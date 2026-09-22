import { LevelDefinition, Vec2, LevelZone, LevelEntity } from '../shared/index';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export class LevelManager {
  private levels = new Map<string, LevelDefinition>();

  async loadAllLevels(): Promise<void> {
    const levelsDir = join(__dirname);
    const files = readdirSync(levelsDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      try {
        const data = readFileSync(join(levelsDir, file), 'utf-8');
        const level: LevelDefinition = JSON.parse(data);
        this.levels.set(level.id, level);
        console.log(`Loaded level: ${level.name} (${level.id})`);
      } catch (err) {
        console.error(`Failed to load level ${file}:`, err);
      }
    }
  }

  getLevel(id: string): LevelDefinition | undefined {
    return this.levels.get(id);
  }

  getLevelList(): Array<{ id: string; name: string; description: string }> {
    return Array.from(this.levels.values()).map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
    }));
  }

  isWalkable(levelId: string, x: number, y: number): boolean {
    const level = this.levels.get(levelId);
    if (!level) return false;

    const tileX = Math.floor(x / level.tileSize);
    const tileY = Math.floor(y / level.tileSize);

    if (tileX < 0 || tileX >= level.width || tileY < 0 || tileY >= level.height) {
      return false;
    }

    // Check terrain layer (index 0) — 0 = walkable, anything else = blocked
    const terrainLayer = level.layers.find((l) => l.type === 'terrain');
    if (!terrainLayer) return true;

    const tile = terrainLayer.data[tileY]?.[tileX];
    return tile === 0 || tile === undefined;
  }

  getSpawnPoint(levelId: string): Vec2 {
    const level = this.levels.get(levelId);
    return level?.spawnPoint ?? { x: 200, y: 200 };
  }

  getZones(levelId: string): LevelZone[] {
    const level = this.levels.get(levelId);
    return level?.zones ?? [];
  }

  getConnections(levelId: string) {
    const level = this.levels.get(levelId);
    return level?.connections ?? [];
  }

  getEntities(levelId: string): LevelEntity[] {
    const level = this.levels.get(levelId);
    return level?.entities ?? [];
  }
}
