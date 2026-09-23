import { ref, watch } from 'vue'

// El mismo trabajador suele registrar varias líneas seguidas — recordar el
// último nombre en este dispositivo evita reescribirlo cada vez.
const KEY = 'turon:responsable'
const responsable = ref(localStorage.getItem(KEY) || '')

watch(responsable, (value) => {
  localStorage.setItem(KEY, value)
})

export function useResponsable() {
  return responsable
}
