'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  DollarSign,
  LockKeyhole,
  FileText,
  PackagePlus,
  Percent,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import {
  EntitySheet,
  MoneyInput,
  PageHeader,
  QuantityInput,
  RoleGate,
} from '@/components/erp/layout'
import { useAuth } from '@/contexts/AuthContext'
import { cashApi, customersApi, documentsApi, priceListsApi, productsApi, stockApi } from '@/lib/api'
import { printDocumentA4 } from '@/lib/print-document'

type DocumentType = 'INVOICE_A' | 'INVOICE_B' | 'INVOICE_C' | 'REMITO' | 'BUDGET'
type PaymentMode = 'CASH' | 'CURRENT_ACCOUNT'
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MERCADO_PAGO' | 'CURRENT_ACCOUNT' | 'OTHER'
type PaymentKind = 'FULL' | 'ENTRY'

type ProductHit = {
  id: string
  code: string
  name: string
  unit: string
  brandName?: string | null
  categoryName?: string | null
  price: number
  basePrice?: number
  taxRate?: number
  appliedCoefficient?: number
  appliedCoefficientName?: string | null
  stock: number
  stockTotal: number
}

type CounterLine = {
  productId: string
  code: string
  description: string
  brandName?: string | null
  categoryName?: string | null
  unit: string
  stock: number
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  productTaxRate: number
}

type Customer = {
  id: string
  name: string
  cuit?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  ivaCondition?: string
  priceListId?: string | null
}

type PriceList = {
  id: string
  name: string
  isDefault?: boolean
}

type Deposit = {
  id: string
  name: string
  isDefault?: boolean
}

type Punto = {
  id: string
  number: number
  name: string
}

type RecentDoc = {
  id: string
  customerName?: string | null
  total?: number
  date: string
  number?: number | null
  puntoDeVenta?: number | null
}

const DOC_TYPES: Array<{ value: DocumentType; label: string; short: string }> = [
  { value: 'BUDGET', label: 'Presupuesto', short: 'Ppto' },
  { value: 'REMITO', label: 'Remito interno', short: 'Remito' },
  { value: 'INVOICE_B', label: 'Factura B interna', short: 'Fac B' },
  { value: 'INVOICE_A', label: 'Factura A interna', short: 'Fac A' },
  { value: 'INVOICE_C', label: 'Factura C interna', short: 'Fac C' },
]

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
})

const DATE = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  const data = (value as { data?: T[] } | undefined)?.data
  return Array.isArray(data) ? data : []
}

function numberInput(value: string): number {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function lineSubtotal(line: CounterLine) {
  return line.quantity * line.unitPrice * (1 - line.discount / 100)
}

function lineTax(line: CounterLine) {
  return lineSubtotal(line) * line.taxRate / 100
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function appendNote(notes: string, extra: string) {
  return notes.trim() ? `${notes.trim()}\n${extra}` : extra
}

function documentNumber(item: { number?: number | null; puntoDeVenta?: number | null }) {
  if (item.number == null) return 'Borrador'
  if (item.puntoDeVenta == null) return String(item.number).padStart(8, '0')
  return `${String(item.puntoDeVenta).padStart(4, '0')}-${String(item.number).padStart(8, '0')}`
}

function emptyQuickProduct(priceListId: string) {
  return {
    code: '',
    name: '',
    unit: 'un',
    price: '',
    stockQuantity: '',
    brandId: '',
    brandName: '',
    categoryId: '',
    categoryName: '',
    priceListId,
  }
}

function applyVatToLines(lines: CounterLine[], enabled: boolean) {
  return lines.map((line) => ({ ...line, taxRate: enabled ? line.productTaxRate : 0 }))
}

export default function VentasPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const isReadonly = user?.role === 'READONLY'
  const canUseCounter = !isReadonly
  const sensitiveLocked = !isOwner
  const [docType, setDocType] = useState<DocumentType>('BUDGET')
  const [customerId, setCustomerId] = useState('')
  const [priceListId, setPriceListId] = useState('')
  const [depositId, setDepositId] = useState('')
  const [puntoDeVentaId, setPuntoDeVentaId] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [paymentLabel, setPaymentLabel] = useState('Caja Mostrador-Efectivo')
  const [paymentKind, setPaymentKind] = useState<PaymentKind>('FULL')
  const [paymentEntry, setPaymentEntry] = useState('')
  const [roundTotal, setRoundTotal] = useState(true)
  const [includeVat, setIncludeVat] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<CounterLine[]>([])
  const [lastDocument, setLastDocument] = useState<Record<string, unknown> | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customerSheet, setCustomerSheet] = useState(false)
  const [productSheet, setProductSheet] = useState(false)
  const [discountSheet, setDiscountSheet] = useState(false)
  const [paymentSheet, setPaymentSheet] = useState(false)
  const [cashSheet, setCashSheet] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [globalDiscount, setGlobalDiscount] = useState('')
  const [quickCustomer, setQuickCustomer] = useState({ name: '', cuit: '', phone: '', address: '', city: '', province: '', ivaCondition: 'CONSUMIDOR_FINAL', deliveryAddress: '' })
  const [quickProduct, setQuickProduct] = useState(() => emptyQuickProduct(''))

  const { data: customersRaw } = useQuery({ queryKey: ['customers-counter'], queryFn: () => customersApi.list({ limit: 500 }) })
  const { data: priceListsRaw } = useQuery({ queryKey: ['price-lists-counter'], queryFn: priceListsApi.list })
  const { data: depositsRaw } = useQuery({ queryKey: ['deposits-counter'], queryFn: stockApi.deposits })
  const { data: puntosRaw } = useQuery({ queryKey: ['puntos-counter'], queryFn: documentsApi.puntos })
  const { data: brandsRaw } = useQuery({ queryKey: ['brands-counter'], queryFn: productsApi.listBrands })
  const { data: categoriesRaw } = useQuery({ queryKey: ['categories-counter'], queryFn: productsApi.listCategories })
  const { data: recentRaw } = useQuery({
    queryKey: ['counter-recent-documents'],
    queryFn: () => documentsApi.list({ types: 'INVOICE_A,INVOICE_B,INVOICE_C,REMITO,BUDGET' }),
  })
  const { data: currentCash, isLoading: cashLoading } = useQuery({ queryKey: ['cash-current'], queryFn: cashApi.current })

  const priceLists = asArray<PriceList>(priceListsRaw)
  const customers = asArray<Customer>(customersRaw)
  const deposits = asArray<Deposit>(depositsRaw)
  const puntos = asArray<Punto>(puntosRaw)
  const brands = asArray<{ id: string; name: string }>(brandsRaw)
  const categories = asArray<{ id: string; name: string }>(categoriesRaw)
  const recentDocs = asArray<RecentDoc>(recentRaw).slice(0, 8)

  const effectivePriceListId = priceListId || priceLists.find((list) => list.isDefault)?.id || priceLists[0]?.id || ''
  const effectiveDepositId = depositId || deposits.find((deposit) => deposit.isDefault)?.id || deposits[0]?.id || ''
  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const needsPv = docType.startsWith('INVOICE_')
  const budgetMode = docType === 'BUDGET'

  const { data: hitsRaw, isFetching: searching } = useQuery({
    queryKey: ['counter-products', search, effectivePriceListId, effectiveDepositId],
    queryFn: () => productsApi.search({
      q: search.trim(),
      priceListId: effectivePriceListId,
      depositId: effectiveDepositId,
      limit: 60,
    }),
    enabled: search.trim().length > 0,
  })
  const hits = asArray<ProductHit>(hitsRaw)

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + lineSubtotal(line), 0)
    const tax = lines.reduce((sum, line) => sum + lineTax(line), 0)
    const raw = subtotal + tax
    const requestedDiscount = clamp(numberInput(globalDiscount), 0, 100)
    const discount = raw * requestedDiscount / 100
    const payable = Math.max(raw - discount, 0)
    return {
      subtotal,
      tax,
      discount,
      requestedDiscount,
      total: roundTotal ? Math.round(payable) : payable,
      raw,
      items: lines.reduce((sum, line) => sum + line.quantity, 0),
    }
  }, [globalDiscount, lines, roundTotal])

  const addLine = (product: ProductHit) => {
    if (!canUseCounter) return
    setError(null)
    setMessage(null)
    setLines((current) => {
      const index = current.findIndex((line) => line.productId === product.id)
      if (index >= 0) {
        const next = [...current]
        next[index] = { ...next[index], quantity: next[index].quantity + 1 }
        return next
      }
      return [
        ...current,
        {
          productId: product.id,
          code: product.code,
          description: product.name,
          unit: product.unit || 'un',
          brandName: product.brandName,
          categoryName: product.categoryName,
          stock: Number(product.stock ?? product.stockTotal ?? 0),
          quantity: 1,
          unitPrice: Number(product.price || 0),
          discount: 0,
          taxRate: includeVat ? Number(product.taxRate || 0) : 0,
          productTaxRate: Number(product.taxRate || 0),
        },
      ]
    })
    setSearch('')
  }

  const updateLine = (index: number, patch: Partial<CounterLine>) => {
    if (!canUseCounter) return
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))
  }

  const removeLine = (index: number) => {
    if (!canUseCounter) return
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
  }

  const resetCounter = () => {
    setLines([])
    setSearch('')
    setNotes('')
    setDocType('BUDGET')
    setPaymentMode('CASH')
    setPaymentMethod('CASH')
    setPaymentLabel('Caja Mostrador-Efectivo')
    setPaymentKind('FULL')
    setPaymentEntry('')
    setGlobalDiscount('')
    setIncludeVat(false)
  }

  const openCustomerSheet = () => {
    const customer = customers.find((item) => item.id === customerId)
    setQuickCustomer({
      name: customer?.name || '',
      cuit: customer?.cuit || '',
      phone: customer?.phone || '',
      address: customer?.address || '',
      city: customer?.city || '',
      province: customer?.province || '',
      ivaCondition: customer?.ivaCondition || 'CONSUMIDOR_FINAL',
      deliveryAddress: notes.match(/(?:^|\n)Entrega:\s*(.+)/)?.[1] || customer?.address || '',
    })
    setCustomerSheet(true)
  }

  const toggleVat = (enabled: boolean) => {
    setIncludeVat(enabled)
    setLines((current) => applyVatToLines(current, enabled))
  }

  const applyGlobalDiscount = () => {
    const discount = clamp(numberInput(globalDiscount), 0, 100)
    setGlobalDiscount(discount > 0 ? String(discount) : '')
    setDiscountSheet(false)
  }

  const choosePayment = (method: PaymentMethod, label: string, mode: PaymentMode = 'CASH') => {
    setPaymentMethod(method)
    setPaymentLabel(label)
    setPaymentMode(mode)
    setPaymentKind('FULL')
    setPaymentEntry('')
    setPaymentSheet(false)
  }

  const chooseEntry = () => {
    setPaymentMethod('CASH')
    setPaymentLabel('Caja Mostrador-Entrada')
    setPaymentMode('CASH')
    setPaymentKind('ENTRY')
  }

  const closePaymentSheet = () => {
    if (paymentKind === 'ENTRY' && numberInput(paymentEntry) <= 0) return
    setPaymentSheet(false)
  }

  const linesForPayload = () => {
    const globalRate = totals.raw > 0 ? clamp(totals.discount / totals.raw, 0, 1) : 0
    return lines.map((line) => {
      const lineDiscountRate = clamp(line.discount, 0, 100) / 100
      const finalDiscount = globalRate > 0
        ? (1 - ((1 - lineDiscountRate) * (1 - globalRate))) * 100
        : line.discount
      return {
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: clamp(finalDiscount, 0, 100),
        taxRate: line.taxRate,
      }
    })
  }

  const buildDocumentPayload = (type: DocumentType) => {
    const discountNote = totals.discount > 0 ? `Descuento global mostrador: ${totals.requestedDiscount.toLocaleString('es-AR')}% (${ARS.format(totals.discount)})` : ''
    const deliveryNote = quickCustomer.deliveryAddress.trim() ? `Entrega: ${quickCustomer.deliveryAddress.trim()}` : ''
    const baseNotes = [notes, deliveryNote].filter(Boolean).join('\n')
    return {
      type,
      customerId: customerId || null,
      puntoDeVentaId: type.startsWith('INVOICE_') ? puntoDeVentaId || puntos[0]?.id || null : null,
      date,
      notes: discountNote ? appendNote(baseNotes, discountNote) : baseNotes,
      roundTotal,
      items: linesForPayload().map((line) => ({
      productId: line.productId,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount,
      taxRate: line.taxRate,
    })),
      priceListId: effectivePriceListId || null,
    }
  }

  const documentMutation = useMutation({
    mutationFn: async ({ action, type }: { action: 'draft' | 'confirm'; type: DocumentType }) => {
      if (!canUseCounter) throw new Error('Tu usuario es de solo lectura.')
      if (lines.length === 0) throw new Error('Agregá al menos un producto.')
      if (type.startsWith('INVOICE_') && !puntoDeVentaId && puntos.length === 0) throw new Error('Falta punto de venta.')
      const created = await documentsApi.create(buildDocumentPayload(type))
      if (action !== 'confirm') return created
      if (paymentMode === 'CURRENT_ACCOUNT' && !customerId) throw new Error('La cuenta corriente requiere seleccionar un cliente.')
      const entryAmount = numberInput(paymentEntry)
      if (paymentKind === 'ENTRY' && entryAmount <= 0) throw new Error('Ingresá el importe de la entrada.')
      if (paymentKind === 'ENTRY' && entryAmount < totals.total && !customerId) throw new Error('Una entrada parcial requiere cliente para dejar el saldo en cuenta corriente.')
      const payments = paymentKind === 'ENTRY' && entryAmount < totals.total
        ? [
            { method: paymentMethod, amount: entryAmount, notes: paymentLabel },
            { method: 'CURRENT_ACCOUNT', amount: totals.total - entryAmount, notes: 'Saldo por entrada parcial' },
          ]
        : [{
            method: paymentMode === 'CURRENT_ACCOUNT' ? 'CURRENT_ACCOUNT' : paymentMethod,
            amount: paymentKind === 'ENTRY' ? entryAmount : totals.total,
            notes: paymentMode === 'CURRENT_ACCOUNT' ? 'Cuenta corriente desde mostrador' : paymentLabel,
          }]
      return documentsApi.confirm(created.id, {
        depositId: effectiveDepositId,
        paymentMode,
        payments,
      })
    },
    onSuccess: (document: { type: string; status: string; number?: number | null }) => {
      qc.invalidateQueries({ queryKey: ['counter-recent-documents'] })
      qc.invalidateQueries({ queryKey: ['ventas-documents'] })
      qc.invalidateQueries({ queryKey: ['documents-history'] })
      qc.invalidateQueries({ queryKey: ['stock-current'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setLastDocument(document as unknown as Record<string, unknown>)
      setMessage(`${document.type === 'BUDGET' ? 'Presupuesto' : 'Documento'} ${document.status === 'CONFIRMED' ? 'confirmado' : 'guardado'} correctamente.`)
      setError(null)
      resetCounter()
    },
    onError: (mutationError: unknown) => {
      const apiError = mutationError as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const detail = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo guardar el documento.'
      setError(Array.isArray(detail) ? detail.join(', ') : detail)
    },
  })

  const quickCustomerMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: quickCustomer.name,
        cuit: quickCustomer.cuit || null,
        phone: quickCustomer.phone || null,
        address: quickCustomer.address || null,
        city: quickCustomer.city || null,
        province: quickCustomer.province || null,
        ivaCondition: quickCustomer.ivaCondition,
      }
      return customerId ? customersApi.update(customerId, payload) : customersApi.create(payload)
    },
    onSuccess: (customer: Customer) => {
      qc.invalidateQueries({ queryKey: ['customers-counter'] })
      setCustomerId(customer.id)
      if (customer.priceListId) setPriceListId(customer.priceListId)
      setNotes((current) => {
        const clean = current.split(/\r?\n/).filter((line) => !/^Entrega:/i.test(line.trim())).join('\n')
        return quickCustomer.deliveryAddress.trim() ? appendNote(clean, `Entrega: ${quickCustomer.deliveryAddress.trim()}`) : clean
      })
      setCustomerSheet(false)
    },
  })

  const quickProductMutation = useMutation({
    mutationFn: async () => {
      let brandId = quickProduct.brandId || undefined
      let categoryId = quickProduct.categoryId || undefined
      if (!brandId && quickProduct.brandName.trim()) {
        const brand = await productsApi.createBrand({ name: quickProduct.brandName.trim() })
        brandId = brand.id
      }
      if (!categoryId && quickProduct.categoryName.trim()) {
        const category = await productsApi.createCategory({ name: quickProduct.categoryName.trim() })
        categoryId = category.id
      }
      return productsApi.create({
        code: quickProduct.code.trim(),
        name: quickProduct.name.trim(),
        unit: quickProduct.unit || 'un',
        brandId,
        categoryId,
        stockQuantity: numberInput(quickProduct.stockQuantity),
        prices: effectivePriceListId ? { [effectivePriceListId]: numberInput(quickProduct.price) } : undefined,
      })
    },
    onSuccess: (product: { id: string; code: string; name: string; unit?: string; stockQuantity?: number }) => {
      qc.invalidateQueries({ queryKey: ['counter-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['brands-counter'] })
      qc.invalidateQueries({ queryKey: ['categories-counter'] })
      addLine({
        id: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit || 'un',
        price: numberInput(quickProduct.price),
        stock: numberInput(quickProduct.stockQuantity),
        stockTotal: numberInput(quickProduct.stockQuantity),
      })
      setQuickProduct(emptyQuickProduct(effectivePriceListId))
      setProductSheet(false)
    },
  })

  const openCashMutation = useMutation({
    mutationFn: () => cashApi.open({ openingAmount, note: 'Apertura desde mostrador' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-current'] })
      setOpeningAmount('')
      setCashSheet(false)
      setMessage('Caja abierta correctamente.')
      setError(null)
    },
    onError: (mutationError: unknown) => {
      const apiError = mutationError as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const detail = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo abrir la caja.'
      setError(Array.isArray(detail) ? detail.join(', ') : detail)
    },
  })

  return (
    <div className="counter-page">
      <PageHeader
        title="Mostrador"
        subtitle="Presupuestos, remitos y facturas internas desde una sola pantalla"
        actions={(
          <>
            <RoleGate role={user?.role} allow={['OWNER']}>
              <button className="btn btn-secondary" type="button" onClick={openCustomerSheet}>
                <UserPlus size={14} /> Datos cliente
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => { setQuickProduct(emptyQuickProduct(effectivePriceListId)); setProductSheet(true) }}>
                <PackagePlus size={14} /> Producto
              </button>
            </RoleGate>
          </>
        )}
      />

      {message && <div className="counter-alert success"><Check size={15} /> {message}</div>}
      {error && <div className="counter-alert danger"><AlertTriangle size={15} /> {error}</div>}

      <div className="counter-layout">
        <section className="counter-workspace">
          <div className="operation-panel">
            <div className="operation-grid">
              <label>
                <span>Documento</span>
                <select className="fc-input" value={docType} onChange={(event) => setDocType(event.target.value as DocumentType)}>
                  {DOC_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label>
                <span>Fecha</span>
                <input className="fc-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={sensitiveLocked} />
              </label>
              {needsPv && (
                <label>
                  <span>Punto de venta</span>
                  <select className="fc-input" value={puntoDeVentaId} onChange={(event) => setPuntoDeVentaId(event.target.value)}>
                    <option value="">Seleccionar</option>
                    {puntos.map((punto) => <option key={punto.id} value={punto.id}>PV {punto.number} - {punto.name}</option>)}
                  </select>
                </label>
              )}
              <label>
                <span>Depósito</span>
                <select className="fc-input" value={depositId} onChange={(event) => setDepositId(event.target.value)} disabled={sensitiveLocked}>
                  <option value="">Predeterminado</option>
                  {deposits.map((deposit) => <option key={deposit.id} value={deposit.id}>{deposit.name}</option>)}
                </select>
              </label>
              <label>
                <span>Cliente</span>
                <select className="fc-input" value={customerId} onChange={(event) => {
                  const next = event.target.value
                  setCustomerId(next)
                  const customer = customers.find((item) => item.id === next)
                  if (customer?.priceListId) setPriceListId(customer.priceListId)
                }}>
                  <option value="">Consumidor final</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
              </label>
              <button className="btn btn-secondary" type="button" onClick={openCustomerSheet} disabled={!canUseCounter}>
                Datos fiscales / entrega
              </button>
              <label>
                <span>Lista</span>
                <select className="fc-input" value={priceListId} onChange={(event) => setPriceListId(event.target.value)} disabled={sensitiveLocked}>
                  <option value="">Predeterminada</option>
                  {priceLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                </select>
              </label>
              <label>
                <span>Pago</span>
                <select
                  className="fc-input"
                  value={paymentMode}
                  onChange={(event) => {
                    const mode = event.target.value as PaymentMode
                    setPaymentMode(mode)
                    setPaymentKind('FULL')
                    setPaymentEntry('')
                    setPaymentLabel(mode === 'CURRENT_ACCOUNT' ? 'Cuenta corriente' : 'Caja Mostrador-Efectivo')
                  }}
                >
                  <option value="CASH">Contado caja mostrador</option>
                  <option value="CURRENT_ACCOUNT">Cuenta corriente</option>
                </select>
              </label>
            </div>
          </div>

          <div className="counter-control-row">
            <div className="aguila-command-bar">
              <button
                className={`toolbar-btn ${currentCash ? 'active' : ''}`}
                type="button"
                onClick={() => !currentCash && setCashSheet(true)}
                disabled={cashLoading || !canUseCounter}
              >
                <LockKeyhole size={15} /> {currentCash ? 'Caja abierta' : 'Abrir caja'}
              </button>
              <button
                className={`toolbar-btn ${totals.requestedDiscount > 0 ? 'active' : ''}`}
                type="button"
                onClick={() => setDiscountSheet(true)}
                disabled={!canUseCounter}
              >
                <Percent size={15} /> {totals.requestedDiscount > 0 ? `Descuento ${totals.requestedDiscount.toLocaleString('es-AR')}%` : 'Descuento'}
              </button>
              <label className={`toolbar-check ${includeVat ? 'active' : ''}`}>
                <input type="checkbox" checked={includeVat} onChange={(event) => toggleVat(event.target.checked)} disabled={!canUseCounter} />
                IVA
              </label>
              <button className="toolbar-btn" type="button" onClick={() => setPaymentSheet(true)} disabled={!canUseCounter}>
                <DollarSign size={15} /> Contado
              </button>
              <button
                className="toolbar-btn"
                type="button"
                onClick={() => lastDocument && printDocumentA4(lastDocument as Parameters<typeof printDocumentA4>[0])}
                disabled={!lastDocument}
              >
                <Printer size={15} /> Imprimir PDF
              </button>
              <span className="payment-status">{paymentLabel}</span>
            </div>
          </div>

          <div className="product-search-panel">
            <div className="counter-search">
              <Search size={17} />
              <input
                className="fc-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && hits[0]) {
                    event.preventDefault()
                    addLine(hits[0])
                  }
                }}
                placeholder="Código / producto / marca"
                autoComplete="off"
                autoFocus
                disabled={!canUseCounter}
              />
              {search && <button className="btn btn-icon btn-secondary" type="button" onClick={() => setSearch('')}><X size={14} /></button>}
            </div>
            {search.trim() && (
              <div className="product-results">
                {searching ? (
                  <div className="product-result muted">Buscando productos...</div>
                ) : hits.length === 0 ? (
                  <div className="product-result muted">
                    Sin resultados. {isOwner ? 'Podés crear el producto sin salir del mostrador.' : 'Pedile al owner que lo cargue.'}
                  </div>
                ) : hits.map((product) => (
                  <button className="product-result" key={product.id} type="button" onClick={() => addLine(product)}>
                    <span>
                      <strong>{product.code}</strong> {product.name}
                      <small>{[product.brandName, product.categoryName].filter(Boolean).join(' · ') || 'Sin clasificación'}</small>
                    </span>
                    <span className="result-numbers">
                      <b>{ARS.format(product.price || 0)}</b>
                      {product.appliedCoefficient && product.appliedCoefficient > 1 && <small>x{Number(product.appliedCoefficient).toLocaleString('es-AR')} {product.appliedCoefficientName || ''}</small>}
                      <small>Stock {Number(product.stock || 0).toLocaleString('es-AR')}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="counter-lines">
            <div className="counter-lines-header">
              <h2>Detalle de items</h2>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setLines([])} disabled={lines.length === 0 || !canUseCounter} title="Vaciar items">
                <Trash2 size={13} /> Vaciar
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="empty-state counter-empty">
                <ReceiptText size={30} />
                <p>Buscá un producto para empezar el comprobante.</p>
              </div>
            ) : (
              <>
                {budgetMode && (
                  <div className="budget-readonly-note">
                    Presupuesto protegido: podés sumar cantidades, buscar más productos y quitar ítems. Precio, descripción, descuento e IVA quedan bloqueados.
                  </div>
                )}
                <div className="counter-lines-table">
                  <table className="fc-table aguila-items-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th style={{ textAlign: 'right' }}>Cant.</th>
                        <th style={{ textAlign: 'right' }}>Unitario</th>
                        <th style={{ textAlign: 'right' }}>% Desc.</th>
                        {includeVat && <th style={{ textAlign: 'right' }}>% IVA</th>}
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => (
                        <tr key={`${line.productId}-${index}`}>
                          <td className="mono-cell">{line.code}</td>
                          <td>
                            {budgetMode ? (
                              <div className="readonly-line-description">{line.description}</div>
                            ) : (
                              <textarea className="fc-input line-description" value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} disabled={sensitiveLocked} rows={2} />
                            )}
                            <small className="line-meta">Stock {line.stock.toLocaleString('es-AR')} {line.unit} · {[line.brandName, line.categoryName].filter(Boolean).join(' · ') || 'Sin clasificación'}</small>
                          </td>
                          <td><QuantityInput value={String(line.quantity)} onChange={(event) => updateLine(index, { quantity: numberInput(event.target.value) })} disabled={!canUseCounter} /></td>
                          <td>{budgetMode ? <span className="readonly-number">{ARS.format(line.unitPrice)}</span> : <MoneyInput value={String(line.unitPrice)} onChange={(event) => updateLine(index, { unitPrice: numberInput(event.target.value) })} disabled={sensitiveLocked} />}</td>
                          <td>{budgetMode ? <span className="readonly-number">{line.discount.toLocaleString('es-AR')}%</span> : <QuantityInput value={String(line.discount)} onChange={(event) => updateLine(index, { discount: numberInput(event.target.value) })} disabled={!canUseCounter} />}</td>
                          {includeVat && <td>{budgetMode ? <span className="readonly-number">{line.taxRate.toLocaleString('es-AR')}%</span> : <QuantityInput value={String(line.taxRate)} onChange={(event) => updateLine(index, { taxRate: numberInput(event.target.value), productTaxRate: numberInput(event.target.value) })} disabled={!canUseCounter} />}</td>}
                          <td className="line-total">{ARS.format(lineSubtotal(line) + lineTax(line))}</td>
                          <td><button className="btn btn-icon btn-secondary btn-sm" type="button" onClick={() => removeLine(index)} disabled={!canUseCounter} title="Quitar item"><X size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="counter-line-cards">
                  {lines.map((line, index) => (
                    <article className="counter-line-card" key={line.productId}>
                      <header>
                        <div>
                          <b>{line.code}</b>
                          <span>{line.description}</span>
                        </div>
                        <button className="btn btn-icon btn-secondary btn-sm" type="button" onClick={() => removeLine(index)} disabled={!canUseCounter}><X size={13} /></button>
                      </header>
                      <small>Stock {line.stock.toLocaleString('es-AR')} {line.unit} · {[line.brandName, line.categoryName].filter(Boolean).join(' · ') || 'Sin clasificación'}</small>
                      <div className="mobile-line-grid">
                        <label><span>Cant.</span><QuantityInput value={String(line.quantity)} onChange={(event) => updateLine(index, { quantity: numberInput(event.target.value) })} disabled={!canUseCounter} /></label>
                        <label><span>Precio</span>{budgetMode ? <b>{ARS.format(line.unitPrice)}</b> : <MoneyInput value={String(line.unitPrice)} onChange={(event) => updateLine(index, { unitPrice: numberInput(event.target.value) })} disabled={sensitiveLocked} />}</label>
                        <label><span>Desc.</span>{budgetMode ? <b>{line.discount.toLocaleString('es-AR')}%</b> : <QuantityInput value={String(line.discount)} onChange={(event) => updateLine(index, { discount: numberInput(event.target.value) })} disabled={!canUseCounter} />}</label>
                        <strong>{ARS.format(lineSubtotal(line) + lineTax(line))}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="counter-checkout-bar">
            <div className="checkout-context">
              <span>{DOC_TYPES.find((item) => item.value === docType)?.short}</span>
              <strong>{selectedCustomer?.name || 'Consumidor final'}</strong>
            </div>
            <div className="checkout-metrics">
              <div>
                <span>Items</span>
                <strong>{totals.items.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span>Subtotal</span>
                <strong>{ARS.format(totals.subtotal)}</strong>
              </div>
              {includeVat && (
                <div>
                  <span>IVA</span>
                  <strong>{ARS.format(totals.tax)}</strong>
                </div>
              )}
              {totals.discount > 0 && (
                <div>
                  <span>Desc.</span>
                  <strong>-{ARS.format(totals.discount)}</strong>
                </div>
              )}
            </div>
            <label className="checkout-round">
              <input type="checkbox" checked={roundTotal} onChange={(event) => setRoundTotal(event.target.checked)} />
              Redondear
            </label>
            <div className="checkout-total">
              <span>Total</span>
              <strong>{ARS.format(totals.total)}</strong>
            </div>
            <div className="counter-primary-actions">
              <button className="btn btn-secondary" type="button" onClick={() => documentMutation.mutate({ action: 'draft', type: 'BUDGET' })} disabled={documentMutation.isPending || lines.length === 0 || !canUseCounter}>
                <FileText size={14} /> Guardar
              </button>
              <button className="btn btn-primary" type="button" onClick={() => documentMutation.mutate({ action: 'confirm', type: docType })} disabled={documentMutation.isPending || lines.length === 0 || !canUseCounter}>
                <Check size={14} /> {documentMutation.isPending ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>

          <div className="recent-card counter-recent-strip">
            <h2>Últimos documentos</h2>
            {recentDocs.length === 0 ? <p>Sin historial todavía.</p> : recentDocs.map((doc) => (
              <Link key={doc.id} href={`/documentos?selected=${doc.id}`} className="recent-row">
                <span>{doc.customerName || 'Consumidor final'}</span>
                <b>{ARS.format(Number(doc.total || 0))}</b>
                <small>{DATE.format(new Date(doc.date))} · {documentNumber(doc)}</small>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <EntitySheet
        open={customerSheet}
        title={customerId ? 'Editar datos del cliente' : 'Alta rápida de cliente'}
        onClose={() => setCustomerSheet(false)}
        footer={(
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setCustomerSheet(false)}>Cancelar</button>
            <button className="btn btn-primary" type="button" disabled={!quickCustomer.name || quickCustomerMutation.isPending} onClick={() => quickCustomerMutation.mutate()}>
              {quickCustomerMutation.isPending ? 'Guardando...' : customerId ? 'Guardar datos' : 'Crear cliente'}
            </button>
          </>
        )}
      >
        <div className="sheet-form-grid">
          <label><span>Razón social</span><input className="fc-input" value={quickCustomer.name} onChange={(event) => setQuickCustomer((current) => ({ ...current, name: event.target.value }))} autoFocus /></label>
          <label><span>CUIT / DNI</span><input className="fc-input" value={quickCustomer.cuit} onChange={(event) => setQuickCustomer((current) => ({ ...current, cuit: event.target.value }))} /></label>
          <label><span>Condición IVA</span><select className="fc-input" value={quickCustomer.ivaCondition} onChange={(event) => setQuickCustomer((current) => ({ ...current, ivaCondition: event.target.value }))}>
            <option value="CONSUMIDOR_FINAL">Consumidor final</option>
            <option value="RESPONSABLE_INSCRIPTO">Responsable inscripto</option>
            <option value="MONOTRIBUTISTA">Monotributista</option>
            <option value="EXENTO">Exento</option>
            <option value="NO_CATEGORIZADO">No categorizado</option>
          </select></label>
          <label><span>Teléfono</span><input className="fc-input" value={quickCustomer.phone} onChange={(event) => setQuickCustomer((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label><span>Domicilio</span><input className="fc-input" value={quickCustomer.address} onChange={(event) => setQuickCustomer((current) => ({ ...current, address: event.target.value }))} /></label>
          <label><span>Localidad</span><input className="fc-input" value={quickCustomer.city} onChange={(event) => setQuickCustomer((current) => ({ ...current, city: event.target.value }))} /></label>
          <label><span>Provincia</span><input className="fc-input" value={quickCustomer.province} onChange={(event) => setQuickCustomer((current) => ({ ...current, province: event.target.value }))} /></label>
          <label><span>Domicilio de entrega</span><input className="fc-input" value={quickCustomer.deliveryAddress} onChange={(event) => setQuickCustomer((current) => ({ ...current, deliveryAddress: event.target.value }))} placeholder="Si es distinto al domicilio fiscal" /></label>
        </div>
      </EntitySheet>

      <EntitySheet
        open={productSheet}
        title="Alta rápida de producto"
        onClose={() => setProductSheet(false)}
        footer={(
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setProductSheet(false)}>Cancelar</button>
            <button className="btn btn-primary" type="button" disabled={!quickProduct.code || !quickProduct.name || quickProductMutation.isPending} onClick={() => quickProductMutation.mutate()}>
              {quickProductMutation.isPending ? 'Guardando...' : 'Crear y agregar'}
            </button>
          </>
        )}
      >
        <div className="sheet-form-grid">
          <label><span>Código</span><input className="fc-input" value={quickProduct.code} onChange={(event) => setQuickProduct((current) => ({ ...current, code: event.target.value }))} autoFocus /></label>
          <label><span>Nombre</span><input className="fc-input" value={quickProduct.name} onChange={(event) => setQuickProduct((current) => ({ ...current, name: event.target.value }))} /></label>
          <label><span>Marca existente</span><select className="fc-input" value={quickProduct.brandId} onChange={(event) => setQuickProduct((current) => ({ ...current, brandId: event.target.value, brandName: '' }))}><option value="">Crear / sin marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
          <label><span>Nueva marca</span><input className="fc-input" value={quickProduct.brandName} disabled={Boolean(quickProduct.brandId)} onChange={(event) => setQuickProduct((current) => ({ ...current, brandName: event.target.value }))} /></label>
          <label><span>Categoría existente</span><select className="fc-input" value={quickProduct.categoryId} onChange={(event) => setQuickProduct((current) => ({ ...current, categoryId: event.target.value, categoryName: '' }))}><option value="">Crear / sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label><span>Nueva categoría</span><input className="fc-input" value={quickProduct.categoryName} disabled={Boolean(quickProduct.categoryId)} onChange={(event) => setQuickProduct((current) => ({ ...current, categoryName: event.target.value }))} /></label>
          <label><span>Unidad</span><input className="fc-input" value={quickProduct.unit} onChange={(event) => setQuickProduct((current) => ({ ...current, unit: event.target.value }))} /></label>
          <label><span>Precio mostrador</span><MoneyInput value={quickProduct.price} onChange={(event) => setQuickProduct((current) => ({ ...current, price: event.target.value }))} /></label>
          <label><span>Stock inicial</span><QuantityInput value={quickProduct.stockQuantity} onChange={(event) => setQuickProduct((current) => ({ ...current, stockQuantity: event.target.value }))} /></label>
        </div>
      </EntitySheet>

      <EntitySheet
        open={cashSheet}
        title="Abrir caja"
        onClose={() => setCashSheet(false)}
        footer={(
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setCashSheet(false)}>Cancelar</button>
            <button className="btn btn-primary" type="button" onClick={() => openCashMutation.mutate()} disabled={openCashMutation.isPending}>
              {openCashMutation.isPending ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </>
        )}
      >
        <div className="sheet-form-grid">
          <label><span>Saldo inicial efectivo</span><MoneyInput value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} placeholder="0,00" autoFocus /></label>
        </div>
      </EntitySheet>

      <EntitySheet
        open={discountSheet}
        title="Descuento del Comprobante"
        onClose={() => setDiscountSheet(false)}
        footer={(
          <>
            <button className="btn btn-secondary" type="button" onClick={() => { setGlobalDiscount(''); setDiscountSheet(false) }}>Quitar descuento</button>
            <button className="btn btn-primary" type="button" onClick={applyGlobalDiscount}>Aplicar descuento</button>
          </>
        )}
      >
        <div className="sheet-form-grid">
          <label><span>Porcentaje de descuento</span><QuantityInput value={globalDiscount} onChange={(event) => setGlobalDiscount(event.target.value)} placeholder="0" min={0} max={100} autoFocus /></label>
          <div className="discount-help">
            <span>Total antes</span>
            <strong>{ARS.format(totals.raw)}</strong>
            <span>Porcentaje</span>
            <strong>{totals.requestedDiscount.toLocaleString('es-AR')}%</strong>
            <span>Descuento</span>
            <strong>-{ARS.format(totals.discount)}</strong>
            <span>Total final</span>
            <strong>{ARS.format(totals.total)}</strong>
          </div>
        </div>
      </EntitySheet>

      <EntitySheet
        open={paymentSheet}
        title="Seleccionar Valor"
        onClose={() => setPaymentSheet(false)}
        footer={<button className="btn btn-primary" type="button" onClick={closePaymentSheet}>Aceptar</button>}
      >
        <div className="payment-options">
          <button type="button" className={paymentKind === 'ENTRY' ? 'active' : ''} onClick={chooseEntry}>
            <strong>Entrada</strong><span>Pago parcial · deja saldo en CC</span>
          </button>
          <button type="button" onClick={() => choosePayment('CASH', 'Caja Mostrador-Efectivo')}>
            <strong>Efectivo</strong><span>Caja Mostrador · Pesos</span>
          </button>
          <button type="button" onClick={() => choosePayment('MERCADO_PAGO', 'Caja Mostrador-Mercado Pago')}>
            <strong>Mercado Pago</strong><span>Caja Mostrador · Dinero digital</span>
          </button>
          <button type="button" onClick={() => choosePayment('DEBIT_CARD', 'Caja Mostrador-Débito')}>
            <strong>Débito</strong><span>Caja Mostrador · Tarjeta</span>
          </button>
          <button type="button" onClick={() => choosePayment('BANK_TRANSFER', 'Banco/Transferencia')}>
            <strong>Transferencia</strong><span>Banco · Pesos</span>
          </button>
          <button type="button" onClick={() => choosePayment('CURRENT_ACCOUNT', 'Cuenta corriente', 'CURRENT_ACCOUNT')}>
            <strong>Cuenta corriente</strong><span>Requiere cliente seleccionado</span>
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="fc-label">Importe de entrada</label>
          <MoneyInput value={paymentEntry} onChange={(event) => setPaymentEntry(event.target.value)} placeholder={paymentKind === 'ENTRY' ? 'Obligatorio para entrada' : String(totals.total || 0)} />
          {paymentKind === 'ENTRY' && numberInput(paymentEntry) <= 0 && (
            <div className="field-hint danger">Ingresá cuánto deja como entrada.</div>
          )}
        </div>
      </EntitySheet>
    </div>
  )
}
