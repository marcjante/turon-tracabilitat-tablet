<script setup>
import { useRoute, useRouter } from 'vue-router'
import ToastHost from './components/ToastHost.vue'

const route = useRoute()
const router = useRouter()

const titles = {
  entrades: 'Entrada de matèries primeres',
  'lots-en-us': 'Lots en ús',
  semielaborats: 'Producció de semielaborats',
  productes: 'Producció diària',
  incidencies: 'Canvi de lot / Incidència',
  traca: 'Traçabilitat',
  catalegs: 'Catàlegs',
}
</script>

<template>
  <div class="min-h-full bg-[#faf6ee]">
    <ToastHost />
    <header
      v-if="route.name !== 'home'"
      class="sticky top-0 z-40 flex items-center gap-3 border-b-2 border-turon-gold bg-white px-4 py-3 shadow-sm"
    >
      <button
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-turon-black text-xl text-white active:opacity-80"
        @click="router.push({ name: 'home' })"
      >
        ←
      </button>
      <h1 class="font-heading truncate text-lg font-bold text-turon-black">{{ titles[route.name] || 'Turòn' }}</h1>
    </header>
    <main class="mx-auto max-w-2xl px-4 py-4 pb-16" :class="{ 'pt-0': route.name === 'home' }">
      <router-view />
    </main>
  </div>
</template>
