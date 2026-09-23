// Còpia de seguretat local (fase 9): exportar tot IndexedDB a un
// fitxer JSON i poder-lo tornar a carregar. Útil si cal canviar de
// tablet, o com a xarxa de seguretat abans de fer proves.

import { db, obtenirDeviceId } from './index.js'

const VERSIO_ESQUEMA = 1
const TAULES = ['ingredients', 'proveidors', 'elaboracions', 'receptes', 'lots', 'lotsEnUs', 'incidencies', 'syncQueue']

export async function comptarOperacionsPendents() {
  return db.syncQueue.where('status').equals('pending').count()
}

export async function exportarBackup() {
  const dades = {}
  for (const taula of TAULES) {
    dades[taula] = await db[taula].toArray()
  }
  const backup = {
    versioEsquema: VERSIO_ESQUEMA,
    dataExportacio: new Date().toISOString(),
    deviceId: await obtenirDeviceId(),
    dades,
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `turon-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  return backup
}

class BackupInvalid extends Error {}

function validar(backup) {
  if (!backup || typeof backup !== 'object') throw new BackupInvalid('El fitxer no és un backup vàlid')
  if (backup.versioEsquema !== VERSIO_ESQUEMA) {
    throw new BackupInvalid(`Aquest backup és d'una versió (${backup.versioEsquema}) que aquesta app no sap llegir`)
  }
  if (!backup.dades || typeof backup.dades !== 'object') throw new BackupInvalid('El fitxer no conté dades')
  for (const taula of TAULES) {
    if (!Array.isArray(backup.dades[taula])) throw new BackupInvalid(`Falta la taula "${taula}" al backup`)
  }
}

export async function llegirFitxerBackup(file) {
  const text = await file.text()
  let backup
  try {
    backup = JSON.parse(text)
  } catch {
    throw new BackupInvalid('El fitxer no és un JSON vàlid')
  }
  validar(backup)
  return backup
}

export async function importarBackup(backup) {
  validar(backup)
  await db.transaction('rw', TAULES.map((t) => db[t]), async () => {
    for (const taula of TAULES) {
      await db[taula].clear()
      if (backup.dades[taula].length) await db[taula].bulkPut(backup.dades[taula])
    }
  })
}

export { BackupInvalid }
