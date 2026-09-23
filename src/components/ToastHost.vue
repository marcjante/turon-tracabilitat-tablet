<script setup>
import { useToast } from '../toast.js'

const { items } = useToast()
</script>

<template>
  <div class="fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3 pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="item in items"
        :key="item.id"
        class="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-base font-bold shadow-md"
        :class="item.kind === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'"
        style="animation: toast-in 0.2s ease"
      >
        <span class="text-xl">{{ item.kind === 'success' ? '✅' : '⚠️' }}</span>
        <span>{{ item.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  position: absolute;
}
.toast-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
