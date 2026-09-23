<script setup>
import { onMounted, ref } from 'vue'
import { api, ApiError } from '../api.js'
import { useToast } from '../toast.js'
import { useResponsable } from '../responsable.js'
import { baixarExcel } from '../utils/baixarExcel.js'
import { fullProductes } from '../utils/exportFulls.js'
import FormField from '../components/FormField.vue'

const toast = useToast()
const responsable = useResponsable()

const elaboracions = ref([])
const recents = ref([])
const semielaboratsDisponibles = ref([]) // lots vius de semielaborats, per triar-ne un
const componentsSemielaborat = ref([]) // components de la recepta que són semielaborats
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
  unitat: 'unitats',
  elaborat_at: araLocal(),
  torn: 'mati',
  observacions: '',
})
const lotsSemielaborats = ref({}) // { semielaborat_id: lot_id }

async function carregar() {
  loading.value = true
  try {
    const [ela, prod, sem] = await Promise.all([
      api.elaboracions({ tipus: 'producte', actiu: true }),
      api.productes(),
      api.semielaborats(),
    ])
    elaboracions.value = ela
    recents.value = prod.slice(0, 8)
    semielaboratsDisponibles.value = sem
  } catch (err) {
    toast.error(err.detail || err.message)
  } finally {
    loading.value = false
  }
}
onMounted(carregar)

const elaboracioNom = (id) => elaboracions.value.find((e) => e.id === id)?.nom || `#${id}`

function lotsPer(semielaboratId) {
  return semielaboratsDisponibles.value.filter((l) => l.elaboracio_id === semielaboratId)
}

async function carregarRecepta() {
  componentsSemielaborat.value = []
  lotsSemielaborats.value = {}
  if (!form.value.elaboracio_id) return
  try {
    const receptes = await api.receptes({ elaboracio_id: form.value.elaboracio_id })
    componentsSemielaborat.value = receptes.filter((r) => r.semielaborat_id !== null)
    for (const c of componentsSemielaborat.value) {
      lotsSemielaborats.value[c.semielaborat_id] = ''
    }
  } catch (err) {
    toast.error(err.detail || err.message)
  }
}

async function enviar() {
  if (!form.value.elaboracio_id || !form.value.quantitat || !form.value.unitat || !form.value.torn) {
    toast.error('Falten camps obligatoris')
    return
  }
  for (const c of componentsSemielaborat.value) {
    if (!lotsSemielaborats.value[c.semielaborat_id]) {
      toast.error('Falta triar el lot d\'algun semielaborat de la recepta')
      return
    }
  }
  enviant.value = true
  try {
    const lots_semielaborats = {}
    for (const [semId, lotId] of Object.entries(lotsSemielaborats.value)) {
      lots_semielaborats[semId] = Number(lotId)
    }
    const resultat = await api.crearProducte({
      elaboracio_id: Number(form.value.elaboracio_id),
      quantitat: Number(form.value.quantitat),
      unitat: form.value.unitat,
      elaborat_at: new Date(form.value.elaborat_at).toISOString(),
      torn: form.value.torn,
      responsable: responsable.value,
      observacions: form.value.observacions || null,
      lots_semielaborats,
    })
    if (resultat.recepta_incompleta) {
      toast.error(`Lot ${resultat.codi} creat, però la recepta és incompleta: revisa els consums`)
    } else {
      toast.success(`Lot creat: ${resultat.codi}`)
    }
    const elaboracioPrevia = form.value.elaboracio_id
    form.value = { elaboracio_id: elaboracioPrevia, quantitat: '', unitat: form.value.unitat, elaborat_at: araLocal(), torn: form.value.torn, observacions: '' }
    await carregar()
    await carregarRecepta()
  } catch (err) {
    toast.error(err instanceof ApiError ? err.detail : 'Error de connexió')
  } finally {
    enviant.value = false
  }
}

async function exportar() {
  descarregant.value = true
  try {
    const full = await fullProductes()
    await baixarExcel([full], `turon-productes-${new Date().toISOString().slice(0, 10)}.xlsx`)
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

      <FormField label="🥐 Què has fet?" required>
        <select v-model="form.elaboracio_id" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" @change="carregarRecepta">
          <option value="" disabled>Tria-ho de la llista…</option>
          <option v-for="e in elaboracions" :key="e.id" :value="e.id">{{ e.nom }}</option>
        </select>
      </FormField>

      <div v-if="componentsSemielaborat.length" class="space-y-3 rounded-xl bg-amber-50 p-3">
        <p class="text-base font-bold text-amber-900">🧁 Amb quins lots ho has fet?</p>
        <FormField
          v-for="c in componentsSemielaborat"
          :key="c.id"
          :label="elaboracioNom(c.semielaborat_id)"
          required
        >
          <select v-model="lotsSemielaborats[c.semielaborat_id]" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2">
            <option value="" disabled>Tria un lot…</option>
            <option v-for="l in lotsPer(c.semielaborat_id)" :key="l.id" :value="l.id">{{ l.codi }}</option>
          </select>
          <p v-if="!lotsPer(c.semielaborat_id).length" class="mt-1 text-sm text-red-500">
            No hi ha cap lot d'això fet (mira la ficha 3)
          </p>
        </FormField>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <FormField label="⚖️ Quant n'has fet?" required>
          <input v-model="form.quantitat" type="number" step="0.01" min="0" class="w-full rounded-lg border-2 border-slate-300 px-3 py-2" />
        </FormField>
        <FormField label="En quina unitat?" required hint="unitats, kg...">
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
      <p v-if="loading" class="text-base text-slate-400">Carregant…</p>
      <ul v-else class="space-y-2">
        <li v-for="r in recents" :key="r.id" class="rounded-xl bg-white p-3 text-base shadow-sm">
          <div class="font-bold">{{ r.codi }} — {{ elaboracioNom(r.elaboracio_id) }}</div>
          <div class="text-slate-500">{{ r.quantitat }} {{ r.unitat }} · {{ r.torn }} · {{ r.responsable }}</div>
        </li>
        <li v-if="!recents.length" class="text-base text-slate-400">Encara no hi ha res apuntat.</li>
      </ul>
    </section>
  </div>
</template>
