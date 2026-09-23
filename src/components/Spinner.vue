<script setup>
defineProps({ label: { type: String, default: 'Carregant…' } })
</script>

<template>
  <div class="flex items-center justify-center gap-3 py-6 text-slate-400">
    <span class="spinner" />
    <span class="text-base">{{ label }}</span>
  </div>
</template>

<style scoped>
.spinner {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  border: 3px solid var(--color-turon-gold-light);
  border-top-color: var(--color-turon-gold);
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
