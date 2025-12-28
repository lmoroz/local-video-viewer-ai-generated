import { Request, Response } from 'express';
import indexer from '../services/indexerService';
import path from 'path';
import { ScanQuerySchema, SearchQuerySchema } from '../schemas/common.schema';
import * as searchService from '../services/searchService';
import { logger } from '../utils/logger';

export const getPlaylists = async (req: Request, res: Response) => {
  const validation = ScanQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  const { dir } = validation.data;

  try {
    const playlists = await indexer.scanPlaylists(dir);
    res.json(playlists);
  } catch (err: unknown) {
    const error = err as Error;
    logger.error({ err }, 'Failed to get playlists');
    if (error.message === 'Directory not found') {
      return res.status(404).json({ error: 'Directory not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPlaylistDetails = async (req: Request, res: Response) => {
  const validation = ScanQuerySchema.safeParse(req.query);
  const { id } = req.params;

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  try {
    const result = await indexer.scanPlaylistVideos(validation.data.dir, id);
    if (!result) return res.status(404).json({ error: 'Playlist not found' });

    res.json(result);
  } catch (err) {
    logger.error({ err, playlistId: id }, 'Failed to get playlist details');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const serveFile = (req: Request, res: Response) => {
  const filePath = req.query.path;

  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).send('Missing path');
  }

  res.sendFile(path.resolve(filePath), (err) => {
    if (err && !res.headersSent) {
      // Это не всегда ошибка сервера (клиент прервал загрузку), логируем как warn
      logger.warn({ err, filePath }, 'File serve interrupted or missing');
      res.status(404).send('File not found or access denied');
    }
  });
};

export const getAllVideos = async (req: Request, res: Response) => {
  const validation = ScanQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0].message });
  }

  try {
    const videos = await indexer.scanAllVideos(validation.data.dir);

    videos.sort((a, b) => {
      const dateA = a.upload_date || '';
      const dateB = b.upload_date || '';
      if (dateA && dateB) {
        return dateB.localeCompare(dateA);
      }
      if (!dateA && !dateB) return (b.ctime || 0) - (a.ctime || 0);
      return dateA ? -1 : 1;
    });

    res.json(videos);
  } catch (err: unknown) {
    const error = err as Error;
    logger.error({ err }, 'Failed to scan all videos');
    if (error.message === 'Directory not found') return res.status(404).json({ error: 'Directory not found' });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const search = async (req: Request, res: Response) => {
  const validation = SearchQuerySchema.safeParse(req.query);

  if (!validation.success) return res.status(400).json({ error: validation.error.issues[0].message });

  const { dir, query } = validation.data;

  try {
    const allVideos = await indexer.scanAllVideos(dir);
    const results = searchService.searchVideos(allVideos, query);

    res.json(results);
  } catch (err) {
    logger.error({ err, query }, 'Search failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};
