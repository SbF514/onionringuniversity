class GameState {
  constructor() {
    this.localPlayerId = null;
    this.players = {};
    this.entities = [];
    this.tiles = [];
    this.tileSize = 32;
    this.levelWidth = 50;
    this.levelHeight = 40;
    this.chatMessages = [];
  }

  setLocalPlayer(id) {
    this.localPlayerId = id;
  }

  updatePlayer(data) {
    if (!this.players[data.id]) {
      this.players[data.id] = {
        id: data.id,
        username: 'Unknown',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        facing: 'down',
        avatar: null,
        isMoving: false,
      };
    }
    var p = this.players[data.id];
    if (data.username) p.username = data.username;
    if (data.position) p.position = data.position;
    if (data.velocity) p.velocity = data.velocity;
    if (data.facing) p.facing = data.facing;
    if (data.avatar) p.avatar = data.avatar;
    if (data.isMoving !== undefined) p.isMoving = data.isMoving;
  }

  removePlayer(id) {
    delete this.players[id];
  }

  setTiles(tiles) {
    this.tiles = tiles;
  }

  setEntities(entities) {
    this.entities = entities;
  }

  addChatMessage(playerId, text, timestamp) {
    this.chatMessages.push({
      playerId: playerId,
      text: text,
      timestamp: timestamp || Date.now(),
      opacity: 1,
    });
    // Keep only last 50 messages
    if (this.chatMessages.length > 50) {
      this.chatMessages = this.chatMessages.slice(-50);
    }
  }

  getAllPlayers() {
    var result = [];
    for (var id in this.players) {
      result.push(this.players[id]);
    }
    return result;
  }

  getRenderState() {
    return {
      camera: { position: { x: 0, y: 0 }, zoom: 1 },
      players: this.getAllPlayers(),
      entities: this.entities,
      tiles: this.tiles,
      tileSize: this.tileSize,
      levelWidth: this.levelWidth,
      levelHeight: this.levelHeight,
      localPlayerId: this.localPlayerId,
      chatMessages: this.chatMessages,
    };
  }
}
