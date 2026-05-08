'use client'

import { useState, useRef, useCallback } from 'react'
import {
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
} from 'lucide-react'
import { suppliersApi } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

type RowData = Record<string, string>

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done'

interface ProveedorField {
  key: string
  label: string
  required?: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CAMPOS: ProveedorField[] = [
  { key: 'razonSocial', label: 'Razón Social / Nombre', required: true },
  { key: 'cuit',        label: 'CUIT' },
  { key: 'email',       label: 'Email' },
  { key: 'telefono',    label: 'Teléfono' },
  { key: 'direccion',   label: 'Dirección' },
  { key: 'ciudad',      label: 'Ciudad' },
  { key: 'provincia',   label: 'Provincia' },
  { key: 'condicionIva', label: 'Condición IVA' },
  { key: 'condicionPago', label: 'Condición Pago' },
  { key: 'notas',       label: 'Notas' },
  { key: '-',           label: '— No importar —' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCSV(raw: string): { headers: string[]; rows: string[][] } {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = text.split('\n').filter((l) => l.trim())

  const parseLine = (line: string): string[] => {
    const cols: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (ch === ',' && !inQ) {
        cols.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())
    return cols
  }

  const firstLine = lines[0]
  const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ','

  const parseLineSep = sep === ';'
    ? (l: string) => l.split(';').map((c) => c.replace(/^"|"$/g, '').trim())
    : parseLine

  const headers = parseLineSep(lines[0])
  const rows = lines.slice(1).map(parseLineSep).filter((r) => r.some(Boolean))
  return { headers, rows }
}

function normalizeCuit(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
  }
  return raw.trim()
}

function autoMap(headers: string[]): Record<string, string> {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

  const rules: [string[], string][] = [
    [['razonsocial','razon','nombre','empresa','proveedor','descripcion','razonsocialounombre'], 'razonSocial'],
    [['cuit','cuil','nrodoc','nit','cut','cuitcuil','rut'],                                    'cuit'],
    [['email','correo','mail','emailaddress'],                                                  'email'],
    [['telefono','tel','phone','celular','movil','fax','contacto'],                             'telefono'],
    [['direccion','domicilio','calle','address','dir'],                                         'direccion'],
    [['ciudad','localidad','poblacion','loc'],                                                  'ciudad'],
    [['provincia','prov','estado','region'],                                                   'provincia'],
    [['condicioniva','condiva','iva','situacioniva'],                                          'condicionIva'],
    [['condicionpago','condpago','formapago','plazo','pagos'],                                 'condicionPago'],
    [['notas','nota','observaciones','obs','comentarios'],                                     'notas'],
  ]

  const used = new Set<string>()
  const mapping: Record<string, string> = {}

  for (const h of headers) {
    const n = norm(h)
    mapping[h] = '-'
    for (const [patterns, field] of rules) {
      if (!used.has(field) && patterns.some((p) => n === p || n.includes(p) || p.includes(n))) {
        mapping[h] = field
        used.add(field)
        break
      }
    }
  }
  return mapping
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  onSuccess: () => void
}

const PREVIEW_COUNT = 5

export default function ImportCSVModal({ onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep]       = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows]       = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [errors, setErrors]   = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [result, setResult]   = useState({ ok: 0, skipped: 0 })
  const [progress, setProgress] = useState(0)

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers: h, rows: r } = parseCSV(text)
      setHeaders(h)
      setRows(r)
      setMapping(autoMap(h))
      setErrors([])
      setStep('map')
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.toLowerCase().endsWith('.csv')) handleFile(file)
  }

  const mappedFields = Object.entries(mapping)
    .filter(([, v]) => v !== '-')
    .map(([, v]) => v)

  const buildPayload = (): RowData[] =>
    rows
      .map((row) => {
        const obj: RowData = {}
        headers.forEach((h, i) => {
          const field = mapping[h]
          if (!field || field === '-') return
          let val = (row[i] ?? '').trim()
          if (field === 'cuit' && val) val = normalizeCuit(val)
          obj[field] = val
        })
        return obj
      })
      .filter((o) => o.razonSocial?.trim())

  const previewRows = (): RowData[] => buildPayload().slice(0, PREVIEW_COUNT)

  const validateMap = (): boolean => {
    if (!mappedFields.includes('razonSocial')) {
      setErrors(['Debés mapear al menos la columna "Razón Social / Nombre".'])
      return false
    }
    setErrors([])
    return true
  }

  const handleImport = async () => {
    const payload = buildPayload()
    setStep('importing')
    let ok = 0, skipped = 0

    for (let i = 0; i < payload.length; i += 1) {
      const row = payload[i]
      try {
        await suppliersApi.create({
          name: row.razonSocial,
          cuit: row.cuit || null,
          email: row.email || null,
          phone: row.telefono || null,
          address: [row.direccion, row.ciudad, row.provincia].filter(Boolean).join(', ') || null,
          ivaCondition: row.condicionIva || 'Responsable Inscripto',
          notes: [row.condicionPago ? `Condición de pago: ${row.condicionPago}` : '', row.notas || ''].filter(Boolean).join('\n') || null,
          isActive: true,
        })
        ok += 1
      } catch {
        skipped += 1
      }
      setProgress(Math.round(((i + 1) / payload.length) * 100))
    }

    setResult({ ok, skipped })
    setStep('done')
  }

  const payload = step === 'preview' || step === 'importing' || step === 'done'
    ? buildPayload()
    : []

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Importar proveedores desde CSV</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {step === 'upload'    && 'Compatible con exportaciones del sistema legacy'}
              {step === 'map'       && `${rows.length} filas detectadas en "${fileName}" — mapeá las columnas`}
              {step === 'preview'   && `Vista previa · se importarán ${payload.length} registros`}
              {step === 'importing' && 'Procesando...'}
              {step === 'done'      && 'Importación finalizada'}
            </p>
          </div>
          <button className="btn btn-icon btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>

        {(step === 'map' || step === 'preview') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', padding: '10px 24px', borderBottom: '1px solid var(--fc-border)', background: 'rgba(255,255,255,0.02)' }}>
            {(['map', 'preview'] as const).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {i > 0 && <div style={{ width: '32px', height: '1px', background: 'var(--fc-border)', margin: '0 4px' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '500', color: step === s ? 'var(--accent-purple)' : step === 'preview' && s === 'map' ? 'var(--text-muted)' : 'var(--text-muted)' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', border: `1px solid ${step === s ? 'var(--accent-purple)' : step === 'preview' && s === 'map' ? 'var(--fc-border)' : 'var(--fc-border)'}`, background: step === s ? 'var(--accent-purple)' : step === 'preview' && s === 'map' ? 'rgba(255,255,255,0.05)' : 'transparent', color: step === s ? '#fff' : step === 'preview' && s === 'map' ? 'var(--text-muted)' : 'var(--text-muted)' }}>
                    {step === 'preview' && s === 'map' ? '✓' : i + 1}
                  </div>
                  {s === 'map' ? 'Mapear columnas' : 'Vista previa'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {step === 'upload' && (
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed var(--fc-border)', borderRadius: '12px', padding: '48px', textAlign: 'center', cursor: 'pointer', transition: 'all' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-purple)'; e.currentTarget.style.background = 'rgba(124,58,237,0.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--fc-border)'; e.currentTarget.style.background = 'transparent' }}
            >
              <Upload size={36} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--fc-text)', fontWeight: '500', marginBottom: '4px' }}>
                Arrastrá tu CSV o hacé clic para seleccionarlo
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Exportá desde el legacy con CUIT y Razón Social — se detectan automáticamente
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px' }}>
                <FileText size={12} />
                Solo archivos .csv
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </div>
          )}

          {step === 'map' && (
            <div>
              {errors.map((e) => (
                <div
                  key={e}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#fca5a5', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}
                >
                  <AlertCircle size={14} />
                  {e}
                </div>
              ))}
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Asociá cada columna del archivo con el campo del sistema:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {headers.map((h) => (
                  <div
                    key={h}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--fc-text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rows.slice(0, 3).map((r) => r[headers.indexOf(h)]).filter(Boolean)[0] ?? ''}
                      </span>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <select
                      value={mapping[h] ?? '-'}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                      className="fc-input"
                      style={{ width: '200px' }}
                    >
                      {CAMPOS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                          {c.required ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
                * Campo obligatorio. Los demás son opcionales.
              </p>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Primeras {Math.min(PREVIEW_COUNT, payload.length)} filas de{' '}
                <span style={{ color: 'var(--fc-text)', fontWeight: '500' }}>{payload.length}</span> a importar:
              </p>
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--fc-border)' }}>
                <table className="fc-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {mappedFields.map((f) => (
                        <th key={f}>
                          {CAMPOS.find((c) => c.key === f)?.label ?? f}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows().map((row, i) => (
                      <tr key={i}>
                        {mappedFields.map((f) => (
                          <td key={f} style={{ whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row[f] || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {payload.length > PREVIEW_COUNT && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  + {payload.length - PREVIEW_COUNT} registros más...
                </p>
              )}
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '11px', color: '#fcd34d' }}>
                Los proveedores con CUIT duplicado serán omitidos automáticamente.
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: '20px' }}>
              <div style={{ width: '40px', height: '40px', border: '2px solid var(--accent-purple)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--fc-text)', fontSize: '13px', fontWeight: '500' }}>
                  Importando proveedores...
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>{progress}%</p>
              </div>
              <div style={{ width: '192px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{ height: '100%', background: 'var(--accent-purple)', borderRadius: '3px', transition: 'all 0.3s', width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: '16px' }}>
              <CheckCircle2 size={44} style={{ color: '#4ade80' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--fc-text)', fontWeight: '500', fontSize: '18px' }}>
                  {result.ok} proveedor{result.ok !== 1 ? 'es' : ''} importado{result.ok !== 1 ? 's' : ''}
                </p>
                {result.skipped > 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                    {result.skipped} omitido{result.skipped !== 1 ? 's' : ''} (CUIT duplicado o sin razón social)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 24px', borderTop: '1px solid var(--fc-border)' }}>
          <div>
            {step === 'map' && (
              <button onClick={() => setStep('upload')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={14} /> Volver
              </button>
            )}
            {step === 'preview' && (
              <button onClick={() => setStep('map')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={14} /> Volver
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {step !== 'importing' && step !== 'done' && (
              <button onClick={onClose} className="btn btn-secondary">
                Cancelar
              </button>
            )}
            {step === 'map' && (
              <button
                onClick={() => { if (validateMap()) setStep('preview') }}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Vista previa <ArrowRight size={14} />
              </button>
            )}
            {step === 'preview' && (
              <button onClick={handleImport} className="btn btn-primary">
                Importar {payload.length} proveedores
              </button>
            )}
            {step === 'done' && (
              <button onClick={onSuccess} className="btn btn-primary">
                Listo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
