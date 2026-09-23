<script setup>
import { useRoute, useRouter } from 'vue-router'
import ToastHost from './components/ToastHost.vue'

const route = useRoute()
const router = useRouter()

const titles = {
  home: 'Turon — Traçabilitat',
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
  <div class="min-h-full bg-slate-100">
    <ToastHost />
    <header class="sticky top-0 z-40 flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
      <button
        v-if="route.name !== 'home'"
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl active:bg-slate-200"
        @click="router.push({ name: 'home' })"
      >
        ←
      </button>
      <h1 class="truncate text-lg font-semibold text-slate-900">{{ titles[route.name] || 'Turon' }}</h1>
    </header>
    <main class="mx-auto max-w-2xl px-4 py-4 pb-16">
      <router-view />
    </main>
  </div>
</template>
