type Listener = (schemaType: string | null) => void

const listeners = new Set<Listener>()
let current: string | null = null

export function openHelpDialog(schemaType: string): void {
  current = schemaType
  listeners.forEach((l) => l(schemaType))
}

export function closeHelpDialog(): void {
  current = null
  listeners.forEach((l) => l(null))
}

export function subscribeHelpDialog(listener: Listener): () => void {
  listeners.add(listener)
  listener(current)
  return () => {
    listeners.delete(listener)
  }
}
