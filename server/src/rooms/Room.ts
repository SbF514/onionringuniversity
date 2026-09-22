import { PlayerState, LevelEntity, LevelZone, NETWORK, Vec2 } from '@shared/index';
import { PlayerManager } from '../players/PlayerManager';
import { LevelManager } from '../levels/LevelManager';

export interface BroadcastFn {
  (message: object): void;
}

export interface ProximityFilter {
  (player: PlayerState): boolean;
}

export class Room {
  public id: string;
  public levelId: string;
  public players: Map<string, PlayerState> = new Map();
  public entities: Map<string, LevelEntity> = new Map();
  public createdAt: number = Date.now();
  public maxPlayers: number = 50;

  private playerManager: PlayerManager;
  private levelManager: LevelManager;
  private clients: Map<string, BroadcastFn> = new Map();

  constructor(
    id: string,
    levelId: string,
    playerManager: PlayerManager,
    levelManager: LevelManager
  ) {
    this.id = id;
    this.levelId = levelId;
    this.playerManager = playerManager;
    this.levelManager = levelManager;

    // Load level entities
    const entities = levelManager.getEntities(levelId);
    for (const entity of entities) {
      this.entities.set(entity.id, entity);
    }
  }

  addClient(playerId: string, broadcast: BroadcastFn): void {
    this.clients.set(playerId, broadcast);
    const player = this.playerManager.getPlayer(playerId);
    if (player) {
      this.players.set(playerId, player);
    }
  }

  removeClient(playerId: string): void {
    this.clients.delete(playerId);
    this.players.delete(playerId);
  }

  broadcast(message: object, excludeId?: string): void {
    for (const [id, broadcast] of this.clients) {
      if (id !== excludeId) {
        try {
          broadcast(message);
        } catch {
          // Client disconnected, will be cleaned up
        }
      }
    }
  }

  broadcastProximity(
    message: object,
    center: Vec2,
    radius: number = NETWORK.PROXIMITY_RADIUS,
    excludeId?: string
  ): void {
    for (const [id, broadcast] of this.clients) {
      if (id === excludeId) continue;
      const player = this.players.get(id);
      if (!player) continue;

      const dx = player.position.x - center.x;
      const dy = player.position.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        try {
          broadcast(message);
        } catch {
          // Client disconnected
        }
      }
    }
  }

  sendTo(playerId: string, message: object): void {
    const broadcast = this.clients.get(playerId);
    if (broadcast) {
      try {
        broadcast(message);
      } catch {
        // Client disconnected
      }
    }
  }

  getPlayersInRadius(center: Vec2, radius: number, excludeId?: string): PlayerState[] {
    return Array.from(this.players.values()).filter((p) => {
      if (p.id === excludeId) return false;
      const dx = p.position.x - center.x;
      const dy = p.position.y - center.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  tick(dt: number): void {
    // Update positions, run physics, etc.
    // Collision checks would go here
    for (const player of this.players.values()) {
      if (!player.isMoving) continue;

      const newX = player.position.x + player.velocity.x * dt;
      const newY = player.position.y + player.velocity.y * dt;

      // Boundary check
      const level = this.levelManager.getLevel(this.levelId);
      if (level) {
        const clampedX = Math.max(0, Math.min(newX, level.width * level.tileSize));
        const clampedY = Math.max(0, Math.min(newY, level.height * level.tileSize));

        // Walkability check
        if (this.levelManager.isWalkable(this.levelId, clampedX, clampedY)) {
          player.position.x = clampedX;
          player.position.y = clampedY;
        } else {
          // Try sliding along axes
          if (this.levelManager.isWalkable(this.levelId, clampedX, player.position.y)) {
            player.position.x = clampedX;
          } else if (this.levelManager.isWalkable(this.levelId, player.position.x, clampedY)) {
            player.position.y = clampedY;
          }
          player.velocity = { x: 0, y: 0 };
        }
      }
    }

    // Zone checks for level transitions
    const connections = this.levelManager.getConnections(this.levelId);
    for (const conn of connections) {
      for (const player of this.players.values()) {
        if (
          player.position.x >= conn.triggerBounds.x &&
          player.position.x <= conn.triggerBounds.x + conn.triggerBounds.width &&
          player.position.y >= conn.triggerBounds.y &&
          player.position.y <= conn.triggerBounds.y + conn.triggerBounds.height
        ) {
          // Player hit a transition trigger — emit event for plugin to handle
          this.emit('player:transition', { player, connection: conn });
        }
      }
    }
  }

  private transitionHandlers: Array<(data: { player: PlayerState; connection: unknown }) => void> =
    [];

  on(event: 'player:transition', handler: (data: { player: PlayerState; connection: unknown }) => void): void {
    this.transitionHandlers.push(handler);
  }

  private emit(event: string, data: unknown): void {
    if (event === 'player:transition') {
      for (const handler of this.transitionHandlers) {
        handler(data as { player: PlayerState; connection: unknown });
      }
    }
  }
}
