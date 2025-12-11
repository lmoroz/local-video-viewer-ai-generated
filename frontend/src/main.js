import { createApp } from 'vue'
import '@/assets/css/styles.css'
import 'bootstrap-icons/font/bootstrap-icons.min.css'
// https://icons.getbootstrap.com/
import App from './App.vue'
import router from './router'

window.__BACKEND_URL__ = `http://localhost:3000`
if (window.electronAPI)
  window.electronAPI.onBackendPort(port => {
    window.__BACKEND_URL__ = `http://localhost:${port}`
  })

createApp(App).use(router).mount('#app')
