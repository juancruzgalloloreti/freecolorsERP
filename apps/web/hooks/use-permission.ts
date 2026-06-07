import { useAuth } from '@/contexts/AuthContext'

const FEATURES_ON_BY_DEFAULT = [
  'ventas', 'compras', 'caja', 'clientes', 'productos',
  'stock_movimientos', 'comprobantes', 'proveedores',
]

// Map feature keys to permission codes that appear in the user.permissions array
const FEATURE_TO_PERMISSION: Record<string, string> = {
  precios_especiales: 'price.special',
  utilidad_sobre_costo: 'report.view',
  transferencias_deposito: 'stock.transfer',
  despachos: 'report.view',
  ventas_mensuales: 'report.view',
  historial_legacy: 'historial.caja',
  reportes_completos: 'report.view',
  lista_precios: 'price.update',
  empleados: 'user.manage',
  aprobaciones: 'approval.view',
}

export function usePermission(feature: string): boolean {
  const { user, hasPermission } = useAuth()

  if (!user) return false
  if (user.role === 'OWNER') return true

  if (user.role === 'ADMIN') {
    const permCode = FEATURE_TO_PERMISSION[feature]
    if (!permCode) return true
    return hasPermission(permCode)
  }

  if (FEATURES_ON_BY_DEFAULT.includes(feature)) return true

  const permCode = FEATURE_TO_PERMISSION[feature]
  if (!permCode) return false
  return hasPermission(permCode)
}
