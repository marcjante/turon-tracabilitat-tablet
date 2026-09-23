<script setup>
import { ref } from 'vue'
import { useToast } from '../toast.js'
import { baixarExcel } from '../utils/baixarExcel.js'
import { totsElsFulls } from '../utils/exportFulls.js'

const toast = useToast()
const descarregant = ref(false)

async function exportarTot() {
  descarregant.value = true
  try {
    const fulls = await totsElsFulls()
    await baixarExcel(fulls, `turon-tracabilitat-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (err) {
    toast.error('No s\'ha pogut generar l\'Excel: ' + (err.detail || err.message))
  } finally {
    descarregant.value = false
  }
}

const items = [
  { to: 'entrades', label: 'He rebut una comanda', hint: 'Quan arriba menjar nou', emoji: '📥' },
  { to: 'lots-en-us', label: 'Obro un pot o sac nou', hint: 'Quan comences a fer-lo servir', emoji: '🔄' },
  { to: 'semielaborats', label: 'He preparat una base', hint: 'Cremes, planxes...', emoji: '🥣' },
  { to: 'productes', label: 'He fet productes', hint: 'El que has fet avui', emoji: '🥐' },
  { to: 'incidencies', label: 'Ha passat alguna cosa', hint: 'Canvi de lot, un problema...', emoji: '⚠️' },
  { to: 'traca', label: 'Buscar un lot', hint: 'D\'on ve o on ha anat', emoji: '🔍' },
  { to: 'catalegs', label: 'Configuració', hint: 'Ingredients, proveïdors...', emoji: '⚙️' },
]
</script>

<template>
  <div>
    <div class="from-turon-gold-light to-turon-gold -mx-4 -mt-4 mb-6 rounded-b-[2rem] bg-gradient-to-br px-6 pt-10 pb-8 text-center shadow-md">
      <img src="/turon-logo.png" alt="Fleca i Pastisseria Turòn" class="mx-auto h-16 w-auto drop-shadow-sm sm:h-20" />
      <p class="font-heading text-turon-black/70 mt-3 text-xs font-bold tracking-[0.2em] uppercase">
        Traçabilitat de l'obrador
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <router-link
        v-for="item in items"
        :key="item.to"
        :to="{ name: item.to }"
        class="active:bg-turon-gold-light/20 flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-white p-5 text-center shadow-sm transition active:scale-[0.98]"
      >
        <span class="from-turon-gold-light to-turon-gold flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-3xl">
          {{ item.emoji }}
        </span>
        <span class="font-heading text-turon-black text-base font-bold">{{ item.label }}</span>
        <span class="text-sm text-black/50">{{ item.hint }}</span>
      </router-link>
    </div>

    <button
      type="button"
      :disabled="descarregant"
      class="bg-turon-black mt-4 flex w-full items-center justify-center gap-2 rounded-2xl p-4 text-center text-base font-bold text-white shadow-sm active:opacity-90 disabled:opacity-50"
      @click="exportarTot"
    >
      {{ descarregant ? 'Generant…' : '📊 Baixar-ho tot en Excel' }}
    </button>
  </div>
</template>
