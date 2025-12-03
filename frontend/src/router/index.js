import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import PlaylistPage from '../views/PlaylistPage.vue'
import VideoPage from '../views/VideoPage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/playlist/:name',
    name: 'Playlist',
    component: PlaylistPage,
    props: route => ({ name: route.params.name, dir: route.query.dir })
  },
  {
    path: '/video/:filename',
    name: 'Video',
    component: VideoPage,
    props: route => ({
      filename: route.params.filename,
      dir: route.query.dir,
      playlist: route.query.playlist
    })
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return {
        el: to.hash
      }
    } else if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Получаем исходный title из index.html
const DEFAULT_TITLE = document.title

router.afterEach(() => {
  // Сбрасываем title к исходному после каждого перехода
  document.title = DEFAULT_TITLE
})

export default router
