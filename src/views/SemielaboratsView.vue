<script setup>
import { onMounted, ref } from 'vue'
import { api, ApiError } from '../api.js'
import { repo } from '../db/repo.js'
import { db } from '../db/index.js'
import { afegirAlaCua } from '../db/queue.js'
import { useToast } from '../toast.js'
import { useResponsable } from '../responsable.js'
import { baixarExcel } from '../utils/baixarExcel.js'
import { fullSemielaborats } from '../utils/exportFulls.js'
import FormField from '../components/FormField.vue'
import Spinner from '../components/Spinner.vue'
import EmptyState from '../components/EmptyState.vue'

const toast = useToast()
const responsable = useResponsable()

const elaboracions = ref([])
const recents = ref([])
const loading = ref(true)
const enviant = ref(false)
const descarregant = ref(false)

function araLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const form = ref({
  elaboracio_id: '',
  quantitat: '',
  unitat: 'kg',
  elaborat_at: araLocal(),
  torn: 'mati',
  observacions: '',
})

async function carregar() {
  loading.value = true
  try {
    const [ela, rec] = await Promise.all([
      repo.elaboracions({ tipus: 'semielaborat', actiu: true }),
      repo.semielaborats(),
    ])
    elaboracions.value = ela
    recents.value = rec.slice(0, 8)
  } catch (err) {
    toast.error(err.detail || err.message)
  } finally {
    loading.value = false
  }
}
onMounted(carregar)

const elaboracioNom = (id) => elaboracions.value.find((e) => e.id === id)?.nom || `#${id}`

async function enviar() {
  if (!form.value.elaboracio_id || !form.value.quantitat || !form.value.unitat || !form.value.torn) {
    toast.error('Falten camps obligatoris')
    return
  }
  enviant.value = true
  const clientId = crypto.randomUUID()
  const payload = {
    elaboracio_id: Number(form.value.elaboracio_id),
    quantitat: Number(form.value.quantitat),
    unitat: form.value.unitat,
    elaborat_at: new Date(form.value.elaborat_at).toISOString(),
    torn: form.value.torn,
    responsable: responsable.value,
    observacions: form.value.observacions || null,
    client_id: clientId,
  }
  try {
    const resultat = await api.crearSemielaborat(payload)
    await db.lots.put({ ...resultat, tipus: 'semielaborat' })
    if (resultat.recepta_incompleta) {
      toast.error(`Lot ${resultat.codi} creat, però la recepta és incompleta: revisa els consums`)
    } else {
      toast.success(`Lot creat: ${resultat.codi}`)
    }
    const elaboracioPrevia = form.value.elaboracio_id
    form.value = { elaboracio_id: elaboracioPrevia, quantitat: '', unitat: form.value.unitat, elaborat_at: araLocal(), torn: form.value.torn, observacions: '' }
    await carregar()
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.detail)
    } else {
      const idTemporal = -Date.now()
      // El codi el genera sempre el servidor (PREFIX-DDMMYY-NN) —
      // intentar-lo calcular al dispositiu podria col·lidir amb un
      // altre dispositiu offline el mateix dia. Es mostra pendent
      // fins que es sincronitza de veritat.
      await db.lots.put({
        id: idTemporal,
        client_id: clientId,
        tipus: 'semielaborat',
        codi: null,
        creat_at: new Date().toISOString(),
        responsable: payload.responsable,
        observacions: payload.observacions,
        elaboracio_id: payload.elaboracio_id,
        quantitat: payload.quantitat,
        unitat: payload.unitat,
        elaborat_at: payload.elaborat_at,
        torn: payload.torn,
        anulat_per_id: null,
      })
      await afegirAlaCua({ clientId, operation: 'CREATE_SEMIELABORAT', entity: 'lot', tempId: idTemporal, payload })
      toast.success('Guardat en local (es sincronitzarà sol, amb el codi definitiu)')
      const elaboracioPrevia = form.value.elaboracio_id
      form.value = { elaboracio_id: elaboracioPrevia, quantitat: '', unitat: form.value.unitat, elaborat_at: araLocal(), torn: form.value.torn, observacions: '' }
      await carregar()
    }
  } finally {
    enviant.value = false
  }
}

async function exportar() {
  descarregant.value = true
  try {
    const full = await fullSemielaborats()
    await baixarExcel([full], `turon-semielaborats-${new Date().toISOString().slice(0, 10)}.xlsx`)
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

      <FormField label="🥣 Què has fet?" required>
        <select v-model="form.elaboracio_id" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2">
          <option value="" disabled>Tria-ho de la llista…</option>
          <option v-for="e in elaboracions" :key="e.id" :value="e.id">{{ e.nom }}</option>
        </select>
      </FormField>

      <div class="grid grid-cols-2 gap-3">
        <FormField label="⚖️ Quant n'has fet?" required>
          <input v-model="form.quantitat" type="number" step="0.01" min="0" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
        </FormField>
        <FormField label="En quina unitat?" required hint="kg, g, unitats...">
          <input v-model="form.unitat" type="text" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
        </FormField>
      </div>

      <FormField label="🕐 A quina hora ho has fet?" required>
        <input v-model="form.elaborat_at" type="datetime-local" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
      </FormField>

      <FormField label="☀️ Quin torn?" required>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="t in [{ v: 'mati', l: 'Matí', e: '🌅' }, { v: 'tarda', l: 'Tarda', e: '☀️' }, { v: 'nit', l: 'Nit', e: '🌙' }]"
            :key="t.v"
            type="button"
            class="rounded-xl border-2 p-3 text-center text-base font-bold"
            :class="form.torn === t.v ? 'border-turon-black bg-turon-black text-white' : 'border-slate-300 text-slate-600'"
            @click="form.torn = t.v"
          >
            {{ t.e }} {{ t.l }}
          </button>
        </div>
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
        <h2 class="text-base font-bold text-slate-600">El que has fet fa poc</h2>
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
          <li v-for="r in recents" :key="r.id" class="rounded-xl bg-white p-3 text-base shadow-sm">
            <div class="flex items-center gap-2">
              <span class="font-bold">{{ r.codi || elaboracioNom(r.elaboracio_id) }}</span>
              <span v-if="r.id < 0" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">⏳ Pendent (codi pendent)</span>
              <span v-else>— {{ elaboracioNom(r.elaboracio_id) }}</span>
            </div>
            <div class="text-slate-500">{{ r.quantitat }} {{ r.unitat }} · {{ r.torn }} · {{ r.responsable }}</div>
          </li>
        </ul>
        <EmptyState v-else text="Encara no hi ha res apuntat." />
      </template>
    </section>
  </div>
</template>
