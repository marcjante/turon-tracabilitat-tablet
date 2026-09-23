<script setup>
import { useRoute, useRouter } from 'vue-router'
import ToastHost from './components/ToastHost.vue'
import { useOnlineStatus } from './useOnlineStatus.js'
import { actualitzacioDisponible, aplicarActualitzacio } from './pwa.js'

const route = useRoute()
const router = useRouter()
const { enLinia } = useOnlineStatus()

const titles = {
  entrades: 'He rebut una comanda',
  'lots-en-us': 'Obro un pot o sac nou',
  semielaborats: 'He preparat una base',
  productes: 'He fet productes',
  incidencies: 'Ha passat alguna cosa',
  traca: 'Buscar un lot',
  catalegs: 'Configuració',
}
</script>

<template>
  <div class="min-h-full bg-[#faf6ee]">
    <ToastHost />

    <div v-if="actualitzacioDisponible" class="sticky top-0 z-50 flex items-center justify-between gap-2 bg-turon-black px-4 py-2 text-sm font-bold text-white">
      <span>🔄 Hi ha una versió nova de l'app</span>
      <button type="button" class="rounded-lg bg-turon-gold px-3 py-1.5 text-turon-black" @click="aplicarActualitzacio">
        Actualitzar
      </button>
    </div>

    <div v-if="!enLinia" class="sticky z-40 bg-red-600 px-4 py-1.5 text-center text-xs font-bold text-white" :class="actualitzacioDisponible ? 'top-9' : 'top-0'">
      🔴 Sense connexió · treballant en mode local
    </div>

    <header
      v-if="route.name !== 'home'"
      class="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-turon-gold bg-white px-4 py-3 shadow-sm"
    >
      <button
        type="button"
        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-turon-black text-2xl text-white active:opacity-80"
        @click="router.push({ name: 'home' })"
      >
        ←
      </button>
      <h1 class="font-heading truncate text-xl font-bold text-turon-black">{{ titles[route.name] || 'Turòn' }}</h1>
      <span class="ml-auto shrink-0 text-xl" :title="enLinia ? 'En línia' : 'Sense connexió'">{{ enLinia ? '🟢' : '🔴' }}</span>
    </header>
    <main class="mx-auto max-w-2xl px-4 py-4 pb-16" :class="{ 'pt-0': route.name === 'home' }">
      <router-view v-slot="{ Component }">
        <Transition name="pagina" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </main>
  </div>
</template>
