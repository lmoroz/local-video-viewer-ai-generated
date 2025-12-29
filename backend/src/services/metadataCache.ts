import fs from 'fs-extra';
import path from 'path';
import { LRUCache } from 'lru-cache';
import { config } from '../config';
import { MinifiedMetadata, MinifiedMetadataSchema } from '../schemas/common.schema';
import { logger } from '../utils/logger';

interface CacheEntry {
  mtime: number;
  data: MinifiedMetadata;
}

class MetadataCache {
  private cache: LRUCache<string, CacheEntry>;
  private isDirty: boolean = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new LRUCache<string, CacheEntry>({
      max: 15000,
    });
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(config.CACHE_FILE_PATH)) {
        logger.info('📦 Loading metadata cache from disk...');
        const dump = fs.readJsonSync(config.CACHE_FILE_PATH);
        // LRUCache load types can be tricky
        this.cache.load(dump);
        logger.info({ entries: this.cache.size }, '✅ Cache loaded');
      }
    } catch (err) {
      logger.warn({ err }, '⚠️ Failed to load cache, starting fresh.');
      fs.removeSync(config.CACHE_FILE_PATH);
    }
  }

  private scheduleSave(): void {
    if (this.isDirty && !this.saveTimer) {
      this.saveTimer = setTimeout(async () => {
        await this.saveToDisk();
      }, 5000);
    }
    this.isDirty = true;
  }

  public async saveToDisk(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(config.CACHE_FILE_PATH));
      const dump = this.cache.dump();
      await fs.writeJson(config.CACHE_FILE_PATH, dump);
      if (config.DEBUG_PERF) logger.debug('💾 Cache saved.');

      this.isDirty = false;
      this.saveTimer = null;
    } catch (err) {
      logger.error({ err }, '❌ Error saving cache');
    }
  }

  /**
   * Использует Zod для удаления лишних полей (strip) и валидации типов.
   */
  private _minifyData(fullData: unknown): MinifiedMetadata {
    const result = MinifiedMetadataSchema.safeParse(fullData);
    if (result.success) {
      return result.data;
    }
    return {};
  }

  public async get(filePath: string): Promise<MinifiedMetadata> {
    try {
      // Проверка существования файла через stat (быстрее чем access + read)
      const stat = await fs.stat(filePath);
      const currentMtime = stat.mtimeMs;

      if (this.cache.has(filePath)) {
        const cachedEntry = this.cache.get(filePath);
        if (cachedEntry && cachedEntry.mtime === currentMtime) {
          return cachedEntry.data;
        }
      }

      // Если кэш протух или отсутствует — читаем и парсим
      const fullData = await fs.readJson(filePath);
      const minifiedData = this._minifyData(fullData);

      this.cache.set(filePath, {
        mtime: currentMtime,
        data: minifiedData,
      });

      this.scheduleSave();

      return minifiedData;
    } catch (_err) {
      // Если файла нет или JSON битый — возвращаем пустой объект
      return {};
    }
  }

  public remove(filePath: string): void {
    if (this.cache.delete(filePath)) {
      this.scheduleSave();
      if (config.DEBUG_PERF) {
        logger.debug({ file: path.basename(filePath) }, '[CACHE] Evicted');
      }
    }
  }

  /**
   * Очистка кеша по префиксу пути (например, для конкретного плейлиста)
   */
  public clearByPrefix(pathPrefix: string): number {
    let count = 0;
    const normalizedPrefix = path.normalize(pathPrefix);

    for (const key of this.cache.keys()) {
      const normalizedKey = path.normalize(key);
      if (normalizedKey.startsWith(normalizedPrefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.scheduleSave();
      logger.info({ prefix: pathPrefix, count }, '[CACHE] Cleared entries by prefix');
    }

    return count;
  }
}

const instance = new MetadataCache();

export default instance;
