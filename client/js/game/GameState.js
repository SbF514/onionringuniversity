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
    if (data.id === this.localPlayerId) return; // Don't overwrite local
    this.players[data.id] = {
      id: data.id,
      username: data.username || 'Unknown',
      position: data.position,
      velocity: data.velocity || { x: 0, y: 0 },
      facing: data.facing || 'down',
      avatar: data.avatar,
      isMoving: data.isMoving || false,
    };
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
