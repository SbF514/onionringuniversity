import { WebSocket } from 'ws';
import { RoomManager } from '../rooms/RoomManager';
import { PluginManager } from '../plugins/PluginManager';
import { PlayerJoinMessage, PlayerMoveMessage, ChatMessage, NETWORK } from '../shared/index';

interface ClientSocket extends WebSocket {
  playerId?: string;
  roomId?: string;
}

export class MessageRouter {
  private roomManager: RoomManager;
  private pluginManager: PluginManager;

  constructor(roomManager: RoomManager, pluginManager: PluginManager) {
    this.roomManager = roomManager;
    this.pluginManager = pluginManager;
  }

  handleJoin(ws: ClientSocket, msg: PlayerJoinMessage, send: (m: object) => void): void {
    const { username, level } = msg.payload;
    const roomId = `${level}_default`;

    const { playerId, room } = this.roomManager.joinRoom(roomId, level, username, send);
    ws.playerId = playerId;
    ws.roomId = roomId;

    const players = room.getPlayersInRadius({ x: 0, y: 0 }, Infinity, playerId);
    send({
      type: 'state:full',
      timestamp: Date.now(),
      playerId: 'server',
      payload: {
        playerId,
        players: players.map((p) => ({
          id: p.id, username: p.username, position: p.position,
          avatar: p.avatar, facing: p.facing, isMoving: p.isMoving,
        })),
        level,
        entities: Array.from(room.entities.values()),
      },
    });

    const broadcastMsg: PlayerJoinMessage = {
      type: 'player:join',
      timestamp: Date.now(),
      playerId,
      payload: { username, avatar: msg.payload.avatar, level },
    };
    room.broadcast(broadcastMsg, playerId);

    const player = this.roomManager.getPlayerManager().getPlayer(playerId);
    if (player) {
      this.pluginManager.onPlayerJoin(player, this.roomManager);
    }
    console.log(`Player ${username} (${playerId}) joined ${roomId}`);
  }

  handleMove(playerId: string, roomId: string, msg: PlayerMoveMessage): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    this.roomManager.getPlayerManager().updatePosition(
      playerId, msg.payload.position, msg.payload.velocity, msg.payload.facing
    );

    const player = this.roomManager.getPlayerManager().getPlayer(playerId);
    if (player) {
      room.broadcastProximity(
        {
          type: 'player:update',
          timestamp: Date.now(),
          playerId,
          payload: { position: msg.payload.position, velocity: msg.payload.velocity, facing: msg.payload.facing },
        },
        player.position,
        NETWORK.PROXIMITY_RADIUS * 2,
        playerId
      );
    }
  }

  handleChat(playerId: string, roomId: string, msg: ChatMessage): void {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    const player = this.roomManager.getPlayerManager().getPlayer(playerId);
    if (!player) return;

    const processed = this.pluginManager.onChatMessage(msg, player, this.roomManager);
    if (processed === false) return;

    const chatMsg: ChatMessage = {
      type: 'chat:proximity',
      timestamp: Date.now(),
      playerId,
      payload: { text: msg.payload.text.slice(0, 200), channel: 'proximity' },
    };

    room.broadcast(chatMsg, playerId);
  }
}
