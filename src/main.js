import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router.js'
import { registrarServiceWorker } from './pwa.js'
import { refrescarTot } from './db/sync.js'

createApp(App).use(router).mount('#app')
registrarServiceWorker()

// Sincronització inicial en segon pla: si no hi ha xarxa, falla en
// silenci i l'app continua funcionant amb el que ja hi hagi a
// IndexedDB (buit la primera vegada que s'obre sense connexió).
// refrescarTot() ja processa la cua de pendents abans de baixar dades
// (src/db/sync.js), així que amb això n'hi ha prou tant a l'arrencada
// com en recuperar connexió — no cal cridar-los per separat.
if (navigator.onLine) {
  refrescarTot().catch((err) => console.warn('Sincronització inicial fallida:', err.message))
}
window.addEventListener('online', () => {
  refrescarTot().catch((err) => console.warn('Sincronització fallida:', err.message))
})
