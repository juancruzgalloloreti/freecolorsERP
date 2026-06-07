'use client'

import { useState, useEffect } from 'react'
import { format, parse, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

interface DateInputARProps {
  value: string
  onChange: (iso: string) => void
  placeholder?: string
  className?: string
}

export function DateInputAR({ value, onChange, placeholder = 'DD/MM/YYYY', className }: DateInputARProps) {
  const [displayValue, setDisplayValue] = useState(() =>
    value ? format(new Date(value + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }) : ''
  )

  useEffect(() => {
    setDisplayValue(value ? format(new Date(value + 'T00:00:00'), 'dd/MM/yyyy', { locale: es }) : '')
  }, [value])

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={displayValue}
      className={className}
      onChange={(e) => {
        const raw = e.target.value
        setDisplayValue(raw)
        const parsed = parse(raw, 'dd/MM/yyyy', new Date(), { locale: es })
        if (isValid(parsed)) {
          onChange(parsed.toISOString().split('T')[0])
        }
      }}
    />
  )
}
