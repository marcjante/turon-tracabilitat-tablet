// Cua de sincronització (fase 4): operacions creades sense connexió,
// pendents d'enviar a Railway. `clientId` (UUID) és la clau primària
// tant a la cua com al camp `client_id` que el backend fa servir per
// no duplicar — veure app/services/entrades.py.

import { reactive } from 'vue'
import { db } from './index.js'
import { api, ApiError } from '../api.js'

export const estatCua = reactive({
  processant: false,
})

export async function comptarPendents() {
  return db.syncQueue.where('status').equals('pending').count()
}

export async function llistarCua() {
  return db.syncQueue.orderBy('createdAt').reverse().toArray()
}

export async function afegirAlaCua({ clientId, operation, entity, tempId, payload }) {
  await db.syncQueue.put({
    clientId,
    operation,
    entity,
    tempId: tempId ?? null,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    status: 'pending',
  })
}

// Cada operació sap com enviar-se i com actualitzar la còpia local un
// cop el servidor confirma. Només CREATE_ENTRADA existeix per ara — la
// fase 5 hi afegirà la resta de fichas amb el mateix patró.
const gestors = {
  async CREATE_ENTRADA(payload) {
    const creada = await api.crearEntrada(payload)
    await db.lots.put({ ...creada, tipus: 'materia_primera' })
    return creada
  },
}

export async function processarCua() {
  if (estatCua.processant) return { processats: 0, errors: 0 }
  estatCua.processant = true
  let processats = 0
  let errors = 0
  try {
    const items = await db.syncQueue.where('status').equals('pending').toArray()
    for (const item of items) {
      const gestor = gestors[item.operation]
      if (!gestor) continue
      try {
        await gestor(item.payload)
        if (item.tempId != null) await db.lots.delete(item.tempId)
        await db.syncQueue.delete(item.clientId)
        processats++
      } catch (err) {
        errors++
        if (err instanceof ApiError) {
          // El servidor ha respost i ha rebutjat l'operació (p. ex.
          // 409/422) — reintentar-la sempre fallaria igual, cal que la
          // persona ho revisi en comptes de quedar-se penjada en un
          // bucle de reintents.
          await db.syncQueue.update(item.clientId, {
            status: 'error',
            attempts: (item.attempts || 0) + 1,
            lastError: err.detail || err.message,
          })
        } else {
          // Error de xarxa (offline de nou, timeout...): es queda
          // "pending" per tornar-ho a intentar la propera vegada.
          await db.syncQueue.update(item.clientId, {
            attempts: (item.attempts || 0) + 1,
            lastError: err?.message || 'error de connexió',
          })
        }
      }
    }
  } finally {
    estatCua.processant = false
  }
  return { processats, errors }
}
