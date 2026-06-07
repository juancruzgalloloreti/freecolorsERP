'use client'

import { useState, useEffect } from 'react'

function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ''
  const [, y, m, d] = match
  return `${d}/${m}/${y}`
}

function displayToIso(raw: string): string | null {
  const cleaned = raw.replace(/[^\d]/g, '')
  if (cleaned.length !== 8) return null
  const d = cleaned.slice(0, 2)
  const m = cleaned.slice(2, 4)
  const y = cleaned.slice(4, 8)
  const day = parseInt(d, 10)
  const month = parseInt(m, 10)
  const year = parseInt(y, 10)
  if (day < 1 || day > 31) return null
  if (month < 1 || month > 12) return null
  if (year < 1900 || year > 2100) return null
  return `${y}-${m}-${d}`
}

interface DateInputARProps {
  value: string
  onChange: (iso: string) => void
  placeholder?: string
  className?: string
}

export function DateInputAR({ value, onChange, placeholder = 'DD/MM/YYYY', className }: DateInputARProps) {
  const [displayValue, setDisplayValue] = useState(() => isoToDisplay(value))

  useEffect(() => {
    setDisplayValue(isoToDisplay(value))
  }, [value])

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={displayValue}
      className={className}
      onChange={(e) => {
        const raw = e.target.value
        if (raw.length <= 10) {
          setDisplayValue(raw)
        }
        const iso = displayToIso(raw)
        if (iso) {
          onChange(iso)
        }
      }}
    />
  )
}
