<script setup>
import { ref } from 'vue'
import { api, ApiError } from '../api.js'
import { useToast } from '../toast.js'
import LotSearchField from '../components/LotSearchField.vue'
import FormField from '../components/FormField.vue'

const toast = useToast()

const lotId = ref(null)
const resultat = ref(null)
const direccio = ref('')
const cercant = ref(false)

const mostrarAnular = ref(false)
const lotNouId = ref(null)
const motiuAnular = ref('')
const anulant = ref(false)

const grups = [
  { key: 'materia_primera', label: 'Matèries primeres' },
  { key: 'semielaborat', label: 'Semielaborats' },
  { key: 'producte', label: 'Productes' },
]

async function cercarTraca(sentit) {
  if (!lotId.value) return
  cercant.value = true
  direccio.value = sentit
  try {
    resultat.value = sentit === 'endavant' ? await api.tracaEndavant(lotId.value) : await api.tracaEnrere(lotId.value)
  } catch (err) {
    toast.error(err.detail || err.message)
    resultat.value = null
  } finally {
    cercant.value = false
  }
}

function reiniciar() {
  lotId.value = null
  resultat.value = null
  direccio.value = ''
  mostrarAnular.value = false
  lotNouId.value = null
  motiuAnular.value = ''
}

async function anular() {
  if (!lotId.value || !lotNouId.value) {
    toast.error('Falta triar el lot nou')
    return
  }
  anulant.value = true
  try {
    await api.anularLot(lotId.value, { lot_nou_id: lotNouId.value, motiu: motiuAnular.value || null })
    toast.success('Lot anul·lat')
    reiniciar()
  } catch (err) {
    toast.error(err instanceof ApiError ? err.detail : 'Error de connexió')
  } finally {
    anulant.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
      <LotSearchField label="Lot a cercar" required v-model="lotId" />
      <div class="flex gap-3">
        <button
          type="button"
          :disabled="!lotId || cercant"
          class="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
          @click="cercarTraca('enrere')"
        >
          ← Traça enrere
        </button>
        <button
          type="button"
          :disabled="!lotId || cercant"
          class="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
          @click="cercarTraca('endavant')"
        >
          Traça endavant →
        </button>
      </div>
    </div>

    <div v-if="resultat" class="space-y-4">
      <section v-for="g in grups" :key="g.key">
        <h2 class="mb-2 text-sm font-semibold text-slate-500">{{ g.label }}</h2>
        <ul class="space-y-2">
          <li v-for="item in resultat[g.key]" :key="item.lot_id" class="rounded-xl bg-white p-3 text-sm shadow-sm">
            <div class="font-medium">{{ item.codi }}</div>
            <div class="text-slate-500">{{ item.nom }} <span v-if="item.quantitat">· {{ item.quantitat }}</span></div>
            <div class="text-slate-400">{{ item.data }}</div>
          </li>
          <li v-if="!resultat[g.key].length" class="text-sm text-slate-400">—</li>
        </ul>
      </section>

      <section class="rounded-2xl bg-white p-4 shadow-sm">
        <button type="button" class="text-sm font-medium text-red-600" @click="mostrarAnular = !mostrarAnular">
          Anul·lar el lot cercat
        </button>
        <div v-if="mostrarAnular" class="mt-3 space-y-3">
          <LotSearchField label="Lot nou que el substitueix" required v-model="lotNouId" />
          <FormField label="Motiu">
            <textarea v-model="motiuAnular" rows="2" class="w-full rounded-lg border border-slate-300 px-3 py-2"></textarea>
          </FormField>
          <button
            type="button"
            :disabled="anulant"
            class="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
            @click="anular"
          >
            {{ anulant ? 'Anul·lant…' : 'Confirmar anul·lació' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
