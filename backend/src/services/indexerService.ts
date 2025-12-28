import fs from 'fs-extra';
import path from 'path';
import pLimit from 'p-limit';
import chokidar, { FSWatcher } from 'chokidar';
import { config } from '../config';
import metadataCache from './metadataCache';
import { Playlist, VideoItem, MinifiedMetadata } from '../schemas/common.schema';
import { logger } from '../utils/logger';

class IndexerService {
  // Используем p-limit v6 (совместимый с CJS) или v7 через import.
  // Если ошибка require ESM, нужно использовать dynamic import или p-limit@3.
  // В данном коде предполагаем, что p-limit работает (v6+ поддерживает CJS или используем старую v3).
  // Для надежности можно использовать: const limit = pLimit(50);
  private limit = pLimit(50);

  private watcher: FSWatcher | null = null;
  private currentWatchedDir: string | null = null;

  private _setupWatcher(targetDir: string): void {
    if (this.watcher && this.currentWatchedDir === targetDir) return;

    this.stop(); // Stop previous watcher if exists

    logger.info({ dir: targetDir }, '[WATCHER] Starting watch');
    this.currentWatchedDir = targetDir;

    this.watcher = chokidar.watch(targetDir, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
      depth: 3,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (fp) => this._handleFileChange(fp, 'add'))
      .on('change', (fp) => this._handleFileChange(fp, 'change'))
      .on('unlink', (fp) => this._handleFileChange(fp, 'unlink'));
  }

  public async stop(): Promise<void> {
    if (this.watcher) {
      logger.info({ dir: this.currentWatchedDir }, '[WATCHER] Stopping watch');
      await this.watcher.close();
      this.watcher = null;
      this.currentWatchedDir = null;
    }
  }

  private async _handleFileChange(filePath: string, event: 'add' | 'change' | 'unlink'): Promise<void> {
    const isJson = filePath.endsWith('.info.json');
    if (!isJson) return;

    if (config.DEBUG_PERF) logger.debug({ event, file: path.basename(filePath) }, '[WATCHER] File event');

    if (event === 'unlink') metadataCache.remove(filePath);
    else if (isJson) await metadataCache.get(filePath);
  }

  public async scanPlaylists(dirPath: string): Promise<Playlist[]> {
    if (!(await fs.pathExists(dirPath))) throw new Error('Directory not found');

    this._setupWatcher(dirPath);

    const items = await fs.readdir(dirPath);

    const results = await Promise.all(
      items.map((item) =>
        this.limit(async (): Promise<Playlist | null> => {
          const itemPath = path.join(dirPath, item);
          let stat;
          try {
            stat = await fs.stat(itemPath);
          } catch (_e) {
            return null;
          }

          if (!stat.isDirectory()) return null;

          let files;
          try {
            files = await fs.readdir(itemPath);
          } catch (_e) {
            return null;
          }

          const zeroFile = files.find((f) => f.startsWith('000 - '));
          if (!zeroFile) return null;

          let id: string | null = null;
          let title = item;
          let uploader = 'Unknown';
          let coverPath: string | null = null;
          let totalDuration = 0;

          const infoFile = files.find((f) => f.startsWith('000 - ') && f.endsWith('.info.json'));
          if (infoFile) {
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
            const match = zeroFile.match(/\[([a-zA-Z0-9_-]+)]/);
            if (match) id = match[1];
          }

          const videoFiles = files.filter((f) => config.SUPPORTED_VIDEO_EXT.includes(path.extname(f).toLowerCase() as any));
          const videoCount = videoFiles.length;

          await Promise.all(
            videoFiles.map((vFile) =>
              this.limit(async () => {
                const vBase = path.basename(vFile, path.extname(vFile));
                const vInfo = vBase + '.info.json';
                if (files.includes(vInfo)) {
                  const vData = await metadataCache.get(path.join(itemPath, vInfo));
                  if (vData.duration) totalDuration += vData.duration;
                }
              })
            )
          );

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
        })
      )
    );

    return results.filter((item): item is Playlist => item !== null);
  }

  public async scanPlaylistVideos(dirPath: string, playlistId: string): Promise<{ videos: VideoItem[]; title: string } | null> {
    this._setupWatcher(dirPath);

    const items = await fs.readdir(dirPath);
    let playlistPath: string | null = null;

    // Поиск папки плейлиста
    for (const item of items) {
      const p = path.join(dirPath, item);
      try {
        const stat = await fs.stat(p);
        if (stat.isDirectory()) {
          const f = await fs.readdir(p);
          const zero = f.find((name) => name.startsWith('000 - '));
          if (zero && zero.includes(`[${playlistId}]`)) {
            playlistPath = p;
            break;
          }
        }
      } catch (_e) {
        /* ignore access errors */
      }
    }

    if (!playlistPath) return null;

    const files = await fs.readdir(playlistPath);
    let playlistTitle = path.basename(playlistPath);

    const plInfoFile = files.find((f) => f.startsWith('000 - ') && f.endsWith('.info.json'));
    if (plInfoFile) {
      const d = await metadataCache.get(path.join(playlistPath, plInfoFile));
      if (d.title) playlistTitle = d.title;
    }

    const videoPromises = files
      .filter((f) => config.SUPPORTED_VIDEO_EXT.includes(path.extname(f).toLowerCase() as any))
      .map((file) =>
        this.limit(async (): Promise<VideoItem> => {
          const ext = path.extname(file);
          const basename = path.basename(file, ext);
          const infoFile = basename + '.info.json';
          const descFile = basename + '.description';

          const infoFilePath = path.join(playlistPath!, infoFile);
          const descFilePath = path.join(playlistPath!, descFile);

          // Явная типизация промисов для Promise.all
          const [metaDataResult, descResult] = await Promise.all([
            files.includes(infoFile) ? metadataCache.get(infoFilePath) : Promise.resolve({} as MinifiedMetadata),

            fs.pathExists(descFilePath).then((exists) => (exists ? fs.readFile(descFilePath, 'utf-8').catch(() => '') : '')),
          ]);

          const metadata: MinifiedMetadata = metaDataResult;
          const description: string = descResult;

          let thumbnail: string | null = null;
          for (const ie of config.SUPPORTED_IMG_EXT) {
            if (files.includes(basename + ie)) {
              thumbnail = path.join(playlistPath!, basename + ie);
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
            timestamp: metadata.timestamp,
            duration: metadata.duration,
            description,
            thumbnail,
            path: path.join(playlistPath!, file),
            chapters: metadata.chapters,
          };
        })
      );

    const videos = await Promise.all(videoPromises);
    return { videos, title: playlistTitle };
  }

  public async scanAllVideos(rootDir: string): Promise<VideoItem[]> {
    if (!(await fs.pathExists(rootDir))) throw new Error('Directory not found');

    this._setupWatcher(rootDir);
    const results: VideoItem[] = [];

    const walk = async (dir: string): Promise<void> => {
      let items: fs.Dirent[] = [];
      try {
        // withFileTypes: true возвращает Dirent[], это ок
        items = await fs.readdir(dir, { withFileTypes: true });
      } catch (_e) {
        return; // Возвращаем void (Promise<void>)
      }

      const files: string[] = [];
      const folders: string[] = [];

      for (const item of items) {
        if (item.isDirectory()) {
          folders.push(path.join(dir, item.name));
        } else {
          const ext = path.extname(item.name).toLowerCase();
          if (config.SUPPORTED_VIDEO_EXT.includes(ext as any)) {
            files.push(item.name);
          }
        }
      }

      if (files.length > 0) {
        let playlistId: string | null | undefined = null;
        let playlistName = path.basename(dir);

        try {
          // Читаем просто имена файлов для поиска "000 - [ID]"
          const allFiles = await fs.readdir(dir);
          const zeroFile = allFiles.find((f) => f.startsWith('000 - '));
          if (zeroFile) {
            const match = zeroFile.match(/\[([a-zA-Z0-9_-]+)]/);
            if (match) {
              playlistId = match[1];

              const infoPath = path.join(dir, zeroFile);
              if (await fs.pathExists(infoPath)) {
                const metadata = await metadataCache.get(infoPath);
                if (metadata) playlistName = metadata?.fulltitle || metadata?.title || playlistName;
              }
            }
          }
        } catch (_e) {
          /* empty */
        }

        const filePromises = files.map((filename) =>
          this.limit(async () => {
            const itemPath = path.join(dir, filename);
            const ext = path.extname(filename).toLowerCase();
            const basename = path.basename(filename, ext);
            const infoFile = basename + '.info.json';

            let metadata: MinifiedMetadata = {};
            let thumbnail: string | null = null;

            const infoPath = path.join(dir, infoFile);
            if (await fs.pathExists(infoPath)) metadata = await metadataCache.get(infoPath);

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
            } catch (_e) {
              /* empty */
            }

            results.push({
              id: metadata.id || this._extractIdFromFilename(filename),
              filename: filename,
              title: metadata.fulltitle || metadata.title || filename,
              uploader: metadata.uploader,
              upload_date: metadata.upload_date,
              timestamp: metadata.timestamp,
              duration: metadata.duration,
              thumbnail,
              path: itemPath,
              playlistId,
              playlistName,
              ctime,
              chapters: metadata.chapters,
            });
          })
        );

        await Promise.all(filePromises);
      }

      // Рекурсивный вызов. walk возвращает Promise<void>, map -> Promise<void>[], Promise.all -> Promise<void[]>
      // Это корректно, "void return used" быть не должно, если линтер настроен правильно.
      await Promise.all(folders.map((folder) => walk(folder)));
    };

    await walk(rootDir);
    return results;
  }

  private _extractIdFromFilename(filename: string): string | undefined {
    const match = filename.match(/\[([a-zA-Z0-9_-]+)]/);
    return match ? match[1] : undefined;
  }
}

export default new IndexerService();
