const express = require('express');
const router = express.Router();
const controller = require('../controllers/libraryController');

// Playlists
router.get('/playlists', controller.getPlaylists);
router.get('/playlist/:id', controller.getPlaylistDetails);

// Videos & Search
router.get('/videos', controller.getAllVideos);
router.get('/search', controller.search);

// Files
router.get('/file', controller.serveFile);

module.exports = router;
