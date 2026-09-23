<script setup>
import { useToast } from '../toast.js'

const { items } = useToast()
</script>

<template>
  <div class="fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3 pointer-events-none">
    <div
      v-for="item in items"
      :key="item.id"
      class="pointer-events-auto w-full max-w-md rounded-xl px-4 py-3 text-base font-medium shadow-lg"
      :class="item.kind === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'"
    >
      {{ item.message }}
    </div>
  </div>
</template>
