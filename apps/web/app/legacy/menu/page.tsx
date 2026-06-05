import {
  LegacyOperationLauncher,
  LegacyPanel,
  LegacyShortcutButton,
  LegacyToolbar,
  LegacyWindow,
} from '@/components/legacy/legacy-ui'

const groups = [
  {
    title: 'Ventas',
    items: [
      { title: 'Factura Presupuesto', description: 'Mostrador legacy con grilla y cabecera fiscal', href: '/legacy/ventas/factura-presupuesto', shortcut: 'F4' },
      { title: 'Documentos', description: 'Historial, anulaciones y conversiones', href: '/documentos' },
      { title: 'Pedidos', description: 'Preparacion y facturacion de pedidos', href: '/pedidos', shortcut: 'F10' },
    ],
  },
  {
    title: 'Compras',
    items: [
      { title: 'Factura Proveedores', description: 'Carga legacy de comprobantes de proveedor', href: '/legacy/compras/factura-proveedores' },
      { title: 'Proveedores', description: 'Maestro de proveedores', href: '/proveedores' },
    ],
  },
  {
    title: 'Stock',
    items: [
      { title: 'Consulta Productos', description: 'Busqueda densa por codigo, descripcion, lista y deposito', href: '/legacy/productos/consulta', shortcut: 'F3' },
      { title: 'Ajustes / Transferencias', description: 'Movimientos de stock actuales', href: '/stock' },
      { title: 'Listas de Precio', description: 'Precios y coeficientes vigentes', href: '/listas-de-precio' },
    ],
  },
  {
    title: 'Tesoreria',
    items: [
      { title: 'Caja', description: 'Apertura, movimientos y cierre', href: '/caja' },
      { title: 'Cuenta Corriente', description: 'Saldos y movimientos de clientes', href: '/cuenta-corriente' },
    ],
  },
  {
    title: 'Contabilidad',
    items: [
      { title: 'Reportes', description: 'Ventas, stock y resumen operativo', href: '/reportes' },
      { title: 'Auditoria', description: 'Trazabilidad via detalle de documentos', href: '/documentos' },
    ],
  },
  {
    title: 'Varios',
    items: [
      { title: 'Clientes', description: 'Maestro de clientes fiscales', href: '/clientes' },
      { title: 'Productos', description: 'Catalogo moderno completo', href: '/productos' },
    ],
  },
]

export default function LegacyMenuPage() {
  return (
    <LegacyWindow title="Aguila Soft 3G - Menu Principal" subtitle="Capa de paridad operativa sobre FreeColors ERP">
      <LegacyToolbar>
        <LegacyShortcutButton href="/legacy/operaciones/cargar" shortcut="Alt+C">Cargar operacion</LegacyShortcutButton>
        <LegacyShortcutButton href="/legacy/productos/consulta" shortcut="F3">Consulta productos</LegacyShortcutButton>
        <LegacyShortcutButton href="/dashboard">ERP moderno</LegacyShortcutButton>
      </LegacyToolbar>

      <div className="legacy-menu-grid">
        {groups.map((group) => (
          <LegacyPanel key={group.title} title={group.title}>
            <div className="legacy-stack">
              {group.items.map((item) => (
                <LegacyOperationLauncher key={item.href + item.title} {...item} />
              ))}
            </div>
          </LegacyPanel>
        ))}
      </div>
    </LegacyWindow>
  )
}
