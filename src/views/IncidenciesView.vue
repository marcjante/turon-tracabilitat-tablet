<script setup>
import { onMounted, ref } from 'vue'
import { api, ApiError } from '../api.js'
import { useToast } from '../toast.js'
import { useResponsable } from '../responsable.js'
import { baixarExcel } from '../utils/baixarExcel.js'
import { fullIncidencies } from '../utils/exportFulls.js'
import FormField from '../components/FormField.vue'
import LotSearchField from '../components/LotSearchField.vue'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const toast = useToast()
const responsable = useResponsable()

const recents = ref([])
const codisLot = ref({}) // lot_id -> codi, per mostrar-lo en comptes de l'id
const loading = ref(true)
const enviant = ref(false)
const descarregant = ref(false)
const expandit = ref(null) // id de la incidència oberta a la llista

const tipusInfo = {
  canvi_lot: { l: 'He canviat de lot', e: '🔄' },
  devolucio: { l: 'Devolució', e: '↩️' },
  alerta: { l: 'Alerta', e: '🚨' },
  altra: { l: 'Altra cosa', e: '❓' },
}

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
    const idsUnics = [
      ...new Set(
        recents.value.flatMap((i) => [i.lot_afectat_id, i.lot_anterior_id, i.lot_nou_id]).filter((id) => id != null),
      ),
    ]
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

function toggleExpandir(id) {
  expandit.value = expandit.value === id ? null : id
}

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
    <form class="space-y-5 rounded-2xl bg-white p-4 shadow-sm" @submit.prevent="enviar">
      <FormField label="🙋 Qui ets?" required>
        <input v-model="responsable" type="text" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" placeholder="El teu nom" />
      </FormField>

      <FormField label="⚠️ Què ha passat?" required>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="(info, v) in tipusInfo"
            :key="v"
            type="button"
            class="rounded-xl border-2 p-3 text-center text-base font-bold"
            :class="form.tipus === v ? 'border-turon-black bg-turon-black text-white' : 'border-slate-300 text-slate-600'"
            @click="form.tipus = v"
          >
            {{ info.e }} {{ info.l }}
          </button>
        </div>
      </FormField>

      <LotSearchField label="🔢 De quin lot es tracta?" required v-model="form.lot_afectat_id" />
      <LotSearchField v-if="form.tipus === 'canvi_lot'" label="🔢 Quin lot feies servir abans?" v-model="form.lot_anterior_id" />
      <LotSearchField v-if="form.tipus === 'canvi_lot'" label="🔢 Quin lot fas servir ara?" v-model="form.lot_nou_id" />

      <FormField label="✏️ Explica què ha passat" required>
        <textarea v-model="form.motiu" rows="3" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2"></textarea>
      </FormField>

      <FormField label="🛠️ Què has fet per solucionar-ho? (no cal)">
        <textarea v-model="form.mesura_adoptada" rows="2" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2"></textarea>
      </FormField>

      <FormField label="✅ Comprovació">
        <label class="flex items-center gap-3">
          <input v-model="form.comprovacio" type="checkbox" class="h-7 w-7" />
          <span class="text-base">Algú ha revisat que està tot bé</span>
        </label>
      </FormField>

      <FormField v-if="form.comprovacio" label="🙋 Qui ho ha revisat?">
        <input v-model="form.comprovat_per" type="text" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
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
          <li v-for="i in recents" :key="i.id" class="overflow-hidden rounded-xl bg-white shadow-sm">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 p-3 text-left text-base active:bg-slate-50"
              @click="toggleExpandir(i.id)"
            >
              <div>
                <div class="font-bold">
                  {{ tipusInfo[i.tipus]?.e }} {{ tipusInfo[i.tipus]?.l || i.tipus }} — lot {{ codisLot[i.lot_afectat_id] || `#${i.lot_afectat_id}` }}
                </div>
                <div class="text-slate-500">{{ i.motiu }}</div>
                <div class="text-slate-400">{{ i.responsable }} · {{ new Date(i.data_hora).toLocaleString() }}</div>
              </div>
              <span class="shrink-0 text-xl text-slate-400 transition-transform" :class="{ 'rotate-180': expandit === i.id }">▼</span>
            </button>
            <div v-if="expandit === i.id" class="space-y-1 border-t border-slate-100 bg-slate-50 p-3 text-base">
              <div v-if="i.lot_anterior_id"><span class="font-bold">Lot anterior:</span> {{ codisLot[i.lot_anterior_id] || `#${i.lot_anterior_id}` }}</div>
              <div v-if="i.lot_nou_id"><span class="font-bold">Lot nou:</span> {{ codisLot[i.lot_nou_id] || `#${i.lot_nou_id}` }}</div>
              <div v-if="i.mesura_adoptada"><span class="font-bold">Què s'ha fet:</span> {{ i.mesura_adoptada }}</div>
              <div>
                <span class="font-bold">Comprovació:</span>
                {{ i.comprovacio ? `✅ Sí${i.comprovat_per ? ' — ' + i.comprovat_per : ''}` : '❌ Encara no' }}
              </div>
            </div>
          </li>
        </ul>
        <EmptyState v-else emoji="🎉" text="Encara no hi ha res apuntat." />
      </template>
    </section>
  </div>
</template>
