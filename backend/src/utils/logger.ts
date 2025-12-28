import pino from 'pino';
import { Request } from 'express';
import path from 'path';
import fs from 'fs-extra';
import pinoHttp from 'pino-http';
import pretty from 'pino-pretty';
import { Writable } from 'stream';
import { config } from '../config'; // Импортируем конфиг, чтобы взять DATA_ROOT

const isDev = process.env.NODE_ENV !== 'production';

// Используем DATA_ROOT из конфига
const logDir = path.join(config.DATA_ROOT, 'logs');
fs.ensureDirSync(logDir);

const logFilePath = path.join(logDir, 'app.log');

// 1. Создаем адаптер для console.log
const consoleLogStream = new Writable({
  write(chunk, encoding, callback) {
    const line = chunk.toString();
    console.log(line.trimEnd());
    callback();
  },
});

// 2. Настраиваем pino-pretty
// Передаем destination внутри объекта настроек
const prettyStream = pretty({
  colorize: true,
  translateTime: 'SYS:standard',
  ignore: 'pid,hostname',
  sync: true,
  destination: consoleLogStream, // <--- Перенесли сюда
});

const streams = [
  // Файл пишем всегда
  {
    stream: fs.createWriteStream(logFilePath, { flags: 'a' }),
  },
  // Консоль добавляем только в Dev-режиме
  ...(isDev && config.DEBUG_PERF ? [{ stream: prettyStream }] : []),
];

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: { pid: process.pid },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream(streams)
);

export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req: Request) => req.url?.startsWith('/file'),
  },
});
