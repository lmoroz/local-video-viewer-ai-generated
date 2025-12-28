#!/usr/bin/env node

/**
 * Скрипт для обработки вручную скачанных курсов
 * Преобразует их в формат, совместимый с video-viewer
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');

// ============================================================================
// Конфигурация
// ============================================================================

const CONFIG = {
  videoExtensions: ['.mp4', '.mkv', '.avi', '.mov', '.webm'],
  numberingPattern: /^\d+[\s.\-_]+/,
  uploader: 'Manual Import',
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
};

// ============================================================================
// Утилиты
// ============================================================================

/**
 * Генерирует детерминированный ID на основе строки
 */
function generateId(str) {
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 11);
}

/**
 * Удаляет нумерацию из начала строки
 */
function removeNumbering(str) {
  return str.replace(CONFIG.numberingPattern, '').trim();
}

/**
 * Проверяет, является ли файл видео
 */
function isVideoFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return CONFIG.videoExtensions.includes(ext);
}

/**
 * Логирование
 */
function log(message, level = 'info') {
  if (level === 'verbose' && !CONFIG.verbose) return;
  
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗',
    verbose: '→',
  }[level] || '•';
  
  console.log(`${prefix} ${message}`);
}

/**
 * Получает длительность видео в секундах через ffprobe
 */
function getVideoDuration(videoPath) {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: 'utf-8' }
    );
    return parseFloat(output.trim());
  } catch (error) {
    log(`Ошибка получения длительности для ${path.basename(videoPath)}: ${error.message}`, 'error');
    return 0;
  }
}

/**
 * Извлекает первый кадр видео в webp
 */
async function extractThumbnail(videoPath, outputPath) {
  if (CONFIG.dryRun) {
    log(`[DRY-RUN] Извлечение обложки: ${path.basename(outputPath)}`, 'verbose');
    return;
  }

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', 'select=eq(n\\,0),scale=1280:-1',
      '-q:v', '2',
      '-f', 'webp',
      '-y',
      outputPath
    ], { stdio: 'pipe' });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        log(`Обложка создана: ${path.basename(outputPath)}`, 'verbose');
        resolve();
      } else {
        reject(new Error(`ffmpeg завершился с кодом ${code}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Ищет файл субтитров для видео
 */
async function findSubtitle(videoPath) {
  const dir = path.dirname(videoPath);
  const ext = path.extname(videoPath);
  const basename = path.basename(videoPath, ext);
  
  // Варианты названий субтитров
  const candidates = [
    `${basename}.vtt`,
    `${basename}.srt`,
    `${basename} English.vtt`, // Специфично для этого курса
    `${basename} English.srt`,
    `${basename}.en.vtt`,
    `${basename}.en.srt`
  ];

  for (const name of candidates) {
    const subPath = path.join(dir, name);
    try {
      await fs.access(subPath);
      return subPath;
    } catch {}
  }
  
  return null;
}

/**
 * Сливает несколько видео в одно с chapters и субтитрами
 */
async function mergeVideosWithChapters(videos, outputPath, courseDir) {
  if (CONFIG.dryRun) {
    log(`[DRY-RUN] Слияние ${videos.length} видео с субтитрами в: ${path.basename(outputPath)}`, 'verbose');
    return { duration: 0, chapters: [] };
  }

  const tempFiles = []; // Временные файлы с вшитыми субтитрами

  try {
    // Подготовка списка файлов для слияния
    const listPath = path.join(courseDir, '.concat-list.txt');
    
    const listLines = [];
    
    for (const video of videos) {
      const subPath = await findSubtitle(video.path);
      let inputPath = video.path;

      // Если есть субтитры, муксим их во временный файл перед слиянием
      if (subPath) {
        log(`Вшивание субтитров для: ${video.name}`, 'verbose');
        const tempMkv = path.join(courseDir, `.temp-${generateId(video.name)}.mkv`);
        
        // ffmpeg -i video -i sub -map 0 -map 1 -c copy -c:s copy ...
        // Используем webvtt или srt
        try {
          execSync(
            `ffmpeg -i "${video.path}" -i "${subPath}" -map 0 -map 1 -c copy -c:s copy -metadata:s:s:0 language=eng -y "${tempMkv}"`,
            { stdio: 'pipe' }
          );
          inputPath = tempMkv;
          tempFiles.push(tempMkv);
        } catch (e) {
          log(`Ошибка вшивания субтитров для ${video.name}, используем оригинал: ${e.message}`, 'warn');
        }
      }

      const absPath = path.resolve(inputPath).replace(/\\/g, '/');
      listLines.push(`file '${absPath}'`);
    }
    
    await fs.writeFile(listPath, listLines.join('\n'), 'utf-8');

    // Сливаем видео в MKV (поддерживает любые кодеки, chapters и субтитры)
    execSync(
      `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${outputPath}"`,
      { stdio: 'pipe' }
    );

    // Вычисляем chapters (тайминги субтитров ffmpeg обрабатывает сам при concat!)
    let currentTime = 0;
    const chapters = [];

    for (const video of videos) {
      const duration = getVideoDuration(video.path);
      const title = removeNumbering(path.parse(video.path).name);
      
      chapters.push({
        start_time: currentTime,
        end_time: currentTime + duration,
        title: title,
      });

      currentTime += duration;
    }

    // Удаляем временный файл списка
    await fs.unlink(listPath);
    
    // Удаляем временные файлы с субтитрами
    for (const temp of tempFiles) {
      await fs.unlink(temp).catch(() => {});
    }

    log(`Видео объединено: ${path.basename(outputPath)} (${chapters.length} глав)`, 'verbose');
    return { duration: currentTime, chapters };

  } catch (error) {
    // Чистим за собой в случае ошибки
    const listPath = path.join(courseDir, '.concat-list.txt');
    await fs.unlink(listPath).catch(() => {});
    for (const temp of tempFiles) {
      await fs.unlink(temp).catch(() => {});
    }
    throw error;
  }
}

// ============================================================================
// Основная логика
// ============================================================================

/**
 * Сканирует директорию и возвращает структуру курса
 */
async function scanCourseDirectory(courseDir) {
  const entries = await fs.readdir(courseDir, { withFileTypes: true });
  
  const videos = [];
  const nestedFolders = [];
  const otherFiles = [];

  for (const entry of entries) {
    const fullPath = path.join(courseDir, entry.name);

    if (entry.isFile()) {
      if (isVideoFile(entry.name)) {
        videos.push({
          path: fullPath,
          name: entry.name,
          basename: path.parse(entry.name).name,
        });
      } else {
        otherFiles.push(fullPath);
      }
    } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
      // Проверяем, содержит ли папка видео
      const nestedEntries = await fs.readdir(fullPath, { withFileTypes: true });
      const hasVideos = nestedEntries.some(e => e.isFile() && isVideoFile(e.name));
      
      if (hasVideos) {
        const nestedVideos = nestedEntries
          .filter(e => e.isFile() && isVideoFile(e.name))
          .map(e => ({
            path: path.join(fullPath, e.name),
            name: e.name,
            basename: path.parse(e.name).name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        nestedFolders.push({
          path: fullPath,
          name: entry.name,
          videos: nestedVideos,
          hasOnlyVideos: nestedEntries.every(e => e.isFile() && isVideoFile(e.name)),
        });
      }
    }
  }

  // Сортируем видео по имени (с учётом нумерации)
  videos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return { videos, nestedFolders, otherFiles };
}

/**
 * Создаёт .info.json для плейлиста
 */
async function createPlaylistInfo(courseDir, courseName) {
  const playlistId = generateId(courseName);
  const playlistInfo = {
    id: playlistId,
    title: courseName,
    _type: 'playlist',
    uploader: CONFIG.uploader,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const filename = `000 - ${courseName} [${playlistId}].info.json`;
  const filepath = path.join(courseDir, filename);

  if (!CONFIG.dryRun) {
    await fs.writeFile(filepath, JSON.stringify(playlistInfo, null, 2), 'utf-8');
  }

  log(`Создан .info.json для плейлиста: ${filename}`, 'info');
  return playlistId;
}

/**
 * Создаёт .info.json для видео
 */
async function createVideoInfo(courseDir, videoBasename, index, duration, chapters = null) {
  const cleanTitle = removeNumbering(videoBasename);
  const videoId = generateId(`${courseDir}/${videoBasename}`);
  
  const videoInfo = {
    id: videoId,
    title: cleanTitle,
    duration: duration,
    uploader: CONFIG.uploader,
    timestamp: Math.floor(Date.now() / 1000),
  };

  if (chapters && chapters.length > 0) {
    videoInfo.chapters = chapters;
  }

  const paddedIndex = String(index).padStart(3, '0');
  const filename = `${paddedIndex} - ${cleanTitle} [${videoId}].info.json`;
  const filepath = path.join(courseDir, filename);

  if (!CONFIG.dryRun) {
    await fs.writeFile(filepath, JSON.stringify(videoInfo, null, 2), 'utf-8');
  }

  log(`Создан .info.json для видео: ${filename}`, 'verbose');
  return { filename, videoId };
}

/**
 * Проверяет, обработан ли курс полностью
 */
async function checkCourseStatus(courseDir, courseName) {
  const entries = await fs.readdir(courseDir, { withFileTypes: true });
  const playlistId = generateId(courseName);
  
  // Проверяем наличие playlist .info.json
  const playlistInfoFile = `000 - ${courseName} [${playlistId}].info.json`;
  const playlistInfoPath = path.join(courseDir, playlistInfoFile);
  
  try {
    await fs.access(playlistInfoPath);
  } catch {
    return { isComplete: false, hasPlaylistInfo: false, missingItems: [] };
  }
  
  // Собираем все видео файлы (включая уже обработанные с префиксом 001-NNN)
  const videos = [];
  const nestedFolders = [];
  
  for (const entry of entries) {
    const fullPath = path.join(courseDir, entry.name);
    
    if (entry.isFile() && isVideoFile(entry.name)) {
      videos.push({
        path: fullPath,
        name: entry.name,
        basename: path.parse(entry.name).name,
      });
    } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const nestedEntries = await fs.readdir(fullPath, { withFileTypes: true });
      const hasVideos = nestedEntries.some(e => e.isFile() && isVideoFile(e.name));
      if (hasVideos) {
        nestedFolders.push({ name: entry.name, path: fullPath });
      }
    }
  }
  
  const totalExpectedVideos = videos.length + nestedFolders.length;
  const missingItems = [];
  
  // Проверяем наличие .info.json и .webp для каждого ожидаемого видео
  let foundVideoCount = 0;
  for (let i = 1; i <= totalExpectedVideos; i++) {
    const paddedIndex = String(i).padStart(3, '0');
    const pattern = new RegExp(`^${paddedIndex} - .+\\[.+\\]\\.info\\.json$`);
    const hasInfoJson = entries.some(e => e.isFile() && pattern.test(e.name));
    
    const thumbPattern = new RegExp(`^${paddedIndex} - .+\\[.+\\]\\.webp$`);
    const hasThumbnail = entries.some(e => e.isFile() && thumbPattern.test(e.name));
    
    if (hasInfoJson && hasThumbnail) {
      foundVideoCount++;
    } else {
      missingItems.push({
        index: i,
        hasInfoJson,
        hasThumbnail,
      });
    }
  }
  
  // Проверяем обложку курса
  const courseThumbFile = `000 - ${courseName} [${playlistId}].webp`;
  const courseThumbPath = path.join(courseDir, courseThumbFile);
  let hasCourseThumbnail = false;
  try {
    await fs.access(courseThumbPath);
    hasCourseThumbnail = true;
  } catch {}
  
  const isComplete = (
    foundVideoCount === totalExpectedVideos &&
    hasCourseThumbnail &&
    nestedFolders.length === 0  // Все вложенные папки должны быть обработаны
  );
  
  return {
    isComplete,
    hasPlaylistInfo: true,
    totalExpectedVideos,
    foundVideoCount,
    hasCourseThumbnail,
    hasNestedFolders: nestedFolders.length > 0,
    missingItems,
  };
}

/**
 * Обрабатывает один курс
 */
async function processCourse(courseDir) {
  const courseName = path.basename(courseDir);
  log(`\n${'='.repeat(60)}\nОбработка курса: ${courseName}\n${'='.repeat(60)}`, 'info');

  // Проверяем статус обработки курса
  const status = await checkCourseStatus(courseDir, courseName);
  
  if (status.isComplete) {
    log(`⏭  Курс уже полностью обработан, пропускаем\n`, 'info');
    return;
  }
  
  if (status.hasPlaylistInfo && status.foundVideoCount > 0) {
    log(`↻ Курс частично обработан (${status.foundVideoCount}/${status.totalExpectedVideos} видео), доделываем недостающее`, 'info');
  }

  const structure = await scanCourseDirectory(courseDir);
  
  // Создаём .info.json для плейлиста (если ещё не создан)
  let playlistId;
  if (!status.hasPlaylistInfo) {
    playlistId = await createPlaylistInfo(courseDir, courseName);
  } else {
    playlistId = generateId(courseName);
    log(`Playlist .info.json уже существует`, 'verbose');
  }

  let videoIndex = 1;
  const processedVideos = [];

  // Обрабатываем вложенные папки
  for (const folder of structure.nestedFolders) {
    const mergedBasename = removeNumbering(folder.name);
    const mergedFilename = `${String(videoIndex).padStart(3, '0')} - ${mergedBasename}.mkv`;
    const mergedPath = path.join(courseDir, mergedFilename);
    const videoId = generateId(`${courseDir}/${mergedBasename}`);
    const infoFilename = `${String(videoIndex).padStart(3, '0')} - ${mergedBasename} [${videoId}].info.json`;
    const infoPath = path.join(courseDir, infoFilename);
    const thumbnailFilename = `${String(videoIndex).padStart(3, '0')} - ${mergedBasename} [${videoId}].webp`;
    const thumbnailPath = path.join(courseDir, thumbnailFilename);
    
    // Проверяем, обработана ли уже эта папка
    const alreadyMerged = fsSync.existsSync(mergedPath);
    const hasInfo = fsSync.existsSync(infoPath);
    const hasThumbnail = fsSync.existsSync(thumbnailPath);
    
    // Функция очистки исходных файлов
    const cleanupFolderFiles = async () => {
      if (CONFIG.dryRun) return;
      
      // Защита: проверяем, что merged файл существует и имеет размер > 0
      if (!fsSync.existsSync(mergedPath) || fsSync.statSync(mergedPath).size === 0) {
        log(`⚠ Пропуск очистки: целевой файл ${mergedFilename} не найден или пуст`, 'warn');
        return;
      }

      log(`Очистка исходных файлов в: ${folder.name}`, 'verbose');
      
      for (const video of folder.videos) {
        try {
          if (fsSync.existsSync(video.path)) await fs.unlink(video.path);
          
          const subPath = await findSubtitle(video.path);
          if (subPath && fsSync.existsSync(subPath)) await fs.unlink(subPath);
          
          const descPath = video.path.replace(path.extname(video.path), '.description');
          if (fsSync.existsSync(descPath)) await fs.unlink(descPath);
        } catch (e) {
          log(`Ошибка удаления файлов для ${video.name}: ${e.message}`, 'warn');
        }
      }

      // Пытаемся удалить папку, если она пуста
      try {
        await fs.rmdir(folder.path);
        log(`Удалена пустая папка: ${folder.name}`, 'verbose');
      } catch (e) {
        log(`Папка оставлена (содержит другие файлы): ${folder.name}`, 'verbose');
      }
    };

    if (alreadyMerged && hasInfo && hasThumbnail) {
      log(`⏭  Вложенная папка "${folder.name}" уже обработана, пропускаем`, 'verbose');
      await cleanupFolderFiles();
      processedVideos.push({ path: mergedPath, thumbnailPath });
      videoIndex++;
      continue;
    }
    
    log(`\nОбработка вложенной папки: ${folder.name} (${folder.videos.length} видео)`, 'info');

    // Сливаем видео с chapters (если ещё не слито)
    let duration, chapters;
    if (!alreadyMerged) {
      const result = await mergeVideosWithChapters(folder.videos, mergedPath, courseDir);
      duration = result.duration;
      chapters = result.chapters;
    } else {
      duration = getVideoDuration(mergedPath);
      // Если видео уже слито, chapters не вычисляем (требуется оригинальные видео)
      chapters = null;
      log(`Видео уже объединено, пропускаем слияние`, 'verbose');
    }

    // Создаём .info.json (если ещё не создан)
    if (!hasInfo) {
      await createVideoInfo(courseDir, mergedBasename, videoIndex, duration, chapters);
    } else {
      log(`.info.json уже существует для видео ${videoIndex}`, 'verbose');
    }

    // Извлекаем обложку (если ещё не извлечена)
    if (!hasThumbnail) {
      const sourceVideo = alreadyMerged ? mergedPath : folder.videos[0].path;
      await extractThumbnail(sourceVideo, thumbnailPath);
    } else {
      log(`Обложка уже существует для видео ${videoIndex}`, 'verbose');
    }

    processedVideos.push({ path: mergedPath, thumbnailPath });

    // Очищаем исходники
    await cleanupFolderFiles();

    videoIndex++
  }

  // Обрабатываем видео в корне курса
  for (const video of structure.videos) {
    // Проверяем, существует ли ещё исходный файл (мог быть удалён как часть вложенной папки)
    if (!fsSync.existsSync(video.path)) {
      log(`⏭  Видео "${video.name}" не существует (возможно, было частью объединённой папки), пропускаем`, 'verbose');
      continue;
    }
    
    const cleanBasename = removeNumbering(video.basename);
    const newFilename = `${String(videoIndex).padStart(3, '0')} - ${cleanBasename}${path.extname(video.name)}`;
    const newPath = path.join(courseDir, newFilename);
    const videoId = generateId(`${courseDir}/${cleanBasename}`);
    const infoFilename = `${String(videoIndex).padStart(3, '0')} - ${cleanBasename} [${videoId}].info.json`;
    const infoPath = path.join(courseDir, infoFilename);
    const thumbnailFilename = `${String(videoIndex).padStart(3, '0')} - ${cleanBasename} [${videoId}].webp`;
    const thumbnailPath = path.join(courseDir, thumbnailFilename);
    
    // Проверяем, обработано ли уже это видео
    const hasInfo = fsSync.existsSync(infoPath);
    const hasThumbnail = fsSync.existsSync(thumbnailPath);
    const isRenamed = fsSync.existsSync(newPath);
    
    if (hasInfo && hasThumbnail && isRenamed) {
      log(`⏭  Видео "${cleanBasename}" уже обработано, пропускаем`, 'verbose');
      processedVideos.push({ path: newPath, thumbnailPath });
      videoIndex++;
      continue;
    }
    
    log(`Обработка видео: ${video.name}`, 'verbose');
    
    // Переименовываем видео с нумерацией (если ещё не переименовано)
    let actualPath = video.path;
    if (!CONFIG.dryRun && video.path !== newPath && !isRenamed) {
      await fs.rename(video.path, newPath);
      actualPath = newPath;
    } else if (isRenamed) {
      actualPath = newPath;
    }
    
    // Переименовываем .description файл, если он существует
    const oldDescriptionPath = video.path.replace(path.extname(video.path), '.description');
    const newDescriptionFilename = `${String(videoIndex).padStart(3, '0')} - ${cleanBasename} [${videoId}].description`;
    const newDescriptionPath = path.join(courseDir, newDescriptionFilename);
    
    if (fsSync.existsSync(oldDescriptionPath) && oldDescriptionPath !== newDescriptionPath) {
      if (!CONFIG.dryRun) {
        await fs.rename(oldDescriptionPath, newDescriptionPath);
        log(`Переименован .description: ${path.basename(newDescriptionFilename)}`, 'verbose');
      } else {
        log(`[DRY-RUN] Переименование .description: ${path.basename(newDescriptionFilename)}`, 'verbose');
      }
    }

    // Переименовываем субтитры, если они существуют (для плоской структуры)
    const subPath = await findSubtitle(video.path);
    if (subPath) {
      const subExt = path.extname(subPath);
      // Если название заканчивалось на " English.vtt", можно попробовать сохранить метку языка,
      // но для простоты переименуем в [NNN] - [Title] [ID].vtt, плееры это понимают.
      const newSubFilename = `${String(videoIndex).padStart(3, '0')} - ${cleanBasename} [${videoId}]${subExt}`;
      const newSubPath = path.join(courseDir, newSubFilename);

      if (subPath !== newSubPath) {
        if (!CONFIG.dryRun) {
          await fs.rename(subPath, newSubPath);
          log(`Переименованы субтитры: ${path.basename(newSubFilename)}`, 'verbose');
        } else {
          log(`[DRY-RUN] Переименование субтитров: ${path.basename(newSubFilename)}`, 'verbose');
        }
      }
    }
    
    const duration = getVideoDuration(actualPath);

    // Создаём .info.json (если ещё не создан)
    if (!hasInfo) {
      await createVideoInfo(courseDir, cleanBasename, videoIndex, duration);
    } else {
      log(`.info.json уже существует для видео ${videoIndex}`, 'verbose');
    }

    // Извлекаем обложку (если ещё не извлечена)
    if (!hasThumbnail) {
      await extractThumbnail(actualPath, thumbnailPath);
    } else {
      log(`Обложка уже существует для видео ${videoIndex}`, 'verbose');
    }

    processedVideos.push({ path: newPath, thumbnailPath });
    videoIndex++;
  }

  // Создаём обложку для курса (копия первого видео)
  if (processedVideos.length > 0) {
    const courseThumb = `000 - ${courseName} [${playlistId}].webp`;
    const courseThumbPath = path.join(courseDir, courseThumb);
    
    if (!fsSync.existsSync(courseThumbPath)) {
      if (!CONFIG.dryRun) {
        await fs.copyFile(processedVideos[0].thumbnailPath, courseThumbPath);
      }
      log(`Создана обложка курса: ${courseThumb}`, 'info');
    } else {
      log(`Обложка курса уже существует`, 'verbose');
    }
  }

  log(`\n✓ Курс обработан: ${courseName} (${processedVideos.length} видео)\n`, 'info');
}

/**
 * Главная функция
 */
async function main() {
  const targetDir = process.argv[2] || './sample';
  
  try {
    await fs.access(targetDir);
  } catch {
    console.error(`Ошибка: директория не найдена: ${targetDir}`);
    process.exit(1);
  }

  log(`Начало обработки курсов в: ${targetDir}\n`, 'info');
  if (CONFIG.dryRun) {
    log('РЕЖИМ DRY-RUN: изменения не будут применены', 'warn');
  }

  // Проверяем наличие ffmpeg
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    execSync('ffprobe -version', { stdio: 'pipe' });
  } catch (error) {
    console.error('Ошибка: ffmpeg не установлен или недоступен');
    process.exit(1);
  }

  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  const courseDirs = entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => path.join(targetDir, e.name));

  for (const courseDir of courseDirs) {
    try {
      await processCourse(courseDir);
    } catch (error) {
      log(`Ошибка при обработке ${path.basename(courseDir)}: ${error.message}`, 'error');
      if (CONFIG.verbose) {
        console.error(error);
      }
    }
  }

  log('\n✓ Обработка завершена!', 'info');
}

// ============================================================================
// Запуск
// ============================================================================

if (require.main === module) {
  main().catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = { processCourse, generateId, removeNumbering };
