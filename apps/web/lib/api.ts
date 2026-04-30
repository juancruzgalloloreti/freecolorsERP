import axios from 'axios'
import Cookies from 'js-cookie'

const configuredBase = process.env.NEXT_PUBLIC_API_URL || ''
const isLocalApi =
  configuredBase.includes('localhost') ||
  configuredBase.includes('127.0.0.1') ||
  configuredBase.includes('[::1]')
const isRemoteBrowser =
  typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const BASE = isRemoteBrowser && isLocalApi ? '' : configuredBase

// Slug del tenant — hardcodeado ya que es una sola pinturería.
// Si en el futuro se necesita multi-tenant, leer de variable de entorno.
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG || 'pintureria-demo'

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const method = String(config.method || 'get').toUpperCase()
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) && !config.headers['Idempotency-Key']) {
    config.headers['Idempotency-Key'] = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
  return config
})

let refreshing = false
let refreshQueue: Array<(token: string) => void> = []

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    if (refreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }

    refreshing = true
    try {
      const rt = Cookies.get('refresh_token')
      const savedUser = Cookies.get('user')
      // BUG FIX: el endpoint /auth/refresh requiere userId además del refreshToken
      const userId = savedUser ? JSON.parse(savedUser)?.id : null
      if (!rt || !userId) throw new Error('No refresh token or userId')

      const { data } = await axios.post(`${BASE}/api/v1/auth/refresh`, {
        userId,
        refreshToken: rt,
      })
      const newToken = data.accessToken
      Cookies.set('access_token', newToken, { expires: 1 })
      refreshQueue.forEach((cb) => cb(newToken))
      refreshQueue = []
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch {
      Cookies.remove('access_token')
      Cookies.remove('refresh_token')
      Cookies.remove('user')
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      refreshing = false
    }
  }
)

// ─── Auth ───────────────────────────────────────────────────
export const authApi = {
  // BUG FIX: se agrega tenantSlug — la API lo requiere para encontrar el tenant
  login: (email: string, password: string) =>
    axios
      .post('/api/auth/login', { email, password, tenantSlug: TENANT_SLUG })
      .then((r) => r.data),
  logout: () => api.post('/auth/logout'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data).then((r) => r.data),
  listUsers: () => api.get('/auth/users').then((r) => r.data),
  createUser: (data: Record<string, unknown>) =>
    api.post('/auth/users', data).then((r) => r.data),
  updateUser: (id: string, data: Record<string, unknown>) =>
    api.patch(`/auth/users/${id}`, data).then((r) => r.data),
  deleteUser: (id: string) =>
    api.delete(`/auth/users/${id}`).then((r) => r.data),
}

// ─── Products ───────────────────────────────────────────────
export const productsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/products', { params }).then((r) => r.data),
  search: (params?: Record<string, unknown>) =>
    api.get('/products/search', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/products/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/products', data).then((r) => r.data),
  importProducts: (rows: Record<string, unknown>[], options?: Record<string, unknown>) =>
    api.post('/products/import', { rows, options }).then((r) => r.data),
  exportProducts: () =>
    api.get('/products/export', { responseType: 'blob' }).then((r) => r.data as Blob),
  bulkRemove: (ids: string[]) =>
    api.post('/products/bulk-delete', { ids }).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/products/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/products/${id}`).then((r) => r.data),
  listBrands: () => api.get('/products/brands').then((r) => r.data),
  createBrand: (data: Record<string, unknown>) =>
    api.post('/products/brands', data).then((r) => r.data),
  listCategories: () => api.get('/products/categories').then((r) => r.data),
  createCategory: (data: Record<string, unknown>) =>
    api.post('/products/categories', data).then((r) => r.data),
}

// ─── Stock ──────────────────────────────────────────────────
export const stockApi = {
  current: (params?: Record<string, unknown>) =>
    api.get('/stock', { params }).then((r) => r.data),
  movements: (params?: Record<string, unknown>) =>
    api.get('/stock/movements', { params }).then((r) => r.data),
  record: (data: Record<string, unknown>) =>
    api.post('/stock/movements', data).then((r) => r.data),
  deposits: () => api.get('/stock/deposits').then((r) => r.data),
}

// ─── Documents ──────────────────────────────────────────────
export const documentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/documents', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/documents/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/documents', data).then((r) => r.data),
  confirmSale: (data: Record<string, unknown>) =>
    api.post('/documents/confirm-sale', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/documents/${id}`, data).then((r) => r.data),
  confirm: (id: string, data?: Record<string, unknown>) =>
    api.post(`/documents/${id}/confirm`, data ?? {}).then((r) => r.data),
  cancel: (id: string, data?: Record<string, unknown>) =>
    api.post(`/documents/${id}/cancel`, data ?? {}).then((r) => r.data),
  convert: (id: string, data: Record<string, unknown>) =>
    api.post(`/documents/${id}/convert`, data).then((r) => r.data),
  puntos: () => api.get('/documents/puntos-de-venta').then((r) => r.data),
}

// ─── Sales Orders ───────────────────────────────────────────
export const salesOrdersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/sales-orders', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/sales-orders/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/sales-orders', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/sales-orders/${id}`, data).then((r) => r.data),
  status: (id: string, status: string) =>
    api.post(`/sales-orders/${id}/status`, { status }).then((r) => r.data),
  toDocument: (id: string, data: Record<string, unknown>) =>
    api.post(`/sales-orders/${id}/to-document`, data).then((r) => r.data),
  export: (params?: Record<string, unknown>) =>
    api.get('/sales-orders/export', { params, responseType: 'blob' }).then((r) => r.data as Blob),
}

// ─── Customers ──────────────────────────────────────────────
export const customersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/customers', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/customers', data).then((r) => r.data),
  importCustomers: (rows: Record<string, unknown>[]) =>
    api.post('/customers/import', { rows }).then((r) => r.data),
  exportCustomers: () =>
    api.get('/customers/export', { responseType: 'blob' }).then((r) => r.data as Blob),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/customers/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/customers/${id}`),
  account: (id: string) =>
    api.get(`/customers/${id}/account`).then((r) => r.data),
}

// ─── Suppliers ──────────────────────────────────────────────
export const suppliersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/suppliers', { params }).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/suppliers', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/suppliers/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/suppliers/${id}`),
  account: (id: string) => api.get(`/suppliers/${id}/account`).then((r) => r.data),
  products: (id: string) => api.get(`/suppliers/${id}/products`).then((r) => r.data),
  upsertProduct: (id: string, data: Record<string, unknown>) =>
    api.post(`/suppliers/${id}/products`, data).then((r) => r.data),
}

// ─── Current Account ────────────────────────────────────────
export const ccApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/currentAccount', { params }).then((r) => r.data),
  addEntry: (data: Record<string, unknown>) =>
    api.post('/currentAccount/entries', data).then((r) => r.data),
}

// ─── Cash ───────────────────────────────────────────────────
export const cashApi = {
  current: () => api.get('/cash/current').then((r) => r.data),
  sessions: () => api.get('/cash/sessions').then((r) => r.data),
  open: (data: Record<string, unknown>) =>
    api.post('/cash/open', data).then((r) => r.data),
  move: (data: Record<string, unknown>) =>
    api.post('/cash/move', data).then((r) => r.data),
  close: (data: Record<string, unknown>) =>
    api.post('/cash/close', data).then((r) => r.data),
}

// ─── Price Lists ─────────────────────────────────────────────
export const priceListsApi = {
  list: () => api.get('/priceLists').then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/priceLists', data).then((r) => r.data),
  remove: (id: string) => api.delete(`/priceLists/${id}`).then((r) => r.data),
  updateItem: (priceListId: string, productId: string, price: number) =>
    api
      .patch(`/priceLists/${priceListId}/items/${productId}`, { price })
      .then((r) => r.data),
  recalculate: (priceListId: string, data: Record<string, unknown>) =>
    api.post(`/priceLists/${priceListId}/recalculate`, data).then((r) => r.data),
  coefficients: () =>
    api.get('/priceLists/coefficients').then((r) => r.data),
  createCoefficient: (data: Record<string, unknown>) =>
    api.post('/priceLists/coefficients', data).then((r) => r.data),
  removeCoefficient: (id: string) =>
    api.delete(`/priceLists/coefficients/${id}`).then((r) => r.data),
}

// ─── Reports ─────────────────────────────────────────────────
export const reportsApi = {
  summary: () => api.get('/reports').then((r) => r.data),
  salesSummary: (params?: Record<string, unknown>) =>
    api.get('/reports/sales-summary', { params }).then((r) => r.data),
  management: (params?: Record<string, unknown>) =>
    api.get('/reports/management', { params }).then((r) => r.data),
  sales: (params?: Record<string, unknown>) =>
    api.get('/reports/sales', { params }).then((r) => r.data),
  stock: () => api.get('/reports/stock').then((r) => r.data),
}
