const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(url, opts = {}) {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    const error = new Error(err.message || 'Request failed')
    error.status = res.status
    throw error
  }
  return res.json()
}

export async function authVerify({ gmail, rollNo, dob }) {
  return request(`${BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gmail, rollNo, dob }),
  })
}

export async function authMe(token) {
  return request(`${BASE}/auth/me`, {
    headers: authHeaders(token),
  })
}

export async function getItems(params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) q.set(k, v) })
  return request(`${BASE}/items?${q}`)
}

export async function searchItems(q, ai = false, type = 'found') {
  const params = new URLSearchParams({ q, ai: String(ai), type })
  return request(`${BASE}/items/search?${params}`)
}

export async function getResolvedItems() {
  return request(`${BASE}/items/resolved`)
}

export async function getItem(id) {
  return request(`${BASE}/items/${id}`)
}

export async function postItem(formData, token) {
  return request(`${BASE}/items`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData, // FormData — browser sets Content-Type with boundary
  })
}

export async function resolveItem(id, manageToken) {
  return request(`${BASE}/items/${id}/resolve`, {
    method: 'PATCH',
    headers: { 'x-manage-token': manageToken },
  })
}

export async function updateItem(id, data, manageToken) {
  return request(`${BASE}/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-manage-token': manageToken },
    body: JSON.stringify(data),
  })
}

export async function deleteItem(id, manageToken) {
  return request(`${BASE}/items/${id}`, {
    method: 'DELETE',
    headers: { 'x-manage-token': manageToken },
  })
}

export async function expressInterest(id, body, token) {
  return request(`${BASE}/items/${id}/interest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
}

export async function adminLogin(password) {
  return request(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  })
}

export async function adminGetItems(params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) q.set(k, v) })
  return request(`${BASE}/admin/items?${q}`, { credentials: 'include' })
}

export async function adminDeleteItem(id) {
  return request(`${BASE}/admin/items/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

export async function adminGetStats() {
  return request(`${BASE}/admin/stats`, { credentials: 'include' })
}

export async function getItemByManageToken(token) {
  return request(`${BASE}/items/manage/${encodeURIComponent(token)}`)
}
