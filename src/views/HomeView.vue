<script setup>
const items = [
  { to: 'entrades', label: 'Entrada de matèries primeres', hint: 'Ficha 1', emoji: '📥' },
  { to: 'lots-en-us', label: 'Lots en ús', hint: 'Ficha 2', emoji: '🔄' },
  { to: 'semielaborats', label: 'Semielaborats', hint: 'Ficha 3', emoji: '🥣' },
  { to: 'productes', label: 'Producció diària', hint: 'Ficha 4', emoji: '🥐' },
  { to: 'incidencies', label: 'Canvi de lot / Incidència', hint: 'Ficha 5', emoji: '⚠️' },
  { to: 'traca', label: 'Traçabilitat', hint: 'Cercar un lot', emoji: '🔍' },
  { to: 'catalegs', label: 'Catàlegs', hint: 'Ingredients, proveïdors, receptes', emoji: '⚙️' },
]
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <router-link
      v-for="item in items"
      :key="item.to"
      :to="{ name: item.to }"
      class="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-5 text-center shadow-sm active:bg-slate-50"
    >
      <span class="text-4xl">{{ item.emoji }}</span>
      <span class="text-base font-semibold text-slate-900">{{ item.label }}</span>
      <span class="text-xs text-slate-500">{{ item.hint }}</span>
    </router-link>
  </div>
</template>
