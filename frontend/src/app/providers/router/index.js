import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '@/pages/home/ui/HomePage.vue'
import PlaylistPage from '@/pages/playlist/ui/PlaylistPage.vue'
import VideoPage from '@/pages/video/ui/VideoPage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/playlist/:id',
    name: 'Playlist',
    component: PlaylistPage,
    props: route => ({ id: route.params.id, dir: route.query.dir })
  },
  {
    path: '/video/:playlistId/:videoId',
    name: 'Video',
    component: VideoPage,
    props: route => ({
      videoId: route.params.videoId,
      playlistId: route.params.playlistId,
      dir: route.query.dir
    })
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/pages/search/ui/SearchPage.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
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
