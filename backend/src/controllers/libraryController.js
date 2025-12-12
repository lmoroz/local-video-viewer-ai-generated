const indexer = require('../services/indexerService');
const path = require('path');

exports.getPlaylists = async (req, res) => {
  // 1. Получаем dir из запроса!
  const {dir} = req.query;

  if (!dir || typeof dir !== 'string') {
    return res.status(400).json({error: 'Missing or invalid "dir" query parameter'});
  }

  try {
    // Вызываем сервис, передавая путь от пользователя
    const playlists = await indexer.scanPlaylists(dir);
    res.json(playlists);
  } catch (err) {
    console.error(err);
    if (err.message === 'Directory not found') {
      return res.status(404).json({error: 'Directory not found'});
    }
    res.status(500).json({error: 'Internal server error'});
  }
};

exports.getPlaylistDetails = async (req, res) => {
  const {dir} = req.query;
  const {id} = req.params;

  if (!dir) return res.status(400).json({error: 'Missing dir'});

  try {
    const result = await indexer.scanPlaylistVideos(dir, id);
    if (!result) return res.status(404).json({error: 'Playlist not found'});

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  }
};

exports.serveFile = (req, res) => {
  const {path: filePath} = req.query;
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).send('Missing path');
  }
  // В Windows пути могут быть V:\... express.sendFile требует абсолютный путь
  // или root. path.resolve() поможет.
  res.sendFile(path.resolve(filePath), (err) => {
    if (err) {
      // Если заголовки еще не ушли (редко, но бывает)
      if (!res.headersSent) res.status(404).send('File not found or access denied');
    }
  });
};

exports.getAllVideos = async (req, res) => {
  const {dir} = req.query;

  if (!dir || typeof dir !== 'string') {
    return res.status(400).json({error: 'Missing or invalid "dir" query parameter'});
  }

  try {
    const videos = await indexer.scanAllVideos(dir);

    // Сортировка: Свежие (по upload_date) сверху.
    // Если даты нет - по времени создания файла.
    videos.sort((a, b) => {
      const dateA = a.upload_date || '';
      const dateB = b.upload_date || '';
      if (dateA && dateB) {
        return dateB.localeCompare(dateA); // '2023...' > '2022...'
      }
      if (!dateA && !dateB) return b.ctime - a.ctime;
      // Если у одного есть дата, а у другого нет, тот что с датой считается "новее" (или важнее)
      return dateA ? -1 : 1;
    });

    res.json(videos);
  } catch (err) {
    console.error(err);
    if (err.message === 'Directory not found') return res.status(404).json({error: 'Directory not found'});
    res.status(500).json({error: 'Internal server error'});
  }
};

exports.search = async (req, res) => {
  const {dir, query} = req.query;

  if (!dir || typeof dir !== 'string') {
    return res.status(400).json({error: 'Missing dir'});
  }
  if (!query || typeof query !== 'string') {
    return res.status(400).json({error: 'Missing query'});
  }

  try {
    // 1. Сканируем всё (так же, как в /videos, но можно оптимизировать фильтрацией внутри сервиса,
    // но для чистоты кода используем переиспользование метода, так как p-limit уже дает скорость)
    const allVideos = await indexer.scanAllVideos(dir);

    // 2. Фильтруем
    const lowerQuery = query.toLowerCase();
    const results = allVideos.filter(video => {
      // Ищем совпадение в имени файла (как в оригинале)
      // Можно добавить поиск по title, если нужно: || video.title.toLowerCase().includes(lowerQuery)
      return video.filename.toLowerCase().includes(lowerQuery);
    });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  }
};
