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
if (navigator.onLine) {
  refrescarTot().catch((err) => console.warn('Sincronització inicial fallida:', err.message))
}
