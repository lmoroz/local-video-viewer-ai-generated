import { z } from 'zod';

const ChapterSchema = z.object({
  start_time: z.number(),
  end_time: z.number(),
  title: z.string(),
});

export type Chapter = z.infer<typeof ChapterSchema>;

// Схема оптимизированных метаданных для кэша и UI
export const MinifiedMetadataSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  fulltitle: z.string().optional(),
  uploader: z.string().optional(),
  upload_date: z.string().optional(),
  timestamp: z.number().optional(),
  duration: z.number().optional(),
  uploader_url: z.string().optional(),
  channel_url: z.string().optional(),
  chapters: z.array(ChapterSchema).optional(),
});

export type MinifiedMetadata = z.infer<typeof MinifiedMetadataSchema>;

// Схема ответа API для списка видео
export const VideoItemSchema = MinifiedMetadataSchema.extend({
  filename: z.string(),
  thumbnail: z.string().nullable(),
  path: z.string(),
  playlistId: z.string().nullable().optional(),
  playlistName: z.string().optional(),
  ctime: z.number().optional(),
  timestamp: z.number().optional(),
  description: z.string().optional(),
});

export type VideoItem = z.infer<typeof VideoItemSchema>;

// Схема для Плейлиста
export const PlaylistSchema = z.object({
  id: z.string().nullable(),
  name: z.string(),
  title: z.string(),
  cover: z.string().nullable(),
  videoCount: z.number(),
  totalDuration: z.number(),
  uploader: z.string(),
  updatedAt: z.number(),
});

export type Playlist = z.infer<typeof PlaylistSchema>;

// Валидация Query параметров
export const ScanQuerySchema = z.object({
  dir: z.string().min(1, 'Directory path is required'),
});

export const SearchQuerySchema = ScanQuerySchema.extend({
  query: z.string().min(1, 'Query string is required'),
});
