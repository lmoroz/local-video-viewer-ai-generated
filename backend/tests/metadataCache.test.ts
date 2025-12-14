import { describe, it, expect, vi, beforeEach } from 'vitest';
// @ts-ignore
import fs from 'fs-extra';

// 1. Мокаем fs-extra
vi.mock('fs-extra');

// 2. Мокаем конфиг
vi.mock('../src/config', () => ({
  config: {
    CACHE_FILE_PATH: '/mock/cache/path.json',
    DEBUG_PERF: false,
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
import metadataCache from '../src/services/metadataCache';

describe('MetadataCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty object if file does not exist (stat fails)', async () => {
    // @ts-ignore
    fs.stat.mockRejectedValue(new Error('ENOENT'));

    const result = await metadataCache.get('/tmp/missing.json');
    expect(result).toEqual({});
  });

  it('should parse valid JSON and cache it', async () => {
    const mockMtime = 123456789;
    // @ts-ignore
    fs.stat.mockResolvedValue({ mtimeMs: mockMtime });

    const validData = {
      id: 'vid1',
      title: 'Test Video',
      duration: 120,
    };
    // @ts-ignore
    fs.readJson.mockResolvedValue(validData);

    const result1 = await metadataCache.get('/tmp/video.info.json');
    expect(result1).toEqual(validData);
    expect(fs.readJson).toHaveBeenCalledTimes(1);

    const result2 = await metadataCache.get('/tmp/video.info.json');
    expect(result2).toEqual(validData);
    expect(fs.readJson).toHaveBeenCalledTimes(1);
  });

  it('should reload from disk if mtime changes', async () => {
    const mockMtime1 = 1000;
    const mockMtime2 = 2000;

    // @ts-ignore
    fs.stat.mockResolvedValueOnce({ mtimeMs: mockMtime1 }).mockResolvedValueOnce({ mtimeMs: mockMtime2 });

    // @ts-ignore
    fs.readJson.mockResolvedValueOnce({ title: 'v1' }).mockResolvedValueOnce({ title: 'v2' });

    await metadataCache.get('/tmp/vid.json');
    const result = await metadataCache.get('/tmp/vid.json');

    expect(result.title).toBe('v2');
    expect(fs.readJson).toHaveBeenCalledTimes(2);
  });

  it('should strip invalid fields using Zod schema', async () => {
    // @ts-ignore
    fs.stat.mockResolvedValue({ mtimeMs: 1 });
    // @ts-ignore
    fs.readJson.mockResolvedValue({
      id: '123',
      dangerousField: 'DROP TABLE',
      title: 'Valid',
    });

    const result = await metadataCache.get('/tmp/safe.json');
    expect(result).toHaveProperty('title', 'Valid');
    expect(result).not.toHaveProperty('dangerousField');
  });
});
