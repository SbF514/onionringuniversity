class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera();
    this.tileColors = {
      0: '#2d2d44',
      1: '#1a1a2e',
      2: '#4a3f6b',
      3: '#4a3f6b',
      4: '#4a3f6b',
      5: '#4a3f6b',
      6: '#2d5a3d',
      7: '#5a4a2d',
    };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.camera.resize(window.innerWidth, window.innerHeight);
  }

  clear() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width / (window.devicePixelRatio || 1), this.canvas.height / (window.devicePixelRatio || 1));
  }

  render(state) {
    this.clear();
    this.camera.update();
    const { tiles, tileSize, players, entities, localPlayerId, chatMessages } = state;
    const bounds = this.camera.getVisibleBounds();
    const startCol = Math.max(0, Math.floor(bounds.left / tileSize));
    const endCol = tiles[0] ? Math.min(tiles[0].length, Math.ceil(bounds.right / tileSize)) : 0;
    const startRow = Math.max(0, Math.floor(bounds.top / tileSize));
    const endRow = Math.min(tiles.length, Math.ceil(bounds.bottom / tileSize));

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const tile = tiles[row] ? tiles[row][col] : 0;
        const screen = this.camera.worldToScreen(col * tileSize, row * tileSize);
        const size = tileSize * this.camera.zoom;
        this.ctx.fillStyle = this.tileColors[tile] || '#2d2d44';
        this.ctx.fillRect(screen.x, screen.y, size + 1, size + 1);
        if (tile === 0) {
          this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          this.ctx.strokeRect(screen.x, screen.y, size, size);
        }
      }
    }

    for (const entity of entities) {
      const screen = this.camera.worldToScreen(entity.position.x, entity.position.y);
      this.drawEntity(entity, screen);
    }

    for (const player of players) {
      const isLocal = player.id === localPlayerId;
      const screen = this.camera.worldToScreen(player.position.x, player.position.y);
      this.drawPlayer(player, screen, isLocal);
    }

    for (const bubble of chatMessages) {
      const player = players.find(function(p) { return p.id === bubble.playerId; });
      if (!player) continue;
      const screen = this.camera.worldToScreen(player.position.x, player.position.y);
      this.drawChatBubble(bubble, screen);
    }

    const localPlayer = players.find(function(p) { return p.id === localPlayerId; });
    if (localPlayer) {
      const screen = this.camera.worldToScreen(localPlayer.position.x, localPlayer.position.y);
      this.ctx.beginPath();
      var radius = 80 * this.camera.zoom;
      this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  drawPlayer(player, screen, isLocal) {
    var size = 32 * this.camera.zoom;
    var w = size;
    var h = size * 1.5;
    var x = screen.x - w / 2;
    var y = screen.y - h;
    this.ctx.fillStyle = (player.avatar && player.avatar.color) ? player.avatar.color : '#e0e0e0';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, 4 * this.camera.zoom);
    this.ctx.fill();

    // Eyes
    var eyeSize = 3 * this.camera.zoom;
    this.ctx.fillStyle = '#fff';
    var eyeOffsetX = player.facing === 'left' ? -4 : player.facing === 'right' ? 4 : 0;
    this.ctx.beginPath();
    this.ctx.arc(screen.x - 4 * this.camera.zoom + eyeOffsetX, screen.y - h * 0.65, eyeSize, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(screen.x + 4 * this.camera.zoom + eyeOffsetX, screen.y - h * 0.65, eyeSize, 0, Math.PI * 2);
    this.ctx.fill();

    // Pupils
    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.arc(screen.x - 4 * this.camera.zoom + eyeOffsetX * 1.5, screen.y - h * 0.65, eyeSize * 0.5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(screen.x + 4 * this.camera.zoom + eyeOffsetX * 1.5, screen.y - h * 0.65, eyeSize * 0.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Username
    this.ctx.fillStyle = isLocal ? '#667eea' : '#aaa';
    this.ctx.font = (11 * this.camera.zoom) + 'px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(player.username || '', screen.x, screen.y - h - 8 * this.camera.zoom);
  }

  drawEntity(entity, screen) {
    var s = 24 * this.camera.zoom;
    this.ctx.fillStyle = '#5a5a7a';
    this.ctx.beginPath();
    this.ctx.roundRect(screen.x - s / 2, screen.y - s, s, s, 3 * this.camera.zoom);
    this.ctx.fill();
    this.ctx.fillStyle = '#888';
    this.ctx.font = (9 * this.camera.zoom) + 'px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(entity.properties && entity.properties.name ? entity.properties.name : '', screen.x, screen.y - s - 4 * this.camera.zoom);
  }

  drawChatBubble(bubble, screen) {
    var age = Date.now() - bubble.timestamp;
    if (age > 5000) return;
    var opacity = Math.max(0, 1 - age / 5000);
    this.ctx.globalAlpha = opacity;

    this.ctx.font = (12 * this.camera.zoom) + 'px sans-serif';
    var textWidth = this.ctx.measureText(bubble.text).width;
    var padding = 8 * this.camera.zoom;
    var bw = textWidth + padding * 2;
    var bh = 24 * this.camera.zoom;
    var bx = screen.x - bw / 2;
    var by = screen.y - 70 * this.camera.zoom;

    this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
    this.ctx.beginPath();
    this.ctx.roundRect(bx, by, bw, bh, 6 * this.camera.zoom);
    this.ctx.fill();

    this.ctx.fillStyle = '#fff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(bubble.text, screen.x, by + bh * 0.7);
    this.ctx.globalAlpha = 1;
  }
}
