import Link from 'next/link'
import { ArrowRight, FileText } from 'lucide-react'

export default function PedidosPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pedidos</h1>
          <p className="page-subtitle">Los pedidos se gestionan desde el Mostrador.</p>
        </div>
        <Link className="btn btn-primary" href="/ventas">
          <ArrowRight size={14} /> Ir a Mostrador
        </Link>
      </div>

      <section className="fc-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.24)' }}>
            <FileText size={20} color="#a78bfa" />
          </div>
          <div>
            <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>Gestión centralizada</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Usá Mostrador para crear presupuestos, remitos, facturas y pedidos operativos.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
