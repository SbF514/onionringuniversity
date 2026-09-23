import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { RoomManager } from '../rooms/RoomManager';
import { PluginManager } from '../plugins/PluginManager';
import { NetworkMessage, PlayerJoinMessage, PlayerMoveMessage, ChatMessage, NETWORK } from '../shared/index';
import { MessageRouter } from './MessageRouter';
import { AuthMiddleware, AuthUser } from '../auth/AuthMiddleware';

interface ClientSocket extends WebSocket {
  playerId?: string;
  isAlive: boolean;
  lastMessage: number;
  messageCount: number;
  roomId?: string;
  user?: AuthUser;
}

export class WebSocketServer {
  private wss: WSServer;
  private roomManager: RoomManager;
  private pluginManager: PluginManager;
  private router: MessageRouter;
  private auth: AuthMiddleware | null;
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: Server, roomManager: RoomManager, pluginManager: PluginManager, auth: AuthMiddleware | null) {
    this.roomManager = roomManager;
    this.pluginManager = pluginManager;
    this.auth = auth;
    this.router = new MessageRouter(roomManager, pluginManager);

    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws as ClientSocket, req);
    });

    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const sock = ws as ClientSocket;
        if (!sock.isAlive) {
          this.handleDisconnect(sock);
          return sock.terminate();
        }
        sock.isAlive = false;
        sock.ping();
      });
    }, NETWORK.HEARTBEAT_INTERVAL);

    this.wss.on('close', () => clearInterval(this.heartbeatInterval));
  }

  private async handleConnection(ws: ClientSocket, req: IncomingMessage): Promise<void> {
    ws.isAlive = true;
    ws.lastMessage = Date.now();
    ws.messageCount = 0;

    // Try to authenticate from query param
    if (this.auth) {
      try {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (token) {
          const user = await this.auth.verifyToken(token);
          if (user) {
            ws.user = user;
            console.log(`Authenticated user: ${user.email}`);
          }
        }
      } catch {
        // Continue without auth
      }
    }

    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('close', () => this.handleDisconnect(ws));
    ws.on('error', (err) => console.error(`WS error for ${ws.playerId}:`, err));

    console.log('New connection' + (ws.user ? ` (auth: ${ws.user.email})` : ''));
  }

  private handleMessage(ws: ClientSocket, data: unknown): void {
    const now = Date.now();
    if (now - ws.lastMessage < 33) {
      ws.messageCount++;
      if (ws.messageCount > 30) return;
    } else {
      ws.messageCount = 0;
    }
    ws.lastMessage = now;

    let msg: NetworkMessage;
    try {
      const raw = typeof data === 'string' ? data : String(data);
      msg = JSON.parse(raw) as NetworkMessage;
    } catch { return; }

    if (!msg.type || !msg.timestamp) return;

    if (msg.type === 'player:join') {
      this.router.handleJoin(ws, msg as PlayerJoinMessage, (m) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
      });
      return;
    }

    if (!ws.playerId) return;

    switch (msg.type) {
      case 'player:move':
        this.router.handleMove(ws.playerId, ws.roomId!, msg as PlayerMoveMessage);
        break;
      case 'chat:message':
        this.router.handleChat(ws.playerId, ws.roomId!, msg as ChatMessage);
        break;
      default:
        this.pluginManager.onMessage(msg, ws.playerId, this.roomManager);
    }
  }

  private handleDisconnect(ws: ClientSocket): void {
    if (ws.playerId) {
      this.roomManager.leaveRoom(ws.playerId);
      console.log(`Player ${ws.playerId} disconnected`);
    }
  }

  close(): void {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}
