import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
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
    searchVideos(query, dir) {
        return apiClient.get('/search', { params: { query, dir } });
    },
    getFileUrl(path) {
        if (!path) return '';
        return `/api/file?path=${encodeURIComponent(path)}`;
    },
};
