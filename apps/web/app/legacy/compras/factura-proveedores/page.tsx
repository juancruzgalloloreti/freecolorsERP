import {
  LegacyFieldset,
  LegacyGrid,
  LegacyPanel,
  LegacyShortcutButton,
  LegacyToolbar,
  LegacyWindow,
} from '@/components/legacy/legacy-ui'

export default function LegacySupplierInvoicePage() {
  return (
    <LegacyWindow title="Compras - Factura Proveedores" subtitle="Pantalla de paridad preparada para conectar el flujo de compras">
      <LegacyToolbar>
        <LegacyShortcutButton href="/legacy/menu">Volver</LegacyShortcutButton>
        <LegacyShortcutButton disabled>Grabar</LegacyShortcutButton>
        <LegacyShortcutButton disabled>Cancelar</LegacyShortcutButton>
      </LegacyToolbar>

      <div className="legacy-stack">
        <LegacyFieldset legend="Seleccion de cuenta corriente">
          <LegacyGrid columns={4}>
            <label className="legacy-label"><span>Proveedor</span><input className="legacy-input" placeholder="Buscar proveedor" /></label>
            <label className="legacy-label"><span>CUIT</span><input className="legacy-input" /></label>
            <label className="legacy-label"><span>Condicion IVA</span><input className="legacy-input" /></label>
            <label className="legacy-label"><span>Cuenta corriente</span><select className="legacy-input"><option>Proveedor CC</option><option>Contado</option></select></label>
          </LegacyGrid>
        </LegacyFieldset>

        <LegacyFieldset legend="Datos factura">
          <LegacyGrid columns={5}>
            <label className="legacy-label"><span>Tipo</span><select className="legacy-input"><option>Factura A</option><option>Factura B</option><option>Remito</option></select></label>
            <label className="legacy-label"><span>Fecha</span><input className="legacy-input" type="date" /></label>
            <label className="legacy-label"><span>Punto</span><input className="legacy-input" /></label>
            <label className="legacy-label"><span>Numero</span><input className="legacy-input" /></label>
            <label className="legacy-label"><span>Vencimiento</span><input className="legacy-input" type="date" /></label>
          </LegacyGrid>
        </LegacyFieldset>

        <div className="legacy-layout-2">
          <LegacyPanel title="Ingreso a stock">
            <LegacyGrid columns={4}>
              <label className="legacy-label"><span>Ingresa stock</span><select className="legacy-input"><option>Si</option><option>No</option></select></label>
              <label className="legacy-label"><span>Deposito</span><input className="legacy-input" /></label>
              <label className="legacy-label"><span>Producto</span><input className="legacy-input" /></label>
              <label className="legacy-label"><span>Descuento proveedor</span><input className="legacy-input legacy-number" defaultValue="0" /></label>
            </LegacyGrid>
            <div className="legacy-table-wrap" style={{ marginTop: 8 }}>
              <table className="legacy-table">
                <thead><tr><th>Codigo</th><th>Descripcion</th><th>Cantidad</th><th>Costo</th><th>Desc.</th><th>Total</th></tr></thead>
                <tbody><tr><td colSpan={6}>Pendiente de endpoint especifico de compra proveedor.</td></tr></tbody>
              </table>
            </div>
          </LegacyPanel>

          <LegacyPanel title="Registro contable / impuestos">
            <div className="legacy-stack">
              <label className="legacy-label"><span>Neto gravado</span><input className="legacy-input legacy-number" /></label>
              <label className="legacy-label"><span>IVA</span><input className="legacy-input legacy-number" /></label>
              <label className="legacy-label"><span>Percepciones</span><input className="legacy-input legacy-number" /></label>
              <label className="legacy-label"><span>Descuentos</span><input className="legacy-input legacy-number" /></label>
              <label className="legacy-label"><span>Total</span><input className="legacy-input legacy-number" /></label>
            </div>
          </LegacyPanel>
        </div>
      </div>
    </LegacyWindow>
  )
}
