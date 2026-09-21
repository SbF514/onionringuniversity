import { Room } from './Room';
import { PlayerManager } from '../players/PlayerManager';
import { LevelManager } from '../levels/LevelManager';
import { BroadcastFn } from './Room';

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerRooms = new Map<string, string>(); // playerId -> roomId
  private playerManager: PlayerManager;
  private levelManager: LevelManager;

  constructor(levelManager: LevelManager) {
    this.levelManager = levelManager;
    this.playerManager = new PlayerManager();
  }

  getOrCreateRoom(roomId: string, levelId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Room(roomId, levelId, this.playerManager, this.levelManager);
      this.rooms.set(roomId, room);

      // Listen for transitions
      room.on('player:transition', ({ player, connection }) => {
        const conn = connection as { toLevel: string; spawnPoint: { x: number; y: number } };
        this.transitionPlayer(player.id, conn.toLevel, conn.spawnPoint);
      });
    }
    return room;
  }

  joinRoom(
    roomId: string,
    levelId: string,
    username: string,
    broadcast: BroadcastFn
  ): { playerId: string; room: Room } {
    const room = this.getOrCreateRoom(roomId, levelId);
    const spawnPoint = this.levelManager.getSpawnPoint(levelId);
    const player = this.playerManager.createPlayer(username, levelId, spawnPoint);

    room.addClient(player.id, broadcast);
    this.playerRooms.set(player.id, roomId);

    return { playerId: player.id, room };
  }

  leaveRoom(playerId: string): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.removeClient(playerId);
      this.playerManager.removePlayer(playerId);

      // Clean up empty rooms
      if (room.players.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    this.playerRooms.delete(playerId);
  }

  transitionPlayer(playerId: string, targetLevelId: string, spawnPoint: { x: number; y: number }): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const oldRoom = this.rooms.get(roomId);
    if (!oldRoom) return;

    const player = this.playerManager.getPlayer(playerId);
    if (!player) return;

    // Remove from old room
    oldRoom.removeClient(playerId);

    // Create/get target room (use same room name pattern but different level)
    const newRoomId = `${targetLevelId}_default`;
    const newRoom = this.getOrCreateRoom(newRoomId, targetLevelId);

    // Update player level
    player.currentLevel = targetLevelId;
    player.position = { x: spawnPoint.x, y: spawnPoint.y };
    player.velocity = { x: 0, y: 0 };

    // Get the old broadcast function before removing
    // Re-add to new room (broadcast will be re-set by WebSocket handler)
    // For now, the player needs to reconnect via the transition message
    this.playerRooms.set(playerId, newRoomId);
  }

  getPlayerManager(): PlayerManager {
    return this.playerManager;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  tick(dt: number): void {
    this.playerManager.tick(dt);
    for (const room of this.rooms.values()) {
      room.tick(dt);
    }
  }
}
