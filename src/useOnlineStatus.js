// Estat de connexió del navegador. De moment només reflecteix
// navigator.onLine (fiable per saber si hi ha xarxa local, no garanteix
// que Railway respongui — això s'afegirà quan hi hagi cua de
// sincronització, a la fase 6).

import { ref } from 'vue'

const enLinia = ref(navigator.onLine)

function marcarEnLinia() { enLinia.value = true }
function marcarSenseXarxa() { enLinia.value = false }

window.addEventListener('online', marcarEnLinia)
window.addEventListener('offline', marcarSenseXarxa)

export function useOnlineStatus() {
  return { enLinia }
}
