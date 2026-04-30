import {
  LegacyOperationLauncher,
  LegacyPanel,
  LegacyShortcutButton,
  LegacyToolbar,
  LegacyWindow,
} from '@/components/legacy/legacy-ui'

const operations = [
  { title: 'Ventas - Factura Presupuesto', description: 'Carga de presupuesto, remito o factura desde mostrador', href: '/legacy/ventas/factura-presupuesto', shortcut: 'F4' },
  { title: 'Compras - Factura Proveedores', description: 'Carga de comprobante proveedor con stock opcional', href: '/legacy/compras/factura-proveedores' },
  { title: 'Stock - Ajustes/Transferencias', description: 'Usa la pantalla de stock actual hasta completar layout legacy', href: '/stock' },
  { title: 'Productos - Consulta', description: 'Busqueda y toma rapida de articulos', href: '/legacy/productos/consulta', shortcut: 'F3' },
]

export default function LegacyLoadOperationPage() {
  return (
    <LegacyWindow title="Cargar Operacion" subtitle="Selector de transacciones legacy">
      <LegacyToolbar>
        <LegacyShortcutButton href="/legacy/menu">Volver</LegacyShortcutButton>
      </LegacyToolbar>
      <LegacyPanel title="Operaciones disponibles">
        <div className="legacy-menu-grid">
          {operations.map((operation) => (
            <LegacyOperationLauncher key={operation.href} {...operation} />
          ))}
        </div>
      </LegacyPanel>
    </LegacyWindow>
  )
}
