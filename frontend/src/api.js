import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default {
    getPlaylists(dir) {
        return apiClient.get('/playlists', { params: { dir } });
    },
    getPlaylistDetails(id, dir) {
        return apiClient.get(`/playlist/${encodeURIComponent(id)}`, { params: { dir } });
    },
    getFileUrl(path) {
        if (!path) return '';
        return `http://localhost:3000/api/file?path=${encodeURIComponent(path)}`;
    },
};
