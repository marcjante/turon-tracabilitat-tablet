// Nombre d'operacions pendents de sincronitzar, reactiu de veritat
// (es refresca sol quan canvia la cua) via liveQuery de Dexie — no cal
// fer polling ni recordar-se de refrescar-ho a mà després de cada
// escriptura.

import { onMounted, onUnmounted, ref } from 'vue'
import { liveQuery } from 'dexie'
import { db } from './index.js'

export function usePendentsCount() {
  const pendents = ref(0)
  let subscripcio = null

  onMounted(() => {
    subscripcio = liveQuery(() => db.syncQueue.where('status').equals('pending').count()).subscribe({
      next: (valor) => { pendents.value = valor },
      error: () => { pendents.value = 0 },
    })
  })
  onUnmounted(() => subscripcio?.unsubscribe())

  return { pendents }
}
