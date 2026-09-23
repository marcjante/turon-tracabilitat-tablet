// Sincronització unidireccional (Railway -> IndexedDB), de moment. És
// una còpia completa (no incremental): el backend encara no té
// `updated_at`/`updated_since`, i el volum de dades d'un sol obrador és
// petit — fer-ho incremental és una millora per a quan calgui.

import { reactive } from 'vue'
import { db } from './index.js'
import { api } from '../api.js'
import { processarCua } from './queue.js'

export const estatSincronitzacio = reactive({
  sincronitzant: false,
  ultimErrorMissatge: null,
})

export async function refrescarTot() {
  estatSincronitzacio.sincronitzant = true
  estatSincronitzacio.ultimErrorMissatge = null
  try {
    // Primer s'intenten enviar les escriptures pendents (fase 4): així
    // el "pull" que ve després ja les inclou amb el seu id real.
    await processarCua().catch(() => {})

    const [ingredients, proveidors, elaboracions, receptes, entrades, semielaborats, productes, lotsEnUsHistorial, incidencies] =
      await Promise.all([
        api.ingredients(),
        api.proveidors(),
        api.elaboracions(),
        api.receptes(),
        api.entrades(),
        api.semielaborats(),
        api.productes(),
        api.historialLotsEnUs(),
        api.incidencies(),
      ])

    // Cap dels tres endpoints de llista retorna `tipus` (només ho fan
    // els endpoints d'un sol lot, com /lots/{id}) — cal etiquetar-ho a
    // mà, igual que ja fa cada vista en crear un lot nou.
    const lots = [
      ...entrades.map((l) => ({ ...l, tipus: 'materia_primera' })),
      ...semielaborats.map((l) => ({ ...l, tipus: 'semielaborat' })),
      ...productes.map((l) => ({ ...l, tipus: 'producte' })),
    ]

    // Les llistes normals exclouen els lots anul·lats, però una
    // incidència pot referenciar-ne un (p. ex. "canvi de lot") — cal
    // poder mostrar el seu codi encara que estigui offline.
    const idsCoberts = new Set(lots.map((l) => l.id))
    const idsReferenciats = new Set(
      incidencies.flatMap((i) => [i.lot_afectat_id, i.lot_anterior_id, i.lot_nou_id]).filter((id) => id != null),
    )
    const idsAFaltar = [...idsReferenciats].filter((id) => !idsCoberts.has(id))
    const lotsAnullats = (await Promise.all(idsAFaltar.map((id) => api.obtenirLot(id).catch(() => null)))).filter(Boolean)

    await db.transaction(
      'rw',
      [db.ingredients, db.proveidors, db.elaboracions, db.receptes, db.lots, db.lotsEnUs, db.incidencies, db.meta],
      async () => {
        // Un lot creat offline que encara no s'ha pogut sincronitzar
        // (id temporal negatiu) no ha de desaparèixer només perquè
        // arriba una sincronització de la resta de dades.
        const pendents = await db.lots.where('id').below(0).toArray()

        await Promise.all([
          db.ingredients.clear().then(() => db.ingredients.bulkPut(ingredients)),
          db.proveidors.clear().then(() => db.proveidors.bulkPut(proveidors)),
          db.elaboracions.clear().then(() => db.elaboracions.bulkPut(elaboracions)),
          db.receptes.clear().then(() => db.receptes.bulkPut(receptes)),
          db.lots.clear().then(() => db.lots.bulkPut([...lots, ...lotsAnullats, ...pendents])),
          db.lotsEnUs.clear().then(() => db.lotsEnUs.bulkPut(lotsEnUsHistorial)),
          db.incidencies.clear().then(() => db.incidencies.bulkPut(incidencies)),
        ])
        await db.meta.put({ clau: 'ultimaSincronitzacio', valor: new Date().toISOString() })
      },
    )
  } catch (err) {
    estatSincronitzacio.ultimErrorMissatge = err?.message || 'error desconegut'
    throw err
  } finally {
    estatSincronitzacio.sincronitzant = false
  }
}

export async function ultimaSincronitzacio() {
  const registre = await db.meta.get('ultimaSincronitzacio')
  return registre?.valor ?? null
}
