'use client'

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  DollarSign,
  LockKeyhole,
  FileText,
  Percent,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  ConfirmDialog,
  EntitySheet,
  MoneyInput,
  PageHeader,
  QuantityInput,
} from '@/components/erp/layout'
import { useAuth } from '@/contexts/AuthContext'
import { useBarcodeScan } from '@/hooks/use-barcode-scan'
import { DateInputAR } from '@/components/ui/date-input-ar'
import { cashApi, customersApi, documentsApi, priceListsApi, productsApi, stockApi, preciosEspecialesApi } from '@/lib/api'
import { corePriceLists } from '@/lib/price-list-rules'
import { printDocumentA4 } from '@/lib/print-document'

type DocumentType = 'INVOICE_A' | 'INVOICE_B' | 'INVOICE_C' | 'REMITO' | 'BUDGET'
type PaymentMode = 'CASH' | 'CURRENT_ACCOUNT'
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MERCADO_PAGO' | 'CURRENT_ACCOUNT' | 'OTHER'
type PaymentKind = 'FULL' | 'ENTRY'

type CounterPayment = {
  id: string
  method: PaymentMethod
  amount: number
  reference?: string
  notes: string
}

type ProductHit = {
  id: string
  code: string
  barcode?: string | null
  barcodeAlt?: string | null
  originCode?: string | null
  name: string
  unit: string
  brandName?: string | null
  categoryName?: string | null
  price: number
  pricesByList?: Partial<Record<'LP1' | 'LP2' | 'LP3' | 'LP4' | 'LP5' | 'CR' | 'CU', number>>
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
  isSpecialPrice?: boolean
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

type ResumableDocument = {
  id: string
  type: DocumentType
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED'
  number?: number | null
  puntoDeVenta?: { id?: string | null; number?: number | null } | null
  puntoDeVentaId?: string | null
  customer?: (Customer & { id?: string }) | null
  date: string
  notes?: string | null
  items?: Array<{
    productId?: string | null
    productCode?: string | null
    description: string
    quantity: number
    unitPrice: number
    discount: number
    taxRate?: number
    brandName?: string | null
    categoryName?: string | null
  }>
}

const DOC_TYPES: Array<{ value: DocumentType; label: string; short: string }> = [
  { value: 'BUDGET', label: 'Presupuesto', short: 'Ppto' },
  { value: 'REMITO', label: 'Remito interno', short: 'Remito' },
  { value: 'INVOICE_B', label: 'Factura B interna', short: 'Fac B' },
  { value: 'INVOICE_A', label: 'Factura A interna', short: 'Fac A' },
  { value: 'INVOICE_C', label: 'Factura C interna', short: 'Fac C' },
]
const STOCK_CONFIRMED_TYPES = new Set<DocumentType>(['INVOICE_A', 'INVOICE_B', 'INVOICE_C', 'REMITO'])

import { formatPesos } from '@/lib/format'
const COUNTER_PRICE_COLUMNS = ['LP1', 'LP2', 'LP3', 'LP4'] as const

function formatCounterListPrice(product: ProductHit, code: (typeof COUNTER_PRICE_COLUMNS)[number]) {
  const value = product.pricesByList?.[code]
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? formatPesos(value) : '—'
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  MERCADO_PAGO: 'Mercado Pago',
  CURRENT_ACCOUNT: 'Cuenta corriente',
  OTHER: 'Otro',
}

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

function applyVatToLines(lines: CounterLine[], enabled: boolean) {
  return lines.map((line) => ({ ...line, taxRate: enabled ? line.productTaxRate : 0 }))
}

function normalizePaymentsForDocument<T extends { method: string; amount: number; reference?: string; notes?: string }>(payments: T[], total: number) {
  let excess = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) - total
  if (excess <= 0.01) return payments
  return payments.map((payment, index) => {
    if (excess <= 0) return payment
    const canReduce = payment.method === 'CASH' || index === payments.length - 1
    if (!canReduce) return payment
    const reduction = Math.min(excess, payment.amount)
    excess -= reduction
    return { ...payment, amount: Math.max(payment.amount - reduction, 0) }
  }).filter((payment) => payment.amount > 0)
}

export default function VentasPage() {
  const qc = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const resumeParam = searchParams.get('retomar')
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
  const [paymentReference, setPaymentReference] = useState('')
  const [payments, setPayments] = useState<CounterPayment[]>([])
  const [roundTotal, setRoundTotal] = useState(true)
  const [includeVat, setIncludeVat] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [lines, setLines] = useState<CounterLine[]>([])
  const [resumeDocumentId, setResumeDocumentId] = useState<string | null>(null)
  const isRetakingDraft = resumeDocumentId !== null
  const [lastDocument, setLastDocument] = useState<Record<string, unknown> | null>(null)
  const [lastDocumentId, setLastDocumentId] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customerSheet, setCustomerSheet] = useState(false)
  const [discountSheet, setDiscountSheet] = useState(false)
  const [paymentSheet, setPaymentSheet] = useState(false)
  const [cashSheet, setCashSheet] = useState(false)
  const [productDetail, setProductDetail] = useState<ProductHit | null>(null)
  const [openingAmount, setOpeningAmount] = useState('')
  const [globalDiscount, setGlobalDiscount] = useState('')
  const [quickCustomer, setQuickCustomer] = useState({ name: '', cuit: '', phone: '', address: '', city: '', province: '', ivaCondition: 'CONSUMIDOR_FINAL', deliveryAddress: '' })
  const [resumeConfirm, setResumeConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const loadedResumeIdRef = useRef<string | null>(null)
  const pendingResumeRef = useRef<ResumableDocument | null>(null)

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSearchDebounced, setCustomerSearchDebounced] = useState('')
  const [selectedCustomerObj, setSelectedCustomerObj] = useState<Record<string, any> | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setCustomerSearchDebounced(customerSearch), 300)
    return () => clearTimeout(t)
  }, [customerSearch])

  const { data: customersRaw } = useQuery({
    queryKey: ['customers-counter', customerSearchDebounced],
    queryFn: () => customersApi.list({ search: customerSearchDebounced || undefined, limit: 40 }),
  })
  const { data: priceListsRaw } = useQuery({ queryKey: ['price-lists-counter'], queryFn: priceListsApi.list })
  const { data: depositsRaw } = useQuery({ queryKey: ['deposits-counter'], queryFn: stockApi.deposits })
  const { data: puntosRaw } = useQuery({ queryKey: ['puntos-counter'], queryFn: documentsApi.puntos })
  const { data: recentRaw } = useQuery({
    queryKey: ['counter-recent-documents'],
    queryFn: () => documentsApi.list({ types: 'INVOICE_A,INVOICE_B,INVOICE_C,REMITO,BUDGET', limit: 8 }),
  })
  const { data: currentCash, isLoading: cashLoading } = useQuery({ queryKey: ['cash-current'], queryFn: cashApi.current })
  const { data: resumeDocumentRaw } = useQuery({
    queryKey: ['counter-resume-document', resumeParam],
    queryFn: () => documentsApi.get(resumeParam as string),
    enabled: Boolean(resumeParam),
  })

  const priceLists = corePriceLists(asArray<PriceList>(priceListsRaw))
  const customers = asArray<Customer>(customersRaw)
  const deposits = asArray<Deposit>(depositsRaw)
  const puntos = asArray<Punto>(puntosRaw)
  const recentDocs = asArray<RecentDoc>(recentRaw).slice(0, 8)
  const printableDocumentId = lastDocumentId || recentDocs[0]?.id || null

  const effectivePriceListId = priceListId || priceLists.find((list) => list.isDefault)?.id || priceLists[0]?.id || ''
  const effectiveDepositId = depositId || deposits.find((deposit) => deposit.isDefault)?.id || deposits[0]?.id || ''
  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const [preciosEspecialesMap, setPreciosEspecialesMap] = useState<Map<string, { precio: number; descuento?: number }>>(new Map())

  useEffect(() => {
    if (!customerId) { setPreciosEspecialesMap(new Map()); return }
    preciosEspecialesApi.list(customerId).then((data: any[]) => {
      const map = new Map<string, { precio: number; descuento?: number }>()
      for (const p of data) {
        map.set(p.productId, { precio: Number(p.precio), descuento: p.descuento ? Number(p.descuento) : undefined })
      }
      setPreciosEspecialesMap(map)
    }).catch(() => {})
  }, [customerId])

  const needsPv = docType.startsWith('INVOICE_')
  const budgetMode = docType === 'BUDGET'

  const hydrateDraft = useCallback(async (document: ResumableDocument) => {
    if (document.status !== 'DRAFT') {
      queueMicrotask(() => {
        setResumeDocumentId(null)
        setError('Solo se pueden retomar comprobantes en borrador desde Mostrador.')
      })
      return
    }
    const productIds = [...new Set((document.items ?? [])
      .map((item) => item.productId)
      .filter((id): id is string => Boolean(id)))]
    const productById = new Map<string, ProductHit>()
    await Promise.all(productIds.map(async (productId) => {
      try {
        productById.set(productId, await productsApi.get(productId))
      } catch {
        // El backend vuelve a validar stock/precios al confirmar; si no se puede hidratar, igual dejamos retomar el borrador.
      }
    }))

    setResumeDocumentId(document.id)
    setDocType(DOC_TYPES.some((type) => type.value === document.type) ? document.type : 'BUDGET')
    setCustomerId(document.customer?.id || '')
    setPuntoDeVentaId(document.puntoDeVenta?.id || document.puntoDeVentaId || '')
    setDate(document.date ? new Date(document.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
    setNotes(document.notes || '')
    setPayments([])
    setPaymentMode('CASH')
    setPaymentMethod('CASH')
    setPaymentLabel('Caja Mostrador-Efectivo')
    setPaymentKind('FULL')
    setPaymentEntry('')
    setPaymentReference('')
    setGlobalDiscount('')
    const nextLines = (document.items ?? []).map((item) => {
      const product = item.productId ? productById.get(item.productId) : undefined
      const taxRate = Number(item.taxRate || product?.taxRate || 0)
      return {
        productId: item.productId || '',
        code: product?.code || item.productCode || 'S/C',
        description: item.description,
        brandName: product?.brandName ?? item.brandName ?? null,
        categoryName: product?.categoryName ?? item.categoryName ?? null,
        unit: product?.unit || 'un',
        stock: Number(product?.stock ?? product?.stockTotal ?? 0),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        discount: Number(item.discount || 0),
        taxRate,
        productTaxRate: taxRate,
      }
    })
    setIncludeVat(nextLines.some((line) => line.taxRate > 0))
    setLines(nextLines)
    setLastDocument(document as unknown as Record<string, unknown>)
    setLastDocumentId(document.id)
    setError(null)
    setMessage(`Borrador ${documentNumber({ number: document.number, puntoDeVenta: document.puntoDeVenta?.number ?? null })} retomado. Finalizalo desde Mostrador para impactar pagos/caja.`)
  }, [])

  useEffect(() => {
    if (!resumeParam || !resumeDocumentRaw || loadedResumeIdRef.current === resumeParam) return
    const document = resumeDocumentRaw as ResumableDocument

    if (document.status !== 'DRAFT') {
      queueMicrotask(() => {
        setResumeDocumentId(null)
        setError('Solo se pueden retomar comprobantes en borrador desde Mostrador.')
      })
      return
    }

    if (lines.length > 0) {
      pendingResumeRef.current = document
      queueMicrotask(() => setResumeConfirm(true))
      return
    }

    loadedResumeIdRef.current = resumeParam
    startTransition(() => { void hydrateDraft(document) })
  }, [resumeDocumentRaw, resumeParam, lines, hydrateDraft])

  const confirmResume = useCallback(() => {
    const document = pendingResumeRef.current
    if (!document) return
    setResumeConfirm(false)
    pendingResumeRef.current = null
    loadedResumeIdRef.current = resumeParam
    startTransition(() => { void hydrateDraft(document) })
  }, [hydrateDraft, resumeParam])

  const cancelResume = useCallback(() => {
    setResumeConfirm(false)
    pendingResumeRef.current = null
    loadedResumeIdRef.current = null
    router.replace('/ventas', { scroll: false })
  }, [router])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const canSearchProducts = debouncedSearch.length >= 2
  const { data: hitsRaw, isFetching: searching } = useQuery({
    queryKey: ['counter-products', debouncedSearch, effectivePriceListId, effectiveDepositId],
    queryFn: ({ signal }) => productsApi.search({
      q: debouncedSearch,
      priceListId: effectivePriceListId,
      depositId: effectiveDepositId,
      limit: 60,
    }, signal),
    enabled: canSearchProducts,
    retry: false,
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

  const stockOverages = useMemo(() => lines
    .filter((line) => line.productId && Number(line.quantity || 0) > Number(line.stock || 0))
    .map((line) => ({
      productId: line.productId,
      description: line.description,
      requested: Number(line.quantity || 0),
      available: Number(line.stock || 0),
      unit: line.unit || 'un',
    })), [lines])
  const blocksStockConfirmation = STOCK_CONFIRMED_TYPES.has(docType) && stockOverages.length > 0

  const paymentSummary = useMemo(() => {
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const nonAccountPaid = payments
      .filter((payment) => payment.method !== 'CURRENT_ACCOUNT')
      .reduce((sum, payment) => sum + payment.amount, 0)
    const cashPaid = payments
      .filter((payment) => payment.method === 'CASH')
      .reduce((sum, payment) => sum + payment.amount, 0)
    const remaining = Math.max(totals.total - paid, 0)
    const change = Math.max(paid - totals.total, 0)
    return { paid, nonAccountPaid, cashPaid, remaining, change }
  }, [payments, totals.total])

  const addLine = useCallback((product: ProductHit) => {
    if (!canUseCounter) return
    setError(null)
    setMessage(null)
    const specialPrice = preciosEspecialesMap.get(product.id)
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
          unitPrice: specialPrice ? specialPrice.precio : Number(product.price || 0),
          discount: specialPrice?.descuento ?? 0,
          taxRate: includeVat ? Number(product.taxRate || 0) : 0,
          productTaxRate: Number(product.taxRate || 0),
          isSpecialPrice: !!specialPrice,
        },
      ]
    })
    setSearch('')
    window.setTimeout(() => searchRef.current?.focus(), 0)
  }, [canUseCounter, includeVat, preciosEspecialesMap])

  useBarcodeScan(async (code) => {
    if (!canUseCounter || productDetail || customerSheet || paymentSheet || cashSheet || discountSheet) return
    setError(null)
    setMessage(null)
    const results = asArray<ProductHit>(await productsApi.search({
      q: code,
      priceListId: effectivePriceListId,
      depositId: effectiveDepositId,
      limit: 8,
    }))
    const exactMatches = results.filter((product) => [product.code, product.barcode, product.barcodeAlt].some((value) => String(value || '').trim() === code))
    if (exactMatches.length === 1) addLine(exactMatches[0])
    else if (results.length === 1) addLine(results[0])
    else if (results.length > 1) {
      setSearch(code)
      setMessage(`Encontré ${results.length} coincidencias para ${code}. Elegí el producto correcto.`)
      window.setTimeout(() => searchRef.current?.focus(), 0)
    } else setError(`No encontré producto para el código ${code}`)
  }, canUseCounter)

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
    setPaymentReference('')
    setPayments([])
    setGlobalDiscount('')
    setIncludeVat(false)
    setCustomerId('')
    setPriceListId('')
    setDepositId('')
    setPuntoDeVentaId('')
  }

  const printLastDocument = async () => {
    const documentId = printableDocumentId
    if (!documentId && !lastDocument) {
      setError('No hay un comprobante disponible para imprimir.')
      return
    }
    setPrinting(true)
    setError(null)
    try {
      const detail = documentId ? await documentsApi.get(documentId) : lastDocument
      setLastDocument(detail as Record<string, unknown>)
      if ((detail as { id?: string })?.id) setLastDocumentId((detail as { id: string }).id)
      const opened = printDocumentA4(detail as Parameters<typeof printDocumentA4>[0])
      if (!opened) setError('El navegador bloqueó la ventana de impresión. Habilitá pop-ups para este sitio y probá de nuevo.')
    } catch (printError) {
      const apiError = printError as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
      const detail = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || 'No se pudo preparar el comprobante para imprimir.'
      setError(Array.isArray(detail) ? detail.join(', ') : detail)
    } finally {
      setPrinting(false)
    }
  }

  const openCustomerSheet = () => {
    const customer = customers.find((item) => item.id === customerId) || selectedCustomerObj
    setCustomerSearch(customer?.name || '')
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

  const selectCustomerInSheet = (nextId: string) => {
    setCustomerId(nextId)
    const customer = customers.find((item) => item.id === nextId)
    if (customer) setSelectedCustomerObj(customer as any)
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
    if (customer?.priceListId) setPriceListId(customer.priceListId)
  }

  const saveDeliveryOnly = () => {
    setNotes((current) => {
      const clean = current.split(/\r?\n/).filter((line) => !/^Entrega:/i.test(line.trim())).join('\n')
      return quickCustomer.deliveryAddress.trim() ? appendNote(clean, `Entrega: ${quickCustomer.deliveryAddress.trim()}`) : clean
    })
    setCustomerSheet(false)
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
    setPaymentEntry(String(paymentSummary.remaining || totals.total || 0))
  }

  const chooseEntry = () => {
    setPaymentMethod('CASH')
    setPaymentLabel('Caja Mostrador-Entrada')
    setPaymentMode('CASH')
    setPaymentKind('ENTRY')
    setPaymentEntry('')
  }

  const closePaymentSheet = () => {
    if (payments.length === 0 && paymentKind === 'ENTRY' && numberInput(paymentEntry) <= 0) return
    setPaymentSheet(false)
  }

  const addPayment = () => {
    const amount = numberInput(paymentEntry)
    if (amount <= 0) {
      setError('Ingresá un importe de pago mayor a cero.')
      return
    }
    if (paymentMethod === 'CURRENT_ACCOUNT' && !customerId) {
      setError('La cuenta corriente requiere seleccionar un cliente.')
      return
    }
    const next: CounterPayment = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      method: paymentMethod,
      amount,
      reference: paymentReference.trim() || undefined,
      notes: paymentLabel,
    }
    setPayments((current) => [...current, next])
    setPaymentEntry('')
    setPaymentReference('')
    setError(null)
  }

  const removePayment = (id: string) => {
    setPayments((current) => current.filter((payment) => payment.id !== id))
  }

  const undoLastLine = () => {
    if (!canUseCounter) return
    setLines((current) => current.slice(0, -1))
  }

  const closeTopSheet = () => {
    if (paymentSheet) setPaymentSheet(false)
    else if (discountSheet) setDiscountSheet(false)
    else if (cashSheet) setCashSheet(false)
    else if (productDetail) setProductDetail(null)
    else if (customerSheet) setCustomerSheet(false)
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
    const discountNote = totals.discount > 0 ? `Descuento global mostrador: ${totals.requestedDiscount.toLocaleString('es-AR')}% (${formatPesos(totals.discount)})` : ''
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
      if (action === 'confirm' && STOCK_CONFIRMED_TYPES.has(type) && stockOverages.length > 0) {
        const first = stockOverages[0]
        throw new Error(`Stock insuficiente para ${first.description}. Disponible: ${first.available.toLocaleString('es-AR')} ${first.unit}, solicitado: ${first.requested.toLocaleString('es-AR')} ${first.unit}.`)
      }
      if (type.startsWith('INVOICE_') && !puntoDeVentaId && puntos.length === 0) throw new Error('Falta punto de venta.')
      const documentPayload = buildDocumentPayload(type)
      if (action !== 'confirm') {
        return resumeDocumentId ? documentsApi.update(resumeDocumentId, documentPayload) : documentsApi.create(documentPayload)
      }
      if (paymentMode === 'CURRENT_ACCOUNT' && !customerId) throw new Error('La cuenta corriente requiere seleccionar un cliente.')
      const entryAmount = numberInput(paymentEntry)
      if (payments.length === 0 && paymentKind === 'ENTRY' && entryAmount <= 0) throw new Error('Ingresá el importe de la entrada.')
      if (payments.length === 0 && paymentKind === 'ENTRY' && entryAmount < totals.total && !customerId) throw new Error('Una entrada parcial requiere cliente para dejar el saldo en cuenta corriente.')
      const draftPayments = payments.length > 0
        ? payments.map((payment) => ({ method: payment.method, amount: payment.amount, reference: payment.reference, notes: payment.notes }))
        : paymentKind === 'ENTRY' && entryAmount < totals.total
        ? [
            { method: paymentMethod, amount: entryAmount, notes: paymentLabel },
            { method: 'CURRENT_ACCOUNT', amount: totals.total - entryAmount, notes: 'Saldo por entrada parcial' },
          ]
        : [{
            method: paymentMode === 'CURRENT_ACCOUNT' ? 'CURRENT_ACCOUNT' : paymentMethod,
            amount: paymentKind === 'ENTRY' ? entryAmount : totals.total,
            reference: paymentReference.trim() || undefined,
            notes: paymentMode === 'CURRENT_ACCOUNT' ? 'Cuenta corriente desde mostrador' : paymentLabel,
          }]
      const paid = draftPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      if (paid < totals.total - 0.01) {
        if (!customerId) throw new Error('El pago no cubre el total. Agregá otro medio o seleccioná cliente para dejar saldo en cuenta corriente.')
        draftPayments.push({ method: 'CURRENT_ACCOUNT', amount: totals.total - paid, reference: undefined, notes: 'Saldo pendiente en cuenta corriente' })
      }
      const normalizedPayments = normalizePaymentsForDocument(draftPayments, totals.total)
      if (type.startsWith('INVOICE_') && normalizedPayments.some((payment) => payment.method !== 'CURRENT_ACCOUNT') && !currentCash) {
        throw new Error('Abrí una caja antes de confirmar ventas de contado.')
      }
      const paymentModeForDocument = normalizedPayments.some((payment) => payment.method === 'CURRENT_ACCOUNT') && normalizedPayments.some((payment) => payment.method !== 'CURRENT_ACCOUNT') ? 'MIXED' : paymentMode
      if (resumeDocumentId) {
        await documentsApi.update(resumeDocumentId, documentPayload)
        return documentsApi.confirm(resumeDocumentId, {
          depositId: effectiveDepositId,
          paymentMode: paymentModeForDocument,
          payments: normalizedPayments,
        })
      }
      return documentsApi.confirmSale({
        ...documentPayload,
        depositId: effectiveDepositId,
        paymentMode: paymentModeForDocument,
        payments: normalizedPayments,
      })
    },
    onSuccess: (document: { id?: string; type: string; status: string; number?: number | null }) => {
      qc.invalidateQueries({ queryKey: ['counter-recent-documents'] })
      qc.invalidateQueries({ queryKey: ['ventas-documents'] })
      qc.invalidateQueries({ queryKey: ['documents-history'] })
      qc.invalidateQueries({ queryKey: ['stock-current'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['cash-current'] })
      setLastDocument(document as unknown as Record<string, unknown>)
      setLastDocumentId(document.id ?? null)
      setMessage(`${document.type === 'BUDGET' ? 'Presupuesto' : 'Documento'} ${document.status === 'CONFIRMED' ? 'confirmado' : 'guardado'} correctamente.`)
      setError(null)
      if (resumeDocumentId) {
        setResumeDocumentId(null)
        loadedResumeIdRef.current = null
        router.replace('/ventas', { scroll: false })
      }
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

  const saveCustomerSheet = () => {
    if (!quickCustomer.name.trim()) {
      saveDeliveryOnly()
      return
    }
    quickCustomerMutation.mutate()
  }

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
      />

      {message && (
        <div className="counter-alert success counter-alert-row">
          <span><Check size={15} /> {message}</span>
          {lastDocumentId && (
            <Link className="btn btn-secondary btn-sm" href={`/documentos?selected=${lastDocumentId}`}>
              <FileText size={13} /> Ver comprobante
            </Link>
          )}
        </div>
      )}
      {error && <div className="counter-alert danger"><AlertTriangle size={15} /> {error}</div>}
      {stockOverages.length > 0 && (
        <div className={`counter-alert ${blocksStockConfirmation ? 'danger' : 'warning'}`}>
          <AlertTriangle size={15} />
          {blocksStockConfirmation
            ? `No podés confirmar ${docType === 'REMITO' ? 'remito' : 'factura'} con stock insuficiente: ${stockOverages[0].description} tiene ${stockOverages[0].available.toLocaleString('es-AR')} ${stockOverages[0].unit} y pediste ${stockOverages[0].requested.toLocaleString('es-AR')}.`
            : `Presupuesto con cantidad mayor al stock: ${stockOverages[0].description} tiene ${stockOverages[0].available.toLocaleString('es-AR')} ${stockOverages[0].unit} y pediste ${stockOverages[0].requested.toLocaleString('es-AR')}.`}
        </div>
      )}
      <button type="button" data-escape-action="true" onClick={closeTopSheet} hidden />
      <button type="button" data-undo-line-action="true" onClick={undoLastLine} hidden />

      <div className={`shift-strip ${currentCash ? 'open' : 'closed'}`}>
        <div>
          <span>Turno</span>
          <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: currentCash ? '#22c55e' : '#ef4444' }} />
            {currentCash ? 'Caja abierta' : 'Caja cerrada'}
          </strong>
        </div>
        <div>
          <span>Usuario</span>
          <strong>{user?.firstName} {user?.lastName}</strong>
        </div>
        <div>
          <span>Saldo esperado</span>
          <strong>{cashLoading ? '...' : formatPesos(Number((currentCash as { expectedAmount?: number } | null)?.expectedAmount || 0))}</strong>
        </div>
      </div>

      <div className="counter-layout">
        <section className="counter-workspace">
          <div className="operation-panel">
            <div className="operation-grid">
              <label className="operation-field operation-field-document">
                <span>Documento</span>
                <select className="fc-input" value={docType} onChange={(event) => setDocType(event.target.value as DocumentType)}>
                  {DOC_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className="operation-field operation-field-date">
                <span>Fecha</span>
                <DateInputAR value={date} onChange={setDate} className="fc-input" />
              </label>
              {needsPv && (
                <label className="operation-field operation-field-pv">
                  <span>Punto de venta</span>
                  <select className="fc-input" value={puntoDeVentaId} onChange={(event) => setPuntoDeVentaId(event.target.value)}>
                    <option value="">Seleccionar</option>
                    {puntos.map((punto) => <option key={punto.id} value={punto.id}>PV {punto.number} - {punto.name}</option>)}
                  </select>
                </label>
              )}
              <label className="operation-field operation-field-deposit">
                <span>Depósito</span>
                <select className="fc-input" value={depositId} onChange={(event) => setDepositId(event.target.value)} disabled={sensitiveLocked}>
                  <option value="">Predeterminado</option>
                  {deposits.map((deposit) => <option key={deposit.id} value={deposit.id}>{deposit.name}</option>)}
                </select>
              </label>
              <label className="operation-field operation-field-customer">
                <span>Cliente</span>
                <div style={{ position: 'relative' }}>
                  {customerId && !customerSearch ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span className="fc-input" style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {customers.find(c => c.id === customerId)?.name || 'Cliente seleccionado'}
                      </span>
                      <button type="button" className="btn btn-icon btn-secondary btn-sm" title="Cambiar cliente" onClick={() => { setCustomerId(''); setCustomerSearch('') }}>
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        className="fc-input"
                        style={{ paddingLeft: 26, fontSize: 13 }}
                        placeholder="Consumidor final"
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                      />
                      {customerSearch && customers.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--fc-bg)', border: '1px solid var(--fc-border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: 180, overflowY: 'auto', marginTop: 3 }}>
                          {customers.map(c => (
                            <button key={c.id} type="button"
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, background: 'none', border: 'none', color: 'var(--fc-text)', cursor: 'pointer' }}
                               onMouseDown={() => {
                                 setCustomerId(c.id)
                                 setSelectedCustomerObj(c)
                                 setCustomerSearch('')
                                 if (c.priceListId) setPriceListId(c.priceListId)
                              }}>
                              {c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </label>
              <button className="btn btn-secondary operation-customer-button" type="button" data-customer-action="true" onClick={openCustomerSheet} disabled={!canUseCounter}>
                Datos fiscales / entrega
              </button>
              <label className="operation-field operation-field-list">
                <span>Lista</span>
                <select className="fc-input" value={priceListId} onChange={(event) => setPriceListId(event.target.value)} disabled={sensitiveLocked}>
                  <option value="">Predeterminada</option>
                  {priceLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                </select>
              </label>
              <label className="operation-field operation-field-payment">
                <span>Pago</span>
                <select
                  className="fc-input"
                  value={paymentMode}
                  onChange={(event) => {
                    const mode = event.target.value as PaymentMode
                    setPaymentMode(mode)
                    setPaymentKind('FULL')
                    setPaymentEntry('')
                    setPaymentReference('')
                    setPayments([])
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
            <div className="erp-command-bar">
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
                disabled={!canUseCounter || lines.length === 0}
              >
                <Percent size={15} /> {totals.requestedDiscount > 0 ? `Descuento ${totals.requestedDiscount.toLocaleString('es-AR')}%` : 'Descuento'}
              </button>
              <label className={`toolbar-check ${includeVat ? 'active' : ''}`}>
                <input type="checkbox" checked={includeVat} onChange={(event) => toggleVat(event.target.checked)} disabled={!canUseCounter} />
                IVA
              </label>
              <button className="toolbar-btn" type="button" data-payment-action="true" onClick={() => setPaymentSheet(true)} disabled={!canUseCounter || lines.length === 0}>
                <DollarSign size={15} /> Cobrar
              </button>
              <button
                className="toolbar-btn"
                type="button"
                data-print-action="true"
                onClick={printLastDocument}
                disabled={printing || (!lastDocument && !printableDocumentId)}
              >
                <Printer size={15} /> {printing ? 'Preparando...' : 'Imprimir último'}
              </button>
              <span className="payment-status">
                {payments.length > 0 ? `${payments.length} pago(s) · ${formatPesos(paymentSummary.paid)}` : paymentLabel}
                {paymentSummary.change > 0 ? ` · Vuelto ${formatPesos(paymentSummary.change)}` : ''}
              </span>
            </div>
          </div>

          <div className="product-search-panel">
            <div className="counter-search">
              <Search size={17} />
              <input
                className="fc-input"
                ref={searchRef}
                data-product-search="true"
                data-global-search="true"
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
                disabled={!canUseCounter || isRetakingDraft}
              />
              {search && <button className="btn btn-icon btn-secondary" type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')}><X size={14} /></button>}
            </div>
            {!isRetakingDraft && canSearchProducts && (
              <div className="product-results">
                {searching ? (
                  <div className="product-result muted">Buscando productos...</div>
                ) : hits.length === 0 ? (
                  <div className="product-result muted">
                    Sin resultados. {isOwner ? 'Podés crear el producto sin salir del mostrador.' : 'Pedile al owner que lo cargue.'}
                  </div>
                ) : (
                  <>
                    <div className="counter-product-table-wrap">
                      <table className="fc-table counter-product-table" aria-label="Resultados de productos">
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Origen</th>
                            <th>Producto</th>
                            <th style={{ textAlign: 'right' }}>Stock</th>
                            {COUNTER_PRICE_COLUMNS.map((code) => (
                              <th key={code} style={{ textAlign: 'right' }}>{code}</th>
                            ))}
                            <th style={{ textAlign: 'right' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hits.map((product) => (
                            <tr key={product.id} onDoubleClick={() => addLine(product)} title="Doble click para agregar">
                              <td className="counter-product-code">{product.code}</td>
                              <td className="counter-product-code">{product.originCode || product.barcodeAlt || '-'}</td>
                              <td>
                                <strong className="counter-product-name">{product.name}</strong>
                                <small className="counter-product-meta">
                                  {[product.brandName, product.categoryName].filter(Boolean).join(' · ') || 'Sin clasificación'}
                                </small>
                              </td>
                              <td className={`counter-product-stock tabular-nums ${Number(product.stock ?? 0) < 0 ? 'stock-negative' : Number(product.stock ?? 0) === 0 ? 'stock-zero' : ''}`}>{Number(product.stock ?? 0).toLocaleString('es-AR')}</td>
                              {COUNTER_PRICE_COLUMNS.map((code) => (
                                <td className="counter-product-price" key={code}>{formatCounterListPrice(product, code)}</td>
                              ))}
                              <td className="counter-product-action">
                                <div className="counter-product-actions">
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    type="button"
                                    onClick={() => setProductDetail(product)}
                                    aria-label={`Ver detalle de ${product.name}`}
                                  >
                                    Ver
                                  </button>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    type="button"
                                    onClick={() => addLine(product)}
                                    aria-label={`Agregar ${product.name}`}
                                  >
                                    Agregar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="counter-product-mobile-results">
                      {hits.map((product) => (
                        <div className="product-result" key={product.id}>
                          <span>
                            <strong>{product.code}</strong> {product.name}
                            <small>{[product.originCode || product.barcodeAlt ? `Origen ${product.originCode || product.barcodeAlt}` : '', product.brandName, product.categoryName].filter(Boolean).join(' · ') || 'Sin clasificación'}</small>
                          </span>
                          <span className="result-numbers">
                            <b>{formatPesos(product.price || 0)}</b>
                            {product.appliedCoefficientName && product.appliedCoefficientName !== 'LP1' && (
                              <small>
                                {product.appliedCoefficient ? `x${Number(product.appliedCoefficient).toLocaleString('es-AR')} ` : ''}
                                {product.appliedCoefficientName}
                              </small>
                            )}
                            <small className={Number(product.stock ?? 0) < 0 ? 'stock-negative' : Number(product.stock ?? 0) === 0 ? 'stock-zero' : ''}>Stock {Number(product.stock ?? 0).toLocaleString('es-AR')}</small>
                            {product.pricesByList && (
                              <small className="result-price-strip">
                                {COUNTER_PRICE_COLUMNS.map((code) => (
                                  <span key={code}>{code} {formatCounterListPrice(product, code)}</span>
                                ))}
                              </small>
                            )}
                          </span>
                          <span className="counter-mobile-product-actions">
                            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setProductDetail(product)} aria-label={`Ver detalle de ${product.name}`}>Ver</button>
                            <button className="btn btn-primary btn-sm" type="button" onClick={() => addLine(product)} aria-label={`Agregar ${product.name}`}>Agregar</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="counter-lines">
            <div className="counter-lines-header">
              <h2>Detalle de items</h2>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowClearConfirm(true)} disabled={lines.length === 0 || !canUseCounter} title="Vaciar items">
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
                            <div className="readonly-line-description">{line.description}</div>
                            {line.isSpecialPrice && <span className="badge badge-green" style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>Precio especial</span>}
                            <small className={`line-meta ${line.quantity > line.stock ? 'line-meta-danger' : ''}`}>
                              Stock {line.stock.toLocaleString('es-AR')} {line.unit} · {[line.brandName, line.categoryName].filter(Boolean).join(' · ') || 'Sin clasificación'}
                              {line.quantity > line.stock ? ` · excede por ${(line.quantity - line.stock).toLocaleString('es-AR')} ${line.unit}` : ''}
                            </small>
                          </td>
                          <td><QuantityInput value={String(line.quantity)} onChange={(event) => updateLine(index, { quantity: numberInput(event.target.value) })} disabled={!canUseCounter} /></td>
                          <td><span className="readonly-number">{formatPesos(line.unitPrice)}</span></td>
                          <td><span className="readonly-number">{line.discount.toLocaleString('es-AR')}%</span></td>
                          {includeVat && <td><span className="readonly-number">{line.taxRate.toLocaleString('es-AR')}%</span></td>}
                          <td className="line-total">{formatPesos(lineSubtotal(line) + lineTax(line))}</td>
                          <td><button className="btn btn-icon btn-secondary btn-sm" type="button" onClick={() => removeLine(index)} disabled={!canUseCounter || isRetakingDraft} title="Quitar item" aria-label={`Quitar ${line.description}`}><X size={13} /></button></td>
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
                        <button className="btn btn-icon btn-secondary btn-sm" type="button" aria-label={`Quitar ${line.description}`} onClick={() => removeLine(index)} disabled={!canUseCounter || isRetakingDraft}><X size={13} /></button>
                      </header>
                      <small className={line.quantity > line.stock ? 'line-meta-danger' : ''}>
                        Stock {line.stock.toLocaleString('es-AR')} {line.unit} · {[line.brandName, line.categoryName].filter(Boolean).join(' · ') || 'Sin clasificación'}
                        {line.quantity > line.stock ? ` · excede por ${(line.quantity - line.stock).toLocaleString('es-AR')} ${line.unit}` : ''}
                      </small>
                      <div className="mobile-line-grid">
                        <label><span>Cant.</span><QuantityInput value={String(line.quantity)} onChange={(event) => updateLine(index, { quantity: numberInput(event.target.value) })} disabled={!canUseCounter} /></label>
                        <label><span>Precio</span><b>{formatPesos(line.unitPrice)}</b></label>
                        <label><span>Desc.</span><b>{line.discount.toLocaleString('es-AR')}%</b></label>
                        <strong>{formatPesos(lineSubtotal(line) + lineTax(line))}</strong>
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
                <strong>{formatPesos(totals.subtotal)}</strong>
              </div>
              {includeVat && (
                <div>
                  <span>IVA</span>
                  <strong>{formatPesos(totals.tax)}</strong>
                </div>
              )}
              {totals.discount > 0 && (
                <div>
                  <span>Desc.</span>
                  <strong>-{formatPesos(totals.discount)}</strong>
                </div>
              )}
            </div>
            <label className="checkout-round">
              <input type="checkbox" checked={roundTotal} onChange={(event) => setRoundTotal(event.target.checked)} />
              Redondear
            </label>
            <div className="checkout-total">
              <span>Total</span>
              <strong>{formatPesos(totals.total)}</strong>
            </div>
            {payments.length > 0 && (
              <div className="checkout-payment">
                <span>{paymentSummary.remaining > 0 ? 'Resta' : paymentSummary.change > 0 ? 'Vuelto' : 'Pagado'}</span>
                <strong>{formatPesos(paymentSummary.remaining > 0 ? paymentSummary.remaining : paymentSummary.change > 0 ? paymentSummary.change : paymentSummary.paid)}</strong>
              </div>
            )}
            <div className="counter-primary-actions">
              <button className="btn btn-secondary" type="button" onClick={() => documentMutation.mutate({ action: 'draft', type: resumeDocumentId ? docType : 'BUDGET' })} disabled={documentMutation.isPending || lines.length === 0 || !canUseCounter}>
                <FileText size={14} /> {resumeDocumentId ? 'Actualizar' : 'Guardar'}
              </button>
              <button className="btn btn-primary" type="button" data-confirm-action="true" onClick={() => documentMutation.mutate({ action: 'confirm', type: docType })} disabled={documentMutation.isPending || lines.length === 0 || !canUseCounter || blocksStockConfirmation} title={blocksStockConfirmation ? 'No se puede confirmar con stock insuficiente' : undefined}>
                <Check size={14} /> {documentMutation.isPending ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>

          <div className="recent-card counter-recent-strip">
            <h2>Últimos documentos</h2>
            {recentDocs.length === 0 ? <p>Sin historial todavía.</p> : recentDocs.map((doc) => (
              <Link key={doc.id} href={`/documentos?selected=${doc.id}`} className="recent-row">
                <span>{doc.customerName || 'Consumidor final'}</span>
                <b>{formatPesos(Number(doc.total || 0))}</b>
                <small>{DATE.format(new Date(doc.date))} · {documentNumber(doc)}</small>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <EntitySheet
        open={Boolean(productDetail)}
        title="Detalle de producto"
        onClose={() => setProductDetail(null)}
        preventOutsideClose={true}
        footer={productDetail && (
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setProductDetail(null)}>Cerrar</button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!canUseCounter}
              onClick={() => {
                addLine(productDetail)
                setProductDetail(null)
              }}
            >
              Agregar al comprobante
            </button>
          </>
        )}
      >
        {productDetail && (
          <div className="counter-product-detail">
            <div className="counter-product-detail-head">
              <div>
                <strong>{productDetail.name}</strong>
                <span>{[productDetail.brandName, productDetail.categoryName].filter(Boolean).join(' · ') || 'Sin clasificación'}</span>
              </div>
              <span className={`badge ${Number(productDetail.stock ?? 0) < 0 ? 'badge-red' : Number(productDetail.stock ?? 0) === 0 ? 'badge-yellow' : 'badge-green'}`}>
                Stock {Number(productDetail.stock ?? 0).toLocaleString('es-AR')}
              </span>
            </div>
            <div className="detail-kv">
              <div><span>Código</span><strong>{productDetail.code}</strong></div>
              <div><span>Origen</span><strong>{productDetail.originCode || productDetail.barcodeAlt || '-'}</strong></div>
              <div><span>Barras</span><strong>{productDetail.barcode || '-'}</strong></div>
              <div><span>Unidad</span><strong>{productDetail.unit || 'un'}</strong></div>
              <div><span>Stock total</span><strong>{Number(productDetail.stockTotal || 0).toLocaleString('es-AR')}</strong></div>
              <div><span>Precio activo</span><strong>{formatPesos(productDetail.price || 0)}</strong></div>
            </div>
            <div className="counter-product-price-grid" aria-label="Precios por lista">
              {COUNTER_PRICE_COLUMNS.map((code) => (
                <div key={code}>
                  <span>{code}</span>
                  <strong>{formatCounterListPrice(productDetail, code)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </EntitySheet>

      <EntitySheet
        open={customerSheet}
        title="Cliente, datos fiscales y entrega"
        onClose={() => setCustomerSheet(false)}
        preventOutsideClose={true}
        footer={(
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setCustomerSheet(false)}>Cancelar</button>
            <button className="btn btn-primary" type="button" disabled={quickCustomerMutation.isPending} onClick={saveCustomerSheet}>
              {quickCustomerMutation.isPending ? 'Guardando...' : quickCustomer.name.trim() ? (customerId ? 'Guardar cliente' : 'Crear cliente') : 'Guardar entrega'}
            </button>
          </>
        )}
      >
        <div className="sheet-form-grid">
          <label>
            <span>Buscar cliente</span>
            <div style={{ position: 'relative' }}>
              <input className="fc-input" placeholder="Buscá por nombre, CUIT..." 
                value={customerSearch || (customerId ? (customers.find(c => c.id === customerId)?.name || '') : '')} 
                onChange={e => setCustomerSearch(e.target.value)} autoFocus />
              {customerSearch && customers.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--fc-bg)', border: '1px solid var(--fc-border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: 200, overflowY: 'auto', marginTop: 3 }}>
                  {customers.map(c => (
                    <button key={c.id} type="button"
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, background: 'none', border: 'none', color: 'var(--fc-text)', cursor: 'pointer' }}
                      onMouseDown={() => { selectCustomerInSheet(c.id); setCustomerSearch('') }}>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      {c.cuit && <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>{c.cuit}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
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
        open={cashSheet}
        title="Abrir caja"
        onClose={() => setCashSheet(false)}
        preventOutsideClose={true}
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
        preventOutsideClose={true}
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
            <strong>{formatPesos(totals.raw)}</strong>
            <span>Porcentaje</span>
            <strong>{totals.requestedDiscount.toLocaleString('es-AR')}%</strong>
            <span>Descuento</span>
            <strong>-{formatPesos(totals.discount)}</strong>
            <span>Total final</span>
            <strong>{formatPesos(totals.total)}</strong>
          </div>
        </div>
      </EntitySheet>

      <EntitySheet
        open={paymentSheet}
        title="Cobrar venta"
        onClose={() => setPaymentSheet(false)}
        preventOutsideClose={true}
        footer={<button className="btn btn-primary" type="button" onClick={closePaymentSheet}>Aceptar</button>}
      >
        <div className="payment-summary-panel">
          <div><span>Total</span><strong>{formatPesos(totals.total)}</strong></div>
          <div><span>Pagado</span><strong>{formatPesos(paymentSummary.paid)}</strong></div>
          <div><span>Resta</span><strong>{formatPesos(paymentSummary.remaining)}</strong></div>
          {paymentSummary.change > 0 && <div className="change"><span>Vuelto</span><strong>{formatPesos(paymentSummary.change)}</strong></div>}
        </div>
        {payments.length > 0 && (
          <div className="payment-list">
            {payments.map((payment) => (
              <div className="payment-row" key={payment.id}>
                <span>{PAYMENT_METHOD_LABELS[payment.method]}</span>
                <strong>{formatPesos(payment.amount)}</strong>
                <button className="btn btn-icon btn-secondary btn-sm" type="button" onClick={() => removePayment(payment.id)} title="Quitar pago" aria-label={`Quitar pago ${PAYMENT_METHOD_LABELS[payment.method]}`}>
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="payment-options">
          <button type="button" className={paymentKind === 'ENTRY' ? 'active' : ''} onClick={chooseEntry}>
            <strong>Entrada</strong><span>Pago parcial · deja saldo en CC</span>
          </button>
          <button type="button" className={paymentMethod === 'CASH' ? 'active' : ''} onClick={() => choosePayment('CASH', 'Caja Mostrador-Efectivo')}>
            <strong>Efectivo</strong><span>Caja Mostrador · Pesos</span>
          </button>
          <button type="button" className={paymentMethod === 'MERCADO_PAGO' ? 'active' : ''} onClick={() => choosePayment('MERCADO_PAGO', 'Caja Mostrador-Mercado Pago')}>
            <strong>Mercado Pago</strong><span>Caja Mostrador · Dinero digital</span>
          </button>
          <button type="button" className={paymentMethod === 'DEBIT_CARD' ? 'active' : ''} onClick={() => choosePayment('DEBIT_CARD', 'Caja Mostrador-Débito')}>
            <strong>Débito</strong><span>Caja Mostrador · Tarjeta</span>
          </button>
          <button type="button" className={paymentMethod === 'BANK_TRANSFER' ? 'active' : ''} onClick={() => choosePayment('BANK_TRANSFER', 'Banco/Transferencia')}>
            <strong>Transferencia</strong><span>Banco · Pesos</span>
          </button>
          <button type="button" className={paymentMethod === 'CURRENT_ACCOUNT' ? 'active' : ''} onClick={() => choosePayment('CURRENT_ACCOUNT', 'Cuenta corriente', 'CURRENT_ACCOUNT')}>
            <strong>Cuenta corriente</strong><span>Requiere cliente seleccionado</span>
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="fc-label">Importe</label>
          <MoneyInput value={paymentEntry} onChange={(event) => setPaymentEntry(event.target.value)} placeholder={paymentKind === 'ENTRY' ? 'Obligatorio para entrada' : String(paymentSummary.remaining || totals.total || 0)} autoFocus />
          <label className="fc-label" style={{ marginTop: 10 }}>Referencia</label>
          <input className="fc-input" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Cupón, transferencia, nota opcional" />
          {paymentKind === 'ENTRY' && numberInput(paymentEntry) <= 0 && <div className="field-hint danger">Ingresá cuánto deja como entrada.</div>}
          {paymentSummary.remaining > 0 && customerId && <div className="field-hint">Si aceptás con saldo pendiente, se completa en cuenta corriente.</div>}
          <button className="btn btn-secondary" type="button" style={{ marginTop: 10 }} onClick={addPayment}>
            Agregar pago
          </button>
        </div>
      </EntitySheet>

      <ConfirmDialog
        open={resumeConfirm}
        title="Retomar borrador"
        body="Ya tenés productos cargados en el Mostrador. ¿Querés descartarlos y retomar el borrador?"
        confirmLabel="Descartar y retomar"
        pending={false}
        onCancel={cancelResume}
        onConfirm={confirmResume}
      />

      <ConfirmDialog
        open={showClearConfirm}
        title="¿Vaciar el mostrador?"
        body="Se eliminarán todos los productos del comprobante actual."
        confirmLabel="Confirmar"
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => {
          setLines([])
          setShowClearConfirm(false)
        }}
      />
    </div>
  )
}
