require('dotenv').config({quiet: true});

module.exports = {
  PORT: process.env.PORT || 3000,
  DEBUG_PERF: process.env.DEBUG_PERF || false,
  SUPPORTED_VIDEO_EXT: ['.mp4', '.mkv', '.webm'],
  SUPPORTED_IMG_EXT: ['.webp', '.jpg', '.jpeg', '.png'],
};
