const fs = require('fs-extra');
const path = require('path');
const pLimit = require('p-limit').default;
const chokidar = require('chokidar');
const config = require('../config');
const metadataCache = require('./metadataCache');

class IndexerService {
  constructor() {
    this.limit = pLimit(50);

    // Состояние для вотчера
    this.watcher = null;
    this.currentWatchedDir = null;
  }

  _setupWatcher(targetDir) {
    // 1. Если мы уже следим за этой папкой — ничего не делаем
    if (this.watcher && this.currentWatchedDir === targetDir) return;

    // 2. Если есть старый вотчер на другой папке — убиваем его
    if (this.watcher) {
      console.log(`[WATCHER] Stopping watch on: ${ this.currentWatchedDir }`);
      this.watcher.close();
      this.watcher = null;
    }

    // 3. Запускаем новый
    console.log(`[WATCHER] Starting watch on: ${ targetDir }`);
    this.currentWatchedDir = targetDir;

    this.watcher = chokidar.watch(targetDir, {
      ignored: /(^|[\/\\])\../, // Игнорировать скрытые файлы (начинаются с точки)
      persistent: true,
      ignoreInitial: true, // Не триггерить события на те файлы, которые уже там есть (мы их и так просканировали)
      depth: 3, // Не лезть слишком глубоко, если папок очень много
      awaitWriteFinish: { // Ждать, пока файл запишется полностью
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath) => this._handleFileChange(filePath, 'add'))
      .on('change', (filePath) => this._handleFileChange(filePath, 'change'))
      .on('unlink', (filePath) => this._handleFileChange(filePath, 'unlink'));
  }

  async _handleFileChange(filePath, event) {
    // Нас интересуют только JSON
    const isJson = filePath.endsWith('.info.json');
    if (!isJson) return;

    if (config.DEBUG_PERF === 'true') console.log(`[WATCHER] File ${ event }: ${ path.basename(filePath) }`);

    if (event === 'unlink') metadataCache.remove(filePath);
    else if (isJson) await metadataCache.get(filePath);
  }

  async scanPlaylists(dirPath) {
    if (!await fs.pathExists(dirPath)) throw new Error('Directory not found');

    this._setupWatcher(dirPath);

    const items = await fs.readdir(dirPath);

    const results = await Promise.all(items.map(item => this.limit(async () => {
      const itemPath = path.join(dirPath, item);
      let stat;
      try { stat = await fs.stat(itemPath); } catch (e) { return null; }

      if (!stat.isDirectory()) return null;

      let files;
      try { files = await fs.readdir(itemPath); } catch (e) { return null; }

      const zeroFile = files.find(f => f.startsWith('000 - '));
      if (!zeroFile) return null;

      let id = null;
      let title = item;
      let uploader = 'Unknown';
      let coverPath = null;
      let totalDuration = 0;
      let videoCount = 0;

      const infoFile = files.find(f => f.startsWith('000 - ') && f.endsWith('.info.json'));
      if (infoFile) {
        // ОПТИМИЗАЦИЯ: используем кэш
        const infoData = await metadataCache.get(path.join(itemPath, infoFile));

        if (infoData.id) id = infoData.id;
        if (infoData.title) title = infoData.title;
        if (infoData.uploader) uploader = infoData.uploader;

        const basename = path.basename(infoFile, '.info.json');
        for (const ext of config.SUPPORTED_IMG_EXT) {
          if (files.includes(basename + ext)) {
            coverPath = path.join(itemPath, basename + ext);
            break;
          }
        }
      }

      if (!id) {
        const match = zeroFile.match(/\[([a-zA-Z0-9_-]+)\]/);
        if (match) id = match[1];
      }

      const videoFiles = files.filter(f => config.SUPPORTED_VIDEO_EXT.includes(path.extname(f).toLowerCase()));
      videoCount = videoFiles.length;

      await Promise.all(videoFiles.map(vFile => this.limit(async () => {
        const vBase = path.basename(vFile, path.extname(vFile));
        const vInfo = vBase + '.info.json';
        if (files.includes(vInfo)) {
          // ОПТИМИЗАЦИЯ: используем кэш для подсчета длительности
          const vData = await metadataCache.get(path.join(itemPath, vInfo));
          if (vData.duration) totalDuration += vData.duration;
        }
      })));

      return {
        id,
        name: item,
        title,
        cover: coverPath,
        videoCount,
        totalDuration,
        uploader,
        updatedAt: stat.mtimeMs,
      };
    })));

    return results.filter(Boolean);
  }

  async scanPlaylistVideos(dirPath, playlistId) {
    this._setupWatcher(dirPath);

    const items = await fs.readdir(dirPath);
    let playlistPath = null;

    // Быстрый поиск папки
    for (const item of items) {
      const p = path.join(dirPath, item);
      try {
        if ((await fs.stat(p)).isDirectory()) {
          const f = await fs.readdir(p);
          const zero = f.find(name => name.startsWith('000 - '));
          if (zero && zero.includes(`[${ playlistId }]`)) {
            playlistPath = p;
            break;
          }
        }
      } catch (e) {}
    }

    if (!playlistPath) return null;

    const files = await fs.readdir(playlistPath);

    let playlistTitle = path.basename(playlistPath);
    const plInfoFile = files.find(f => f.startsWith('000 - ') && f.endsWith('.info.json'));
    if (plInfoFile) {
      // ОПТИМИЗАЦИЯ: кэш
      const d = await metadataCache.get(path.join(playlistPath, plInfoFile));
      if (d.title) playlistTitle = d.title;
    }

    const videoPromises = files
      .filter(f => config.SUPPORTED_VIDEO_EXT.includes(path.extname(f).toLowerCase()))
      .map(file => this.limit(async () => {
        const ext = path.extname(file);
        const basename = path.basename(file, ext);
        const infoFile = basename + '.info.json';
        const descFile = basename + '.description';

        let metadata = {};
        let description = '';
        let thumbnail = null;

        // Параллельный запрос: Metadata (Cache) + Description (FS)
        const [metaDataResult, descResult] = await Promise.all([
          // ОПТИМИЗАЦИЯ: используем кэш
          files.includes(infoFile) ? metadataCache.get(path.join(playlistPath, infoFile)) : {},

          fs.pathExists(path.join(playlistPath, descFile)).then(exists =>
            exists ? fs.readFile(path.join(playlistPath, descFile), 'utf-8').catch(() => '') : '',
          ),
        ]);

        metadata = metaDataResult;
        description = descResult;

        for (const ie of config.SUPPORTED_IMG_EXT) {
          if (files.includes(basename + ie)) {
            thumbnail = path.join(playlistPath, basename + ie);
            break;
          }
        }

        return {
          id: metadata.id,
          filename: file,
          title: metadata.fulltitle || metadata.title || file,
          uploader: metadata.uploader,
          uploader_url: metadata.uploader_url,
          channel_url: metadata.channel_url,
          upload_date: metadata.upload_date,
          duration: metadata.duration,
          chapters: metadata.chapters,
          description,
          thumbnail,
          path: path.join(playlistPath, file),
        };
      }));

    const videos = await Promise.all(videoPromises);
    return {videos, title: playlistTitle};
  }

  async scanAllVideos(rootDir) {
    if (!await fs.pathExists(rootDir)) throw new Error('Directory not found');

    this._setupWatcher(rootDir);

    const results = [];

    const walk = async (dir) => {
      let items;
      try { items = await fs.readdir(dir, {withFileTypes: true}); } catch (e) { return; }

      const files = [];
      const folders = [];

      for (const item of items) {
        if (item.isDirectory()) {
          folders.push(path.join(dir, item.name));
        }
        else {
          const ext = path.extname(item.name).toLowerCase();
          if (config.SUPPORTED_VIDEO_EXT.includes(ext)) {
            files.push(item.name);
          }
        }
      }

      if (files.length > 0) {
        let playlistId = null;
        let playlistName = path.basename(dir);
        try {
          const allFiles = await fs.readdir(dir); // Имена файлов для поиска ID плейлиста
          const zeroFile = allFiles.find(f => f.startsWith('000 - '));
          if (zeroFile) {
            const match = zeroFile.match(/\[([a-zA-Z0-9_-]+)\]/);
            if (match) playlistId = match[1];
          }
        } catch (e) {}

        const filePromises = files.map(filename => this.limit(async () => {
          const itemPath = path.join(dir, filename);
          const ext = path.extname(filename).toLowerCase();
          const basename = path.basename(filename, ext);
          const infoFile = basename + '.info.json';

          let metadata = {};
          let thumbnail = null;

          const infoPath = path.join(dir, infoFile);
          // ОПТИМИЗАЦИЯ: кэш. Нам даже не надо проверять fs.exists лишний раз,
          // так как metadataCache.get внутри делает try/catch.
          // Но для точности "есть ли файл info.json рядом" проверка `await fs.pathExists` полезна,
          // хотя можно оптимизировать, проверяя наличие `infoFile` в массиве `allFiles` выше.
          if (await fs.pathExists(infoPath)) {
            metadata = await metadataCache.get(infoPath);
          }

          for (const imgExt of config.SUPPORTED_IMG_EXT) {
            const thumbPath = path.join(dir, basename + imgExt);
            if (await fs.pathExists(thumbPath)) {
              thumbnail = thumbPath;
              break;
            }
          }

          let ctime = 0;
          try {
            const stat = await fs.stat(itemPath);
            ctime = stat.ctimeMs;
          } catch (e) {}

          results.push({
            id: metadata.id || this._extractIdFromFilename(filename),
            filename: filename,
            title: metadata.fulltitle || metadata.title || filename,
            uploader: metadata.uploader,
            upload_date: metadata.upload_date,
            duration: metadata.duration,
            thumbnail,
            path: itemPath,
            playlistId,
            playlistName,
            ctime,
          });
        }));

        await Promise.all(filePromises);
      }

      await Promise.all(folders.map(folder => walk(folder)));
    };

    await walk(rootDir);
    return results;
  }

  _extractIdFromFilename(filename) {
    const match = filename.match(/\[([a-zA-Z0-9_-]+)\]/);
    return match ? match[1] : null;
  }
}

module.exports = new IndexerService();
