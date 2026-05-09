'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { priceListsApi, productsApi } from '@/lib/api'
import { Calculator, Play, Plus, Save, Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { CORE_PRICE_LIST_CODES, isAutomaticPriceList, isCorePriceList, priceListCode } from '@/lib/price-list-rules'

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
  const [confirmingFormula, setConfirmingFormula] = useState<PriceFormula | null>(null)

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
  const coreLists = useMemo(() => lists.filter(isCorePriceList), [lists])
  const optionalLists = useMemo(() => lists.filter((list) => !isCorePriceList(list)), [lists])
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

  const defaultList = coreLists.find((list) => list.isDefault) || coreLists[0]
  const activeCount = coreLists.filter((list) => list.isActive !== false).length
  const formulaBackedCount = coreLists.filter((list) => isAutomaticPriceList(list.name)).length

  const hydratedFormulas = useMemo(() => {
    if (coreLists.length === 0) return formulas
    const findByPrefix = (prefix: string) => coreLists.find((list) => list.name.toUpperCase().startsWith(`${prefix.toUpperCase()} `))
      || coreLists.find((list) => list.name.toUpperCase().startsWith(`${prefix.toUpperCase()} -`))
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
  }, [formulas, coreLists])

  function listName(id: string) {
    return coreLists.find((list) => list.id === id)?.name || 'Seleccionar'
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
    return coreLists.find((list) => list.id !== defaultList?.id)?.id || ''
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
    setConfirmingFormula({ ...formula, baseListId, targetListId })
  }

  function confirmApplyFormula() {
    if (!confirmingFormula) return
    setConfirmingFormula(null)
    recalculateMutation.mutate({ formula: confirmingFormula })
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
          <h1 className="page-title">Precios</h1>
          <p className="page-subtitle">Listas de venta, costos de referencia y reglas de actualización</p>
        </div>
        <span className="badge badge-green">Listas fijas</span>
      </div>

      {message && (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid rgba(59,130,246,0.24)', borderRadius: 8, color: '#bfdbfe', background: 'rgba(59,130,246,0.08)', fontSize: 13 }}>
          {message}
        </div>
      )}

      <div className="price-summary">
        <div><span>Principal</span><strong>{defaultList?.name || 'Sin lista'}</strong></div>
        <div><span>Activas</span><strong>{activeCount} de {coreLists.length}</strong></div>
        <div><span>Automáticas</span><strong>{formulaBackedCount} listas en vivo</strong></div>
        <div><span>Flujo fijo</span><strong>{CORE_PRICE_LIST_CODES.join(', ')}</strong></div>
      </div>

      <div className="fc-card price-main-card">
        <div className="price-section-head">
          <div>
            <h2>Listas</h2>
            <p>Qué precio usa el mostrador y cómo se calcula cada lista.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state"><span className="spinner" /></div>
        ) : coreLists.length === 0 ? (
          <div className="empty-state"><p>No hay listas creadas.</p></div>
        ) : (
          <table className="fc-table">
            <thead>
              <tr>
                <th>Lista</th>
                <th>Uso</th>
                <th>Cálculo</th>
                <th style={{ textAlign: 'right' }}>Carga</th>
                <th>Estado</th>
                {isOwner && <th style={{ width: 54 }}></th>}
              </tr>
            </thead>
            <tbody>
              {coreLists.map((list) => {
                const count = list.items?.filter((item) => Number(item.price || 0) > 0).length || 0
                const isRequired = Boolean(priceListCode(list.name))
                return (
                  <tr key={list.id}>
                    <td style={{ fontWeight: 700 }}>{list.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{list.isDefault ? 'Principal de mostrador' : isAutomaticPriceList(list.name) ? 'Se calcula al buscar/facturar' : 'Alternativa para cliente/documento'}</td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{priceListCalculation(list.name)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{isAutomaticPriceList(list.name) ? 'Automática' : count}</td>
                    <td><span className={`badge ${list.isActive === false ? 'badge-red' : 'badge-green'}`}>{list.isActive === false ? 'Inactiva' : 'Activa'}</span></td>
                    {isOwner && (
                      <td>
                        {!isRequired && (
                          <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setDeletingList(list)} title="Eliminar lista">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {optionalLists.length > 0 && (
        <details className="fc-card price-advanced" style={{ marginBottom: 12 }}>
          <summary>
            <span>Listas antiguas fuera del flujo fijo</span>
            <small>{optionalLists.length}</small>
          </summary>
          <p className="price-advanced-help">Quedan separadas para limpiar datos heredados. No aparecen en Mostrador ni Productos.</p>
          <div className="coefficient-list">
            {optionalLists.map((list) => (
              <div className="coefficient-row" key={list.id}>
                <span className="badge">Heredada</span>
                <strong>{list.name}</strong>
                <span>Fuera de LP1-LP5/CR/CU</span>
                <b>{list.isActive === false ? 'Inactiva' : 'Activa'}</b>
                {isOwner && (
                  <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setDeletingList(list)} title="Eliminar lista heredada">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      <details className="fc-card price-formulas-card">
        <summary>
          <span>Recalcular precios guardados</span>
          <small>Opcional</small>
        </summary>
        <div className="price-section-head">
          <div>
            <h2>Reglas manuales</h2>
            <p>Solo para grabar precios físicos en listas personalizadas. LP2-LP5 ya salen en vivo sin tocar este bloque.</p>
          </div>
          {isOwner && <button className="btn btn-secondary btn-sm" onClick={addFormula}><Plus size={13} /> Regla</button>}
        </div>

        <div className="formula-list">
          {hydratedFormulas.map((formula) => (
            <div className="formula-row" key={formula.id}>
              <label className="formula-cell formula-title">
                <span>Regla</span>
                <input className="fc-input formula-name" value={formula.name} onChange={(e) => updateFormula(formula.id, 'name', e.target.value)} readOnly={!isOwner} />
              </label>
              <label className="formula-cell">
                <span>Base</span>
                <select className="fc-input" aria-label="Lista base" value={formula.baseListId || defaultList?.id || ''} onChange={(e) => updateFormula(formula.id, 'baseListId', e.target.value)} disabled={!isOwner}>
                  <option value="">Base</option>
                  {coreLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                </select>
              </label>
              <label className="formula-cell">
                <span>Destino</span>
                <select className="fc-input" aria-label="Lista destino" value={formula.targetListId || defaultTargetId()} onChange={(e) => updateFormula(formula.id, 'targetListId', e.target.value)} disabled={!isOwner}>
                  <option value="">Destino</option>
                  {coreLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
                </select>
              </label>
              <label className="formula-cell">
                <span>Coef.</span>
                <input className="fc-input formula-number" aria-label="Multiplicador" value={formula.multiplier} onChange={(e) => updateFormula(formula.id, 'multiplier', e.target.value)} readOnly={!isOwner} />
              </label>
              <label className="formula-cell">
                <span>Redondeo</span>
                <input className="fc-input formula-number" aria-label="Redondeo" value={formula.rounding} onChange={(e) => updateFormula(formula.id, 'rounding', e.target.value)} readOnly={!isOwner} />
              </label>
              <label className="formula-check">
                <input type="checkbox" checked={formula.onlyMissing} onChange={(e) => updateFormula(formula.id, 'onlyMissing', e.target.checked)} disabled={!isOwner} />
                <span>Solo faltantes</span>
              </label>
              {isOwner && (
                <div className="formula-actions">
                  <button className="btn btn-secondary btn-sm" disabled={recalculateMutation.isPending} onClick={() => applyFormula(formula)} title={`Aplicar sobre ${listName(formula.targetListId || defaultTargetId())}`}>
                    <Play size={13} /> Aplicar
                  </button>
                  <button className="btn btn-icon btn-secondary btn-sm" onClick={() => removeFormula(formula.id)} title="Eliminar regla"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </details>

      <details className="fc-card price-advanced">
        <summary>
          <span>Coeficientes por producto o categoría</span>
          <small>{coefficients.length} vigentes</small>
        </summary>
        <p className="price-advanced-help">El mostrador aplica el mayor coeficiente vigente entre producto y categoría.</p>
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
      </details>

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

      {confirmingFormula && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div style={{ padding: '28px 24px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'grid', placeItems: 'center', marginBottom: 14 }}>
                <Calculator size={18} color="#a78bfa" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>¿Aplicar fórmula?</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Se van a recalcular los precios de <strong>{listName(confirmingFormula.targetListId)}</strong> basándose en <strong>{listName(confirmingFormula.baseListId)}</strong> con un multiplicador de <strong>x{confirmingFormula.multiplier}</strong>.
                {confirmingFormula.onlyMissing && <span style={{ display: 'block', marginTop: 6 }}>Solo se actualizarán los productos que no tengan precio en la lista destino.</span>}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
                <button className="btn btn-secondary" disabled={recalculateMutation.isPending} onClick={() => setConfirmingFormula(null)}>Cancelar</button>
                <button className="btn btn-primary" disabled={recalculateMutation.isPending} onClick={confirmApplyFormula}>
                  {recalculateMutation.isPending ? 'Aplicando...' : 'Aplicar fórmula'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .price-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }
        .price-summary > div {
          min-height: 58px;
          border: 1px solid var(--fc-border);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          padding: 10px 12px;
          background: rgba(255,255,255,0.03);
        }
        .price-summary span {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .price-summary strong {
          font-size: 15px;
          line-height: 1.2;
          color: var(--fc-text);
        }
        .price-main-card {
          overflow: hidden;
          margin-bottom: 12px;
        }
        .price-formulas-card,
        .price-advanced {
          margin-top: 12px;
        }
        .price-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .price-section-head h2 {
          margin: 0;
          font-size: 15px;
        }
        .price-section-head p,
        .price-advanced-help {
          margin: 3px 0 0;
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.2;
        }
        .formula-list { display: flex; flex-direction: column; gap: 7px; }
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
          grid-template-columns: minmax(210px, 1.15fr) minmax(180px, 1fr) minmax(180px, 1fr) 82px 92px 126px 130px;
          gap: 8px;
          align-items: end;
          padding: 8px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 8px;
          background: rgba(255,255,255,0.025);
        }
        .formula-cell {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 5px;
        }
        .formula-cell > span {
          color: #8090ad;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          line-height: 1;
          text-transform: uppercase;
        }
        .formula-name { font-weight: 750; }
        .formula-row .fc-input {
          min-height: 38px;
          height: 38px;
          padding: 0 12px;
          font-size: 13px;
          line-height: 1.2;
        }
        .formula-row select.fc-input {
          padding-right: 30px;
        }
        .formula-number { text-align: right; font-family: var(--font-mono); }
        .formula-check span { color: #aeb9cf; font-size: 12px; font-weight: 650; }
        .formula-check { min-height: 38px; display: flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap; }
        .formula-check input { width: 16px; height: 16px; accent-color: var(--accent-purple); }
        .formula-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .price-formulas-card > summary,
        .price-advanced summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          list-style: none;
          font-weight: 750;
        }
        .price-formulas-card > summary::-webkit-details-marker,
        .price-advanced summary::-webkit-details-marker { display: none; }
        .price-formulas-card > summary small,
        .price-advanced summary small {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 650;
        }
        .price-formulas-card[open] > summary,
        .price-advanced[open] summary {
          margin-bottom: 10px;
        }
        @media (max-width: 1180px) {
          .price-summary { grid-template-columns: 1fr; }
          .formula-row { grid-template-columns: 1fr 1fr; }
          .formula-title { grid-column: 1 / -1; }
          .coefficient-form, .coefficient-row { grid-template-columns: 1fr 1fr; }
          .formula-actions { justify-content: flex-start; }
        }
        @media (max-width: 720px) {
          .formula-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
