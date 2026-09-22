// ============================================================
// School Metaverse - Shared Types
// Core interfaces for the framework
// ============================================================

// --- Vector & Geometry (2D now, 3D-ready) ---

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Union type: use Vec2 for 2D, Vec3 when expanding to 3D
export type Vector = Vec2 | Vec3;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Collider {
  type: 'rect' | 'circle' | 'mesh';
  offset: Vec2;
  width?: number;
  height?: number;
  radius?: number;
}

// --- Player & Avatar ---

export interface PlayerState {
  id: string;
  username: string;
  position: Vec2;
  velocity: Vec2;
  facing: 'left' | 'right' | 'up' | 'down';
  avatar: AvatarConfig;
  currentLevel: string;
  isMoving: boolean;
  lastInput: number;
}

export interface AvatarConfig {
  spriteId: string;
  color: string;
  scale: number;
  animations: Record<string, SpriteAnimation>;
}

export interface SpriteAnimation {
  frames: number[];
  frameRate: number;
  loop: boolean;
}

// --- Levels ---

export interface LevelDefinition {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  tileSize: number;
  spawnPoint: Vec2;
  layers: LevelLayer[];
  entities: LevelEntity[];
  zones: LevelZone[];
  connections: LevelConnection[];
  metadata: Record<string, unknown>;
}

export interface LevelLayer {
  id: string;
  name: string;
  type: 'background' | 'terrain' | 'foreground' | 'overlay';
  visible: boolean;
  data: number[][];  // Tile indices
  opacity: number;
}

export interface LevelEntity {
  id: string;
  type: string;
  position: Vec2;
  properties: Record<string, unknown>;
  collider?: Collider;
}

export interface LevelZone {
  id: string;
  type: 'spawn' | 'chat' | 'trigger' | 'collision' | 'special';
  bounds: Rect;
  properties: Record<string, unknown>;
}

export interface LevelConnection {
  id: string;
  fromLevel: string;
  toLevel: string;
  triggerBounds: Rect;
  spawnPoint: Vec2;
  requiredCondition?: string;
}

// --- Network Protocol ---

export type MessageType =
  | 'player:join'
  | 'player:leave'
  | 'player:move'
  | 'player:update'
  | 'chat:message'
  | 'chat:proximity'
  | 'level:load'
  | 'level:transition'
  | 'state:sync'
  | 'state:full'
  | 'plugin:command'
  | 'plugin:event'
  | 'error';

export interface NetworkMessage {
  type: MessageType;
  timestamp: number;
  playerId: string;
  payload: unknown;
}

export interface PlayerJoinMessage extends NetworkMessage {
  type: 'player:join';
  payload: {
    username: string;
    avatar: AvatarConfig;
    level: string;
  };
}

export interface PlayerMoveMessage extends NetworkMessage {
  type: 'player:move';
  payload: {
    position: Vec2;
    velocity: Vec2;
    facing: PlayerState['facing'];
  };
}

export interface ChatMessage extends NetworkMessage {
  type: 'chat:message' | 'chat:proximity';
  payload: {
    text: string;
    channel: string;
  };
}

export interface LevelLoadMessage extends NetworkMessage {
  type: 'level:load';
  payload: {
    levelId: string;
    level: LevelDefinition;
  };
}

export interface StateSyncMessage extends NetworkMessage {
  type: 'state:sync';
  payload: {
    players: PlayerState[];
    entities: LevelEntity[];
  };
}

// --- Room System ---

export interface RoomState {
  id: string;
  levelId: string;
  players: Map<string, PlayerState>;
  entities: Map<string, LevelEntity>;
  createdAt: number;
  maxPlayers: number;
}

// --- Plugin System (Special Functions) ---

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
}

export interface ServerPlugin {
  metadata: PluginMetadata;
  onLoad?: (context: PluginContext) => Promise<void>;
  onPlayerJoin?: (player: PlayerState, context: PluginContext) => Promise<void>;
  onPlayerLeave?: (player: PlayerState, context: PluginContext) => Promise<void>;
  onPlayerMove?: (player: PlayerState, context: PluginContext) => Promise<void>;
  onChatMessage?: (message: ChatMessage, context: PluginContext) => boolean | void | Promise<boolean | void>;
  onZoneEnter?: (player: PlayerState, zone: LevelZone, context: PluginContext) => Promise<void>;
  onZoneLeave?: (player: PlayerState, zone: LevelZone, context: PluginContext) => Promise<void>;
  onCommand?: (command: string, args: string[], player: PlayerState, context: PluginContext) => Promise<void>;
  onTick?: (deltaTime: number, context: PluginContext) => Promise<void>;
  onUnload?: (context: PluginContext) => Promise<void>;
}

export interface PluginContext {
  broadcast: (message: NetworkMessage) => void;
  sendTo: (playerId: string, message: NetworkMessage) => void;
  getPlayers: () => PlayerState[];
  getRoom: () => RoomState;
  loadLevel: (levelId: string) => Promise<void>;
  registerCommand: (command: string, handler: CommandHandler) => void;
  getState: () => Record<string, unknown>;
  setState: (key: string, value: unknown) => void;
}

export type CommandHandler = (
  args: string[],
  player: PlayerState,
  context: PluginContext
) => Promise<void>;

// --- Renderer Interface (3D expansion point) ---
// Framework-agnostic: implementations handle DOM/Three.js specifics

export interface Renderer {
  initialize(canvas: unknown): Promise<void>;
  render(state: RenderState): void;
  resize(width: number, height: number): void;
  destroy(): void;
  setCameraTarget(position: Vec2): void;
  setCameraZoom(zoom: number): void;
  screenToWorld(screenPos: Vec2): Vec2;
  worldToScreen(worldPos: Vec2): Vec2;
}

export interface RenderState {
  camera: {
    position: Vec2;
    zoom: number;
  };
  players: PlayerState[];
  entities: LevelEntity[];
  tiles: number[][];
  tileSize: number;
  levelWidth: number;
  levelHeight: number;
  localPlayerId: string;
  chatMessages: ChatBubble[];
}

export interface ChatBubble {
  playerId: string;
  text: string;
  timestamp: number;
  opacity: number;
}

// --- Constants ---

export const NETWORK = {
  TICK_RATE: 20,                    // Server ticks per second
  TICK_INTERVAL: 1000 / 20,        // 50ms
  PROXIMITY_RADIUS: 200,           // Pixels for chat visibility
  MAX_MESSAGE_SIZE: 1024,          // bytes
  RECONNECT_BASE_DELAY: 1000,     // ms
  RECONNECT_MAX_DELAY: 30000,     // ms
  HEARTBEAT_INTERVAL: 15000,      // ms
} as const;

export const PLAYER = {
  SPEED: 150,                       // Pixels per second
  SPRINT_MULTIPLIER: 1.5,
  SIZE: { width: 32, height: 48 }, // Default sprite size
  INTERPOLATION: 0.1,              // Smoothing factor
} as const;

export const RENDER = {
  DEFAULT_TILE_SIZE: 32,
  DEFAULT_ZOOM: 1,
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 2,
  CAMERA_SMOOTHING: 0.08,
  BACKGROUND_COLOR: '#1a1a2e',
} as const;
