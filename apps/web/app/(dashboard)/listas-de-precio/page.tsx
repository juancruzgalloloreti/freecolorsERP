'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { priceListsApi, productsApi } from '@/lib/api'
import { Save, Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { CORE_PRICE_LIST_CODES, isAutomaticPriceList, isCorePriceList, priceListCode } from '@/lib/price-list-rules'

interface PriceList {
  id: string
  name: string
  isDefault?: boolean
  isActive?: boolean
  formulaBaseCode?: string | null
  formulaOperation?: string | null
  formulaCoefficient?: string | number | null
  formulaRoundingMode?: string | null
  formulaRoundingValue?: string | number | null
  items?: { price: number | string; isManualOverride?: boolean }[]
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

function pricedItemsCount(list?: PriceList) {
  return list?.items?.filter((item) => Number(item.price || 0) > 0).length || 0
}

export default function ListasDePrecioPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [deletingList, setDeletingList] = useState<PriceList | null>(null)
  const [coefficientForm, setCoefficientForm] = useState({ scope: 'CATEGORY', targetId: '', name: '', multiplier: '1.00', validFrom: '', validTo: '' })
  const [message, setMessage] = useState<string | null>(null)
  const [formulaDrafts, setFormulaDrafts] = useState<Record<string, Partial<PriceFormula>>>({})
  const [formulaToAutoApply, setFormulaToAutoApply] = useState<string | null>(null)
  const [formulaAwaitingOverrideChoice, setFormulaAwaitingOverrideChoice] = useState<string | null>(null)

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
    mutationFn: ({ formula, includeManualOverrides = false }: { formula: PriceFormula; includeManualOverrides?: boolean }) => {
      const multiplier = parseNumber(formula.multiplier, 1)
      return priceListsApi.recalculate(formula.targetListId, {
        basePriceListId: formula.baseListId,
        operation: 'multiply',
        multiplier,
        roundingMode: 'nearest',
        rounding: parseNumber(formula.rounding, 0),
        onlyMissing: formula.onlyMissing,
        includeManualOverrides,
      })
    },
    onSuccess: async (result: { updated?: number; skipped?: number; total?: number }, variables) => {
      await qc.invalidateQueries({ queryKey: ['price-lists'] })
      setFormulaAwaitingOverrideChoice(null)
      setFormulaDrafts((current) => {
        const next = { ...current }
        delete next[variables.formula.id]
        return next
      })
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
  const defaultTargetId = useMemo(() => coreLists.find((list) => list.id !== defaultList?.id)?.id || '', [coreLists, defaultList?.id])
  const activeCount = coreLists.filter((list) => list.isActive !== false).length
  const formulaBackedCount = coreLists.filter((list) => isAutomaticPriceList(list.name)).length
  const formulaWarnings = useMemo(() => {
    const byCode = new Map<string, PriceList>()
    coreLists.forEach((list) => {
      const code = priceListCode(list.name)
      if (code) byCode.set(code, list)
    })
    return coreLists
      .filter((list) => isAutomaticPriceList(list.name))
      .map((list) => {
        const targetCode = priceListCode(list.name)
        const baseCode = list.formulaBaseCode || (targetCode === 'LP2' || targetCode === 'LP3' ? 'LP1' : targetCode === 'LP4' || targetCode === 'LP5' ? 'CR' : null)
        const baseList = baseCode ? byCode.get(baseCode) : undefined
        const baseCount = pricedItemsCount(baseList)
        if (!baseCode || baseCount > 0) {
          if (baseCode === 'CR' && baseCount > 0 && baseCount < pricedItemsCount(byCode.get('LP1'))) {
            return `${targetCode} depende de ${baseCode}, pero ${baseCode} solo tiene ${baseCount} precios cargados. Recalculá con cuidado: solo esos productos tendrán precio.`
          }
          return null
        }
        return `${targetCode} depende de ${baseCode}, pero ${baseCode} no tiene precios cargados. No recalcules hasta cargar la base.`
      })
      .filter((warning): warning is string => Boolean(warning))
  }, [coreLists])

  const hydratedFormulas = useMemo(() => {
    if (coreLists.length === 0) {
      return DEFAULT_FORMULAS.map((formula) => ({ ...formula, ...formulaDrafts[formula.id] }))
    }
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
    return DEFAULT_FORMULAS.map((formula) => {
      const target = targets[formula.id]
      const draft = formulaDrafts[formula.id] || {}
      if (!target) return { ...formula, ...draft }
      const targetList = coreLists.find((list) => list.id === target.targetListId)
      const savedBase = targetList?.formulaBaseCode
        ? coreLists.find((list) => priceListCode(list.name) === targetList.formulaBaseCode)?.id
        : ''
      return {
        ...formula,
        baseListId: draft.baseListId ?? savedBase ?? target.baseListId ?? '',
        targetListId: draft.targetListId ?? target.targetListId ?? '',
        multiplier: draft.multiplier ?? (targetList?.formulaCoefficient != null ? String(targetList.formulaCoefficient) : formula.multiplier),
        rounding: draft.rounding ?? (targetList?.formulaRoundingValue != null ? String(targetList.formulaRoundingValue) : formula.rounding),
        onlyMissing: draft.onlyMissing ?? formula.onlyMissing,
      }
    })
  }, [coreLists, formulaDrafts])

  const fixedFormulas = hydratedFormulas.filter((formula) => formula.id.startsWith('legacy-'))

  function manualOverridesCountForFormula(formula: PriceFormula) {
    const target = coreLists.find((list) => list.id === (formula.targetListId || defaultTargetId))
    if (priceListCode(target?.name || '') !== 'LP4') return 0
    return target?.items?.filter((item) => item.isManualOverride && Number(item.price || 0) > 0).length || 0
  }

  useEffect(() => {
    if (!formulaToAutoApply || !isOwner) return
    const formula = hydratedFormulas.find((item) => item.id === formulaToAutoApply)
    if (!formula) return
    const multiplier = Number(String(formula.multiplier || '').replace(',', '.'))
    const rounding = Number(String(formula.rounding || '').replace(',', '.'))
    const baseListId = formula.baseListId || defaultList?.id || ''
    const targetListId = formula.targetListId || defaultTargetId
    if (!baseListId || !targetListId || baseListId === targetListId) return
    if (!Number.isFinite(multiplier) || multiplier <= 0) return
    if (!Number.isFinite(rounding) || rounding < 0) return

    const timer = window.setTimeout(() => {
      recalculateMutation.mutate({ formula: { ...formula, baseListId, targetListId, onlyMissing: false } })
      setFormulaToAutoApply(null)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [formulaToAutoApply, hydratedFormulas, isOwner, defaultList?.id, defaultTargetId, recalculateMutation])

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

  function updateFormula(id: string, key: keyof PriceFormula, value: string | boolean) {
    if (!isOwner) return
    const currentFormula = hydratedFormulas.find((formula) => formula.id === id)
    const nextFormula = currentFormula ? { ...currentFormula, [key]: value } : null
    setFormulaDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }))
    if (['baseListId', 'targetListId', 'multiplier', 'rounding'].includes(key)) {
      if (nextFormula && manualOverridesCountForFormula(nextFormula) > 0) {
        setFormulaToAutoApply(null)
        setFormulaAwaitingOverrideChoice(id)
        return
      }
      setFormulaAwaitingOverrideChoice(null)
      setFormulaToAutoApply(id)
    }
  }

  function applyFormula(formula: PriceFormula, includeManualOverrides: boolean) {
    const baseListId = formula.baseListId || defaultList?.id || ''
    const targetListId = formula.targetListId || defaultTargetId
    if (!baseListId || !targetListId || baseListId === targetListId) {
      setMessage('Elegí una base y un destino distintos para recalcular.')
      return
    }
    recalculateMutation.mutate({ formula: { ...formula, baseListId, targetListId, onlyMissing: false }, includeManualOverrides })
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
          <p className="page-subtitle">Listas fijas, costos de referencia y formulas tipo Excel</p>
        </div>
        <span className="badge badge-green">Listas fijas</span>
      </div>

      {message && (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid rgba(59,130,246,0.24)', borderRadius: 8, color: '#bfdbfe', background: 'rgba(59,130,246,0.08)', fontSize: 13 }}>
          {message}
        </div>
      )}
      {formulaWarnings.length > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: '#fde68a', background: 'rgba(245,158,11,0.08)', fontSize: 13, display: 'grid', gap: 4 }}>
          {formulaWarnings.map((warning) => <span key={warning}>{warning}</span>)}
        </div>
      )}

      <div className="price-summary">
        <div><span>Principal</span><strong>{defaultList?.name || 'Sin lista'}</strong></div>
        <div><span>Activas</span><strong>{activeCount} de {coreLists.length}</strong></div>
        <div><span>Fórmulas</span><strong>{formulaBackedCount} listas calculadas</strong></div>
        <div><span>Flujo fijo</span><strong>{CORE_PRICE_LIST_CODES.join(', ')}</strong></div>
      </div>

      <div className="fc-card price-main-card">
        <div className="price-section-head">
          <div>
            <h2>Listas</h2>
            <p>Qué precio usa el mostrador y cómo se calcula cada lista fija.</p>
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
                    <td style={{ color: 'var(--text-muted)' }}>{list.isDefault ? 'Principal de mostrador' : isAutomaticPriceList(list.name) ? 'Formula fija regulada por owner' : 'Costo/base del flujo'}</td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{priceListCalculation(list.name)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{isAutomaticPriceList(list.name) ? count : count}</td>
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

      <details className="fc-card price-formulas-card" open>
        <summary>
          <span>Fórmulas fijas de listas</span>
          <small>Owner</small>
        </summary>
        <div className="price-section-head">
          <div>
            <h2>Excel de precios</h2>
            <p>El owner regula coeficiente y redondeo. Al cambiar una fórmula válida, se recalculan solos todos los productos de la lista destino.</p>
          </div>
        </div>

        <div className="formula-list">
          {fixedFormulas.map((formula) => {
            const manualOverridesCount = manualOverridesCountForFormula(formula)
            const needsOverrideChoice = isOwner && formulaAwaitingOverrideChoice === formula.id && manualOverridesCount > 0
            return (
              <div className={`formula-row ${needsOverrideChoice ? 'formula-row-warning' : ''}`} key={formula.id}>
                <label className="formula-cell formula-title">
                  <span>Regla</span>
                  <input className="fc-input formula-name" value={formula.name} readOnly />
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
                  <select className="fc-input" aria-label="Lista destino" value={formula.targetListId || defaultTargetId} onChange={(e) => updateFormula(formula.id, 'targetListId', e.target.value)} disabled={!isOwner}>
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
                {isOwner && !needsOverrideChoice && (
                  <span className="formula-auto-state">{recalculateMutation.isPending && formulaToAutoApply === formula.id ? 'Recalculando...' : 'Auto'}</span>
                )}
                {needsOverrideChoice && (
                  <div className="formula-override-choice">
                    <span>{manualOverridesCount} precios manuales en LP4</span>
                    <button className="btn btn-secondary btn-sm" disabled={recalculateMutation.isPending} onClick={() => applyFormula(formula, false)}>Preservar manuales</button>
                    <button className="btn btn-danger btn-sm" disabled={recalculateMutation.isPending} onClick={() => applyFormula(formula, true)}>Recalcular todo</button>
                  </div>
                )}
              </div>
            )
          })}
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

      {deletingList && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <button className="btn btn-icon btn-secondary modal-x-close" disabled={deleteMutation.isPending} onClick={() => setDeletingList(null)} aria-label="Cerrar"><X size={14} /></button>
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
          grid-template-columns: minmax(210px, 1.15fr) minmax(180px, 1fr) minmax(180px, 1fr) 82px 92px 78px;
          gap: 8px;
          align-items: end;
          padding: 8px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 8px;
          background: rgba(255,255,255,0.025);
        }
        .formula-row-warning {
          border-color: rgba(245,158,11,0.3);
          background: rgba(245,158,11,0.055);
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
        .formula-auto-state {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(34,197,94,0.24);
          border-radius: 8px;
          color: #86efac;
          background: rgba(34,197,94,0.08);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
        .formula-override-choice {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-width: 0;
          padding-top: 2px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 750;
        }
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
        }
        @media (max-width: 720px) {
          .formula-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
