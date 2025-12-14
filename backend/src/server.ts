import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import apiRoutes from './routes/api';
import { PerformanceTimer } from './utils/performance';
import { logger, requestLogger } from './utils/logger';
import metadataCache from './services/metadataCache';
import indexerService from './services/indexerService';
import http from 'http';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger); // Pino HTTP logger

// Middleware профилирующего таймера
app.use((req: Request, res: Response, next: NextFunction) => {
  if (config.DEBUG_PERF) {
    const timer = new PerformanceTimer(`${req.method} ${req.url}`);
    res.on('finish', () => timer.end());
  }
  next();
});

app.use('/api', apiRoutes);

const frontendPath = path.join(__dirname, '../frontend-dist');
app.use(express.static(frontendPath));

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API endpoint not found' });

  if (fs.existsSync(path.join(frontendPath, 'index.html'))) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).send('Frontend not found.');
  }
});

let server: http.Server;

function startServer(port: number = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    server = app.listen(port, () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        logger.info({ port: address.port }, '🚀 Server running');
        resolve(address.port);
      } else {
        reject(new Error('Failed to get server address'));
      }
    });
    server.on('error', reject);
  });
}

// Graceful Shutdown Logic
async function shutdown(signal: string) {
  logger.info({ signal }, '🛑 Received termination signal. Shutting down gracefully...');

  if (server) {
    server.close(() => {
      logger.info('🔌 HTTP server closed.');
    });
  }

  try {
    await indexerService.stop(); // Stop watchers
    await metadataCache.saveToDisk(); // Save cache
    logger.info('💾 State saved successfully.');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, '❌ Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) startServer(config.PORT);

export { app, startServer };
