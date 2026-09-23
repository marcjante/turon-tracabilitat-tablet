<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, ApiError } from '../api.js'
import { useToast } from '../toast.js'
import { baixarExcel } from '../utils/baixarExcel.js'
import { fullLotsEnUs } from '../utils/exportFulls.js'
import FormField from '../components/FormField.vue'

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
    const [ing, ob] = await Promise.all([api.ingredients({ actiu: true }), api.lotsEnUs()])
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
    lotsIngredient.value = await api.entrades({ ingredient_id: form.value.ingredient_id })
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
  try {
    await api.obrirLotEnUs({
      ingredient_id: Number(form.value.ingredient_id),
      lot_id: Number(form.value.lot_id),
      inici: new Date(form.value.inici).toISOString(),
      observacions: form.value.observacions || null,
    })
    toast.success('Lot obert com a "en ús"')
    form.value = { ingredient_id: '', lot_id: '', inici: araLocal(), observacions: '' }
    lotsIngredient.value = []
    await carregar()
  } catch (err) {
    toast.error(err instanceof ApiError ? err.detail : 'Error de connexió')
  } finally {
    enviant.value = false
  }
}

async function tancar(id) {
  try {
    await api.tancarLotEnUs(id, {})
    toast.success('Lot tancat')
    await carregar()
  } catch (err) {
    toast.error(err.detail || err.message)
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
      <p v-if="loading" class="text-base text-slate-400">Carregant…</p>
      <ul v-else class="space-y-2">
        <li v-for="o in oberts" :key="o.id" class="flex items-center justify-between rounded-xl bg-white p-3 text-base shadow-sm">
          <div>
            <div class="font-bold">{{ ingredientNom(o.ingredient_id) }}</div>
            <div class="text-slate-500">des de {{ new Date(o.inici).toLocaleString() }}</div>
          </div>
          <button type="button" class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold active:bg-slate-200" @click="tancar(o.id)">
            🔚 S'ha acabat
          </button>
        </li>
        <li v-if="!oberts.length" class="text-base text-slate-400">Ara mateix no hi ha res obert.</li>
      </ul>
    </section>
  </div>
</template>
