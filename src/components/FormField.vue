<script setup>
defineProps({ label: String, required: Boolean, hint: String })
</script>

<template>
  <label class="block">
    <span class="block text-sm font-medium text-slate-700 mb-1">
      {{ label }}<span v-if="required" class="text-red-500"> *</span>
    </span>
    <slot />
    <span v-if="hint" class="mt-1 block text-xs text-slate-500">{{ hint }}</span>
  </label>
</template>
