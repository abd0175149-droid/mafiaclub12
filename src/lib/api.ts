const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export function hasToken(): boolean {
  return !!localStorage.getItem('token');
}

export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {})
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  // If token is expired (401) or too large (431), clear it and force re-login
  if (res.status === 401 || res.status === 431) {
    clearToken();
    window.location.reload();
    throw new Error('جلسة منتهية');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'خطأ غير معروف' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Convenience methods
export const apiGet = <T = any>(path: string) => api<T>(path);
export const apiPost = <T = any>(path: string, data: any) => api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const apiPut = <T = any>(path: string, data: any) => api<T>(path, { method: 'PUT', body: JSON.stringify(data) });
export const apiDelete = <T = any>(path: string) => api<T>(path, { method: 'DELETE' });
