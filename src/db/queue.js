// Cua de sincronització (fases 4-5): operacions creades sense
// connexió, pendents d'enviar a Railway. `clientId` (UUID) és la clau
// primària tant a la cua com al camp `client_id` que el backend fa
// servir per no duplicar — veure app/services/*.py.

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

// Torna a intentar un element que havia quedat marcat com "error" (p.
// ex. la persona ja ha obert el lot que faltava) — el torna a deixar
// "pending" perquè processarCua() el reculli la propera vegada.
export async function reintentar(clientId) {
  await db.syncQueue.update(clientId, { status: 'pending', lastError: null })
}

// Descarta un element en error (mai un de "pending": això perdria una
// operació encara vàlida que només espera xarxa). Esborra també el
// registre local pendent associat, si n'hi ha.
export async function descartar(clientId) {
  const item = await db.syncQueue.get(clientId)
  if (!item || item.status !== 'error') return
  if (item.tempId != null) await taulaPerEntitat[item.entity]?.()?.delete(item.tempId)
  await db.syncQueue.delete(clientId)
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

// Taula on viu el registre "pendent" (id temporal negatiu) de cada
// tipus d'entitat, per poder-lo esborrar un cop el servidor confirma.
const taulaPerEntitat = {
  lot: () => db.lots,
  lotEnUs: () => db.lotsEnUs,
  incidencia: () => db.incidencies,
}

// Cada operació sap com enviar-se i com actualitzar la còpia local un
// cop el servidor confirma.
const gestors = {
  async CREATE_ENTRADA(payload) {
    const creada = await api.crearEntrada(payload)
    await db.lots.put({ ...creada, tipus: 'materia_primera' })
  },
  async CREATE_LOT_EN_US(payload) {
    const creat = await api.obrirLotEnUs(payload)
    await db.lotsEnUs.put(creat)
  },
  async TANCAR_LOT_EN_US(payload) {
    const tancat = await api.tancarLotEnUs(payload.lot_en_us_id, { fi: payload.fi })
    await db.lotsEnUs.put(tancat)
  },
  async CREATE_SEMIELABORAT(payload) {
    const creat = await api.crearSemielaborat(payload)
    await db.lots.put({ ...creat, tipus: 'semielaborat' })
  },
  async CREATE_PRODUCTE(payload) {
    const creat = await api.crearProducte(payload)
    await db.lots.put({ ...creat, tipus: 'producte' })
  },
  async CREATE_INCIDENCIA(payload) {
    const creada = await api.crearIncidencia(payload)
    await db.incidencies.put(creada)
  },
}

export async function processarCua() {
  if (estatCua.processant) return { processats: 0, errors: 0 }
  estatCua.processant = true
  let processats = 0
  let errors = 0
  try {
    // Ordre cronològic, no l'ordre "natural" de clientId (UUID): moltes
    // operacions depenen causalment de l'anterior (p. ex. "crear
    // semielaborat" pot necessitar que "obrir lot en ús" ja s'hagi
    // processat), i un UUID no té cap relació amb quan es va crear.
    const items = (await db.syncQueue.where('status').equals('pending').toArray())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    for (const item of items) {
      const gestor = gestors[item.operation]
      if (!gestor) continue
      try {
        await gestor(item.payload)
        if (item.tempId != null) await taulaPerEntitat[item.entity]?.()?.delete(item.tempId)
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
