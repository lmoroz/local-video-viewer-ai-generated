const fs = require('fs-extra');
const path = require('path');
const {LRUCache} = require('lru-cache');

const CACHE_FILE_PATH = path.join(process.cwd(), 'cache', 'metadata-store.json');

class MetadataCache {
  constructor() {
    this.cache = new LRUCache({
      max: 15000, // Можно хранить больше, так как записи станут легкими
    });

    this.isDirty = false;
    this.saveTimer = null;

    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(CACHE_FILE_PATH)) {
        console.log('📦 Loading metadata cache from disk...');
        const dump = fs.readJsonSync(CACHE_FILE_PATH);
        this.cache.load(dump);
        console.log(`✅ Cache loaded: ${ this.cache.size } entries.`);
      }
    } catch (err) {
      console.warn('⚠️ Failed to load cache, starting fresh.');
      fs.removeSync(CACHE_FILE_PATH);
    }
  }

  scheduleSave() {
    if (this.isDirty && !this.saveTimer) {
      this.saveTimer = setTimeout(async () => {
        await this.saveToDisk();
      }, 5000);
    }
    this.isDirty = true;
  }

  async saveToDisk() {
    try {
      await fs.ensureDir(path.dirname(CACHE_FILE_PATH));
      const dump = this.cache.dump();
      await fs.writeJson(CACHE_FILE_PATH, dump);
      if (process.env.DEBUG_PERF === 'true') console.log('💾 Cache saved.');

      this.isDirty = false;
      this.saveTimer = null;
    } catch (err) {
      console.error('❌ Error saving cache:', err);
    }
  }

  /**
   * Оставляет только нужные для UI поля, уменьшая размер объекта в 10-50 раз.
   */
  _minifyData(fullData) {
    if (!fullData) return {};

    return {
      id: fullData.id,
      title: fullData.title,
      fulltitle: fullData.fulltitle, // Иногда нужно, если title обрезан
      uploader: fullData.uploader,
      upload_date: fullData.upload_date,
      uploader_url: fullData.uploader_url,
      channel_url: fullData.channel_url,
      duration: fullData.duration,
      // Не сохраняем formats, http_headers, automatic_captions и прочий мусор
      // description можно оставить, если он нужен для поиска, но он тоже занимает место.
      // Если поиск только по названию - description лучше убрать.
      // description: fullData.description ? fullData.description.substring(0, 1000) : '', // Можно обрезать
    };
  }

  async get(filePath) {
    try {
      const stat = await fs.stat(filePath);
      const currentMtime = stat.mtimeMs;
      const key = filePath;

      if (this.cache.has(key)) {
        const cachedEntry = this.cache.get(key);
        if (cachedEntry.mtime === currentMtime) {
          return cachedEntry.data;
        }
      }

      // Читаем полный файл с диска
      const fullData = await fs.readJson(filePath);

      // ОСТАВЛЯЕМ ТОЛЬКО ВАЖНОЕ
      const minifiedData = this._minifyData(fullData);

      this.cache.set(key, {
        mtime: currentMtime,
        data: minifiedData,
      });

      this.scheduleSave();

      return minifiedData; // Возвращаем уже облегченную версию
    } catch (err) {
      return {};
    }
  }

  remove(filePath) {
    if (this.cache.delete(filePath)) {
      this.scheduleSave(); // Сохраняем изменения на диск
      if (process.env.DEBUG_PERF === 'true') {
        console.log(`[CACHE] Evicted: ${ path.basename(filePath) }`);
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

module.exports = instance;
