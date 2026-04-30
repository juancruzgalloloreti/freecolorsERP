'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LegacyFieldset,
  LegacyGrid,
  LegacyPanel,
  LegacyShortcutButton,
  LegacyToolbar,
  LegacyTotalsBox,
  LegacyWindow,
} from '@/components/legacy/legacy-ui'
import { cashApi, customersApi, documentsApi, priceListsApi, productsApi, stockApi } from '@/lib/api'

type ProductHit = {
  id: string
  code: string
  name: string
  unit: string
  price: number
  taxRate?: number
  stock?: number
  stockTotal?: number
  brandName?: string | null
  categoryName?: string | null
  appliedCoefficient?: number
  appliedCoefficientName?: string | null
}

type LegacyLine = {
  productId: string
  type: string
  code: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  depositId: string
}

type OptionRow = { id: string; name: string; isDefault?: boolean; cuit?: string | null; ivaCondition?: string | null; address?: string | null; city?: string | null; province?: string | null; number?: number }

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  const data = (value as { data?: T[] } | undefined)?.data
  return Array.isArray(data) ? data : []
}

function toNumber(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

export default function LegacyInvoiceBudgetPage() {
  const qc = useQueryClient()
  const [type, setType] = useState('BUDGET')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [customerId, setCustomerId] = useState('')
  const [priceListId, setPriceListId] = useState('')
  const [depositId, setDepositId] = useState('')
  const [puntoDeVentaId, setPuntoDeVentaId] = useState('')
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CURRENT_ACCOUNT'>('CASH')
  const [search, setSearch] = useState('')
  const [rounding, setRounding] = useState('0')
  const [perception, setPerception] = useState('0')
  const [purchaseOrder, setPurchaseOrder] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LegacyLine[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const { data: customersRaw } = useQuery({ queryKey: ['legacy-customers'], queryFn: () => customersApi.list({ limit: 500 }) })
  const { data: priceListsRaw } = useQuery({ queryKey: ['legacy-price-lists'], queryFn: priceListsApi.list })
  const { data: depositsRaw } = useQuery({ queryKey: ['legacy-deposits'], queryFn: stockApi.deposits })
  const { data: puntosRaw } = useQuery({ queryKey: ['legacy-puntos'], queryFn: documentsApi.puntos })
  const { data: currentCash } = useQuery({ queryKey: ['cash-current'], queryFn: cashApi.current })

  const customers = asArray<OptionRow>(customersRaw)
  const priceLists = asArray<OptionRow>(priceListsRaw)
  const deposits = asArray<OptionRow>(depositsRaw)
  const puntos = asArray<OptionRow>(puntosRaw)
  const effectiveDepositId = depositId || deposits.find((item) => item.isDefault)?.id || deposits[0]?.id || ''
  const effectivePriceListId = priceListId || priceLists.find((item) => item.isDefault)?.id || priceLists[0]?.id || ''
  const selectedCustomer = customers.find((item) => item.id === customerId)

  const { data: productsRaw, isFetching } = useQuery({
    queryKey: ['legacy-product-search', search, effectivePriceListId, effectiveDepositId],
    queryFn: () => productsApi.search({ q: search, priceListId: effectivePriceListId, depositId: effectiveDepositId, limit: 30 }),
    enabled: search.trim().length > 0,
  })
  const products = asArray<ProductHit>(productsRaw)

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (1 - line.discount / 100), 0)
    const iva = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (1 - line.discount / 100) * line.taxRate / 100, 0)
    const rounded = toNumber(rounding)
    const percibe = toNumber(perception)
    return { subtotal, iva, rounded, percibe, total: subtotal + iva + rounded + percibe }
  }, [lines, perception, rounding])

  const addProduct = (product: ProductHit) => {
    setLines((current) => [
      ...current,
      {
        productId: product.id,
        type: 'ART',
        code: product.code,
        description: product.name,
        quantity: 1,
        unitPrice: Number(product.price || 0),
        discount: 0,
        taxRate: Number(product.taxRate || 0),
        depositId: effectiveDepositId,
      },
    ])
    setSearch('')
  }

  const updateLine = (index: number, patch: Partial<LegacyLine>) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))
  }

  const saveMutation = useMutation({
    mutationFn: async (confirm: boolean) => {
      if (lines.length === 0) throw new Error('Agrega al menos un item.')
      if (paymentMode === 'CASH' && !currentCash) throw new Error('Abrir caja antes de grabar contado.')
      const created = await documentsApi.create({
        type,
        customerId: customerId || null,
        puntoDeVentaId: type.startsWith('INVOICE_') ? puntoDeVentaId || puntos[0]?.id || null : null,
        date,
        priceListId: effectivePriceListId || null,
        roundTotal: false,
        notes: [notes, purchaseOrder ? `Orden de compra: ${purchaseOrder}` : '', toNumber(perception) ? `Percibe: ${perception}` : '', toNumber(rounding) ? `Redondeo: ${rounding}` : ''].filter(Boolean).join('\n'),
        items: lines.map((line) => ({
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          taxRate: line.taxRate,
        })),
      })
      if (!confirm) return created
      return documentsApi.confirm(created.id, {
        depositId: effectiveDepositId,
        paymentMode,
        payments: [{ method: paymentMode === 'CURRENT_ACCOUNT' ? 'CURRENT_ACCOUNT' : 'CASH', amount: totals.total, notes: 'Legacy Factura Presupuesto' }],
      })
    },
    onSuccess: (document) => {
      qc.invalidateQueries({ queryKey: ['cash-current'] })
      setLines([])
      setMessage(`Documento ${document.status === 'CONFIRMED' ? 'confirmado' : 'grabado'} correctamente.`)
      setError('')
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const detail = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo grabar.'
      setError(Array.isArray(detail) ? detail.join(', ') : detail)
      setMessage('')
    },
  })

  return (
    <LegacyWindow title="Ventas - Factura Presupuesto" subtitle="Operacion legacy sobre documentos actuales" footer={`Caja: ${currentCash ? 'abierta' : 'cerrada'} | Items: ${lines.length}`}>
      <LegacyToolbar>
        <LegacyShortcutButton href="/legacy/productos/consulta" shortcut="F3">Buscar</LegacyShortcutButton>
        <LegacyShortcutButton shortcut="F4" onClick={() => setType('BUDGET')}>Factura Presupuesto</LegacyShortcutButton>
        <LegacyShortcutButton shortcut="F6" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>Facturar</LegacyShortcutButton>
        <LegacyShortcutButton href="/pedidos" shortcut="F10">Pedidos</LegacyShortcutButton>
        <LegacyShortcutButton onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>Grabar</LegacyShortcutButton>
        <LegacyShortcutButton onClick={() => setLines([])}>Cancelar</LegacyShortcutButton>
        <LegacyShortcutButton disabled>Imprimir</LegacyShortcutButton>
        <LegacyShortcutButton disabled>Enviar mail</LegacyShortcutButton>
        <LegacyShortcutButton disabled>Obtener CAE</LegacyShortcutButton>
      </LegacyToolbar>

      {message && <div className="legacy-message">{message}</div>}
      {error && <div className="legacy-error">{error}</div>}

      <div className="legacy-layout-2" style={{ marginTop: 8 }}>
        <div className="legacy-stack">
          <LegacyPanel>
            <LegacyGrid columns={5}>
              <label className="legacy-label"><span>Operacion</span><select className="legacy-input" value={type} onChange={(event) => setType(event.target.value)}><option value="BUDGET">Presupuesto</option><option value="REMITO">Remito</option><option value="INVOICE_A">Factura A</option><option value="INVOICE_B">Factura B</option><option value="INVOICE_C">Factura C</option></select></label>
              <label className="legacy-label"><span>Fecha</span><input className="legacy-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label className="legacy-label"><span>Letra / Tipo</span><input className="legacy-input" value={type.replace('INVOICE_', '')} readOnly /></label>
              <label className="legacy-label"><span>Punto</span><select className="legacy-input" value={puntoDeVentaId} onChange={(event) => setPuntoDeVentaId(event.target.value)}><option value="">Auto</option>{puntos.map((punto) => <option key={punto.id} value={punto.id}>{punto.number} - {punto.name}</option>)}</select></label>
              <label className="legacy-label"><span>Numero</span><input className="legacy-input" value="Automatico al confirmar" readOnly /></label>
            </LegacyGrid>
          </LegacyPanel>

          <LegacyFieldset legend="Cliente fiscal">
            <LegacyGrid columns={4}>
              <label className="legacy-label"><span>Razon social</span><select className="legacy-input" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">Consumidor final</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
              <label className="legacy-label"><span>Domicilio</span><input className="legacy-input" value={selectedCustomer?.address || ''} readOnly /></label>
              <label className="legacy-label"><span>Localidad</span><input className="legacy-input" value={selectedCustomer?.city || ''} readOnly /></label>
              <label className="legacy-label"><span>Provincia</span><input className="legacy-input" value={selectedCustomer?.province || ''} readOnly /></label>
              <label className="legacy-label"><span>Condicion IVA</span><input className="legacy-input" value={selectedCustomer?.ivaCondition || 'CONSUMIDOR_FINAL'} readOnly /></label>
              <label className="legacy-label"><span>CUIT / Doc.</span><input className="legacy-input" value={selectedCustomer?.cuit || ''} readOnly /></label>
              <label className="legacy-label"><span>Pago</span><select className="legacy-input" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as 'CASH' | 'CURRENT_ACCOUNT')}><option value="CASH">Contado</option><option value="CURRENT_ACCOUNT">Cuenta Corriente</option></select></label>
              <label className="legacy-label"><span>Caja</span><input className="legacy-input" value={currentCash ? 'Caja abierta' : 'Sin caja abierta'} readOnly /></label>
            </LegacyGrid>
          </LegacyFieldset>

          <LegacyPanel title="Items">
            <LegacyGrid columns={4}>
              <label className="legacy-label"><span>Lista precios</span><select className="legacy-input" value={effectivePriceListId} onChange={(event) => setPriceListId(event.target.value)}>{priceLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select></label>
              <label className="legacy-label"><span>Deposito</span><select className="legacy-input" value={effectiveDepositId} onChange={(event) => setDepositId(event.target.value)}>{deposits.map((deposit) => <option key={deposit.id} value={deposit.id}>{deposit.name}</option>)}</select></label>
              <label className="legacy-label"><span>Codigo / descripcion</span><input className="legacy-input" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && products[0]) addProduct(products[0]) }} /></label>
              <label className="legacy-label"><span>Estado busqueda</span><input className="legacy-input" value={isFetching ? 'Buscando...' : `${products.length} resultados`} readOnly /></label>
            </LegacyGrid>
            {products.length > 0 && (
              <div className="legacy-table-wrap" style={{ maxHeight: 150, marginTop: 6 }}>
                <table className="legacy-table">
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} onDoubleClick={() => addProduct(product)}>
                        <td>{product.code}</td>
                        <td>{product.name}</td>
                        <td>{product.categoryName || ''}</td>
                        <td className="legacy-money">{ARS.format(product.price || 0)}</td>
                        <td className="legacy-number">{Number(product.stock || product.stockTotal || 0).toLocaleString('es-AR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="legacy-table-wrap" style={{ marginTop: 8 }}>
              <table className="legacy-table">
                <thead><tr><th>Tipo</th><th>Codigo</th><th>Descripcion</th><th>Cantidad</th><th>Unitario</th><th>% Desc</th><th>% IVA</th><th>Total</th><th>Deposito</th><th></th></tr></thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={`${line.productId}-${index}`}>
                      <td><input className="legacy-input" value={line.type} onChange={(event) => updateLine(index, { type: event.target.value })} /></td>
                      <td>{line.code}</td>
                      <td><input className="legacy-input" value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} /></td>
                      <td><input className="legacy-input legacy-number" value={line.quantity} onChange={(event) => updateLine(index, { quantity: toNumber(event.target.value) })} /></td>
                      <td><input className="legacy-input legacy-number" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: toNumber(event.target.value) })} /></td>
                      <td><input className="legacy-input legacy-number" value={line.discount} onChange={(event) => updateLine(index, { discount: toNumber(event.target.value) })} /></td>
                      <td><input className="legacy-input legacy-number" value={line.taxRate} onChange={(event) => updateLine(index, { taxRate: toNumber(event.target.value) })} /></td>
                      <td className="legacy-money">{ARS.format(line.quantity * line.unitPrice * (1 - line.discount / 100) * (1 + line.taxRate / 100))}</td>
                      <td><select className="legacy-input" value={line.depositId} onChange={(event) => updateLine(index, { depositId: event.target.value })}>{deposits.map((deposit) => <option key={deposit.id} value={deposit.id}>{deposit.name}</option>)}</select></td>
                      <td><button className="legacy-shortcut-button" type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>X</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </LegacyPanel>
        </div>

        <div className="legacy-stack">
          <LegacyPanel title="Totales / adicionales">
            <LegacyGrid columns={2}>
              <label className="legacy-label"><span>Redondeo</span><input className="legacy-input legacy-number" value={rounding} onChange={(event) => setRounding(event.target.value)} /></label>
              <label className="legacy-label"><span>Percibe</span><input className="legacy-input legacy-number" value={perception} onChange={(event) => setPerception(event.target.value)} /></label>
              <label className="legacy-label"><span>Orden compra</span><input className="legacy-input" value={purchaseOrder} onChange={(event) => setPurchaseOrder(event.target.value)} /></label>
              <label className="legacy-label"><span>Ver Cta. Cte.</span><input className="legacy-input" value={customerId ? 'Disponible en modulo CC' : 'Sin cliente'} readOnly /></label>
            </LegacyGrid>
          </LegacyPanel>
          <LegacyTotalsBox
            rows={[
              { label: 'Subtotal', value: ARS.format(totals.subtotal) },
              { label: 'IVA', value: ARS.format(totals.iva) },
              { label: 'Redondeo', value: ARS.format(totals.rounded) },
              { label: 'Percibe', value: ARS.format(totals.percibe) },
            ]}
            total={ARS.format(totals.total)}
          />
          <LegacyPanel title="Datos extra">
            <div className="legacy-stack">
              <button className="legacy-shortcut-button" type="button">Datos remito</button>
              <button className="legacy-shortcut-button" type="button">Domicilio entrega</button>
              <textarea className="legacy-input" rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observaciones" />
            </div>
          </LegacyPanel>
        </div>
      </div>
    </LegacyWindow>
  )
}
