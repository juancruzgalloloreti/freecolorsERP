'use client'

import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Edit2, KeyRound, Plus, Save, ShieldCheck, Trash2, UserRound, UsersRound, X } from 'lucide-react'

interface ManagedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'READONLY'
  isActive: boolean
  lastLoginAt?: string | null
}

export default function PerfilPage() {
  const qc = useQueryClient()
  const { user, logout } = useAuth()
  const isOwner = user?.role === 'OWNER'
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'EMPLOYEE',
    password: '',
  })
  const [userMessage, setUserMessage] = useState('')
  const [userError, setUserError] = useState('')
  const [editingUser, setEditingUser] = useState<(ManagedUser & { password?: string }) | null>(null)

  const { data: rawUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['managed-users'],
    queryFn: authApi.listUsers,
    enabled: isOwner,
  })
  const managedUsers: ManagedUser[] = Array.isArray(rawUsers) ? rawUsers : []

  const createUserMutation = useMutation({
    mutationFn: authApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['managed-users'] })
      setUserMessage('Usuario creado correctamente.')
      setUserError('')
      setNewUser({ firstName: '', lastName: '', email: '', role: 'EMPLOYEE', password: '' })
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { message?: string | string[] } } }
      const msg = apiError.response?.data?.message
      setUserError((Array.isArray(msg) ? msg[0] : msg) || 'No se pudo crear el usuario.')
      setUserMessage('')
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => authApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['managed-users'] })
      setUserMessage('Usuario actualizado correctamente.')
      setUserError('')
      setEditingUser(null)
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { message?: string | string[] } } }
      const msg = apiError.response?.data?.message
      setUserError((Array.isArray(msg) ? msg[0] : msg) || 'No se pudo actualizar el usuario.')
      setUserMessage('')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: authApi.deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['managed-users'] })
      setUserMessage('Usuario desactivado correctamente.')
      setUserError('')
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { message?: string | string[] } } }
      const msg = apiError.response?.data?.message
      setUserError((Array.isArray(msg) ? msg[0] : msg) || 'No se pudo desactivar el usuario.')
      setUserMessage('')
    },
  })

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

  const submitNewUser = (event: FormEvent) => {
    event.preventDefault()
    setUserMessage('')
    setUserError('')

    if (newUser.password.length < 8) {
      setUserError('La contraseña inicial debe tener al menos 8 caracteres.')
      return
    }

    createUserMutation.mutate(newUser)
  }

  const saveEditingUser = () => {
    if (!editingUser) return
    updateUserMutation.mutate({
      id: editingUser.id,
      data: {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        role: editingUser.role,
        isActive: editingUser.isActive,
        ...(editingUser.password ? { password: editingUser.password } : {}),
      },
    })
  }

  const deactivateUser = (managed: ManagedUser) => {
    if (managed.id === user?.id) {
      setUserError('No podés desactivar tu propia cuenta.')
      return
    }
    if (window.confirm(`Desactivar a ${managed.firstName} ${managed.lastName}? No va a poder iniciar sesión.`)) {
      deleteUserMutation.mutate(managed.id)
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

      {isOwner && (
        <div className="fc-card" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(34,197,94,0.12)', color: '#86efac' }}>
                <UsersRound size={17} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Usuarios</h2>
                <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Alta de empleados y permisos de acceso.</p>
              </div>
            </div>
            <span className="badge badge-green"><ShieldCheck size={11} /> Sólo owner</span>
          </div>

          <form onSubmit={submitNewUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr 150px 180px auto', gap: 10, alignItems: 'end', marginBottom: 16 }}>
            <div><label className="fc-label">Nombre</label><input className="fc-input" value={newUser.firstName} onChange={(e) => setNewUser((u) => ({ ...u, firstName: e.target.value }))} required /></div>
            <div><label className="fc-label">Apellido</label><input className="fc-input" value={newUser.lastName} onChange={(e) => setNewUser((u) => ({ ...u, lastName: e.target.value }))} required /></div>
            <div><label className="fc-label">Email</label><input className="fc-input" type="email" value={newUser.email} onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))} required /></div>
            <div>
              <label className="fc-label">Rol</label>
              <select className="fc-input" value={newUser.role} onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}>
                <option value="EMPLOYEE">Empleado</option>
                <option value="ADMIN">Admin</option>
                <option value="READONLY">Sólo lectura</option>
              </select>
            </div>
            <div><label className="fc-label">Contraseña inicial</label><input className="fc-input" type="password" value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))} required /></div>
            <button className="btn btn-primary" disabled={createUserMutation.isPending}>
              <Plus size={14} /> Crear
            </button>
          </form>

          {userError && <div style={{ marginBottom: 12, color: '#fca5a5', fontSize: 13 }}>{userError}</div>}
          {userMessage && <div style={{ marginBottom: 12, color: '#86efac', fontSize: 13 }}>{userMessage}</div>}

          <div style={{ overflowX: 'auto', border: '1px solid var(--fc-border)', borderRadius: 8 }}>
            <table className="fc-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último ingreso</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /></td></tr>
                ) : managedUsers.map((managed) => {
                  const isEditing = editingUser?.id === managed.id
                  return (
                    <tr key={managed.id}>
                      <td style={{ fontWeight: 700 }}>
                        {isEditing ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <input className="fc-input" value={editingUser.firstName} onChange={(e) => setEditingUser((current) => current ? { ...current, firstName: e.target.value } : current)} />
                            <input className="fc-input" value={editingUser.lastName} onChange={(e) => setEditingUser((current) => current ? { ...current, lastName: e.target.value } : current)} />
                          </div>
                        ) : `${managed.firstName} ${managed.lastName}`}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {isEditing ? <input className="fc-input" type="email" value={editingUser.email} onChange={(e) => setEditingUser((current) => current ? { ...current, email: e.target.value } : current)} /> : managed.email}
                      </td>
                      <td>
                        {isEditing && managed.role !== 'OWNER' ? (
                          <select className="fc-input" value={editingUser.role} onChange={(e) => setEditingUser((current) => current ? { ...current, role: e.target.value as ManagedUser['role'] } : current)}>
                            <option value="ADMIN">Admin</option>
                            <option value="EMPLOYEE">Empleado</option>
                            <option value="READONLY">Sólo lectura</option>
                          </select>
                        ) : <span className="badge badge-gray">{managed.role}</span>}
                      </td>
                      <td>
                        {isEditing && managed.role !== 'OWNER' ? (
                          <label className="inline-check" style={{ margin: 0 }}>
                            <input type="checkbox" checked={editingUser.isActive} onChange={(e) => setEditingUser((current) => current ? { ...current, isActive: e.target.checked } : current)} />
                            Activo
                          </label>
                        ) : <span className={`badge ${managed.isActive ? 'badge-green' : 'badge-red'}`}>{managed.isActive ? 'Activo' : 'Inactivo'}</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {isEditing ? (
                          <input className="fc-input" type="password" placeholder="Nueva contraseña opcional" value={editingUser.password || ''} onChange={(e) => setEditingUser((current) => current ? { ...current, password: e.target.value } : current)} />
                        ) : managed.lastLoginAt ? new Date(managed.lastLoginAt).toLocaleString('es-AR') : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          {isEditing ? (
                            <>
                              <button className="btn btn-icon btn-primary btn-sm" type="button" onClick={saveEditingUser} disabled={updateUserMutation.isPending}><Save size={13} /></button>
                              <button className="btn btn-icon btn-secondary btn-sm" type="button" onClick={() => setEditingUser(null)}><X size={13} /></button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-icon btn-secondary btn-sm" type="button" onClick={() => setEditingUser({ ...managed, password: '' })}><Edit2 size={13} /></button>
                              {managed.role !== 'OWNER' && <button className="btn btn-icon btn-danger btn-sm" type="button" onClick={() => deactivateUser(managed)} disabled={deleteUserMutation.isPending}><Trash2 size={13} /></button>}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1100px) {
          form[style*="grid-template-columns: 1fr 1fr 1.3fr"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 760px) {
          div[style*="grid-template-columns: minmax(260px"] {
            grid-template-columns: 1fr !important;
          }
          form[style*="grid-template-columns: 1fr 1fr 1.3fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
