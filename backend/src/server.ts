import express, {Request, Response, NextFunction} from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import {config} from './config';
import apiRoutes from './routes/api';
import {PerformanceTimer} from './utils/performance';

const app = express();

app.use(cors());
app.use(express.json());

// Middleware профилирующего таймера
app.use((req: Request, res: Response, next: NextFunction) => {
  const timer = new PerformanceTimer(`${req.method} ${req.url}`);
  res.on('finish', () => {
    timer.end();
  });
  next();
});

app.use('/api', apiRoutes);

const frontendPath = path.join(__dirname, '../frontend-dist'); // Adjust for dist structure if needed, or maintain relative to cwd
app.use(express.static(frontendPath));

app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) return res.status(404).json({error: 'API endpoint not found'});

  if (fs.existsSync(path.join(frontendPath, 'index.html'))) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
  else {
    res.status(404).send('Frontend not found.');
  }
});

export function startServer(port: number = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        console.log(`🚀 Server running on http://localhost:${address.port}`);
        resolve(address.port);
      }
      else {
        reject(new Error('Failed to get server address'));
      }
    });
    server.on('error', reject);
  });
}

// Запуск напрямую, если не импортируется (для отладки)
if (require.main === module) startServer(config.PORT);

export {app};
