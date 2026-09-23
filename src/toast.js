import { reactive } from 'vue'

const state = reactive({ items: [] })
let nextId = 1

function push(kind, message) {
  const id = nextId++
  state.items.push({ id, kind, message })
  setTimeout(() => {
    const i = state.items.findIndex((t) => t.id === id)
    if (i !== -1) state.items.splice(i, 1)
  }, 4000)
}

export function useToast() {
  return {
    items: state.items,
    success: (message) => push('success', message),
    error: (message) => push('error', message),
  }
}
