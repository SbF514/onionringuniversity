import { PlayerState, Vec2, NETWORK, PLAYER } from '@shared/index';
import { v4 as uuid } from 'uuid';

export class PlayerManager {
  private players = new Map<string, PlayerState>();

  createPlayer(username: string, levelId: string, spawnPoint: Vec2): PlayerState {
    const id = uuid();
    const player: PlayerState = {
      id,
      username,
      position: { ...spawnPoint },
      velocity: { x: 0, y: 0 },
      facing: 'down',
      avatar: {
        spriteId: 'default',
        color: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
        scale: 1,
        animations: {},
      },
      currentLevel: levelId,
      isMoving: false,
      lastInput: Date.now(),
    };
    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  getPlayer(id: string): PlayerState | undefined {
    return this.players.get(id);
  }

  getAllPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }

  updatePosition(id: string, position: Vec2, velocity: Vec2, facing: PlayerState['facing']): void {
    const player = this.players.get(id);
    if (!player) return;

    // Validate speed
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    if (speed > PLAYER.SPEED * PLAYER.SPRINT_MULTIPLIER * 1.2) {
      // Reject impossible speed
      return;
    }

    player.position = position;
    player.velocity = velocity;
    player.facing = facing;
    player.isMoving = speed > 0.1;
    player.lastInput = Date.now();
  }

  tick(dt: number): void {
    for (const player of this.players.values()) {
      if (!player.isMoving) continue;

      // Apply velocity
      player.position.x += player.velocity.x * dt;
      player.position.y += player.velocity.y * dt;
    }
  }

  getPlayersInRadius(center: Vec2, radius: number, excludeId?: string): PlayerState[] {
    return this.getAllPlayers().filter((p) => {
      if (p.id === excludeId) return false;
      const dx = p.position.x - center.x;
      const dy = p.position.y - center.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  getPlayersInLevel(levelId: string): PlayerState[] {
    return this.getAllPlayers().filter((p) => p.currentLevel === levelId);
  }
}
