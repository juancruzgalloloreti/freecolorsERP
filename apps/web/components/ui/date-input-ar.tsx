'use client'

import { format, parse, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

interface DateInputARProps {
  value: string
  onChange: (iso: string) => void
  placeholder?: string
  className?: string
}

export function DateInputAR({ value, onChange, placeholder = 'DD/MM/YYYY', className }: DateInputARProps) {
  const display = value
    ? format(new Date(value + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })
    : ''

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={display}
      className={className}
      onChange={(e) => {
        const parsed = parse(e.target.value, 'dd/MM/yyyy', new Date(), { locale: es })
        if (isValid(parsed)) {
          onChange(parsed.toISOString().split('T')[0])
        }
      }}
    />
  )
}
