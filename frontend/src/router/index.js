import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import PlaylistPage from '../views/PlaylistPage.vue';
import VideoPage from '../views/VideoPage.vue';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: HomePage,
    },
    {
        path: '/playlist/:name',
        name: 'Playlist',
        component: PlaylistPage,
        props: (route) => ({ name: route.params.name, dir: route.query.dir }),
    },
    {
        path: '/video/:filename',
        name: 'Video',
        component: VideoPage,
        props: (route) => ({
            filename: route.params.filename,
            dir: route.query.dir,
            playlist: route.query.playlist
        }),
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
