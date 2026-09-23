<script setup>
import { ref } from 'vue'
import { repo } from '../db/repo.js'

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
    const trobats = await repo.cercarLots(query.value.trim())
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
    <span class="mb-1.5 block text-base font-bold text-slate-800">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </span>

    <div v-if="seleccionat" class="flex items-center justify-between rounded-lg border-2 border-turon-gold bg-turon-gold-light/30 px-3 py-3">
      <span class="text-lg font-bold text-turon-black">{{ seleccionat.codi }}</span>
      <button type="button" class="text-base font-bold text-turon-black underline" @click="canviar">Canviar</button>
    </div>
    <div v-else class="space-y-2">
      <p class="text-sm text-slate-500">Escriu el número de lot i prem "Cercar"</p>
      <div class="flex gap-2">
        <input
          v-model="query"
          type="text"
          placeholder="Número de lot…"
          class="w-full rounded-lg border-2 border-slate-300 px-3 py-2"
          @keyup.enter="cercar"
        />
        <button type="button" class="shrink-0 rounded-lg bg-slate-200 px-5 text-base font-bold active:bg-slate-300" @click="cercar">
          🔍 Cercar
        </button>
      </div>
      <ul v-if="resultats.length" class="max-h-56 space-y-1 overflow-y-auto rounded-lg border-2 border-slate-200 bg-white p-1">
        <li v-for="l in resultats" :key="l.id">
          <button
            type="button"
            class="w-full rounded-md px-3 py-3 text-left text-base active:bg-slate-100"
            @click="triar(l)"
          >
            <span class="font-bold">{{ l.codi }}</span>
            <span class="ml-2 text-sm text-slate-500">{{ l.tipus }}</span>
          </button>
        </li>
      </ul>
      <p v-else-if="cercat && !cercant" class="text-base text-slate-400">No s'ha trobat cap lot amb aquest número.</p>
    </div>
  </div>
</template>
