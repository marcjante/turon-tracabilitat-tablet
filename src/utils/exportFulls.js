// Construeix les "fulles" (dades + columnes) per a cada ficha, llestes
// per passar a baixarExcel(). Llegeix sempre de la còpia local
// (IndexedDB, via repo.js), no de l'API — així l'exportació també
// funciona sense connexió.

import { repo } from '../db/repo.js'

function formatarData(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('ca-ES')
}

function crearResoledorDeLots() {
  const cache = new Map()
  return async function resol(id) {
    if (id == null) return ''
    if (cache.has(id)) return cache.get(id)
    try {
      const lot = await repo.obtenirLot(id)
      cache.set(id, lot.codi)
      return lot.codi
    } catch {
      cache.set(id, `#${id}`)
      return `#${id}`
    }
  }
}

export async function fullEntrades() {
  const [entrades, ingredients, proveidors] = await Promise.all([
    repo.entrades(),
    repo.ingredients(),
    repo.proveidors(),
  ])
  const nomIngredient = (id) => ingredients.find((i) => i.id === id)?.nom || `#${id}`
  const nomProveidor = (id) => proveidors.find((p) => p.id === id)?.nom || `#${id}`

  return {
    nom: 'Entrades',
    columnes: [
      { header: 'Codi', key: 'codi', width: 20 },
      { header: 'Ingredient', key: 'ingredient', width: 20 },
      { header: 'Proveïdor', key: 'proveidor', width: 20 },
      { header: 'Data recepció', key: 'data_recepcio', width: 14 },
      { header: 'Caducitat', key: 'caducitat', width: 14 },
      { header: 'Tipus data', key: 'tipus_data', width: 16 },
      { header: 'Responsable', key: 'responsable', width: 16 },
      { header: 'Observacions', key: 'observacions', width: 30 },
      { header: 'Registrat el', key: 'creat_at', width: 20 },
    ],
    files: entrades.map((e) => ({
      codi: e.codi,
      ingredient: nomIngredient(e.ingredient_id),
      proveidor: nomProveidor(e.proveidor_id),
      data_recepcio: e.data_recepcio,
      caducitat: e.caducitat,
      tipus_data: e.tipus_data === 'caducitat' ? 'Caducitat' : 'Consum preferent',
      responsable: e.responsable,
      observacions: e.observacions || '',
      creat_at: formatarData(e.creat_at),
    })),
  }
}

export async function fullLotsEnUs() {
  const [historial, ingredients] = await Promise.all([repo.historialLotsEnUs(), repo.ingredients()])
  const resol = crearResoledorDeLots()
  const nomIngredient = (id) => ingredients.find((i) => i.id === id)?.nom || `#${id}`

  const files = await Promise.all(
    historial.map(async (h) => ({
      ingredient: nomIngredient(h.ingredient_id),
      lot: await resol(h.lot_id),
      inici: formatarData(h.inici),
      fi: h.fi ? formatarData(h.fi) : '(obert)',
      observacions: h.observacions || '',
    })),
  )

  return {
    nom: 'Lots en ús',
    columnes: [
      { header: 'Ingredient', key: 'ingredient', width: 20 },
      { header: 'Lot', key: 'lot', width: 20 },
      { header: 'Inici', key: 'inici', width: 20 },
      { header: 'Fi', key: 'fi', width: 20 },
      { header: 'Observacions', key: 'observacions', width: 30 },
    ],
    files,
  }
}

function fullProduccio(nom, lots, elaboracions) {
  const nomElaboracio = (id) => elaboracions.find((e) => e.id === id)?.nom || `#${id}`
  return {
    nom,
    columnes: [
      { header: 'Codi', key: 'codi', width: 20 },
      { header: 'Elaboració', key: 'elaboracio', width: 20 },
      { header: 'Quantitat', key: 'quantitat', width: 12 },
      { header: 'Unitat', key: 'unitat', width: 10 },
      { header: 'Torn', key: 'torn', width: 10 },
      { header: 'Responsable', key: 'responsable', width: 16 },
      { header: 'Elaborat el', key: 'elaborat_at', width: 20 },
      { header: 'Observacions', key: 'observacions', width: 30 },
    ],
    files: lots.map((l) => ({
      codi: l.codi,
      elaboracio: nomElaboracio(l.elaboracio_id),
      quantitat: l.quantitat,
      unitat: l.unitat,
      torn: l.torn,
      responsable: l.responsable,
      elaborat_at: formatarData(l.elaborat_at),
      observacions: l.observacions || '',
    })),
  }
}

export async function fullSemielaborats() {
  const [lots, elaboracions] = await Promise.all([repo.semielaborats(), repo.elaboracions()])
  return fullProduccio('Semielaborats', lots, elaboracions)
}

export async function fullProductes() {
  const [lots, elaboracions] = await Promise.all([repo.productes(), repo.elaboracions()])
  return fullProduccio('Productes', lots, elaboracions)
}

export async function fullIncidencies() {
  const incidencies = await repo.incidencies()
  const resol = crearResoledorDeLots()

  const files = await Promise.all(
    incidencies.map(async (i) => ({
      tipus: i.tipus,
      data_hora: formatarData(i.data_hora),
      responsable: i.responsable,
      lot_afectat: await resol(i.lot_afectat_id),
      lot_anterior: await resol(i.lot_anterior_id),
      lot_nou: await resol(i.lot_nou_id),
      motiu: i.motiu,
      mesura_adoptada: i.mesura_adoptada || '',
      comprovacio: i.comprovacio ? 'Sí' : 'No',
      comprovat_per: i.comprovat_per || '',
    })),
  )

  return {
    nom: 'Incidències',
    columnes: [
      { header: 'Tipus', key: 'tipus', width: 16 },
      { header: 'Data/hora', key: 'data_hora', width: 20 },
      { header: 'Responsable', key: 'responsable', width: 16 },
      { header: 'Lot afectat', key: 'lot_afectat', width: 18 },
      { header: 'Lot anterior', key: 'lot_anterior', width: 18 },
      { header: 'Lot nou', key: 'lot_nou', width: 18 },
      { header: 'Motiu', key: 'motiu', width: 30 },
      { header: 'Mesura adoptada', key: 'mesura_adoptada', width: 30 },
      { header: 'Comprovat', key: 'comprovacio', width: 12 },
      { header: 'Comprovat per', key: 'comprovat_per', width: 16 },
    ],
    files,
  }
}

export async function totsElsFulls() {
  return Promise.all([
    fullEntrades(),
    fullLotsEnUs(),
    fullSemielaborats(),
    fullProductes(),
    fullIncidencies(),
  ])
}
