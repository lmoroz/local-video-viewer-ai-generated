import axios from 'axios'

const apiClient = axios.create({
  //baseURL: `${window.__BACKEND_URL__}/api`,
  headers: { 'Content-Type': 'application/json' }
})

export default {
  getPlaylists(dir) {
    return apiClient.get(`${window.__BACKEND_URL__}/api/playlists`, { params: { dir } })
  },
  getPlaylistDetails(id, dir) {
    return apiClient.get(`${window.__BACKEND_URL__}/api/playlist/${encodeURIComponent(id)}`, { params: { dir } })
  },
  searchVideos(query, dir) {
    return apiClient.get(`${window.__BACKEND_URL__}/api/search`, { params: { query, dir } })
  },
  getFileUrl(path) {
    if (!path) return ''
    return `${window.__BACKEND_URL__}/api/file?path=${encodeURIComponent(path)}`
  }
}
