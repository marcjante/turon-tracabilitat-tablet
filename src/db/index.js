// Base de dades local (IndexedDB via Dexie). Les taules reflecteixen
// les entitats reals del backend (app/models/*.py), no un esquema
// genèric de "productes/stock" — veure docs/OFFLINE_ARCHITECTURE.md.
//
// NOTA: no hi ha taula `consums` perquè el backend no exposa cap
// endpoint per llistar-los en bloc (només es creen/eliminen sobre un
// lot concret) — no hi ha res a sincronitzar-hi encara. La
// traçabilitat (WITH RECURSIVE) continua sent només en línia.

import Dexie from 'dexie'

export const db = new Dexie('turon')

db.version(1).stores({
  ingredients: 'id, nom, actiu',
  proveidors: 'id, nom, actiu',
  elaboracions: 'id, nom, tipus, actiu',
  receptes: 'id, elaboracio_id, ingredient_id, semielaborat_id',
  // `lots` és la mateixa taula unificada que al backend (materia
  // primera, semielaborat i producte junts, distingits per `tipus`).
  lots: 'id, tipus, codi, ingredient_id, elaboracio_id, anulat_per_id',
  lotsEnUs: 'id, ingredient_id, lot_id, fi',
  incidencies: 'id, tipus, lot_afectat_id, data_hora',
  meta: 'clau',
})

// Fase 4: cua de sincronització per a escriptures fetes sense
// connexió. `clientId` és la clau primària (el mateix UUID que porta
// el lot creat localment) — així mai hi ha dos elements de cua per a
// la mateixa operació encara que es truqui dues vegades per error.
db.version(2).stores({
  syncQueue: 'clientId, status, createdAt',
})

export async function obtenirDeviceId() {
  const existent = await db.meta.get('deviceId')
  if (existent) return existent.valor
  const nou = crypto.randomUUID()
  await db.meta.put({ clau: 'deviceId', valor: nou })
  return nou
}
