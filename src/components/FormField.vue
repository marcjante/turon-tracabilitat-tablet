<script setup>
defineProps({ label: String, required: Boolean, hint: String })
</script>

<template>
  <label class="block">
    <span class="mb-1.5 block text-base font-bold text-slate-800">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </span>
    <slot />
    <span v-if="hint" class="mt-1.5 block text-sm text-slate-500">{{ hint }}</span>
  </label>
</template>
