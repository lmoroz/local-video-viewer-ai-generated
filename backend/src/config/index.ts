import dotenv from 'dotenv';
import path from 'path';

dotenv.config({quiet: true});

export const config = {
  PORT: Number(process.env.PORT) || 3000,
  DEBUG_PERF: process.env.DEBUG_PERF === 'true',
  SUPPORTED_VIDEO_EXT: ['.mp4', '.mkv', '.webm'] as const,
  SUPPORTED_IMG_EXT: ['.webp', '.jpg', '.jpeg', '.png'] as const,
  CACHE_FILE_PATH: path.join(process.cwd(), 'cache', 'metadata-store.json'),
};
