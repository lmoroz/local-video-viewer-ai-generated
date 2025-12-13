import fs from 'fs-extra';
import path from 'path';
import {LRUCache} from 'lru-cache';
import {config} from '../config';
import {MinifiedMetadata, MinifiedMetadataSchema} from '../schemas/common.schema';

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
        console.log('📦 Loading metadata cache from disk...');
        const dump = fs.readJsonSync(config.CACHE_FILE_PATH);
        // @ts-ignore: LRUCache load types can be tricky with raw dumps
        this.cache.load(dump);
        console.log(`✅ Cache loaded: ${this.cache.size} entries.`);
      }
    } catch (err) {
      console.warn('⚠️ Failed to load cache, starting fresh.');
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
      if (config.DEBUG_PERF) console.log('💾 Cache saved.');

      this.isDirty = false;
      this.saveTimer = null;
    } catch (err) {
      console.error('❌ Error saving cache:', err);
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
    } catch (err) {
      // Если файла нет или JSON битый — возвращаем пустой объект
      return {};
    }
  }

  public remove(filePath: string): void {
    if (this.cache.delete(filePath)) {
      this.scheduleSave();
      if (config.DEBUG_PERF) {
        console.log(`[CACHE] Evicted: ${path.basename(filePath)}`);
      }
    }
  }
}

const instance = new MetadataCache();

process.on('SIGINT', async () => {
  console.log('\n💾 Saving cache before exit...');
  await instance.saveToDisk();
  process.exit();
});

export default instance;
