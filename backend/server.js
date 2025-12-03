const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Helper function to find a file with specific extension in a directory
async function findFileByExt(dir, basename, extensions) {
  for (const ext of extensions) {
    const filePath = path.join(dir, `${ basename }${ ext }`);
    if (await fs.pathExists(filePath)) {
      return filePath;
    }
  }
  return null;
}

// Helper function to find a file starting with a prefix and having specific extensions
async function findFileByPrefix(dir, prefix, extensions) {
  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (file.startsWith(prefix)) {
        const ext = path.extname(file).toLowerCase();
        if (extensions.includes(ext)) {
          return path.join(dir, file);
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${ dir }:`, err);
  }
  return null;
}

// Helper function to extract ID from filename
function extractId(filename) {
  const match = filename.match(/\[([a-zA-Z0-9_-]+)\]/);
  return match ? match[1] : null;
}

// GET /api/playlists
app.get('/api/playlists', async (req, res) => {
  const {dir} = req.query;

  if (!dir || typeof dir !== 'string') {
    return res.status(400).json({error: 'Missing or invalid "dir" query parameter'});
  }

  if (!(await fs.pathExists(dir))) {
    return res.status(404).json({error: 'Directory not found'});
  }

  try {
    const items = await fs.readdir(dir);
    const playlists = [];

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        let title = item;
        let coverPath = null;
        let videoCount = 0;
        let totalDuration = 0;
        let id = null;

        const files = await fs.readdir(itemPath);

        // Find info.json for playlist (starts with "000 - ")
        const infoFile = files.find(f => f.startsWith('000 - ') && f.endsWith('.info.json'));

        // Find any file starting with "000 - " to extract ID
        const zeroFile = files.find(f => f.startsWith('000 - '));
        if (zeroFile) {
          id = extractId(zeroFile);
        }

        if (infoFile) {
          try {
            const infoData = await fs.readJson(path.join(itemPath, infoFile));
            if (infoData.title) {
              title = infoData.title;
            }
          } catch (e) {
            console.error(`Error reading info.json for ${ item }:`, e);
          }

          // Find cover image matching the info file basename
          const basename = path.basename(infoFile, '.info.json');
          // Try extensions
          const extensions = ['.webp', '.jpg', '.jpeg', '.png'];
          for (const ext of extensions) {
            if (files.includes(basename + ext)) {
              coverPath = path.join(itemPath, basename + ext);
              break;
            }
          }
        }

        // Scan videos
        const videoExtensions = ['.mp4', '.mkv', '.webm'];
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (videoExtensions.includes(ext)) {
            videoCount++;

            // Try to find corresponding info.json for duration
            const videoBasename = path.basename(file, ext);
            const videoInfoFile = videoBasename + '.info.json';
            if (files.includes(videoInfoFile)) {
              try {
                const videoInfo = await fs.readJson(path.join(itemPath, videoInfoFile));
                if (videoInfo.duration) {
                  totalDuration += videoInfo.duration;
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }

        playlists.push({
          id, // Add ID
          name: item, // Keep name for reference/fallback if needed, but UI should use ID
          title,
          cover: coverPath,
          videoCount,
          totalDuration,
        });
      }
    }

    res.json(playlists);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

// GET /api/playlist/:id
app.get('/api/playlist/:id', async (req, res) => {
  const {dir} = req.query;
  const {id} = req.params;

  if (!dir || typeof dir !== 'string') {
    return res.status(400).json({error: 'Missing or invalid "dir" query parameter'});
  }

  try {
    // Find playlist directory by ID
    // We have to scan the directory to find the folder that contains the "000 - ... [id]..." file
    const items = await fs.readdir(dir);
    let playlistPath = null;
    let playlistDirName = null;

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = await fs.stat(itemPath);
      if (stat.isDirectory()) {
        const files = await fs.readdir(itemPath);
        const zeroFile = files.find(f => f.startsWith('000 - '));
        if (zeroFile && extractId(zeroFile) === id) {
          playlistPath = itemPath;
          playlistDirName = item;
          break;
        }
      }
    }

    if (!playlistPath) {
      return res.status(404).json({error: 'Playlist not found'});
    }

    const files = await fs.readdir(playlistPath);
    const videos = [];
    const videoExtensions = ['.mp4', '.mkv', '.webm'];

    const infoFile = files.find(f => f.startsWith('000 - ') && f.endsWith('.info.json'));
    let title = playlistPath;
    if (infoFile) {
      try {
        const infoData = await fs.readJson(path.join(playlistPath, infoFile));
        if (infoData.title) {
          title = infoData.title;
        }
      } catch (e) {
        console.error(`Error reading info.json for ${ item }:`, e);
      }
    }
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (videoExtensions.includes(ext)) {
        const basename = path.basename(file, ext);
        const infoFile = basename + '.info.json';
        const descFile = basename + '.description';

        let metadata = {};
        let description = '';
        let thumbnail = null;

        // Read metadata
        if (files.includes(infoFile)) {
          try {
            metadata = await fs.readJson(path.join(playlistPath, infoFile));
          } catch (e) {
            console.error(`Error reading info for ${ file }:`, e);
          }
        }

        // Read description
        if (files.includes(descFile)) {
          try {
            description = await fs.readFile(path.join(playlistPath, descFile), 'utf-8');
          } catch (e) {
            // ignore
          }
        }

        // Find thumbnail
        const imgExtensions = ['.webp', '.jpg', '.jpeg', '.png'];
        for (const imgExt of imgExtensions) {
          if (files.includes(basename + imgExt)) {
            thumbnail = path.join(playlistPath, basename + imgExt);
            break;
          }
        }

        videos.push({
          id: extractId(file), // Extract video ID
          filename: file,
          title: metadata.fulltitle || file,
          uploader: metadata.uploader,
          uploader_url: metadata.uploader_url,
          channel_url: metadata.channel_url,
          upload_date: metadata.upload_date,
          duration: metadata.duration,
          chapters: metadata.chapters,
          description,
          thumbnail,
          path: path.join(playlistPath, file),
        });
      }
    }

    res.json({videos, title});
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Internal server error'});
  }
});

// GET /api/file
app.get('/api/file', (req, res) => {
  const {path: filePath} = req.query;

  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).send('Missing path');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${ PORT }`);
});
