'use client'

import { FormEvent, useState } from 'react'
import { authApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { KeyRound, UserRound } from 'lucide-react'

export default function PerfilPage() {
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.')
      return
    }

    setLoading(true)
    try {
      await authApi.changePassword({ currentPassword, newPassword })
      setMessage('Contraseña actualizada. Volvé a iniciar sesión con la nueva contraseña.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => logout(), 1200)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string | string[] } } }
      const msg = apiError.response?.data?.message
      setError((Array.isArray(msg) ? msg[0] : msg) || 'No se pudo cambiar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Usuario'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Perfil</h1>
          <p className="page-subtitle">Datos del usuario y seguridad de la cuenta</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 0.8fr) minmax(320px, 1.2fr)', gap: 16, alignItems: 'start' }}>
        <div className="fc-card">
          <div style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', marginBottom: 14 }}>
            <UserRound size={21} />
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{fullName}</h2>
          <p style={{ margin: '5px 0 0', color: 'var(--text-muted)' }}>{user?.email}</p>
          <div style={{ marginTop: 14 }}><span className="badge badge-gray">{user?.role}</span></div>
        </div>

        <form className="fc-card" onSubmit={submit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(124,58,237,0.14)', color: '#c4b5fd' }}><KeyRound size={17} /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Cambiar contraseña</h2>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Se cerrará la sesión después de actualizarla.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div><label className="fc-label">Contraseña actual</label><input className="fc-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
            <div><label className="fc-label">Nueva contraseña</label><input className="fc-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
            <div><label className="fc-label">Confirmar nueva contraseña</label><input className="fc-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
          </div>

          {error && <div style={{ marginTop: 14, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
          {message && <div style={{ marginTop: 14, color: '#86efac', fontSize: 13 }}>{message}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Actualizar contraseña'}</button>
          </div>
        </form>
      </div>

      <style>{`
        @media (max-width: 760px) {
          div[style*="grid-template-columns: minmax(260px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
