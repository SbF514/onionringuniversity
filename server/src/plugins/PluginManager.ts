import { ServerPlugin, PluginContext, NetworkMessage, PlayerState, ChatMessage, CommandHandler } from '../shared/index';
import { RoomManager } from '../rooms/RoomManager';
import { readdirSync } from 'fs';
import { join } from 'path';

export class PluginManager {
  private plugins = new Map<string, ServerPlugin>();
  private commands = new Map<string, CommandHandler>();
  private pluginStates = new Map<string, Record<string, unknown>>();

  async loadPlugins(): Promise<void> {
    const pluginDir = join(__dirname);
    const files = readdirSync(pluginDir).filter(f => f.endsWith('Plugin.js'));

    for (const file of files) {
      try {
        const mod = await import(join(pluginDir, file));
        const PluginClass = Object.values(mod).find((v: any) => typeof v === 'function') as any;
        if (!PluginClass) continue;

        const plugin: ServerPlugin = new PluginClass();
        const ctx = this.createContext(plugin.metadata.id);

        if (plugin.onLoad) await plugin.onLoad(ctx);
        this.plugins.set(plugin.metadata.id, plugin);
        console.log(`Loaded plugin: ${plugin.metadata.name} v${plugin.metadata.version}`);
      } catch (err) {
        console.error(`Failed to load plugin ${file}:`, err);
      }
    }
  }

  private createContext(pluginId: string): PluginContext {
    return {
      broadcast: () => {},
      sendTo: () => {},
      getPlayers: () => [],
      getRoom: () => ({} as any),
      loadLevel: async () => {},
      registerCommand: (cmd, handler) => this.commands.set(cmd, handler),
      getState: () => this.pluginStates.get(pluginId) || {},
      setState: (key, value) => {
        const state = this.pluginStates.get(pluginId) || {};
        state[key] = value;
        this.pluginStates.set(pluginId, state);
      },
    };
  }

  onPlayerJoin(player: PlayerState, roomManager: RoomManager): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onPlayerJoin) {
        const ctx = this.createContext(plugin.metadata.id);
        plugin.onPlayerJoin(player, ctx).catch(err =>
          console.error(`Plugin ${plugin.metadata.id} onPlayerJoin error:`, err)
        );
      }
    }
  }

  onPlayerLeave(player: PlayerState, roomManager: RoomManager): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onPlayerLeave) {
        const ctx = this.createContext(plugin.metadata.id);
        plugin.onPlayerLeave(player, ctx).catch(err =>
          console.error(`Plugin ${plugin.metadata.id} onPlayerLeave error:`, err)
        );
      }
    }
  }

  onChatMessage(msg: ChatMessage, player: PlayerState, roomManager: RoomManager): boolean | void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onChatMessage) {
        const ctx = this.createContext(plugin.metadata.id);
        const result = plugin.onChatMessage(msg, ctx);
        if (result === false) return false;
      }
    }
  }

  onMessage(msg: NetworkMessage, playerId: string, roomManager: RoomManager): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onCommand && msg.type === 'plugin:command') {
        const payload = msg.payload as { command: string; args: string[] };
        const player = roomManager.getPlayerManager().getPlayer(playerId);
        if (player) {
          const ctx = this.createContext(plugin.metadata.id);
          plugin.onCommand(payload.command, payload.args, player, ctx).catch(err =>
            console.error(`Plugin command error:`, err)
          );
        }
      }
    }
  }

  onTick(dt: number): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onTick) {
        const ctx = this.createContext(plugin.metadata.id);
        plugin.onTick(dt, ctx).catch(err =>
          console.error(`Plugin ${plugin.metadata.id} tick error:`, err)
        );
      }
    }
  }

  async unloadAll(): Promise<void> {
    for (const [id, plugin] of this.plugins) {
      if (plugin.onUnload) {
        const ctx = this.createContext(id);
        await plugin.onUnload(ctx);
      }
    }
    this.plugins.clear();
  }
}
