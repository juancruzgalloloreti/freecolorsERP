'use client'

import { useEffect } from 'react'

type HotkeyHandler = (event: KeyboardEvent) => void

function normalize(event: KeyboardEvent) {
  if (typeof event.key !== 'string' || event.key.length === 0) return null
  const keys: string[] = []
  if (event.ctrlKey) keys.push('ctrl')
  if (event.altKey) keys.push('alt')
  if (event.shiftKey) keys.push('shift')
  keys.push(event.key.toLowerCase())
  return keys.join('+')
}

export function useHotkeys(bindings: Record<string, HotkeyHandler>, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const handler = (event: KeyboardEvent) => {
      const key = normalize(event)
      if (!key) return
      const callback = bindings[key] ?? bindings[event.key.toLowerCase()]
      if (!callback) return
      callback(event)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [bindings, enabled])
}
