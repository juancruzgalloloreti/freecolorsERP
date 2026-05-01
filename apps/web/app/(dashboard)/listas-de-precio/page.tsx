'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { priceListsApi, productsApi } from '@/lib/api'
import { Calculator, CheckCircle2, Play, Plus, Save, Tag, Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface PriceList {
  id: string
  name: string
  isDefault?: boolean
  isActive?: boolean
  items?: { price: number | string }[]
}

interface PriceFormula {
  id: string
  name: string
  baseListId: string
  targetListId: string
  multiplier: string
  rounding: string
  onlyMissing: boolean
}

interface PriceCoefficient {
  id: string
  scope: 'PRODUCT' | 'CATEGORY'
  name: string
  multiplier: number | string
  isActive?: boolean
  validFrom?: string | null
  validTo?: string | null
  product?: { id: string; code: string; name: string } | null
  category?: { id: string; name: string } | null
}

const FORMULAS_KEY = 'freecolors-price-formulas'
const DEFAULT_FORMULAS: PriceFormula[] = [
  {
    id: 'legacy-lp2',
    name: 'Lista 2 Coef. S/Lista 1',
    baseListId: '',
    targetListId: '',
    multiplier: '0.60',
    rounding: '10',
    onlyMissing: false,
  },
  {
    id: 'legacy-lp3',
    name: 'Lista 3 Coef. S/Lista 1',
    baseListId: '',
    targetListId: '',
    multiplier: '0.80',
    rounding: '10',
    onlyMissing: false,
  },
  {
    id: 'legacy-lp4',
    name: 'Lista 4 Coef. S/CR',
    baseListId: '',
    targetListId: '',
    multiplier: '1.20',
    rounding: '10',
    onlyMissing: false,
  },
  {
    id: 'legacy-lp5',
    name: 'Lista 5 = CR',
    baseListId: '',
    targetListId: '',
    multiplier: '1.00',
    rounding: '10',
    onlyMissing: false,
  },
]

const REQUIRED_LIST_LABELS = ['LP1', 'LP2', 'LP3', 'LP4', 'LP5', 'CR', 'CU']

function parseNumber(value: string, fallback: number) {
  const parsed = Number(String(value || '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : fallback
}

function apiMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

export default function ListasDePrecioPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [creating, setCreating] = useState(false)
  const [deletingList, setDeletingList] = useState<PriceList | null>(null)
  const [form, setForm] = useState({ name: '', isDefault: false })
  const [coefficientForm, setCoefficientForm] = useState({ scope: 'CATEGORY', targetId: '', name: '', multiplier: '1.00', validFrom: '', validTo: '' })
  const [message, setMessage] = useState<string | null>(null)
  const [formulas, setFormulas] = useState<PriceFormula[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_FORMULAS
    const saved = window.localStorage.getItem(FORMULAS_KEY)
    if (!saved) return DEFAULT_FORMULAS
    try {
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FORMULAS
      return [
        ...parsed,
        ...DEFAULT_FORMULAS.filter((formula) => !parsed.some((item: PriceFormula) => item.id === formula.id)),
      ]
    } catch {
      return DEFAULT_FORMULAS
    }
  })

  const { data: rawLists, isLoading } = useQuery({
    queryKey: ['price-lists'],
    queryFn: priceListsApi.list,
  })
  const { data: rawCoefficients = [] } = useQuery({ queryKey: ['price-coefficients'], queryFn: priceListsApi.coefficients })
  const { data: rawProducts = [] } = useQuery({ queryKey: ['products-for-coefficients'], queryFn: () => productsApi.list({ limit: 500 }) })
  const { data: rawCategories = [] } = useQuery({ queryKey: ['categories-for-coefficients'], queryFn: productsApi.listCategories })

  const lists: PriceList[] = useMemo(
    () => Array.isArray(rawLists) ? rawLists : (rawLists as { data?: PriceList[] } | undefined)?.data || [],
    [rawLists]
  )
  const coefficients: PriceCoefficient[] = useMemo(
    () => Array.isArray(rawCoefficients) ? rawCoefficients : (rawCoefficients as { data?: PriceCoefficient[] } | undefined)?.data || [],
    [rawCoefficients]
  )
  const products = useMemo(
    () => Array.isArray(rawProducts) ? rawProducts : (rawProducts as { data?: Array<{ id: string; code: string; name: string }> } | undefined)?.data || [],
    [rawProducts]
  )
  const categories = useMemo(
    () => Array.isArray(rawCategories) ? rawCategories : (rawCategories as { data?: Array<{ id: string; name: string }> } | undefined)?.data || [],
    [rawCategories]
  )

  useEffect(() => {
    window.localStorage.setItem(FORMULAS_KEY, JSON.stringify(formulas))
  }, [formulas])

  const createMutation = useMutation({
    mutationFn: priceListsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-lists'] })
      setCreating(false)
      setForm({ name: '', isDefault: false })
      setMessage('Lista creada. Ahora podés usarla como destino de una fórmula o cargar precios desde Productos.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo crear la lista')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => priceListsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-lists'] })
      setDeletingList(null)
      setMessage('Lista eliminada.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo eliminar la lista')),
  })

  const recalculateMutation = useMutation({
    mutationFn: ({ formula }: { formula: PriceFormula }) => {
      const multiplier = parseNumber(formula.multiplier, 1)
      return priceListsApi.recalculate(formula.targetListId, {
        basePriceListId: formula.baseListId,
        percentage: (multiplier - 1) * 100,
        rounding: parseNumber(formula.rounding, 0),
        onlyMissing: formula.onlyMissing,
      })
    },
    onSuccess: (result: { updated?: number; skipped?: number; total?: number }) => {
      qc.invalidateQueries({ queryKey: ['price-lists'] })
      setMessage(`Fórmula aplicada: ${result.updated || 0} precios actualizados, ${result.skipped || 0} omitidos.`)
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo aplicar la fórmula')),
  })
  const coefficientMutation = useMutation({
    mutationFn: () => priceListsApi.createCoefficient({
      scope: coefficientForm.scope,
      name: coefficientForm.name,
      multiplier: parseNumber(coefficientForm.multiplier, 1),
      productId: coefficientForm.scope === 'PRODUCT' ? coefficientForm.targetId : undefined,
      categoryId: coefficientForm.scope === 'CATEGORY' ? coefficientForm.targetId : undefined,
      validFrom: coefficientForm.validFrom || undefined,
      validTo: coefficientForm.validTo || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-coefficients'] })
      qc.invalidateQueries({ queryKey: ['counter-products'] })
      setCoefficientForm({ scope: 'CATEGORY', targetId: '', name: '', multiplier: '1.00', validFrom: '', validTo: '' })
      setMessage('Coeficiente guardado. El mostrador ya lo aplica al buscar productos.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo guardar el coeficiente')),
  })
  const removeCoefficientMutation = useMutation({
    mutationFn: priceListsApi.removeCoefficient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['price-coefficients'] })
      qc.invalidateQueries({ queryKey: ['counter-products'] })
      setMessage('Coeficiente eliminado.')
    },
    onError: (error) => setMessage(apiMessage(error, 'No se pudo eliminar el coeficiente')),
  })

  const defaultList = lists.find((list) => list.isDefault) || lists[0]
  const activeCount = lists.filter((list) => list.isActive !== false).length
  const formulaBackedCount = lists.filter((list) => priceListCode(list.name)).length

  const hydratedFormulas = useMemo(() => {
    if (lists.length === 0) return formulas
    const findByPrefix = (prefix: string) => lists.find((list) => list.name.toUpperCase().startsWith(`${prefix.toUpperCase()} `))
      || lists.find((list) => list.name.toUpperCase().startsWith(`${prefix.toUpperCase()} -`))
    const lp1 = findByPrefix('LP1')
    const lp2 = findByPrefix('LP2')
    const lp3 = findByPrefix('LP3')
    const lp4 = findByPrefix('LP4')
    const lp5 = findByPrefix('LP5')
    const cr = findByPrefix('CR')
    const targets: Record<string, { baseListId?: string; targetListId?: string }> = {
      'legacy-lp2': { baseListId: lp1?.id, targetListId: lp2?.id },
      'legacy-lp3': { baseListId: lp1?.id, targetListId: lp3?.id },
      'legacy-lp4': { baseListId: cr?.id || lp1?.id, targetListId: lp4?.id },
      'legacy-lp5': { baseListId: cr?.id || lp1?.id, targetListId: lp5?.id },
    }
    return formulas.map((formula) => {
      const target = targets[formula.id]
      if (!target) return formula
      return {
        ...formula,
        baseListId: formula.baseListId || target.baseListId || '',
        targetListId: formula.targetListId || target.targetListId || '',
      }
    })
  }, [formulas, lists])

  function listName(id: string) {
    return lists.find((list) => list.id === id)?.name || 'Seleccionar'
  }

  function findListByPrefix(prefix: string) {
    return lists.find((list) => list.name.toUpperCase().startsWith(`${prefix.toUpperCase()} `))
      || lists.find((list) => list.name.toUpperCase().startsWith(`${prefix.toUpperCase()} -`))
  }

  function priceListCode(name: string) {
    const upper = name.toUpperCase()
    return REQUIRED_LIST_LABELS.find((prefix) => upper.startsWith(`${prefix} `) || upper.startsWith(`${prefix} -`)) || null
  }

  function priceListCalculation(name: string) {
    const code = priceListCode(name)
    if (code === 'LP1') return 'Base manual/importada'
    if (code === 'LP2') return 'LP1 x 0.60'
    if (code === 'LP3') return 'LP1 x 0.80'
    if (code === 'LP4') return 'CR x 1.20'
    if (code === 'LP5') return 'CR'
    if (code === 'CR') return 'Costo reposición'
    if (code === 'CU') return 'Costo última compra'
    return 'Precio propio opcional'
  }

  function defaultTargetId() {
    return lists.find((list) => list.id !== defaultList?.id)?.id || ''
  }

  function createList() {
    if (!form.name.trim()) return
    createMutation.mutate({ name: form.name.trim(), isDefault: form.isDefault, isActive: true })
  }

  function updateFormula(id: string, key: keyof PriceFormula, value: string | boolean) {
    if (!isOwner) return
    setFormulas((current) => current.map((formula) => formula.id === id ? { ...formula, [key]: value } : formula))
  }

  function addFormula() {
    if (!isOwner) return
    setFormulas((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: `Regla ${current.length + 1}`,
        baseListId: defaultList?.id || '',
        targetListId: lists.find((list) => list.id !== defaultList?.id)?.id || '',
        multiplier: '1.00',
        rounding: '10',
        onlyMissing: false,
      },
    ])
  }

  function removeFormula(id: string) {
    if (!isOwner) return
    setFormulas((current) => current.filter((formula) => formula.id !== id))
  }

  function applyFormula(formula: PriceFormula) {
    const baseListId = formula.baseListId || defaultList?.id || ''
    const targetListId = formula.targetListId || defaultTargetId()
    if (!baseListId || !targetListId) {
      setMessage('Elegí lista base y lista destino antes de aplicar la fórmula.')
      return
    }
    if (baseListId === targetListId) {
      setMessage('La lista destino tiene que ser distinta de la lista base.')
      return
    }
    recalculateMutation.mutate({ formula: { ...formula, baseListId, targetListId } })
  }

  function saveCoefficient() {
    if (!isOwner || !coefficientForm.targetId) {
      setMessage('Elegí producto o categoría para el coeficiente.')
      return
    }
    coefficientMutation.mutate()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Listas de Precio</h1>
          <p className="page-subtitle">Precios globales por fórmula: cada producto calcula LP2, LP3, LP4 y LP5 desde LP1 o CR</p>
        </div>
        {isOwner && (
          <button className="btn btn-primary" onClick={() => { setCreating(true); setMessage(null) }}>
            <Plus size={14} /> Nueva lista
          </button>
        )}
      </div>

      {message && (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid rgba(59,130,246,0.24)', borderRadius: 8, color: '#bfdbfe', background: 'rgba(59,130,246,0.08)', fontSize: 13 }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div className="stat-card"><div className="stat-value">{lists.length}</div><div className="stat-label">Listas configuradas</div></div>
        <div className="stat-card"><div className="stat-value">{activeCount}</div><div className="stat-label">Activas para vender</div></div>
        <div className="stat-card"><div className="stat-value">{formulaBackedCount}</div><div className="stat-label">Listas con fórmula Aguila</div></div>
      </div>

      <div className="fc-card required-lists">
        {REQUIRED_LIST_LABELS.map((prefix) => {
          const list = findListByPrefix(prefix)
          return (
            <div className="required-list" key={prefix}>
              <span>{prefix}</span>
              <strong>{list?.name || 'Pendiente'}</strong>
              <small>{list ? priceListCalculation(list.name) : 'Se crea automáticamente'}</small>
            </div>
          )
        })}
      </div>

      <div className="fc-card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15 }}>Coeficientes vigentes</h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>El mostrador aplica el mayor coeficiente vigente entre producto y categoría.</p>
          </div>
        </div>
        {isOwner && (
          <div className="coefficient-form">
            <select className="fc-input" value={coefficientForm.scope} onChange={(e) => setCoefficientForm((current) => ({ ...current, scope: e.target.value, targetId: '' }))}>
              <option value="CATEGORY">Categoría</option>
              <option value="PRODUCT">Producto</option>
            </select>
            <select className="fc-input" value={coefficientForm.targetId} onChange={(e) => setCoefficientForm((current) => ({ ...current, targetId: e.target.value }))}>
              <option value="">Seleccionar</option>
              {coefficientForm.scope === 'PRODUCT'
                ? products.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}</option>)
                : categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <input className="fc-input" value={coefficientForm.name} onChange={(e) => setCoefficientForm((current) => ({ ...current, name: e.target.value }))} placeholder="Nombre" />
            <input className="fc-input" value={coefficientForm.multiplier} onChange={(e) => setCoefficientForm((current) => ({ ...current, multiplier: e.target.value }))} placeholder="1.20" inputMode="decimal" />
            <input className="fc-input" type="date" value={coefficientForm.validFrom} onChange={(e) => setCoefficientForm((current) => ({ ...current, validFrom: e.target.value }))} />
            <input className="fc-input" type="date" value={coefficientForm.validTo} onChange={(e) => setCoefficientForm((current) => ({ ...current, validTo: e.target.value }))} />
            <button className="btn btn-primary btn-sm" disabled={coefficientMutation.isPending} onClick={saveCoefficient}>
              <Save size={13} /> Guardar
            </button>
          </div>
        )}
        <div className="coefficient-list">
          {coefficients.length === 0 ? (
            <div className="empty-state" style={{ padding: 18 }}><p>No hay coeficientes cargados.</p></div>
          ) : coefficients.map((coefficient) => (
            <div className="coefficient-row" key={coefficient.id}>
              <span className="badge">{coefficient.scope === 'PRODUCT' ? 'Producto' : 'Categoría'}</span>
              <strong>{coefficient.product ? `${coefficient.product.code} · ${coefficient.product.name}` : coefficient.category?.name}</strong>
              <span>{coefficient.name}</span>
              <b>x{Number(coefficient.multiplier || 1).toLocaleString('es-AR', { maximumFractionDigits: 4 })}</b>
              {isOwner && <button className="btn btn-icon btn-secondary btn-sm" onClick={() => removeCoefficientMutation.mutate(coefficient.id)}><Trash2 size={13} /></button>}
            </div>
          ))}
        </div>
      </div>

      <div className="fc-card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.24)' }}>
              <Calculator size={17} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15 }}>Fórmulas</h2>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Las listas obligatorias se calculan en vivo para todos los productos; aplicar solo recalcula precios guardados si lo necesitás para exportar o auditar.</p>
            </div>
          </div>
          {isOwner && <button className="btn btn-secondary btn-sm" onClick={addFormula}><Plus size={13} /> Fórmula</button>}
        </div>

        <div className="formula-list">
          {hydratedFormulas.map((formula) => (
            <div className="formula-row" key={formula.id}>
              <input className="fc-input formula-name" value={formula.name} onChange={(e) => updateFormula(formula.id, 'name', e.target.value)} readOnly={!isOwner} />
              <div className="formula-field">
                <span>Base</span>
                <select className="fc-input" value={formula.baseListId || defaultList?.id || ''} onChange={(e) => updateFormula(formula.id, 'baseListId', e.target.value)} disabled={!isOwner}>
                  <option value="">Seleccionar</option>
                  {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                </select>
              </div>
              <div className="formula-field">
                <span>Destino</span>
                <select className="fc-input" value={formula.targetListId || defaultTargetId()} onChange={(e) => updateFormula(formula.id, 'targetListId', e.target.value)} disabled={!isOwner}>
                  <option value="">Seleccionar</option>
                  {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                </select>
              </div>
              <div className="formula-field small">
                <span>x</span>
                <input className="fc-input" value={formula.multiplier} onChange={(e) => updateFormula(formula.id, 'multiplier', e.target.value)} readOnly={!isOwner} />
              </div>
              <div className="formula-field small">
                <span>Red.</span>
                <input className="fc-input" value={formula.rounding} onChange={(e) => updateFormula(formula.id, 'rounding', e.target.value)} readOnly={!isOwner} />
              </div>
              <label className="formula-check">
                <input type="checkbox" checked={formula.onlyMissing} onChange={(e) => updateFormula(formula.id, 'onlyMissing', e.target.checked)} disabled={!isOwner} />
                <span>Solo faltantes</span>
              </label>
              {isOwner && (
                <div className="formula-actions">
                  <button className="btn btn-secondary btn-sm" disabled={recalculateMutation.isPending} onClick={() => applyFormula(formula)} title={`Aplicar sobre ${listName(formula.targetListId || defaultTargetId())}`}>
                    <Play size={13} /> Aplicar
                  </button>
                  <button className="btn btn-icon btn-secondary btn-sm" onClick={() => removeFormula(formula.id)} title="Eliminar fórmula"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="fc-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : lists.length === 0 ? (
          <div className="empty-state"><p>No hay listas creadas.</p></div>
        ) : (
          <table className="fc-table">
            <thead>
              <tr>
                <th>Lista</th>
                <th>Uso</th>
                <th>Cálculo</th>
                <th style={{ textAlign: 'right' }}>Precios base</th>
                <th>Estado</th>
                {isOwner && <th style={{ width: 54 }}></th>}
              </tr>
            </thead>
            <tbody>
              {lists.map((list) => {
                const count = list.items?.filter((item) => Number(item.price || 0) > 0).length || 0
                const isRequired = Boolean(priceListCode(list.name))
                return (
                  <tr key={list.id}>
                    <td style={{ fontWeight: 700 }}>{list.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{list.isDefault ? 'Principal de mostrador' : 'Alternativa para cliente/documento'}</td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{priceListCalculation(list.name)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{count}</td>
                    <td><span className={`badge ${list.isActive === false ? 'badge-red' : 'badge-green'}`}>{list.isActive === false ? 'Inactiva' : 'Activa'}</span></td>
                    {isOwner && (
                      <td>
                        <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setDeletingList(list)} title={isRequired ? 'Lista obligatoria' : 'Eliminar lista'} disabled={isRequired}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="fc-card" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        <div className="locked-field"><Tag size={14} /> Principal: {defaultList?.name || 'Sin lista'}</div>
        <div className="locked-field"><CheckCircle2 size={14} /> Se usa al emitir documentos</div>
      </div>

      {creating && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Nueva lista de precio</h3>
              <button className="btn btn-icon btn-secondary" disabled={createMutation.isPending} onClick={() => setCreating(false)}><X size={14} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="fc-label">Nombre *</label>
                <input className="fc-input" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Ej: Obra, Mayorista, Contado" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((current) => ({ ...current, isDefault: e.target.checked }))} style={{ width: 15, height: 15, accentColor: 'var(--accent-purple)' }} />
                <span style={{ fontSize: 13 }}>Usar como lista principal</span>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--fc-border)', paddingTop: 14 }}>
                <button className="btn btn-secondary" disabled={createMutation.isPending} onClick={() => setCreating(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={!form.name.trim() || createMutation.isPending} onClick={createList}>
                  <Save size={14} /> {createMutation.isPending ? 'Creando...' : 'Crear lista'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingList && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div style={{ padding: '28px 24px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'grid', placeItems: 'center', marginBottom: 14 }}>
                <Trash2 size={18} color="#f87171" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>¿Eliminar lista?</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Se elimina la lista {deletingList.name} y sus precios asociados. No se borran productos ni se toca LP1/CR/CU.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
                <button className="btn btn-secondary" disabled={deleteMutation.isPending} onClick={() => setDeletingList(null)}>Cancelar</button>
                <button className="btn btn-danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deletingList.id)}>
                  {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .formula-list { display: flex; flex-direction: column; gap: 8px; }
        .required-lists {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
          margin-bottom: 14px;
        }
        .required-list {
          min-height: 48px;
          border: 1px solid var(--fc-border);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
          padding: 8px 10px;
          background: rgba(255,255,255,0.03);
        }
        .required-list span {
          color: #a78bfa;
          font-size: 11px;
          font-weight: 800;
        }
        .required-list strong {
          font-size: 12px;
          line-height: 1.2;
        }
        .required-list small {
          color: var(--text-muted);
          font-size: 11px;
          line-height: 1.2;
        }
        .coefficient-form {
          display: grid;
          grid-template-columns: 130px minmax(220px, 1.4fr) minmax(120px, 1fr) 90px 135px 135px auto;
          gap: 8px;
          align-items: center;
          margin-bottom: 12px;
        }
        .coefficient-list { display: flex; flex-direction: column; gap: 8px; }
        .coefficient-row {
          display: grid;
          grid-template-columns: 92px minmax(180px, 1.3fr) minmax(130px, 1fr) 90px 36px;
          gap: 8px;
          align-items: center;
          padding: 9px;
          border: 1px solid var(--fc-border);
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          font-size: 13px;
        }
        .coefficient-row b { text-align: right; font-family: var(--font-mono); }
        .formula-row {
          display: grid;
          grid-template-columns: minmax(130px, 1.1fr) minmax(170px, 1.1fr) minmax(170px, 1.1fr) 74px 78px 128px auto;
          gap: 8px;
          align-items: end;
          padding: 9px;
          border: 1px solid var(--fc-border);
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
        }
        .formula-name { font-weight: 750; }
        .formula-field { display: flex; flex-direction: column; gap: 4px; }
        .formula-field span, .formula-check span { color: var(--text-muted); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .formula-field .fc-input, .formula-name { min-height: 32px; height: 32px; }
        .formula-field.small .fc-input { text-align: right; font-family: var(--font-mono); }
        .formula-check { min-height: 32px; display: flex; align-items: center; gap: 7px; cursor: pointer; }
        .formula-check input { width: 15px; height: 15px; accent-color: var(--accent-purple); }
        .formula-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .locked-field {
          min-height: 38px;
          border: 1px solid var(--fc-border);
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 11px;
          color: var(--fc-text);
          background: rgba(255,255,255,0.03);
          font-weight: 650;
        }
        @media (max-width: 1180px) {
          .formula-row { grid-template-columns: 1fr 1fr; }
          .coefficient-form, .coefficient-row { grid-template-columns: 1fr 1fr; }
          .formula-actions { justify-content: flex-start; }
        }
      `}</style>
    </div>
  )
}
