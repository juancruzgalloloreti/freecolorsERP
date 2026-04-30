'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { priceListsApi, productsApi } from '@/lib/api'
import { Plus, Edit2, Trash2, Search, X, Package, Upload, Download, CheckSquare2, Square } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import * as XLSX from 'xlsx'

interface Product {
  id: string; code: string; name: string; unit: string; isActive: boolean
  brand?: { name: string }; category?: { name: string }
  description?: string; notes?: string; brandId?: string; categoryId?: string
  stockQuantity?: number | string
  taxRate?: number | string
  purchaseUnitCoefficient?: number | string | null
  replacementCost?: number | string | null
  averageCost?: number | string | null
  lastPurchaseCost?: number | string | null
}

interface PriceList {
  id: string
  name: string
  items?: { productId: string; price: number | string }[]
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let cell = ''
  let row: string[] = []
  let quoted = false
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const delimiter = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ';' : ','

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)

  const [headers = [], ...data] = rows
  return data.map((values) => normalizeImportRow(headers, values))
}

function decodeCsv(buffer: ArrayBuffer) {
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  return utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(buffer) : utf8
}

function parseSpreadsheet(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { defval: '', raw: false, header: 1 })
  const [headers = [], ...data] = rows
  return data
    .filter((row) => row.some((value) => String(value ?? '').trim()))
    .map((values) => normalizeImportRow(headers.map(String), values.map((value) => String(value ?? ''))))
}

function normalizeImportRow(headers: string[], values: string[]) {
  const row: Record<string, unknown> = {}
  headers.forEach((header, index) => {
    const cleanHeader = String(header || '').trim()
    const letter = String.fromCharCode(65 + index)
    const value = values[index]?.trim() ?? ''
    if (cleanHeader) row[cleanHeader] = value
    row[letter] = value
  })
  return row
}

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
})

function priceOf(list: PriceList, productId: string) {
  const item = list.items?.find((i) => i.productId === productId)
  return item ? Number(item.price || 0) : 0
}

function ProductModal({ product, brands, categories, priceLists, onClose, onSave }: {
  product: Product | null
  brands: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  priceLists: PriceList[]
  onClose: () => void
  onSave: (d: Record<string, unknown>) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    code: product?.code || '', name: product?.name || '',
    unit: product?.unit || 'item', brandId: product?.brandId || '',
    categoryId: product?.categoryId || '', description: product?.description || '',
    notes: product?.notes || '', isActive: product?.isActive ?? true,
    stockQuantity: product?.stockQuantity !== undefined ? String(product.stockQuantity) : '',
    taxRate: product?.taxRate !== undefined ? String(product.taxRate) : '21',
    purchaseUnitCoefficient: product?.purchaseUnitCoefficient !== undefined && product.purchaseUnitCoefficient !== null ? String(product.purchaseUnitCoefficient) : '',
    replacementCost: product?.replacementCost !== undefined && product.replacementCost !== null ? String(product.replacementCost) : '',
    averageCost: product?.averageCost !== undefined && product.averageCost !== null ? String(product.averageCost) : '',
    lastPurchaseCost: product?.lastPurchaseCost !== undefined && product.lastPurchaseCost !== null ? String(product.lastPurchaseCost) : '',
  })
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(priceLists.map((list) => {
      const current = product ? priceOf(list, product.id) : 0
      return [list.id, current ? String(current) : '']
    }))
  )
  const [newBrandName, setNewBrandName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingBrand, setCreatingBrand] = useState(false)
  const [creatingCategory, setCreatingCategory] = useState(false)
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const setPrice = (id: string, value: string) => setPrices((current) => ({ ...current, [id]: value }))
  const createBrand = async () => {
    const name = newBrandName.trim()
    if (!name) return
    setCreatingBrand(true)
    try {
      const brand = await productsApi.createBrand({ name })
      qc.invalidateQueries({ queryKey: ['brands'] })
      qc.invalidateQueries({ queryKey: ['brands-counter'] })
      set('brandId', brand.id)
      setNewBrandName('')
    } finally {
      setCreatingBrand(false)
    }
  }
  const createCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    setCreatingCategory(true)
    try {
      const category = await productsApi.createCategory({ name })
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['categories-counter'] })
      set('categoryId', category.id)
      setNewCategoryName('')
    } finally {
      setCreatingCategory(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ width: 'min(760px, 100%)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600' }}>{product ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: 'calc(88vh - 138px)' }}>
          <div>
            <label className="fc-label">Código *</label>
            <input className="fc-input" value={form.code} onChange={e => set('code', e.target.value)} placeholder="ej: LAT-001" />
          </div>
          <div>
            <label className="fc-label">Nombre *</label>
            <input className="fc-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="ej: Látex Interior Blanco 10lt" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="fc-label">Marca</label>
              <select className="fc-input" value={form.brandId} onChange={e => set('brandId', e.target.value)}>
                <option value="">Sin marca</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="inline-create-row">
                <input className="fc-input" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Nueva marca" />
                <button className="btn btn-secondary btn-sm" type="button" disabled={!newBrandName.trim() || creatingBrand} onClick={createBrand}>
                  {creatingBrand ? '...' : 'Crear'}
                </button>
              </div>
            </div>
            <div>
              <label className="fc-label">Categoría</label>
              <select className="fc-input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="inline-create-row">
                <input className="fc-input" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nueva categoría" />
                <button className="btn btn-secondary btn-sm" type="button" disabled={!newCategoryName.trim() || creatingCategory} onClick={createCategory}>
                  {creatingCategory ? '...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div>
              <label className="fc-label">IVA %</label>
              <input className="fc-input" inputMode="decimal" value={form.taxRate} onChange={e => set('taxRate', e.target.value)} placeholder="21" />
            </div>
            <div>
              <label className="fc-label">Coef. compra</label>
              <input className="fc-input" inputMode="decimal" value={form.purchaseUnitCoefficient} onChange={e => set('purchaseUnitCoefficient', e.target.value)} placeholder="1" />
            </div>
            <div>
              <label className="fc-label">Costo reposición</label>
              <input className="fc-input" inputMode="decimal" value={form.replacementCost} onChange={e => set('replacementCost', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="fc-label">Costo promedio</label>
              <input className="fc-input" inputMode="decimal" value={form.averageCost} onChange={e => set('averageCost', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="fc-label">Costo ult. compra</label>
              <input className="fc-input" inputMode="decimal" value={form.lastPurchaseCost} onChange={e => set('lastPurchaseCost', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="fc-label">Stock actual</label>
              <input
                className="fc-input"
                inputMode="decimal"
                value={form.stockQuantity}
                onChange={e => set('stockQuantity', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="fc-label">Unidad</label>
              <input className="fc-input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="item" />
            </div>
          </div>
          <div>
            <label className="fc-label">Descripción</label>
            <textarea className="fc-input" value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Descripción opcional" />
          </div>
          <div>
            <label className="fc-label">Notas internas</label>
            <textarea className="fc-input" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Solo uso interno" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
              style={{ width: '15px', height: '15px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            <span style={{ fontSize: '13px', color: 'var(--fc-text)' }}>Producto activo</span>
          </label>

          <div style={{ borderTop: '1px solid var(--fc-border)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
              <label className="fc-label" style={{ margin: 0 }}>Precios por lista</label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Se cargan junto con el producto</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              {priceLists.map((list, index) => (
                <div key={list.id}>
                  <label className="fc-label">L{index + 1} · {list.name}</label>
                  <input
                    className="fc-input"
                    inputMode="decimal"
                    value={prices[list.id] || ''}
                    onChange={(e) => setPrice(list.id, e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!form.code || !form.name} onClick={() => onSave({ ...form, prices })}>
            {product ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductosPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const canManageCatalog = isOwner
  const canImportProducts = isOwner
  const canDeleteProducts = isOwner
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Product | null | 'new'>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importOptions, setImportOptions] = useState({ alternateCode: '', addNewCodes: true })
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: rawProducts, isLoading } = useQuery({ queryKey: ['products', search], queryFn: () => productsApi.list({ search: search || undefined }) })
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => productsApi.listBrands() })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => productsApi.listCategories() })
  const { data: rawPriceLists = [] } = useQuery({ queryKey: ['price-lists'], queryFn: priceListsApi.list })

  const refreshProductsAndStock = () => {
    qc.invalidateQueries({ queryKey: ['products'] })
    qc.invalidateQueries({ queryKey: ['products-all'] })
    qc.invalidateQueries({ queryKey: ['stock-current'] })
    qc.invalidateQueries({ queryKey: ['stock-movements'] })
  }

  const createMutation = useMutation({ mutationFn: productsApi.create, onSuccess: () => { refreshProductsAndStock(); setModal(null) } })
  const importMutation = useMutation({
    mutationFn: () => productsApi.importProducts(importRows, {
      alternateCode: importOptions.alternateCode.trim() || undefined,
      addNewCodes: importOptions.addNewCodes,
    }),
    onSuccess: (r: { created?: number; updated?: number; skipped?: number; stockAdjusted?: number }) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock-current'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      setImportResult(`Importados: ${r.created || 0} nuevos, ${r.updated || 0} actualizados, ${r.skipped || 0} omitidos, ${r.stockAdjusted || 0} ajustes de stock.`)
      setImportRows([])
      setImportFileName('')
      setImportError(null)
      setImporting(false)
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo importar el CSV'
      setImportError(Array.isArray(message) ? message.join(', ') : message)
    },
  })
  const exportMutation = useMutation({
    mutationFn: productsApi.exportProducts,
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `productos-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo exportar el CSV'
      setImportResult(Array.isArray(message) ? message.join(', ') : message)
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => productsApi.update(id, data),
    onSuccess: () => { refreshProductsAndStock(); setModal(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: (r: { archived?: boolean }) => {
      refreshProductsAndStock()
      setImportResult(r?.archived ? 'Producto archivado: tenía historial asociado y no se eliminó físicamente.' : 'Producto eliminado.')
      setDeletingId(null)
      setDeleteError(null)
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo eliminar el producto'
      setDeleteError(Array.isArray(message) ? message.join(', ') : message)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedProductIds)
      const summary = { deleted: 0, archived: 0, failed: [] as string[] }

      for (const id of ids) {
        try {
          const result = await productsApi.remove(id)
          if (result?.archived) summary.archived += 1
          else summary.deleted += 1
        } catch (error) {
          const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
          const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo eliminar'
          summary.failed.push(Array.isArray(message) ? message.join(', ') : message)
        }
      }

      if (summary.failed.length === ids.length) {
        throw new Error(summary.failed[0] || 'No se pudo eliminar la selección')
      }

      return summary
    },
    onSuccess: (summary: { deleted: number; archived: number; failed: string[] }) => {
      refreshProductsAndStock()
      setBulkDeleting(false)
      setBulkDeleteError(null)
      setSelectedProductIds(new Set())
      setSelectionMode(false)
      setImportResult(`Selección procesada: ${summary.deleted} eliminado${summary.deleted === 1 ? '' : 's'}, ${summary.archived} archivado${summary.archived === 1 ? '' : 's'}${summary.failed.length ? `, ${summary.failed.length} con error` : ''}.`)
    },
    onError: (error: unknown) => {
      const apiError = error as { message?: string }
      setBulkDeleteError(apiError.message || 'No se pudo eliminar la selección')
    },
  })

  const products: Product[] = useMemo(
    () => Array.isArray(rawProducts) ? rawProducts : (rawProducts as { data?: Product[] } | undefined)?.data || [],
    [rawProducts]
  )
  const brs = Array.isArray(brands) ? brands : (brands as { data?: { id: string; name: string }[] }).data || []
  const cats = Array.isArray(categories) ? categories : (categories as { data?: { id: string; name: string }[] }).data || []
  const priceLists: PriceList[] = (Array.isArray(rawPriceLists) ? rawPriceLists : (rawPriceLists as { data?: PriceList[] }).data || []).slice(0, 4)
  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.has(product.id)),
    [products, selectedProductIds]
  )
  const allVisibleSelected = products.length > 0 && products.every((product) => selectedProductIds.has(product.id))

  function handleImport(file: File | null) {
    if (!file) return
    setImportError(null)
    setImportResult(null)
    setImportRows([])
    setImportFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer
        const rows = /\.(xlsx|xls)$/i.test(file.name)
          ? parseSpreadsheet(buffer)
          : parseCsv(decodeCsv(buffer))
        setImportRows(rows)
        if (rows.length === 0) setImportError('No se encontraron filas para importar en el CSV.')
      } catch {
        setImportError('No se pudo leer el archivo. Revisá que sea Excel o CSV con encabezados.')
      }
    }
    reader.onerror = () => setImportError('No se pudo abrir el archivo seleccionado.')
    reader.readAsArrayBuffer(file)
  }

  function openImportModal() {
    setImporting(true)
    setImportRows([])
    setImportFileName('')
    setImportError(null)
  }

  function closeImportModal() {
    if (importMutation.isPending) return
    setImporting(false)
  }

  function toggleSelectionMode() {
    setImportResult(null)
    setBulkDeleteError(null)
    if (selectionMode) setSelectedProductIds(new Set())
    setSelectionMode(!selectionMode)
  }

  function toggleProductSelection(id: string) {
    setSelectedProductIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setVisibleSelection(checked: boolean) {
    setSelectedProductIds((current) => {
      const next = new Set(current)
      products.forEach((product) => {
        if (checked) next.add(product.id)
        else next.delete(product.id)
      })
      return next
    })
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo</h1>
          <p className="page-subtitle">{products.length} producto{products.length !== 1 ? 's' : ''}, marcas, categorías y precios</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${selectionMode ? 'btn-primary' : 'btn-secondary'}`}
            disabled={!canDeleteProducts || products.length === 0}
            title={!canDeleteProducts ? 'Solo OWNER puede seleccionar y archivar productos' : undefined}
            onClick={toggleSelectionMode}
          >
            {selectionMode ? <CheckSquare2 size={14} /> : <Square size={14} />}
            {selectionMode ? 'Seleccionando' : 'Seleccionar items'}
          </button>
          <button
            className="btn btn-secondary"
            disabled={!canImportProducts || exportMutation.isPending}
            title={!canImportProducts ? 'Solo OWNER puede exportar el catálogo' : undefined}
            onClick={() => exportMutation.mutate()}
          >
            <Download size={14} /> {exportMutation.isPending ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <button
            className="btn btn-secondary"
            disabled={!canImportProducts}
            title={!canImportProducts ? 'Solo OWNER puede importar CSV' : undefined}
            onClick={openImportModal}
          >
            <Upload size={14} /> Importar CSV
          </button>
          <button
            className="btn btn-primary"
            disabled={!canManageCatalog}
            title={!canManageCatalog ? 'Solo OWNER puede crear productos, marcas y categorías' : undefined}
            onClick={() => setModal('new')}
          >
            <Plus size={14} /> Nuevo producto
          </button>
        </div>
      </div>

      {importResult && (
        <div style={{ marginBottom: '12px', padding: '10px 12px', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', color: '#86efac', background: 'rgba(34,197,94,0.08)', fontSize: '13px' }}>
          {importResult}
        </div>
      )}

      <div className="search-wrap">
        <Search size={14} />
        <input className="fc-input" placeholder="Buscar por nombre o código…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isOwner && selectionMode && (
        <div style={{ marginBottom: '12px', padding: '10px 12px', border: '1px solid var(--fc-border)', borderRadius: '10px', background: 'rgba(16,21,34,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setVisibleSelection(!allVisibleSelected)} disabled={bulkDeleteMutation.isPending}>
              {allVisibleSelected ? <CheckSquare2 size={13} /> : <Square size={13} />}
              {allVisibleSelected ? 'Quitar visibles' : 'Seleccionar visibles'}
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {selectedProducts.length} seleccionados
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-danger btn-sm" onClick={() => { setBulkDeleteError(null); setBulkDeleting(true) }} disabled={selectedProducts.length === 0 || bulkDeleteMutation.isPending}>
              <Trash2 size={13} /> Archivar seleccionados
            </button>
            {selectedProducts.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProductIds(new Set())} disabled={bulkDeleteMutation.isPending}>
                <X size={13} /> Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      <div className="fc-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '56px' }}><span className="spinner" /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Package size={32} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p>No hay productos{search ? ` para "${search}"` : ''}</p>
            {!isOwner && <small>Ingresá como OWNER para importar CSV, cargar precios o crear productos.</small>}
          </div>
        ) : (
          <>
          <div className="catalog-desktop-table" style={{ overflowX: 'auto' }}>
            <table className="fc-table">
              <thead>
                <tr>
                  {isOwner && selectionMode && (
                    <th style={{ width: '42px' }}>
                      <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setVisibleSelection(!allVisibleSelected)} title={allVisibleSelected ? 'Quitar visibles' : 'Seleccionar visibles'}>
                        {allVisibleSelected ? <CheckSquare2 size={13} /> : <Square size={13} />}
                      </button>
                    </th>
                  )}
                  <th>Código</th><th>Nombre</th><th>Marca</th>
                  <th>Categoría</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>IVA</th>
                  <th style={{ textAlign: 'right' }}>Costo rep.</th>
                  {priceLists.map((list, index) => <th key={list.id} style={{ textAlign: 'right' }}>L{index + 1}</th>)}
                  <th>Estado</th>
                  {canManageCatalog && <th style={{ width: canDeleteProducts ? '90px' : '44px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p: Product) => {
                  const selected = selectedProductIds.has(p.id)
                  return (
                    <tr key={p.id} style={selected ? { background: 'rgba(124,58,237,0.12)' } : undefined}>
                      {isOwner && selectionMode && (
                        <td>
                          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => toggleProductSelection(p.id)} title={selected ? 'Quitar producto' : 'Seleccionar producto'}>
                            {selected ? <CheckSquare2 size={13} /> : <Square size={13} />}
                          </button>
                        </td>
                      )}
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '5px' }}>
                          {p.code}
                        </span>
                      </td>
                      <td style={{ fontWeight: '500' }}>{p.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.brand?.name || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.category?.name || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`badge ${Number(p.stockQuantity || 0) <= 0 ? 'badge-red' : Number(p.stockQuantity || 0) < 5 ? 'badge-yellow' : 'badge-green'}`}>
                          {Number(p.stockQuantity || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {Number(p.taxRate ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: p.replacementCost ? 'var(--fc-text)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {p.replacementCost ? money.format(Number(p.replacementCost)) : '—'}
                      </td>
                      {priceLists.map((list) => {
                        const price = priceOf(list, p.id)
                        return (
                          <td key={list.id} style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: price ? 'var(--fc-text)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {price ? money.format(price) : '—'}
                          </td>
                        )
                      })}
                      <td><span className={`badge ${p.isActive ? 'badge-green' : 'badge-red'}`}>{p.isActive ? 'Activo' : 'Inactivo'}</span></td>
                      {canManageCatalog && (
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setModal(p)} title="Editar"><Edit2 size={12} /></button>
                            {canDeleteProducts && (
                              <button className="btn btn-icon btn-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '7px', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center' }} onClick={() => { setDeleteError(null); setDeletingId(p.id) }} title="Eliminar"><Trash2 size={12} color="#f87171" /></button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="catalog-mobile-cards">
            {products.map((p: Product) => {
              const selected = selectedProductIds.has(p.id)
              return (
                <article className={`catalog-card ${selected ? 'selected' : ''}`} key={p.id}>
                  <header>
                    <div>
                      <span className="mono-pill">{p.code}</span>
                      <strong>{p.name}</strong>
                    </div>
                    {isOwner && selectionMode && (
                      <button className="btn btn-icon btn-secondary btn-sm" onClick={() => toggleProductSelection(p.id)} title={selected ? 'Quitar producto' : 'Seleccionar producto'}>
                        {selected ? <CheckSquare2 size={13} /> : <Square size={13} />}
                      </button>
                    )}
                  </header>
                  <div className="catalog-card-meta">
                    <span>{p.brand?.name || 'Sin marca'}</span>
                    <span>{p.category?.name || 'Sin categoría'}</span>
                    <span className={`badge ${Number(p.stockQuantity || 0) <= 0 ? 'badge-red' : Number(p.stockQuantity || 0) < 5 ? 'badge-yellow' : 'badge-green'}`}>
                      Stock {Number(p.stockQuantity || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="catalog-card-prices">
                    <span>IVA: <b>{Number(p.taxRate ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%</b></span>
                    <span>Costo rep.: <b>{p.replacementCost ? money.format(Number(p.replacementCost)) : '—'}</b></span>
                    {priceLists.map((list, index) => {
                      const price = priceOf(list, p.id)
                      return <span key={list.id}>L{index + 1}: <b>{price ? money.format(price) : '—'}</b></span>
                    })}
                  </div>
                  <footer>
                    <span className={`badge ${p.isActive ? 'badge-green' : 'badge-red'}`}>{p.isActive ? 'Activo' : 'Inactivo'}</span>
                    {canManageCatalog && (
                      <div>
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal(p)}><Edit2 size={12} /> Editar</button>
                        {canDeleteProducts && (
                          <button className="btn btn-danger btn-sm" onClick={() => { setDeleteError(null); setDeletingId(p.id) }}><Trash2 size={12} /> Archivar</button>
                        )}
                      </div>
                    )}
                  </footer>
                </article>
              )
            })}
          </div>
          </>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal as Product}
          brands={brs as { id: string; name: string }[]}
          categories={cats as { id: string; name: string }[]}
          priceLists={priceLists}
          onClose={() => setModal(null)}
          onSave={d => modal === 'new' ? createMutation.mutate(d) : updateMutation.mutate({ id: (modal as Product).id, data: d })}
        />
      )}

      {importing && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeImportModal()}>
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Importar productos</h3>
              <button className="btn btn-icon btn-secondary" disabled={importMutation.isPending} onClick={closeImportModal}><X size={14} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Importa Excel o CSV del Aguila. Respeta código principal, código alternativo, equivalencia, origen, precio sin IVA, costos, IVA, unidad y coeficiente de compra.
              </p>
              <input className="fc-input" type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" disabled={importMutation.isPending} onChange={e => handleImport(e.target.files?.[0] || null)} />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
                Formato Aguila directo: Codigo, Equivalencia, Nombre, Precio lista sin iva, Stock, Codigo en Origen, Marca, Proveedor, Costo Reposicion y Costo Ult.Cp. Tambien acepta planillas A-M con codigo alternativo en B.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="fc-label">Código alternativo fijo</label>
                  <input
                    className="fc-input"
                    maxLength={5}
                    value={importOptions.alternateCode}
                    onChange={(e) => setImportOptions((current) => ({ ...current, alternateCode: e.target.value }))}
                    placeholder="Hasta 5 dígitos"
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'end', gap: '8px', paddingBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={importOptions.addNewCodes}
                    onChange={(e) => setImportOptions((current) => ({ ...current, addNewCodes: e.target.checked }))}
                    style={{ width: 15, height: 15, accentColor: 'var(--accent-purple)' }}
                  />
                  <span style={{ fontSize: 13 }}>Agregar códigos nuevos</span>
                </label>
              </div>
              {importFileName && (
                <div style={{ padding: '10px 12px', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '8px', background: 'rgba(124,58,237,0.08)', fontSize: '13px', color: 'var(--fc-text)' }}>
                  {importRows.length > 0 ? `${importFileName}: ${importRows.length} filas listas para importar.` : `Leyendo ${importFileName}...`}
                </div>
              )}
              {importError && (
                <div style={{ padding: '10px 12px', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', fontSize: '13px', color: '#fca5a5' }}>
                  {importError}
                </div>
              )}
              {importMutation.isPending && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Importando productos...</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--fc-border)', paddingTop: '14px' }}>
                <button className="btn btn-secondary" disabled={importMutation.isPending} onClick={closeImportModal}>Cancelar</button>
                <button className="btn btn-primary" disabled={importRows.length === 0 || importMutation.isPending} onClick={() => importMutation.mutate()}>
                  {importMutation.isPending ? 'Importando...' : 'Importar productos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkDeleting && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !bulkDeleteMutation.isPending && setBulkDeleting(false)}>
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <div style={{ padding: '28px 24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Trash2 size={18} color="#f87171" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>¿Archivar productos seleccionados?</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {selectedProducts.length} producto{selectedProducts.length === 1 ? '' : 's'} seleccionado{selectedProducts.length === 1 ? '' : 's'}. Si tienen historial, se archivan para no romper stock ni documentos.
              </p>
              {bulkDeleteError && (
                <div style={{ marginTop: '12px', padding: '10px 12px', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', fontSize: '13px', color: '#fca5a5' }}>
                  {bulkDeleteError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '22px' }}>
                <button className="btn btn-secondary" onClick={() => { setBulkDeleting(false); setBulkDeleteError(null) }} disabled={bulkDeleteMutation.isPending}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => bulkDeleteMutation.mutate()} disabled={bulkDeleteMutation.isPending}>
                  {bulkDeleteMutation.isPending ? 'Archivando...' : 'Archivar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '360px' }}>
            <div style={{ padding: '28px 24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Trash2 size={18} color="#f87171" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>¿Eliminar producto?</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Si tiene historial, se archiva para no romper stock ni documentos.</p>
              {deleteError && (
                <div style={{ marginTop: '12px', padding: '10px 12px', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', fontSize: '13px', color: '#fca5a5' }}>
                  {deleteError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '22px' }}>
                <button className="btn btn-secondary" onClick={() => { setDeletingId(null); setDeleteError(null) }} disabled={deleteMutation.isPending}>Cancelar</button>
                <button className="btn btn-danger" onClick={() => deleteMutation.mutate(deletingId)} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

