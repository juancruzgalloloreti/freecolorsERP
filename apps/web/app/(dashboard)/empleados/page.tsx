'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, Save, ShieldCheck, Trash2, UserCog, X } from 'lucide-react'
import { authApi, permissionsApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/erp/error-boundary'

type ManagedUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'READONLY'
  isActive: boolean
  lastLoginAt?: string | null
}

type Permission = {
  id: string
  code: string
  description: string
  category: string
}

const ROLE_LABEL: Record<ManagedUser['role'], string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  EMPLOYEE: 'Empleado',
  READONLY: 'Solo lectura',
}

const CATEGORY_LABEL: Record<string, string> = {
  sales: 'Ventas y Mostrador',
  stock: 'Inventario y Stock',
  cash: 'Caja',
  customers: 'Clientes',
  suppliers: 'Proveedores',
  purchases: 'Compras',
  checks: 'Cheques',
  approvals: 'Aprobaciones',
  products: 'Productos',
  documents: 'Comprobantes',
  reports: 'Reportes',
  prices: 'Precios',
  audit: 'Auditoría',
  users: 'Empleados y permisos',
}

function apiMessage(error: unknown, fallback: string) {
  const apiError = error as { response?: { data?: { message?: string | string[]; error?: string } }; message?: string }
  const message = apiError.response?.data?.message || apiError.response?.data?.error || apiError.message || fallback
  return Array.isArray(message) ? message.join(', ') : message
}

function EmpleadosPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const canManage = user?.role === 'OWNER'
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', role: 'EMPLOYEE', password: '' })
  const [editingUser, setEditingUser] = useState<(ManagedUser & { password?: string }) | null>(null)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())

  const { data: rawUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['managed-users'],
    queryFn: authApi.listUsers,
    enabled: canManage,
  })
  const { data: rawPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: permissionsApi.list,
    enabled: canManage,
  })
  const users = useMemo(() => Array.isArray(rawUsers) ? rawUsers as ManagedUser[] : [], [rawUsers])
  const permissions = useMemo(() => Array.isArray(rawPermissions) ? rawPermissions as Permission[] : [], [rawPermissions])
  const selectedUser = users.find((item) => item.id === selectedId) ?? users[0] ?? null

  const permissionGroups = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      const key = permission.category || 'otros'
      groups[key] = [...(groups[key] ?? []), permission]
      return groups
    }, {})
  }, [permissions])

  const { data: userPermissions = [] } = useQuery({
    queryKey: ['employee-permissions', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return []
      return permissionsApi.user(selectedUser.id) as Promise<Permission[]>
    },
    enabled: canManage && Boolean(selectedUser),
  })

  useEffect(() => {
    if (!selectedUser) return
    setSelectedCodes(new Set((userPermissions as Permission[]).map((p) => p.code)))
  }, [userPermissions, selectedUser?.id])

  const createMutation = useMutation({
    mutationFn: authApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['managed-users'] })
      setNewUser({ firstName: '', lastName: '', email: '', role: 'EMPLOYEE', password: '' })
      setMessage('Empleado creado correctamente.')
      setError('')
    },
    onError: (mutationError) => {
      setError(apiMessage(mutationError, 'No se pudo crear el empleado.'))
      setMessage('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => authApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['managed-users'] })
      setEditingUser(null)
      setMessage('Empleado actualizado.')
      setError('')
    },
    onError: (mutationError) => {
      setError(apiMessage(mutationError, 'No se pudo actualizar el empleado.'))
      setMessage('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: authApi.deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['managed-users'] })
      setMessage('Empleado desactivado.')
      setError('')
    },
    onError: (mutationError) => {
      setError(apiMessage(mutationError, 'No se pudo desactivar el empleado.'))
      setMessage('')
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => selectedUser ? permissionsApi.syncUser(selectedUser.id, Array.from(selectedCodes)) : Promise.resolve(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-permissions', selectedUser?.id] })
      setMessage('Permisos guardados.')
      setError('')
    },
    onError: (mutationError) => {
      setError(apiMessage(mutationError, 'No se pudieron guardar los permisos.'))
      setMessage('')
    },
  })

  function submitNewUser(event: FormEvent) {
    event.preventDefault()
    if (newUser.password.length < 8) {
      setError('La contraseña inicial debe tener al menos 8 caracteres.')
      return
    }
    createMutation.mutate(newUser)
  }

  function saveEditingUser() {
    if (!editingUser) return
    updateMutation.mutate({
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

  function togglePermission(code: string, checked: boolean) {
    setSelectedCodes((current) => {
      const next = new Set(current)
      if (checked) next.add(code)
      else next.delete(code)
      return next
    })
  }

  if (!canManage) {
    return (
      <div className="fc-card">
        <h1 className="page-title">Empleados</h1>
        <p className="page-subtitle">No tenés permisos para administrar empleados.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Empleados</h1>
          <p className="page-subtitle">Alta, estado, roles y permisos completos por categoría.</p>
        </div>
        <span className="badge badge-green"><ShieldCheck size={11} /> Gestión interna</span>
      </div>

      {error && <div className="counter-alert danger">{error}</div>}
      {message && <div className="counter-alert success">{message}</div>}

      <form className="fc-card employee-create-form" onSubmit={submitNewUser}>
        <label><span>Nombre</span><input className="fc-input" value={newUser.firstName} onChange={(event) => setNewUser((current) => ({ ...current, firstName: event.target.value }))} required /></label>
        <label><span>Apellido</span><input className="fc-input" value={newUser.lastName} onChange={(event) => setNewUser((current) => ({ ...current, lastName: event.target.value }))} required /></label>
        <label><span>Email</span><input className="fc-input" type="email" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} required /></label>
        <label><span>Rol</span><select className="fc-input" value={newUser.role} onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value }))}><option value="EMPLOYEE">Empleado</option><option value="ADMIN">Admin</option><option value="READONLY">Solo lectura</option></select></label>
        <label><span>Contraseña inicial</span><input className="fc-input" type="password" value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} required /></label>
        <button className="btn btn-primary" disabled={createMutation.isPending} type="submit">Crear empleado</button>
      </form>

      <div className="employee-layout">
        <section className="fc-card employee-list-panel">
          <h2>Equipo</h2>
          {usersLoading ? <div className="empty-state"><span className="spinner" /></div> : users.map((managed) => {
            const isEditing = editingUser?.id === managed.id
            return (
              <article className={`employee-row ${selectedUser?.id === managed.id ? 'active' : ''}`} key={managed.id}>
                <button type="button" onClick={() => setSelectedId(managed.id)}>
                  <UserCog size={16} />
                  <span>
                    <strong>{managed.firstName} {managed.lastName}</strong>
                    <small>{managed.email}</small>
                  </span>
                  <b>{ROLE_LABEL[managed.role]}</b>
                </button>
                {isEditing ? (
                  <div className="employee-edit-grid">
                    <input className="fc-input" value={editingUser.firstName} onChange={(event) => setEditingUser((current) => current ? { ...current, firstName: event.target.value } : current)} />
                    <input className="fc-input" value={editingUser.lastName} onChange={(event) => setEditingUser((current) => current ? { ...current, lastName: event.target.value } : current)} />
                    <input className="fc-input" type="email" value={editingUser.email} onChange={(event) => setEditingUser((current) => current ? { ...current, email: event.target.value } : current)} />
                    <select className="fc-input" value={editingUser.role} disabled={managed.role === 'OWNER'} onChange={(event) => setEditingUser((current) => current ? { ...current, role: event.target.value as ManagedUser['role'] } : current)}>
                      <option value="ADMIN">Admin</option><option value="EMPLOYEE">Empleado</option><option value="READONLY">Solo lectura</option>
                    </select>
                    <input className="fc-input" type="password" placeholder="Nueva contraseña opcional" value={editingUser.password || ''} onChange={(event) => setEditingUser((current) => current ? { ...current, password: event.target.value } : current)} />
                    <label className="inline-check"><input type="checkbox" checked={editingUser.isActive} disabled={managed.role === 'OWNER'} onChange={(event) => setEditingUser((current) => current ? { ...current, isActive: event.target.checked } : current)} /> Activo</label>
                    <div className="employee-edit-actions">
                      <button className="btn btn-primary" type="button" onClick={saveEditingUser} disabled={updateMutation.isPending}><Save size={14} /> Guardar</button>
                      <button className="btn btn-secondary" type="button" onClick={() => setEditingUser(null)}><X size={14} /> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <footer>
                    <span className={`badge ${managed.isActive ? 'badge-green' : 'badge-red'}`}>{managed.isActive ? 'Activo' : 'Inactivo'}</span>
                    <span>Último ingreso: {managed.lastLoginAt ? new Date(managed.lastLoginAt).toLocaleString('es-AR') : '-'}</span>
                    <button className="btn btn-icon btn-secondary btn-sm" type="button" aria-label={`Editar ${managed.firstName}`} onClick={() => setEditingUser({ ...managed, password: '' })}><Edit2 size={13} /></button>
                    {managed.role !== 'OWNER' && <button className="btn btn-icon btn-danger btn-sm" type="button" aria-label={`Desactivar ${managed.firstName}`} onClick={() => deleteMutation.mutate(managed.id)} disabled={deleteMutation.isPending}><Trash2 size={13} /></button>}
                  </footer>
                )}
              </article>
            )
          })}
        </section>

        <section className="fc-card employee-permissions-panel">
          <div className="employee-permissions-header">
            <div>
              <h2>Permisos</h2>
              <p>{selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Seleccioná un empleado'}</p>
            </div>
            <button className="btn btn-primary" type="button" disabled={!selectedUser || permissionsLoading || syncMutation.isPending} onClick={() => syncMutation.mutate()}>
              {syncMutation.isPending ? 'Guardando...' : 'Guardar permisos'}
            </button>
          </div>

          <div className="permission-groups">
            {Object.entries(permissionGroups).map(([category, items]) => (
              <section className="permission-group" key={category}>
                <h3>{CATEGORY_LABEL[category] || category}</h3>
                <div>
                  {items.map((permission) => (
                    <label key={permission.id} className="permission-check">
                      <input type="checkbox" checked={selectedCodes.has(permission.code)} onChange={(event) => togglePermission(permission.code, event.target.checked)} disabled={!selectedUser?.isActive || selectedUser?.role === 'OWNER'} />
                      <span>
                        <strong>{permission.description}</strong>
                        <small>{permission.code}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default function EmpleadosPageWithErrorBoundary() {
  return <ErrorBoundary><EmpleadosPage /></ErrorBoundary>
}
