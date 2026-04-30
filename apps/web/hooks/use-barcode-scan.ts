'use client'

import { useEffect, useRef } from 'react'

const BARCODE_SCAN_THRESHOLD_MS = 100

export function useBarcodeScan(onScan: (code: string) => void, enabled = true) {
  const buffer = useRef('')
  const lastKeyTime = useRef(0)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!enabled) return
    const handler = (event: KeyboardEvent) => {
      if (typeof event.key !== 'string' || event.key.length === 0) return
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-ignore-barcode="true"]')) return
      const now = Date.now()
      if (event.key === 'Enter') {
        if (buffer.current.length > 3) {
          event.preventDefault()
          onScanRef.current(buffer.current)
          buffer.current = ''
        }
        return
      }
      if (event.key.length !== 1) return
      if (now - lastKeyTime.current > BARCODE_SCAN_THRESHOLD_MS) buffer.current = ''
      buffer.current += event.key
      lastKeyTime.current = now
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [enabled])
}
