<script setup>
import { onMounted, ref } from 'vue'
import { api, ApiError } from '../api.js'
import { useToast } from '../toast.js'
import { useResponsable } from '../responsable.js'
import { baixarExcel } from '../utils/baixarExcel.js'
import { fullIncidencies } from '../utils/exportFulls.js'
import FormField from '../components/FormField.vue'
import LotSearchField from '../components/LotSearchField.vue'

const toast = useToast()
const responsable = useResponsable()

const recents = ref([])
const codisLot = ref({}) // lot_id -> codi, per mostrar-lo en comptes de l'id
const loading = ref(true)
const enviant = ref(false)
const descarregant = ref(false)

const form = ref({
  tipus: 'canvi_lot',
  responsable: '',
  lot_afectat_id: null,
  lot_anterior_id: null,
  lot_nou_id: null,
  motiu: '',
  mesura_adoptada: '',
  comprovacio: false,
  comprovat_per: '',
})

async function carregar() {
  loading.value = true
  try {
    recents.value = (await api.incidencies()).slice(0, 8)
    const idsUnics = [...new Set(recents.value.map((i) => i.lot_afectat_id).filter((id) => id != null))]
    const resolts = await Promise.all(
      idsUnics.map(async (id) => {
        try {
          return [id, (await api.obtenirLot(id)).codi]
        } catch {
          return [id, `#${id}`]
        }
      }),
    )
    codisLot.value = Object.fromEntries(resolts)
  } catch (err) {
    toast.error(err.detail || err.message)
  } finally {
    loading.value = false
  }
}
onMounted(carregar)

async function enviar() {
  if (!form.value.lot_afectat_id || !form.value.motiu) {
    toast.error('Falten camps obligatoris')
    return
  }
  enviant.value = true
  try {
    await api.crearIncidencia({
      tipus: form.value.tipus,
      responsable: responsable.value,
      lot_afectat_id: form.value.lot_afectat_id,
      lot_anterior_id: form.value.lot_anterior_id,
      lot_nou_id: form.value.lot_nou_id,
      motiu: form.value.motiu,
      mesura_adoptada: form.value.mesura_adoptada || null,
      comprovacio: form.value.comprovacio,
      comprovat_per: form.value.comprovacio ? form.value.comprovat_per || null : null,
    })
    toast.success('Incidència registrada')
    form.value = {
      tipus: 'canvi_lot', responsable: '', lot_afectat_id: null, lot_anterior_id: null, lot_nou_id: null,
      motiu: '', mesura_adoptada: '', comprovacio: false, comprovat_per: '',
    }
    await carregar()
  } catch (err) {
    toast.error(err instanceof ApiError ? err.detail : 'Error de connexió')
  } finally {
    enviant.value = false
  }
}

async function exportar() {
  descarregant.value = true
  try {
    const full = await fullIncidencies()
    await baixarExcel([full], `turon-incidencies-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (err) {
    toast.error('No s\'ha pogut generar l\'Excel: ' + (err.detail || err.message))
  } finally {
    descarregant.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <form class="space-y-4 rounded-2xl bg-white p-4 shadow-sm" @submit.prevent="enviar">
      <FormField label="Responsable" required>
        <input v-model="responsable" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="El teu nom" />
      </FormField>

      <FormField label="Tipus d'incidència" required>
        <select v-model="form.tipus" class="w-full rounded-lg border border-slate-300 px-3 py-2">
          <option value="canvi_lot">Canvi de lot a mig torn</option>
          <option value="devolucio">Devolució</option>
          <option value="alerta">Alerta</option>
          <option value="altra">Altra</option>
        </select>
      </FormField>

      <LotSearchField label="Lot afectat" required v-model="form.lot_afectat_id" />
      <LotSearchField v-if="form.tipus === 'canvi_lot'" label="Lot anterior" v-model="form.lot_anterior_id" />
      <LotSearchField v-if="form.tipus === 'canvi_lot'" label="Lot nou" v-model="form.lot_nou_id" />

      <FormField label="Motiu" required>
        <textarea v-model="form.motiu" rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2"></textarea>
      </FormField>

      <FormField label="Mesura adoptada">
        <textarea v-model="form.mesura_adoptada" rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2"></textarea>
      </FormField>

      <FormField label="Comprovació">
        <label class="flex items-center gap-2">
          <input v-model="form.comprovacio" type="checkbox" class="h-5 w-5" />
          <span>S'ha comprovat la incidència</span>
        </label>
      </FormField>

      <FormField v-if="form.comprovacio" label="Comprovat per">
        <input v-model="form.comprovat_per" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </FormField>

      <button type="submit" :disabled="enviant" class="w-full rounded-xl bg-turon-black py-3 text-base font-semibold text-white disabled:opacity-50">
        {{ enviant ? 'Registrant…' : 'Registrar incidència' }}
      </button>
    </form>

    <section>
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-500">Últimes incidències</h2>
        <button
          type="button"
          :disabled="descarregant"
          class="text-sm font-medium text-turon-black disabled:opacity-50"
          @click="exportar"
        >
          {{ descarregant ? 'Generant…' : '📥 Descarregar Excel' }}
        </button>
      </div>
      <p v-if="loading" class="text-sm text-slate-400">Carregant…</p>
      <ul v-else class="space-y-2">
        <li v-for="i in recents" :key="i.id" class="rounded-xl bg-white p-3 text-sm shadow-sm">
          <div class="font-medium">{{ i.tipus }} — lot {{ codisLot[i.lot_afectat_id] || `#${i.lot_afectat_id}` }}</div>
          <div class="text-slate-500">{{ i.motiu }}</div>
          <div class="text-slate-400">{{ i.responsable }} · {{ new Date(i.data_hora).toLocaleString() }}</div>
        </li>
        <li v-if="!recents.length" class="text-sm text-slate-400">Encara no hi ha incidències.</li>
      </ul>
    </section>
  </div>
</template>
