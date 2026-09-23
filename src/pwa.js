// Registre del service worker (generat per vite-plugin-pwa a partir de
// tots els fitxers de dist/, no a mà — així cap chunk de Vue Router es
// queda sense cachejar) + detecció de "hi ha una versió nova" i del
// prompt d'instal·lació natiu (Android/desktop Chrome; a iOS no
// existeix aquest event, per això hi ha docs/INSTALL_MOBILE.md).

import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

export const actualitzacioDisponible = ref(false)
export const promptInstallacio = ref(null)

let aplicarSW = null

export function registrarServiceWorker() {
  aplicarSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      actualitzacioDisponible.value = true
    },
  })
}

export function aplicarActualitzacio() {
  actualitzacioDisponible.value = false
  aplicarSW?.(true)
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  promptInstallacio.value = event
})

export async function instalarApp() {
  const event = promptInstallacio.value
  if (!event) return
  event.prompt()
  await event.userChoice
  promptInstallacio.value = null
}
