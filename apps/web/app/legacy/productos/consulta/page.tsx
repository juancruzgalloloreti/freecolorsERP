'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LegacyFieldset,
  LegacyGrid,
  LegacyPanel,
  LegacyShortcutButton,
  LegacyToolbar,
  LegacyWindow,
} from '@/components/legacy/legacy-ui'
import { priceListsApi, productsApi, stockApi } from '@/lib/api'

type ProductHit = {
  id: string
  code: string
  name: string
  description?: string | null
  unit: string
  price: number
  basePrice?: number
  taxRate?: number
  stock?: number
  stockTotal?: number
  brandName?: string | null
  categoryName?: string | null
  appliedCoefficient?: number
  appliedCoefficientName?: string | null
  replacementCost?: number | null
  averageCost?: number | null
  lastPurchaseCost?: number | null
}

type OptionRow = { id: string; name: string; isDefault?: boolean }

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  const data = (value as { data?: T[] } | undefined)?.data
  return Array.isArray(data) ? data : []
}

export default function LegacyProductLookupPage() {
  const [depositId, setDepositId] = useState('')
  const [priceListId, setPriceListId] = useState('')
  const [code, setCode] = useState('')
  const [equivalence, setEquivalence] = useState('')
  const [origin, setOrigin] = useState('')
  const [description, setDescription] = useState('')
  const [classification, setClassification] = useState('')
  const [scanner, setScanner] = useState('')
  const [selected, setSelected] = useState<ProductHit | null>(null)

  const { data: depositsRaw } = useQuery({ queryKey: ['legacy-lookup-deposits'], queryFn: stockApi.deposits })
  const { data: priceListsRaw } = useQuery({ queryKey: ['legacy-lookup-price-lists'], queryFn: priceListsApi.list })
  const deposits = asArray<OptionRow>(depositsRaw)
  const priceLists = asArray<OptionRow>(priceListsRaw)
  const effectiveDepositId = depositId || deposits.find((item) => item.isDefault)?.id || deposits[0]?.id || ''
  const effectivePriceListId = priceListId || priceLists.find((item) => item.isDefault)?.id || priceLists[0]?.id || ''
  const queryText = [scanner, code, equivalence, origin, description, classification].filter(Boolean).join(' ')

  const { data: productsRaw, isFetching } = useQuery({
    queryKey: ['legacy-products-consulta', queryText, effectiveDepositId, effectivePriceListId],
    queryFn: () => productsApi.search({ q: queryText, depositId: effectiveDepositId, priceListId: effectivePriceListId, limit: 120 }),
    enabled: queryText.trim().length > 0,
  })
  const products = asArray<ProductHit>(productsRaw)

  const exportCsv = async () => {
    const blob = await productsApi.exportProducts()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `productos-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <LegacyWindow title="Consulta Productos" subtitle="Busqueda legacy por deposito, lista, codigo, equivalencia y clasificacion" footer={`${products.length} producto(s) | Enter o doble click toma producto`}>
      <LegacyToolbar>
        <LegacyShortcutButton href="/legacy/menu">Volver</LegacyShortcutButton>
        <LegacyShortcutButton shortcut="F3" onClick={() => setScanner('')}>Nueva busqueda</LegacyShortcutButton>
        <LegacyShortcutButton onClick={exportCsv}>Exportar Excel</LegacyShortcutButton>
        <LegacyShortcutButton disabled={!selected}>Ver clasificacion</LegacyShortcutButton>
      </LegacyToolbar>

      <LegacyFieldset legend="Filtros">
        <LegacyGrid columns={4}>
          <label className="legacy-label"><span>Deposito</span><select className="legacy-input" value={effectiveDepositId} onChange={(event) => setDepositId(event.target.value)}>{deposits.map((deposit) => <option key={deposit.id} value={deposit.id}>{deposit.name}</option>)}</select></label>
          <label className="legacy-label"><span>Lista precios</span><select className="legacy-input" value={effectivePriceListId} onChange={(event) => setPriceListId(event.target.value)}>{priceLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select></label>
          <label className="legacy-label"><span>Codigo</span><input className="legacy-input" value={code} onChange={(event) => setCode(event.target.value)} autoFocus /></label>
          <label className="legacy-label"><span>Scanner</span><input className="legacy-input" value={scanner} onChange={(event) => setScanner(event.target.value)} /></label>
          <label className="legacy-label"><span>Equivalencia</span><input className="legacy-input" value={equivalence} onChange={(event) => setEquivalence(event.target.value)} /></label>
          <label className="legacy-label"><span>Origen</span><input className="legacy-input" value={origin} onChange={(event) => setOrigin(event.target.value)} /></label>
          <label className="legacy-label"><span>Descripcion</span><input className="legacy-input" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label className="legacy-label"><span>Clasificacion</span><input className="legacy-input" value={classification} onChange={(event) => setClassification(event.target.value)} /></label>
        </LegacyGrid>
      </LegacyFieldset>

      <div className="legacy-layout-2" style={{ marginTop: 8 }}>
        <LegacyPanel title={isFetching ? 'Buscando...' : 'Resultado'}>
          <div className="legacy-table-wrap" style={{ maxHeight: '62vh' }}>
            <table className="legacy-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Clasificacion</th>
                  <th>Marca</th>
                  <th>Stock</th>
                  <th>Precio lista</th>
                  <th>Coef.</th>
                  <th>Precio efectivo</th>
                  <th>IVA</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => setSelected(product)}
                    onDoubleClick={() => setSelected(product)}
                    onKeyDown={(event) => { if (event.key === 'Enter') setSelected(product) }}
                    tabIndex={0}
                  >
                    <td>{product.code}</td>
                    <td>{product.name}</td>
                    <td>{product.categoryName || ''}</td>
                    <td>{product.brandName || ''}</td>
                    <td className="legacy-number">{Number(product.stock ?? product.stockTotal ?? 0).toLocaleString('es-AR')}</td>
                    <td className="legacy-money">{ARS.format(Number(product.basePrice ?? product.price ?? 0))}</td>
                    <td>{product.appliedCoefficient && product.appliedCoefficient > 1 ? `${product.appliedCoefficient} ${product.appliedCoefficientName || ''}` : ''}</td>
                    <td className="legacy-money">{ARS.format(Number(product.price || 0))}</td>
                    <td className="legacy-number">{Number(product.taxRate || 0).toLocaleString('es-AR')}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LegacyPanel>

        <LegacyPanel title="Producto tomado">
          {selected ? (
            <div className="legacy-stack">
              <strong>{selected.code} - {selected.name}</strong>
              <span>{selected.description || 'Sin descripcion extendida'}</span>
              <div>Stock deposito: <b>{Number(selected.stock ?? 0).toLocaleString('es-AR')}</b></div>
              <div>Stock total: <b>{Number(selected.stockTotal ?? 0).toLocaleString('es-AR')}</b></div>
              <div>Precio efectivo: <b>{ARS.format(Number(selected.price || 0))}</b></div>
              <div>Clasificacion: <b>{selected.categoryName || 'Sin clasificacion'}</b></div>
              <div>Costo reposicion: <b>{selected.replacementCost ? ARS.format(selected.replacementCost) : '-'}</b></div>
              <div>Costo promedio: <b>{selected.averageCost ? ARS.format(selected.averageCost) : '-'}</b></div>
              <div>Ultima compra: <b>{selected.lastPurchaseCost ? ARS.format(selected.lastPurchaseCost) : '-'}</b></div>
            </div>
          ) : (
            <p>Seleccione un producto con doble click o Enter.</p>
          )}
        </LegacyPanel>
      </div>
    </LegacyWindow>
  )
}
