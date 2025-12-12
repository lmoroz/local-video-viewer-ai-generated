import { createRouter, createWebHashHistory } from 'vue-router'


const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/home/ui/HomePage.vue')
  },
  {
    path: '/playlist/:id',
    name: 'Playlist',
    component: () => import('@/pages/playlist/ui/PlaylistPage.vue'),
    props: route => ({ id: route.params.id, dir: route.query.dir })
  },
  {
    path: '/video/:playlistId/:videoId',
    name: 'Video',
    component: () => import('@/pages/video/ui/VideoPage.vue'),
    props: route => ({
      videoId: route.params.videoId,
      playlistId: route.params.playlistId,
      dir: route.query.dir
    })
  },

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
