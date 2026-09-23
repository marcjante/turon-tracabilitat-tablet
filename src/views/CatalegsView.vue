<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, ApiError } from '../api.js'
import { useToast } from '../toast.js'
import FormField from '../components/FormField.vue'
import Spinner from '../components/Spinner.vue'

const toast = useToast()

const tabs = [
  { key: 'ingredients', label: 'Ingredients' },
  { key: 'proveidors', label: 'Proveïdors' },
  { key: 'elaboracions', label: 'Elaboracions' },
  { key: 'receptes', label: 'Receptes' },
]
const tabActiu = ref('ingredients')

const ingredients = ref([])
const proveidors = ref([])
const elaboracions = ref([])
const receptes = ref([])
const loading = ref(true)

async function carregar() {
  loading.value = true
  try {
    const [ing, prov, ela] = await Promise.all([api.ingredients(), api.proveidors(), api.elaboracions()])
    ingredients.value = ing
    proveidors.value = prov
    elaboracions.value = ela
  } catch (err) {
    toast.error(err.detail || err.message)
  } finally {
    loading.value = false
  }
}
onMounted(carregar)

// --- Ingredients ---
const nouIngredient = ref('')
async function crearIngredient() {
  if (!nouIngredient.value.trim()) return
  try {
    const creat = await api.crearIngredient({ nom: nouIngredient.value.trim() })
    ingredients.value.push(creat)
    nouIngredient.value = ''
    toast.success('Ingredient afegit')
  } catch (err) {
    toast.error(err instanceof ApiError ? err.detail : 'Error de connexió')
  }
}
// --- Proveïdors ---
const nouProveidor = ref('')
async function crearProveidor() {
  if (!nouProveidor.value.trim()) return
  try {
    const creat = await api.crearProveidor({ nom: nouProveidor.value.trim() })
    proveidors.value.push(creat)
    nouProveidor.value = ''
    toast.success('Proveïdor afegit')
  } catch (err) {
    toast.error(err instanceof ApiError ? err.detail : 'Error de connexió')
  }
}

// --- Elaboracions ---
const novaElaboracio = ref({ nom: '', tipus: 'semielaborat', prefix_lot: '' })
async function crearElaboracioForm() {
  if (!novaElaboracio.value.nom.trim() || !novaElaboracio.value.prefix_lot.trim()) {
    toast.error('Falten camps obligatoris')
    return
  }
  try {
    const creada = await api.crearElaboracio({
      nom: novaElaboracio.value.nom.trim(),
      tipus: novaElaboracio.value.tipus,
      prefix_lot: novaElaboracio.value.prefix_lot.trim().toUpperCase(),
    })
    elaboracions.value.push(creada)
    novaElaboracio.value = { nom: '', tipus: novaElaboracio.value.tipus, prefix_lot: '' }
    toast.success('Elaboració afegida')
  } catch (err) {
    toast.error(err instanceof ApiError ? err.detail : 'Error de connexió')
  }
}

// --- Receptes ---
const elaboracioSeleccionada = ref('')
const receptaComponentTipus = ref('ingredient')
const receptaComponentId = ref('')

const semielaboratsCatalag = computed(() => elaboracions.value.filter((e) => e.tipus === 'semielaborat'))

async function carregarReceptes() {
  receptes.value = []
  receptaComponentId.value = ''
  if (!elaboracioSeleccionada.value) return
  try {
    receptes.value = await api.receptes({ elaboracio_id: elaboracioSeleccionada.value })
  } catch (err) {
    toast.error(err.detail || err.message)
  }
}

function nomComponent(r) {
  if (r.ingredient_id) return ingredients.value.find((i) => i.id === r.ingredient_id)?.nom || `ingredient #${r.ingredient_id}`
  return elaboracions.value.find((e) => e.id === r.semielaborat_id)?.nom || `semielaborat #${r.semielaborat_id}`
}

async function afegirComponent() {
  if (!elaboracioSeleccionada.value || !receptaComponentId.value) {
    toast.error('Falten camps obligatoris')
    return
  }
  try {
    const payload = { elaboracio_id: Number(elaboracioSeleccionada.value) }
    if (receptaComponentTipus.value === 'ingredient') payload.ingredient_id = Number(receptaComponentId.value)
    else payload.semielaborat_id = Number(receptaComponentId.value)
    const creada = await api.crearRecepta(payload)
    receptes.value.push(creada)
    receptaComponentId.value = ''
    toast.success('Component afegit a la recepta')
  } catch (err) {
    toast.error(err instanceof ApiError ? err.detail : 'Error de connexió')
  }
}

async function eliminarComponent(id) {
  try {
    await api.eliminarRecepta(id)
    receptes.value = receptes.value.filter((r) => r.id !== id)
    toast.success('Component eliminat')
  } catch (err) {
    toast.error(err.detail || err.message)
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-2 overflow-x-auto">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        class="shrink-0 rounded-full px-4 py-2 text-sm font-medium"
        :class="tabActiu === t.key ? 'bg-turon-black text-white' : 'bg-white text-slate-600'"
        @click="tabActiu = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <Spinner v-if="loading" />

    <template v-else>
      <!-- Ingredients -->
      <div v-if="tabActiu === 'ingredients'" class="space-y-4">
        <div class="flex gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <input v-model="nouIngredient" type="text" placeholder="Nom de l'ingredient" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" @keyup.enter="crearIngredient" />
          <button type="button" class="shrink-0 rounded-lg bg-turon-black px-4 text-white" @click="crearIngredient">Afegir</button>
        </div>
        <ul class="space-y-2">
          <li v-for="i in ingredients" :key="i.id" class="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
            <span :class="{ 'text-slate-400 line-through': !i.actiu }">{{ i.nom }}</span>
          </li>
        </ul>
      </div>

      <!-- Proveïdors -->
      <div v-if="tabActiu === 'proveidors'" class="space-y-4">
        <div class="flex gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <input v-model="nouProveidor" type="text" placeholder="Nom del proveïdor" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" @keyup.enter="crearProveidor" />
          <button type="button" class="shrink-0 rounded-lg bg-turon-black px-4 text-white" @click="crearProveidor">Afegir</button>
        </div>
        <ul class="space-y-2">
          <li v-for="p in proveidors" :key="p.id" class="rounded-xl bg-white p-3 text-sm shadow-sm">
            <span :class="{ 'text-slate-400 line-through': !p.actiu }">{{ p.nom }}</span>
          </li>
        </ul>
      </div>

      <!-- Elaboracions -->
      <div v-if="tabActiu === 'elaboracions'" class="space-y-4">
        <div class="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <FormField label="Nom" required>
            <input v-model="novaElaboracio.nom" type="text" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
          </FormField>
          <FormField label="Tipus" required>
            <select v-model="novaElaboracio.tipus" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2">
              <option value="semielaborat">Semielaborat</option>
              <option value="producte">Producte</option>
            </select>
          </FormField>
          <FormField label="Prefix del lot" required hint="Per exemple: PPE, MEL, CAR">
            <input v-model="novaElaboracio.prefix_lot" type="text" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
          </FormField>
          <button type="button" class="w-full rounded-xl bg-turon-black py-3 text-sm font-semibold text-white" @click="crearElaboracioForm">
            Afegir elaboració
          </button>
        </div>
        <ul class="space-y-2">
          <li v-for="e in elaboracions" :key="e.id" class="rounded-xl bg-white p-3 text-sm shadow-sm">
            <span :class="{ 'text-slate-400 line-through': !e.actiu }">{{ e.nom }}</span>
            <span class="ml-2 text-xs text-slate-500">{{ e.tipus }} · {{ e.prefix_lot }}</span>
          </li>
        </ul>
      </div>

      <!-- Receptes -->
      <div v-if="tabActiu === 'receptes'" class="space-y-4">
        <div class="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <FormField label="Elaboració" required>
            <select v-model="elaboracioSeleccionada" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" @change="carregarReceptes">
              <option value="" disabled>Selecciona…</option>
              <option v-for="e in elaboracions" :key="e.id" :value="e.id">{{ e.nom }} ({{ e.tipus }})</option>
            </select>
          </FormField>

          <template v-if="elaboracioSeleccionada">
            <FormField label="Tipus de component">
              <div class="flex gap-4">
                <label class="flex items-center gap-2"><input v-model="receptaComponentTipus" type="radio" value="ingredient" /> Ingredient</label>
                <label class="flex items-center gap-2"><input v-model="receptaComponentTipus" type="radio" value="semielaborat" /> Semielaborat</label>
              </div>
            </FormField>
            <FormField label="Component" required>
              <select v-model="receptaComponentId" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2">
                <option value="" disabled>Selecciona…</option>
                <template v-if="receptaComponentTipus === 'ingredient'">
                  <option v-for="i in ingredients" :key="i.id" :value="i.id">{{ i.nom }}</option>
                </template>
                <template v-else>
                  <option v-for="s in semielaboratsCatalag" :key="s.id" :value="s.id">{{ s.nom }}</option>
                </template>
              </select>
            </FormField>
            <button type="button" class="w-full rounded-xl bg-turon-black py-3 text-sm font-semibold text-white" @click="afegirComponent">
              Afegir component
            </button>

            <ul class="space-y-2 pt-2">
              <li v-for="r in receptes" :key="r.id" class="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <span>{{ nomComponent(r) }}</span>
                <button type="button" class="text-red-600" @click="eliminarComponent(r.id)">Eliminar</button>
              </li>
              <li v-if="!receptes.length" class="text-sm text-slate-400">Aquesta elaboració encara no té recepta.</li>
            </ul>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
