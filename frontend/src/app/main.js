import { createApp } from 'vue'
import '@/app/assets/css/styles.css'
import 'bootstrap-icons/font/bootstrap-icons.min.css'
// https://icons.getbootstrap.com/
import App from '@/app/App.vue'
import router from '@/app/providers/router'

const startApp = () => createApp(App).use(router).mount('#app')

if (window.electronAPI)
  window.electronAPI.onBackendPort(port => {
    window.__BACKEND_URL__ = `http://localhost:${port}`
    startApp()
  })
else {
  window.__BACKEND_URL__ = `http://localhost:3000`
  startApp()
}
