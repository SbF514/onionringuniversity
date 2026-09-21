class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.input = new InputManager();
    this.state = new GameState();
    this.chatUI = new ChatUI(this.state);
    this.localPlayer = null;
    this.ws = null;
    this.running = false;
    this.lastTick = 0;
  }

  start(username, wsUrl) {
    var self = this;

    // Show game screen
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';

    // Connect to server
    this.ws = new WebSocketClient(wsUrl);

    this.ws.on('connected', function() {
      self.setStatus('connected');
      self.chatUI.addSystemMessage('Connected to server');
      // Send join message
      self.ws.send('player:join', {
        username: username,
        avatar: { spriteId: 'default', color: '#667eea', scale: 1, animations: {} },
        level: 'campus-main',
      });
    });

    this.ws.on('disconnected', function() {
      self.setStatus('disconnected');
      self.chatUI.addSystemMessage('Disconnected from server');
    });

    this.ws.on('state:full', function(msg) {
      self.state.setLocalPlayer(msg.payload.playerId);
      self.localPlayer = new LocalPlayer(
        msg.payload.playerId,
        username,
        800, 640
      );

      // Load level tiles from server entities
      self.state.setEntities(msg.payload.entities || []);

      // Set player count
      document.getElementById('player-count').textContent =
        (msg.payload.players.length + 1) + ' players online';

      self.chatUI.addSystemMessage('Welcome to the campus! Use WASD to move.');
      self.startGameLoop();
    });

    this.ws.on('player:join', function(msg) {
      self.state.updatePlayer({
        id: msg.playerId,
        username: msg.payload.username,
        position: { x: 800, y: 640 },
        avatar: msg.payload.avatar,
      });
      self.chatUI.addSystemMessage(msg.payload.username + ' joined');
      self.updatePlayerCount();
    });

    this.ws.on('player:update', function(msg) {
      self.state.updatePlayer({
        id: msg.playerId,
        position: msg.payload.position,
        velocity: msg.payload.velocity,
        facing: msg.payload.facing,
      });
    });

    this.ws.on('player:leave', function(msg) {
      self.state.removePlayer(msg.playerId);
      self.updatePlayerCount();
    });

    this.ws.on('chat:proximity', function(msg) {
      var player = self.state.players[msg.playerId];
      var name = player ? player.username : 'Unknown';
      self.chatUI.addPlayerMessage(msg.playerId, name, msg.payload.text);
    });

    this.ws.on('level:load', function(msg) {
      if (msg.payload.level && msg.payload.level.layers) {
        var terrainLayer = msg.payload.level.layers.find(function(l) { return l.type === 'terrain'; });
        if (terrainLayer) {
          self.state.setTiles(terrainLayer.data);
        }
        self.state.tileSize = msg.payload.level.tileSize || 32;
        self.state.setEntities(msg.payload.level.entities || []);
      }
    });

    // Chat send
    this.chatUI.onSend(function(text) {
      self.ws.send('chat:message', { text: text, channel: 'proximity' });
    });

    this.ws.connect();
  }

  startGameLoop() {
    this.running = true;
    this.lastTick = performance.now();
    var self = this;

    // Load demo level tiles (fallback until server sends level data)
    this.loadDemoLevel();

    function loop(now) {
      if (!self.running) return;
      var dt = (now - self.lastTick) / 1000;
      self.lastTick = now;
      self.update(dt);
      self.draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  loadDemoLevel() {
    // Generate a simple demo level: 15 rows x 50 cols
    var tiles = [];
    for (var row = 0; row < 15; row++) {
      var r = [];
      for (var col = 0; col < 50; col++) {
        if (row === 0 || row === 14) {
          r.push(1); // walls top/bottom
        } else if (col === 0 || col === 49) {
          r.push(1); // walls left/right
        } else if (row >= 3 && row <= 5 && col >= 3 && col <= 6) {
          r.push(2); // building 1
        } else if (row >= 3 && row <= 5 && col >= 16 && col <= 19) {
          r.push(3); // building 2
        } else if (row >= 3 && row <= 5 && col >= 29 && col <= 32) {
          r.push(4); // building 3
        } else if (row >= 3 && row <= 5 && col >= 41 && col <= 44) {
          r.push(5); // building 4
        } else if (row >= 7 && row <= 9 && col >= 10 && col <= 13) {
          r.push(6); // garden
        } else if (row >= 7 && row <= 9 && col >= 35 && col <= 38) {
          r.push(6); // garden 2
        } else if (row >= 9 && row <= 11 && col >= 20 && col <= 25) {
          r.push(7); // courtyard
        } else {
          r.push(0); // walkable
        }
      }
      tiles.push(r);
    }
    this.state.setTiles(tiles);
  }

  update(dt) {
    if (!this.localPlayer) return;

    // Input
    if (!this.input.isInputActive()) {
      this.localPlayer.handleInput(this.input.keys);
    }

    // Update position
    this.localPlayer.update(dt);

    // Update camera
    this.renderer.camera.setTarget(this.localPlayer.x, this.localPlayer.y);

    // Send position to server (throttled to ~20/sec)
    if (!this._lastSend || Date.now() - this._lastSend > 50) {
      var p = this.localPlayer.getState();
      this.ws.send('player:move', {
        position: p.position,
        velocity: p.velocity,
        facing: p.facing,
      });
      this._lastSend = Date.now();
    }

    // Update local player in state for rendering
    this.state.updatePlayer({
      id: this.localPlayer.id,
      username: this.localPlayer.username,
      position: { x: this.localPlayer.x, y: this.localPlayer.y },
      velocity: { x: this.localPlayer.vx, y: this.localPlayer.vy },
      facing: this.localPlayer.facing,
      isMoving: this.localPlayer.isMoving,
    });
  }

  draw() {
    var renderState = this.state.getRenderState();
    if (this.localPlayer) {
      renderState.localPlayerId = this.localPlayer.id;
    }
    this.renderer.render(renderState);
  }

  setStatus(status) {
    var el = document.getElementById('connection-status');
    el.className = 'status-' + status;
    el.textContent = status === 'connected' ? 'Connected' : status === 'disconnected' ? 'Disconnected' : 'Connecting...';
    if (status === 'connected') {
      setTimeout(function() { el.style.opacity = '0'; }, 2000);
    } else {
      el.style.opacity = '1';
    }
  }

  updatePlayerCount() {
    var count = this.state.getAllPlayers().length + (this.localPlayer ? 1 : 0);
    document.getElementById('player-count').textContent = count + ' players online';
  }
}
