'use client'

import { ErrorBoundary } from '@/components/erp/error-boundary'
import VentasPage from './ventas-page'

export default function VentasPageWrapper() {
  return (
    <ErrorBoundary>
      <VentasPage />
    </ErrorBoundary>
  )
}
