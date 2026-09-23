// Cliente HTTP fino para la API de trazabilidad. Sin autenticación (la
// API tampoco la tiene todavía — ver CLAUDE.md del backend).

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail))
    this.status = status
    this.detail = detail
  }
}

async function request(method, path, { params, body } = {}) {
  const url = new URL(path, BASE_URL)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    }
  }
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    let detail = response.statusText
    try {
      const data = await response.json()
      detail = data.detail ?? detail
    } catch {
      // sin cuerpo JSON, nos quedamos con statusText
    }
    throw new ApiError(response.status, detail)
  }
  if (response.status === 204) return null
  return response.json()
}

const get = (path, params) => request('GET', path, { params })
const post = (path, body) => request('POST', path, { body })
const patch = (path, body) => request('PATCH', path, { body })
const del = (path, params) => request('DELETE', path, { params })

export const api = {
  // Catàlegs
  ingredients: (params) => get('/ingredients', params),
  crearIngredient: (body) => post('/ingredients', body),
  proveidors: (params) => get('/proveidors', params),
  crearProveidor: (body) => post('/proveidors', body),
  elaboracions: (params) => get('/elaboracions', params),
  crearElaboracio: (body) => post('/elaboracions', body),
  receptes: (params) => get('/receptes', params),
  crearRecepta: (body) => post('/receptes', body),
  eliminarRecepta: (id) => del(`/receptes/${id}`),

  // Ficha 1 — entrades
  entrades: (params) => get('/entrades', params),
  crearEntrada: (body) => post('/entrades', body),

  // Ficha 2 — lots en ús
  lotsEnUs: () => get('/lots-en-us'),
  historialLotsEnUs: (params) => get('/lots-en-us/historial', params),
  obrirLotEnUs: (body) => post('/lots-en-us', body),
  tancarLotEnUs: (id, body) => post(`/lots-en-us/${id}/tancar`, body),

  // Ficha 3/4 — producció
  semielaborats: () => get('/semielaborats'),
  crearSemielaborat: (body) => post('/semielaborats', body),
  productes: () => get('/productes'),
  crearProducte: (body) => post('/productes', body),

  // Gestió de lots
  cercarLots: (codi) => get('/lots/cerca', { codi }),
  anularLot: (id, body) => post(`/lots/${id}/anular`, body),
  afegirConsum: (lotId, body) => post(`/lots/${lotId}/consums`, body),
  anularConsum: (lotId, lotConsumitId) => del(`/lots/${lotId}/consums`, { lot_consumit_id: lotConsumitId }),

  // Traçabilitat
  tracaEndavant: (lotId) => get(`/traca/endavant/${lotId}`),
  tracaEnrere: (lotId) => get(`/traca/enrere/${lotId}`),

  // Ficha 5 — incidències
  incidencies: (params) => get('/incidencies', params),
  crearIncidencia: (body) => post('/incidencies', body),
}
