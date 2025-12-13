import {Router} from 'express';
import * as controller from '../controllers/libraryController';

const router = Router();

// Playlists
router.get('/playlists', controller.getPlaylists);
router.get('/playlist/:id', controller.getPlaylistDetails);

// Videos & Search
router.get('/videos', controller.getAllVideos);
router.get('/search', controller.search);

// Files
router.get('/file', controller.serveFile);

export default router;
