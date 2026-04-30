'use client'

import { useState, FormEvent } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      window.location.assign('/ventas')
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string | string[] } }; request?: unknown }
      const msg = apiError.response?.data?.message
      const text = Array.isArray(msg) ? msg[0] : msg

      if (!apiError.response && apiError.request) {
        setError('No se pudo conectar con la API. Revisá que el backend esté corriendo y que el ERP se abra desde la IP correcta.')
      } else {
        setError(text || 'Email o contraseña incorrectos')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        input:-webkit-autofill,input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 40px #0a0c18 inset !important;
          -webkit-text-fill-color: #dde1f0 !important;
          caret-color: #dde1f0;
          transition: background-color 9999s ease-in-out 0s;
        }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes loginIn {
          from { opacity: 0; transform: translateY(20px) }
          to   { opacity: 1; transform: none }
        }
        .login-card { animation: loginIn 0.4s cubic-bezier(.2,.8,.3,1) both; }
        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#07090f',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div className="login-bg-orb" style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', top: -100, left: '50%', transform: 'translateX(-50%)' }} />
        <div className="login-bg-orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', bottom: 0, right: '10%' }} />

        <div className="login-card" style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <Image
              src="/freecolors-logo.png"
              alt="Freecolors Pinturerias"
              width={340}
              height={100}
              priority
              style={{
                display: 'block',
                width: 'min(100%, 340px)',
                height: 'auto',
                margin: '0 auto',
                filter: 'drop-shadow(0 8px 28px rgba(124,58,237,0.22))',
              }}
            />
            <div style={{
              width: '40px', height: '2px',
              background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
              margin: '14px auto 0',
              borderRadius: '2px',
            }} />
          </div>

          {/* Card */}
          <div style={{
            background: '#0f1320',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '36px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
          }}>
            <h2 style={{
              fontSize: '17px',
              fontWeight: '600',
              color: '#eceef4',
              marginBottom: '28px',
              letterSpacing: '-0.2px',
            }}>
              Iniciar sesión
            </h2>

            <form onSubmit={submit}>
              {/* Email */}
              <div style={{ marginBottom: '18px' }}>
                <label className="fc-label">Email</label>
                <input
                  className="fc-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@freecolors.com"
                  required
                  autoFocus
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '28px' }}>
                <label className="fc-label">Contraseña</label>
                <input
                  className="fc-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.18)',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '13px',
                  color: '#f87171',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading
                    ? 'rgba(124,58,237,0.5)'
                    : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '13px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-sans)',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.4)',
                }}
              >
                {loading ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ animation: 'spin 0.7s linear infinite' }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Verificando...
                  </>
                ) : 'Ingresar'}
              </button>
            </form>
          </div>

          <p style={{
            textAlign: 'center',
            fontSize: '11px',
            color: '#363b52',
            marginTop: '24px',
            letterSpacing: '0.05em',
          }}>
            FREECOLORS ERP v2.0
          </p>
        </div>
      </div>
    </>
  )
}
