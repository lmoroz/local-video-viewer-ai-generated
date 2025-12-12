const fs = require('fs-extra');
const path = require('path');
const pLimit = require('p-limit').default;
const config = require('../config'); // Импортируем конфиг

class IndexerService {
  constructor() {
    this.limit = pLimit(50);
  }

  async scanPlaylists(dirPath) {
    if (!await fs.pathExists(dirPath)) throw new Error('Directory not found');

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
        try {
          const infoData = await fs.readJson(path.join(itemPath, infoFile));
          id = infoData.id;
          title = infoData.title || title;
          uploader = infoData.uploader || uploader;
        } catch (e) {}

        const basename = path.basename(infoFile, '.info.json');
        // ИСПОЛЬЗУЕМ КОНФИГ
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
          try {
            const vData = await fs.readJson(path.join(itemPath, vInfo));
            if (vData.duration) totalDuration += vData.duration;
          } catch (e) {}
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
    const items = await fs.readdir(dirPath);
    let playlistPath = null;

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
      try {
        const d = await fs.readJson(path.join(playlistPath, plInfoFile));
        if (d.title) playlistTitle = d.title;
      } catch (e) {}
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

        const [metaDataResult, descResult] = await Promise.all([
          fs.pathExists(path.join(playlistPath, infoFile)).then(exists =>
            exists ? fs.readJson(path.join(playlistPath, infoFile)).catch(() => ({})) : {},
          ),
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
          const allFiles = await fs.readdir(dir);
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
          if (await fs.pathExists(infoPath)) {
            try { metadata = await fs.readJson(infoPath); } catch (e) {}
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
