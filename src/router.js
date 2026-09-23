import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/entrades', name: 'entrades', component: () => import('./views/EntradaView.vue') },
    { path: '/lots-en-us', name: 'lots-en-us', component: () => import('./views/LotsEnUsView.vue') },
    { path: '/semielaborats', name: 'semielaborats', component: () => import('./views/SemielaboratsView.vue') },
    { path: '/productes', name: 'productes', component: () => import('./views/ProductesView.vue') },
    { path: '/incidencies', name: 'incidencies', component: () => import('./views/IncidenciesView.vue') },
    { path: '/traca', name: 'traca', component: () => import('./views/TracabilitatView.vue') },
    { path: '/catalegs', name: 'catalegs', component: () => import('./views/CatalegsView.vue') },
  ],
})

export default router
