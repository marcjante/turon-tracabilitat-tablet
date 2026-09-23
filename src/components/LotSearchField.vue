<script setup>
import { ref } from 'vue'
import { api } from '../api.js'

const props = defineProps({
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  tipusFiltre: { type: String, default: null }, // 'materia_primera' | 'semielaborat' | 'producte'
  modelValue: { type: Number, default: null },
})
const emit = defineEmits(['update:modelValue'])

const query = ref('')
const resultats = ref([])
const cercant = ref(false)
const seleccionat = ref(null)
const cercat = ref(false)

async function cercar() {
  if (!query.value.trim()) return
  cercant.value = true
  cercat.value = true
  try {
    const trobats = await api.cercarLots(query.value.trim())
    resultats.value = props.tipusFiltre ? trobats.filter((l) => l.tipus === props.tipusFiltre) : trobats
  } catch {
    resultats.value = []
  } finally {
    cercant.value = false
  }
}

function triar(lot) {
  seleccionat.value = lot
  resultats.value = []
  query.value = ''
  emit('update:modelValue', lot.id)
}

function canviar() {
  seleccionat.value = null
  cercat.value = false
  emit('update:modelValue', null)
}
</script>

<template>
  <div>
    <label class="mb-1 block text-sm font-medium text-slate-700">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </label>

    <div v-if="seleccionat" class="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
      <span class="font-medium text-indigo-900">{{ seleccionat.codi }}</span>
      <button type="button" class="text-sm font-medium text-indigo-600" @click="canviar">Canviar</button>
    </div>
    <div v-else class="space-y-2">
      <div class="flex gap-2">
        <input
          v-model="query"
          type="text"
          placeholder="Codi del lot…"
          class="w-full rounded-lg border border-slate-300 px-3 py-2"
          @keyup.enter="cercar"
        />
        <button type="button" class="shrink-0 rounded-lg bg-slate-200 px-4 text-sm font-medium active:bg-slate-300" @click="cercar">
          Cercar
        </button>
      </div>
      <ul v-if="resultats.length" class="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
        <li v-for="l in resultats" :key="l.id">
          <button
            type="button"
            class="w-full rounded-md px-2 py-2 text-left text-sm active:bg-slate-100"
            @click="triar(l)"
          >
            <span class="font-medium">{{ l.codi }}</span>
            <span class="ml-2 text-xs text-slate-500">{{ l.tipus }}</span>
          </button>
        </li>
      </ul>
      <p v-else-if="cercat && !cercant" class="text-sm text-slate-400">Cap lot trobat.</p>
    </div>
  </div>
</template>
