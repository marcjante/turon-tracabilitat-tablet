// Lectures "local-first": sempre contra IndexedDB, mai directament
// contra l'API. Reprodueix els mateixos filtres i el mateix ordre que
// fa avui el backend perquè cap vista hagi de canviar de comportament.
//
// Les escriptures (crear/anul·lar...) encara van directes a l'API
// (src/api.js) — la fase 4 les farà també local-first amb UUID.

import { db } from './index.js'

function ordenarPerNom(arr) {
  return [...arr].sort((a, b) => a.nom.localeCompare(b.nom, 'ca'))
}

function ordenarPerCreatDesc(arr) {
  return [...arr].sort((a, b) => new Date(b.creat_at) - new Date(a.creat_at))
}

export const repo = {
  async ingredients({ actiu } = {}) {
    let arr = await db.ingredients.toArray()
    if (actiu !== undefined) arr = arr.filter((i) => i.actiu === actiu)
    return ordenarPerNom(arr)
  },

  async proveidors({ actiu } = {}) {
    let arr = await db.proveidors.toArray()
    if (actiu !== undefined) arr = arr.filter((p) => p.actiu === actiu)
    return ordenarPerNom(arr)
  },

  async elaboracions({ tipus, actiu } = {}) {
    let arr = await db.elaboracions.toArray()
    if (tipus !== undefined) arr = arr.filter((e) => e.tipus === tipus)
    if (actiu !== undefined) arr = arr.filter((e) => e.actiu === actiu)
    return ordenarPerNom(arr)
  },

  async receptes({ elaboracio_id } = {}) {
    let arr = await db.receptes.toArray()
    if (elaboracio_id !== undefined) arr = arr.filter((r) => r.elaboracio_id === Number(elaboracio_id))
    return arr
  },

  async entrades({ ingredient_id } = {}) {
    let arr = (await db.lots.where('tipus').equals('materia_primera').toArray()).filter((l) => l.anulat_per_id == null)
    if (ingredient_id !== undefined) arr = arr.filter((l) => l.ingredient_id === Number(ingredient_id))
    return ordenarPerCreatDesc(arr)
  },

  async lotsEnUs() {
    const arr = await db.lotsEnUs.toArray()
    return arr.filter((l) => l.fi == null)
  },

  async historialLotsEnUs({ ingredient_id } = {}) {
    let arr = await db.lotsEnUs.toArray()
    if (ingredient_id !== undefined) arr = arr.filter((l) => l.ingredient_id === Number(ingredient_id))
    return arr
  },

  async semielaborats() {
    const arr = (await db.lots.where('tipus').equals('semielaborat').toArray()).filter((l) => l.anulat_per_id == null)
    return ordenarPerCreatDesc(arr)
  },

  async productes() {
    const arr = (await db.lots.where('tipus').equals('producte').toArray()).filter((l) => l.anulat_per_id == null)
    return ordenarPerCreatDesc(arr)
  },

  async cercarLots(codi) {
    const q = codi.toLowerCase()
    const arr = (await db.lots.toArray()).filter((l) => l.anulat_per_id == null && l.codi.toLowerCase().includes(q))
    return ordenarPerCreatDesc(arr)
  },

  async obtenirLot(id) {
    const lot = await db.lots.get(Number(id))
    if (!lot) throw new Error(`lot #${id} no disponible localment (cal sincronitzar)`)
    return lot
  },

  async incidencies({ lot_afectat_id } = {}) {
    let arr = await db.incidencies.toArray()
    if (lot_afectat_id !== undefined) arr = arr.filter((i) => i.lot_afectat_id === Number(lot_afectat_id))
    return arr.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora))
  },
}
