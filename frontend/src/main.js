import { createApp } from 'vue'
import '@/assets/css/styles.css'
import 'bootstrap-icons/font/bootstrap-icons.min.css'
// https://icons.getbootstrap.com/
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
