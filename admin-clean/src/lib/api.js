// /lib/api.js — EscapeShop Admin

// База API:
// - в проде из VITE_API_BASE (например: https://api.escapestore.ru/api)
// - в деве по умолчанию '/api' (Vite proxy на бекенд)
const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');

// --- helpers ---
function authHeaders() {
  const t = localStorage.getItem('token');
  return t ? { Authorization: 'Bearer ' + t } : {};
}
export async function uploadImageFile(file) {
  const fd = new FormData();
  fd.append('image', file);
  return request(`/admin/images/upload`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: fd
  }); // { url }
}
async function request(path, opts = {}) {
  // Склеиваем без двойных слэшей
  const url = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  const r = await fetch(url, { credentials: 'include', ...opts });

  // Тело для сообщений об ошибке
  const ctype = r.headers.get('content-type') || '';

  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      if (ctype.includes('application/json')) {
        const data = await r.json();
        msg = (data && (data.error || data.message)) ? String(data.error || data.message) : JSON.stringify(data);
      } else {
        const text = await r.text();
        msg = text.slice(0, 500);
      }
    } catch (_) {}
    throw new Error(msg);
  }

  if (!ctype.includes('application/json')) {
    const text = await r.text();
    throw new Error(`Не JSON от API (${r.status}). Получено: ${text.slice(0, 200)}`);
  }

  return r.json();
}

// ====== Аутентификация ======
export async function login(email, password) {
  const data = await request('/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  localStorage.setItem('token', data.token);
  return data;
}

// ====== Категории ======
export async function listCategories() {
  return request('/categories');
}

export async function createCategory(payload) {
  return request('/admin/categories', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updateCategory(id, payload) {
  return request(`/admin/categories/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function uploadCategoryImage(id, file) {
  const fd = new FormData();
  fd.append('image', file);
  return request(`/admin/categories/${id}/image`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: fd
  });
}

export async function deleteCategory(id) {
  await request(`/admin/categories/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  return true;
}

// ====== Товары / Вариации ======
export async function listProducts() {
  return request('/products?limit=200'); // бэк должен возвращать variants + categories
}

export async function createProduct(payload) {
  // payload: { title, slug, description, specs?, category_ids? }
  return request('/admin/products', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updateProduct(id, payload) {
  // payload: { title?, slug?, description?, specs?, category_ids? }
  return request(`/admin/products/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deleteProduct(id) {
  await request(`/admin/products/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  return true;
}

export async function createVariant(productId, payload) {
  return request(`/admin/products/${productId}/variants`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function createVariantUpload(productId, fields, files) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => v != null && fd.append(k, String(v)));
  for (const f of files) fd.append('images', f, f.name);
  return request(`/admin/products/${productId}/variants`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: fd
  });
}

export async function updateVariant(id, payload) {
  return request(`/admin/variants/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deleteVariant(id) {
  await request(`/admin/variants/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  return true;
}