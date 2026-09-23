<script setup>
defineProps({ emoji: { type: String, default: '📭' }, text: { type: String, required: true } })
</script>

<template>
  <div class="flex flex-col items-center gap-2 rounded-xl bg-white/60 py-8 text-center shadow-sm">
    <span class="text-4xl opacity-60">{{ emoji }}</span>
    <span class="text-base text-slate-400">{{ text }}</span>
  </div>
</template>
