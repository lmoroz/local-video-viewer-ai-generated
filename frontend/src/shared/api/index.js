import axios from 'axios'

const apiClient = axios.create({
  //baseURL: `${window.__BACKEND_URL__}/api`,
  headers: { 'Content-Type': 'application/json' }
})

export default {
  getPlaylists(dir) {
    return apiClient.get(`${window.__BACKEND_URL__}/api/playlists`, { params: { dir } })
  },
  getPlaylistDetails(id, dir, cacheBust) {
    const params = { dir }
    if (cacheBust) {
      params._t = cacheBust
    }
    return apiClient.get(`${window.__BACKEND_URL__}/api/playlist/${encodeURIComponent(id)}`, { params })
  },
  clearPlaylistCache(id, dir) {
    return apiClient.delete(`${window.__BACKEND_URL__}/api/playlist/${encodeURIComponent(id)}/cache`, { params: { dir } })
  },
  searchVideos(query, dir) {

    return apiClient.get(`${window.__BACKEND_URL__}/api/search`, { params: { query, dir } })
  },
  getVideos(dir) {
    return apiClient.get(`${window.__BACKEND_URL__}/api/videos`, { params: { dir } })
  },
  getFileUrl(path) {
    if (!path) return ''
    return `${window.__BACKEND_URL__}/api/file?path=${encodeURIComponent(path)}`
  }
}
