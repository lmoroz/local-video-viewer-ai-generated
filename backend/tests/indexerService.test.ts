import { describe, it, expect, vi, beforeEach } from 'vitest';
// @ts-ignore
import path from 'path';

// 1. Используем vi.hoisted для создания переменных, доступных внутри фабрики vi.mock
const { mockMetadataCache } = vi.hoisted(() => {
  return {
    mockMetadataCache: {
      get: vi.fn(),
      remove: vi.fn(),
    },
  };
});

// 2. Мокаем зависимости
vi.mock('fs-extra');

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// 3. !!! ВАЖНО: Мокаем логгер, чтобы он не пытался создать реальные стримы через замоканный fs
vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  requestLogger: vi.fn((req, res, next) => next()),
}));

// Импортируем тестируемый модуль ПОСЛЕ моков
vi.mock('../src/services/metadataCache', () => ({
  default: mockMetadataCache,
}));

vi.mock('../src/config', () => ({
  config: {
    SUPPORTED_VIDEO_EXT: ['.mp4', '.mkv'],
    SUPPORTED_IMG_EXT: ['.jpg', '.png'],
    DEBUG_PERF: false,
  },
}));

// 3. Импорты (теперь безопасны)
import indexerService from '../src/services/indexerService';
// @ts-ignore
import fs from 'fs-extra';

describe('IndexerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('scanAllVideos', () => {
    it('should throw error if directory does not exist', async () => {
      // @ts-ignore
      fs.pathExists.mockResolvedValue(false);

      await expect(indexerService.scanAllVideos('/bad/path')).rejects.toThrow('Directory not found');
    });

    it('should scan videos and merge with metadata', async () => {
      const rootDir = '/videos';

      // @ts-ignore
      fs.pathExists.mockResolvedValue(true);

      const mockDirents = [
        { name: 'movie.mp4', isDirectory: () => false },
        { name: 'movie.info.json', isDirectory: () => false },
        { name: 'subfolder', isDirectory: () => true },
      ];
      // @ts-ignore
      fs.readdir.mockImplementation(async (pathArg) => {
        if (pathArg === rootDir) return mockDirents;
        return [];
      });

      // @ts-ignore
      fs.stat.mockResolvedValue({ ctimeMs: 1000 });

      mockMetadataCache.get.mockResolvedValue({
        id: '123',
        title: 'Cached Title',
        uploader: 'Tester',
      });

      const results = await indexerService.scanAllVideos(rootDir);

      expect(results).toHaveLength(1);
      const video = results[0];

      expect(video.filename).toBe('movie.mp4');
      expect(video.title).toBe('Cached Title');
      expect(video.uploader).toBe('Tester');
      expect(video.path).toBe(path.join(rootDir, 'movie.mp4'));

      expect(mockMetadataCache.get).toHaveBeenCalledWith(path.join(rootDir, 'movie.info.json'));
    });

    it('should extract ID from filename if no metadata found', async () => {
      const rootDir = '/videos';
      // @ts-ignore
      fs.pathExists.mockResolvedValue(true);
      // @ts-ignore
      fs.readdir.mockResolvedValue([{ name: 'video [ABC-123].mp4', isDirectory: () => false }]);
      // @ts-ignore
      fs.stat.mockResolvedValue({ ctimeMs: 0 });

      mockMetadataCache.get.mockResolvedValue({});

      const results = await indexerService.scanAllVideos(rootDir);

      expect(results[0].id).toBe('ABC-123');
      expect(results[0].title).toBe('video [ABC-123].mp4');
    });
  });

  describe('scanPlaylists', () => {
    it('should identify folder as playlist if it contains video files', async () => {
      const rootDir = path.normalize('/library');
      const playlistName = 'Knitting Course';
      const playlistDir = path.join(rootDir, playlistName);

      // Имена файлов для теста
      const infoFile = '000 - meta.info.json';
      const coverFile = '000 - meta.jpg'; // Имя должно совпадать с infoFile

      // @ts-ignore
      fs.pathExists.mockResolvedValue(true);

      // @ts-ignore
      fs.readdir.mockImplementation(async (p) => {
        if (p === rootDir) return [playlistName];

        // Возвращаем правильный набор файлов
        if (p === playlistDir) return [infoFile, coverFile, '001.mp4', '002.mp4'];

        return [];
      });

      // @ts-ignore
      fs.stat.mockImplementation(async (p) => {
        if (p === playlistDir) return { isDirectory: () => true, mtimeMs: 500 };
        return { isDirectory: () => false };
      });

      // Кэш должен вернуть что-то для infoFile, чтобы сервис не упал (опционально)
      mockMetadataCache.get.mockResolvedValue({});

      const playlists = await indexerService.scanPlaylists(rootDir);

      expect(playlists).toHaveLength(1);
      expect(playlists[0].name).toBe(playlistName);
      expect(playlists[0].videoCount).toBe(2);
      // Проверяем, что обложка нашлась по правильному пути
      expect(playlists[0].cover).toBe(path.join(playlistDir, coverFile));
    });

    it('should parse playlist metadata from 000 - file', async () => {
      const rootDir = '/library';
      const playlistDir = path.join(rootDir, 'Course [ID1]');

      // @ts-ignore
      fs.pathExists.mockResolvedValue(true);

      // @ts-ignore
      fs.readdir.mockImplementation(async (p) => {
        if (p === rootDir) return ['Course [ID1]'];
        if (p === playlistDir) return ['000 - [ID1].info.json', 'video.mp4'];
        return [];
      });

      // @ts-ignore
      fs.stat.mockResolvedValue({ isDirectory: () => true, mtimeMs: 0 });

      mockMetadataCache.get.mockImplementation(async (filepath: any) => {
        if (typeof filepath === 'string' && filepath.includes('000 - [ID1].info.json')) {
          return { title: 'Full Course Title', uploader: 'Prof' };
        }
        return {};
      });

      const playlists = await indexerService.scanPlaylists(rootDir);

      expect(playlists[0].title).toBe('Full Course Title');
      expect(playlists[0].id).toBe('ID1');
      expect(playlists[0].uploader).toBe('Prof');
    });
  });
});
