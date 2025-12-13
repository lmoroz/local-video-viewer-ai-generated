import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';

dotenv.config({quiet: true});

// Определяем базовую директорию для данных
// В Electron (prod) это будет C:\Users\User\AppData\Roaming\LocalVideoViewer
// В Dev это будет корень проекта
const DATA_ROOT = process.env.APP_USER_DATA || process.cwd();

// Убедимся, что папка cache существует внутри DATA_ROOT
const CACHE_DIR = path.join(DATA_ROOT, 'cache');
fs.ensureDirSync(CACHE_DIR);

export const config = {
  PORT: Number(process.env.PORT) || 3000,
  DEBUG_PERF: process.env.DEBUG_PERF === 'true',
  SUPPORTED_VIDEO_EXT: ['.mp4', '.mkv', '.webm'] as const,
  SUPPORTED_IMG_EXT: ['.webp', '.jpg', '.jpeg', '.png'] as const,
  // Путь к кэшу теперь безопасен для Windows
  CACHE_FILE_PATH: path.join(CACHE_DIR, 'metadata-store.json'),
  DATA_ROOT, // Экспортируем корень, пригодится для логгера
};
