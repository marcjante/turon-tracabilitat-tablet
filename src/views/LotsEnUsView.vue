<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, ApiError } from '../api.js'
import { repo } from '../db/repo.js'
import { db } from '../db/index.js'
import { afegirAlaCua } from '../db/queue.js'
import { useToast } from '../toast.js'
import { baixarExcel } from '../utils/baixarExcel.js'
import { fullLotsEnUs } from '../utils/exportFulls.js'
import FormField from '../components/FormField.vue'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const toast = useToast()

const ingredients = ref([])
const lotsIngredient = ref([])
const oberts = ref([])
const loading = ref(true)
const enviant = ref(false)
const descarregant = ref(false)

function araLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const form = ref({ ingredient_id: '', lot_id: '', inici: araLocal(), observacions: '' })

const ingredientNom = (id) => ingredients.value.find((i) => i.id === id)?.nom || `#${id}`

async function carregar() {
  loading.value = true
  try {
    const [ing, ob] = await Promise.all([repo.ingredients({ actiu: true }), repo.lotsEnUs()])
    ingredients.value = ing
    oberts.value = ob
  } catch (err) {
    toast.error(err.detail || err.message)
  } finally {
    loading.value = false
  }
}
onMounted(carregar)

async function carregarLotsIngredient() {
  lotsIngredient.value = []
  form.value.lot_id = ''
  if (!form.value.ingredient_id) return
  try {
    // Només lots ja sincronitzats: no es pot obrir un lot en ús
    // referenciant un lot que el servidor encara no coneix.
    lotsIngredient.value = (await repo.entrades({ ingredient_id: form.value.ingredient_id })).filter((l) => l.id > 0)
  } catch (err) {
    toast.error(err.detail || err.message)
  }
}

async function enviar() {
  if (!form.value.ingredient_id || !form.value.lot_id) {
    toast.error('Selecciona ingredient i lot')
    return
  }
  enviant.value = true
  const clientId = crypto.randomUUID()
  const payload = {
    ingredient_id: Number(form.value.ingredient_id),
    lot_id: Number(form.value.lot_id),
    inici: new Date(form.value.inici).toISOString(),
    observacions: form.value.observacions || null,
    client_id: clientId,
  }
  try {
    const nou = await api.obrirLotEnUs(payload)
    // Regla de negoci 1: obrir-ne un de nou tanca automàticament el que
    // ja estava obert d'aquest ingredient (fi = inici del nou).
    const antic = oberts.value.find((o) => o.ingredient_id === nou.ingredient_id)
    if (antic) await db.lotsEnUs.put({ ...antic, fi: nou.inici })
    await db.lotsEnUs.put(nou)
    toast.success('Lot obert com a "en ús"')
    form.value = { ingredient_id: '', lot_id: '', inici: araLocal(), observacions: '' }
    lotsIngredient.value = []
    await carregar()
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.detail)
    } else {
      const idTemporal = -Date.now()
      const antic = oberts.value.find((o) => o.ingredient_id === payload.ingredient_id)
      if (antic) await db.lotsEnUs.put({ ...antic, fi: payload.inici })
      await db.lotsEnUs.put({
        id: idTemporal,
        client_id: clientId,
        ingredient_id: payload.ingredient_id,
        lot_id: payload.lot_id,
        inici: payload.inici,
        fi: null,
        observacions: payload.observacions,
      })
      await afegirAlaCua({ clientId, operation: 'CREATE_LOT_EN_US', entity: 'lotEnUs', tempId: idTemporal, payload })
      toast.success('Guardat en local (es sincronitzarà sol)')
      form.value = { ingredient_id: '', lot_id: '', inici: araLocal(), observacions: '' }
      lotsIngredient.value = []
      await carregar()
    }
  } finally {
    enviant.value = false
  }
}

async function tancar(id) {
  if (id < 0) {
    toast.error('Aquest lot encara s\'ha de sincronitzar abans de poder-lo tancar')
    return
  }
  const fi = new Date().toISOString()
  const clientId = crypto.randomUUID()
  try {
    const tancat = await api.tancarLotEnUs(id, { fi })
    await db.lotsEnUs.put(tancat)
    toast.success('Lot tancat')
    await carregar()
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.detail)
    } else {
      const obert = oberts.value.find((o) => o.id === id)
      if (obert) await db.lotsEnUs.put({ ...obert, fi })
      await afegirAlaCua({
        clientId, operation: 'TANCAR_LOT_EN_US', entity: 'lotEnUs', tempId: null,
        payload: { lot_en_us_id: id, fi },
      })
      toast.success('Guardat en local (es sincronitzarà sol)')
      await carregar()
    }
  }
}

async function exportar() {
  descarregant.value = true
  try {
    const full = await fullLotsEnUs()
    await baixarExcel([full], `turon-lots-en-us-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (err) {
    toast.error('No s\'ha pogut generar l\'Excel: ' + (err.detail || err.message))
  } finally {
    descarregant.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <p class="rounded-xl bg-white p-3 text-base text-slate-600 shadow-sm">
      Fes-ho servir quan comences a obrir/fer servir un sac o pot nou d'un ingredient.
    </p>

    <form class="space-y-5 rounded-2xl bg-white p-4 shadow-sm" @submit.prevent="enviar">
      <FormField label="🥣 Quin ingredient comences a fer servir?" required>
        <select v-model="form.ingredient_id" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" @change="carregarLotsIngredient">
          <option value="" disabled>Tria-ho de la llista…</option>
          <option v-for="i in ingredients" :key="i.id" :value="i.id">{{ i.nom }}</option>
        </select>
      </FormField>

      <FormField label="🔢 Quin lot és?" required :hint="form.ingredient_id && !lotsIngredient.length ? 'Encara no has apuntat cap entrada d\'aquest ingredient' : ''">
        <select v-model="form.lot_id" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" :disabled="!form.ingredient_id">
          <option value="" disabled>Tria-ho de la llista…</option>
          <option v-for="l in lotsIngredient" :key="l.id" :value="l.id">{{ l.codi }} (caduca {{ l.caducitat }})</option>
        </select>
      </FormField>

      <FormField label="🕐 A quina hora ho has començat?" required>
        <input v-model="form.inici" type="datetime-local" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
      </FormField>

      <FormField label="✏️ Vols dir alguna cosa més? (no cal)">
        <textarea v-model="form.observacions" rows="2" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2"></textarea>
      </FormField>

      <button type="submit" :disabled="enviant" class="w-full rounded-xl bg-turon-black py-4 text-lg font-bold text-white disabled:opacity-50">
        {{ enviant ? 'Guardant…' : '✅ Guardar' }}
      </button>
    </form>

    <section>
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-600">Ara mateix s'estan fent servir</h2>
        <button
          type="button"
          :disabled="descarregant"
          class="text-sm font-bold text-turon-black disabled:opacity-50"
          @click="exportar"
        >
          {{ descarregant ? 'Generant…' : '📥 Excel' }}
        </button>
      </div>
      <Spinner v-if="loading" />
      <template v-else>
        <ul v-if="oberts.length" class="space-y-2">
          <li v-for="o in oberts" :key="o.id" class="flex items-center justify-between rounded-xl bg-white p-3 text-base shadow-sm">
            <div>
              <div class="font-bold">{{ ingredientNom(o.ingredient_id) }}</div>
              <div class="text-slate-500">des de {{ new Date(o.inici).toLocaleString() }}</div>
            </div>
            <button type="button" class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold active:bg-slate-200" @click="tancar(o.id)">
              🔚 S'ha acabat
            </button>
          </li>
        </ul>
        <EmptyState v-else emoji="🫙" text="Ara mateix no hi ha res obert." />
      </template>
    </section>
  </div>
</template>
