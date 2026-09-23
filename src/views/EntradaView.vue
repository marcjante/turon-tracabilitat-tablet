<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, ApiError } from '../api.js'
import { useToast } from '../toast.js'
import { useResponsable } from '../responsable.js'
import { baixarExcel } from '../utils/baixarExcel.js'
import { fullEntrades } from '../utils/exportFulls.js'
import FormField from '../components/FormField.vue'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const toast = useToast()
const responsable = useResponsable()

const ingredients = ref([])
const proveidors = ref([])
const recents = ref([])
const loading = ref(true)
const enviant = ref(false)
const descarregant = ref(false)
const novaProveidorNom = ref('')
const mostrarNouProveidor = ref(false)

const avui = new Date().toISOString().slice(0, 10)

const form = ref({
  ingredient_id: '',
  proveidor_id: '',
  lot_proveidor: '',
  data_recepcio: avui,
  caducitat: '',
  tipus_data: 'caducitat',
  observacions: '',
})

async function carregar() {
  loading.value = true
  try {
    const [ing, prov, ent] = await Promise.all([
      api.ingredients({ actiu: true }),
      api.proveidors({ actiu: true }),
      api.entrades(),
    ])
    ingredients.value = ing
    proveidors.value = prov
    recents.value = ent.slice(0, 8)
  } catch (err) {
    toast.error('No s\'han pogut carregar les dades: ' + (err.detail || err.message))
  } finally {
    loading.value = false
  }
}
onMounted(carregar)

async function crearProveidorRapid() {
  const nom = novaProveidorNom.value.trim()
  if (!nom) return
  try {
    const creat = await api.crearProveidor({ nom })
    proveidors.value.push(creat)
    form.value.proveidor_id = creat.id
    novaProveidorNom.value = ''
    mostrarNouProveidor.value = false
    toast.success(`Proveïdor "${nom}" afegit`)
  } catch (err) {
    toast.error(err.detail || err.message)
  }
}

async function enviar() {
  if (!form.value.ingredient_id || !form.value.proveidor_id || !form.value.lot_proveidor || !form.value.caducitat) {
    toast.error('Falten camps obligatoris')
    return
  }
  enviant.value = true
  try {
    await api.crearEntrada({
      ingredient_id: Number(form.value.ingredient_id),
      proveidor_id: Number(form.value.proveidor_id),
      lot_proveidor: form.value.lot_proveidor,
      data_recepcio: form.value.data_recepcio,
      caducitat: form.value.caducitat,
      tipus_data: form.value.tipus_data,
      responsable: responsable.value,
      observacions: form.value.observacions || null,
    })
    toast.success(`Entrada registrada: lot ${form.value.lot_proveidor}`)
    const ingredientPrevi = form.value.ingredient_id
    form.value = { ingredient_id: ingredientPrevi, proveidor_id: '', lot_proveidor: '', data_recepcio: avui, caducitat: '', tipus_data: 'caducitat', observacions: '' }
    await carregar()
  } catch (err) {
    if (err instanceof ApiError) toast.error(err.detail)
    else toast.error('Error de connexió')
  } finally {
    enviant.value = false
  }
}

async function exportar() {
  descarregant.value = true
  try {
    const full = await fullEntrades()
    await baixarExcel([full], `turon-entrades-${avui}.xlsx`)
  } catch (err) {
    toast.error('No s\'ha pogut generar l\'Excel: ' + (err.detail || err.message))
  } finally {
    descarregant.value = false
  }
}

const etiquetaData = computed(() =>
  form.value.tipus_data === 'caducitat' ? 'Quin dia caduca?' : 'Fins quin dia es pot fer servir?',
)
</script>

<template>
  <div class="space-y-5">
    <form class="space-y-5 rounded-2xl bg-white p-4 shadow-sm" @submit.prevent="enviar">
      <FormField label="🙋 Qui ets?" required>
        <input v-model="responsable" type="text" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" placeholder="El teu nom" />
      </FormField>

      <FormField label="📦 Què has rebut?" required>
        <select v-model="form.ingredient_id" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2">
          <option value="" disabled>Tria-ho de la llista…</option>
          <option v-for="i in ingredients" :key="i.id" :value="i.id">{{ i.nom }}</option>
        </select>
      </FormField>

      <FormField label="🚚 Qui te l'ha portat?" required>
        <select v-model="form.proveidor_id" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2">
          <option value="" disabled>Tria-ho de la llista…</option>
          <option v-for="p in proveidors" :key="p.id" :value="p.id">{{ p.nom }}</option>
        </select>
        <button type="button" class="mt-2 text-base font-bold text-turon-black underline" @click="mostrarNouProveidor = !mostrarNouProveidor">
          + Aquest proveïdor no hi és, afegir-lo
        </button>
        <div v-if="mostrarNouProveidor" class="mt-2 flex gap-2">
          <input v-model="novaProveidorNom" type="text" placeholder="Nom del proveïdor" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
          <button type="button" class="shrink-0 rounded-lg bg-turon-black px-4 text-white" @click="crearProveidorRapid">Afegir</button>
        </div>
      </FormField>

      <FormField label="🔢 Número de lot" required hint="Mira la bossa, la capsa o l'albarà: sol posar un número o codi">
        <input v-model="form.lot_proveidor" type="text" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
      </FormField>

      <FormField label="📅 Quin dia ha arribat?" required>
        <input v-model="form.data_recepcio" type="date" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
      </FormField>

      <FormField label="⏳ Aquest producte...">
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl border-2 p-3 text-center text-base font-bold"
            :class="form.tipus_data === 'caducitat' ? 'border-turon-black bg-turon-black text-white' : 'border-slate-300 text-slate-600'"
            @click="form.tipus_data = 'caducitat'"
          >
            Caduca
          </button>
          <button
            type="button"
            class="rounded-xl border-2 p-3 text-center text-base font-bold"
            :class="form.tipus_data === 'consum_preferent' ? 'border-turon-black bg-turon-black text-white' : 'border-slate-300 text-slate-600'"
            @click="form.tipus_data = 'consum_preferent'"
          >
            Es pot consumir fins
          </button>
        </div>
      </FormField>

      <FormField :label="`📆 ${etiquetaData}`" required>
        <input v-model="form.caducitat" type="date" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
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
        <h2 class="text-base font-bold text-slate-600">El que has apuntat fa poc</h2>
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
        <ul v-if="recents.length" class="space-y-2">
          <li v-for="e in recents" :key="e.id" class="rounded-xl bg-white p-3 text-base shadow-sm">
            <div class="font-bold">{{ e.codi }}</div>
            <div class="text-slate-500">Caduca {{ e.caducitat }} · {{ e.responsable }}</div>
          </li>
        </ul>
        <EmptyState v-else text="Encara no hi ha res apuntat." />
      </template>
    </section>
  </div>
</template>
