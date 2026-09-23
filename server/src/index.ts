import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { WebSocketServer } from './network/WebSocketServer';
import { RoomManager } from './rooms/RoomManager';
import { LevelManager } from './levels/LevelManager';
import { PluginManager } from './plugins/PluginManager';
import { AuthMiddleware } from './auth/AuthMiddleware';
import { createAuthRouter } from './auth/authRoutes';
import { NETWORK } from './shared/index';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Auth middleware
  let auth: AuthMiddleware | null = null;
  try {
    auth = new AuthMiddleware();
    await auth.init();
    app.use('/api/auth', createAuthRouter(auth));
    console.log('Auth middleware initialized');
  } catch (err) {
    console.warn('Auth middleware not initialized (missing SUPABASE_JWT_SECRET):', err);
  }

  // Level data API
  const levelManager = new LevelManager();
  await levelManager.loadAllLevels();

  app.get('/api/levels', (_req, res) => {
    res.json(levelManager.getLevelList());
  });

  app.get('/api/levels/:id', (req, res) => {
    const level = levelManager.getLevel(req.params.id);
    if (!level) return res.status(404).json({ error: 'Level not found' });
    res.json(level);
  });

  // Create HTTP server
  const server = createServer(app);

  // Initialize systems
  const roomManager = new RoomManager(levelManager);
  const pluginManager = new PluginManager();
  await pluginManager.loadPlugins();

  // WebSocket server
  const wss = new WebSocketServer(server, roomManager, pluginManager, auth);

  // Main tick loop
  setInterval(() => {
    const dt = NETWORK.TICK_INTERVAL / 1000;
    roomManager.tick(dt);
    pluginManager.onTick(dt);
  }, NETWORK.TICK_INTERVAL);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    pluginManager.unloadAll();
    wss.close();
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
