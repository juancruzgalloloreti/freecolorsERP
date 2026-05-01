'use client'

import { useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useHotkeys } from '@/hooks/use-hotkeys'

export function GlobalShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const bindings = useMemo(() => ({
    f2: (event: KeyboardEvent) => {
      event.preventDefault()
      router.push('/ventas')
    },
    f4: (event: KeyboardEvent) => {
      event.preventDefault()
      const customerAction = document.querySelector<HTMLElement>('[data-customer-action="true"]')
      if (customerAction) customerAction.click()
      else router.push('/clientes')
    },
    'ctrl+f': (event: KeyboardEvent) => {
      event.preventDefault()
      const search = document.querySelector<HTMLInputElement>('[data-global-search="true"], input[type="search"], input[placeholder*="Buscar" i]')
      search?.focus()
      search?.select()
    },
    'ctrl+n': (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select')) return
      event.preventDefault()
      document.querySelector<HTMLElement>('[data-create-action="true"]')?.click()
    },
    'ctrl+p': (event: KeyboardEvent) => {
      event.preventDefault()
      document.querySelector<HTMLElement>('[data-print-action="true"]')?.click()
    },
    f9: (event: KeyboardEvent) => {
      event.preventDefault()
      document.querySelector<HTMLElement>('[data-payment-action="true"]')?.click()
    },
    f12: (event: KeyboardEvent) => {
      event.preventDefault()
      document.querySelector<HTMLElement>('[data-confirm-action="true"]')?.click()
    },
    escape: (event: KeyboardEvent) => {
      event.preventDefault()
      if (document.querySelector('[role="dialog"], [role="alertdialog"], .modal-overlay, .entity-sheet-overlay')) {
        const active = document.activeElement as HTMLElement | null
        active?.blur?.()
        return
      }
      document.querySelector<HTMLElement>('[data-escape-action="true"]')?.click()
      const active = document.activeElement as HTMLElement | null
      active?.blur?.()
    },
    'ctrl+z': (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select')) return
      event.preventDefault()
      document.querySelector<HTMLElement>('[data-undo-line-action="true"]')?.click()
    },
    f3: (event: KeyboardEvent) => {
      event.preventDefault()
      const productSearch = document.querySelector<HTMLInputElement>('[data-product-search="true"]')
      productSearch?.focus()
      productSearch?.select()
    },
  }), [router])

  useHotkeys(bindings, pathname !== '/login')
  return null
}
