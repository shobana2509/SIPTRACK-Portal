const API_BASE = 'http://localhost:5000/api';

export async function apiGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPostWithFile<T>(endpoint: string, data: Record<string, unknown>, file?: File): Promise<T> {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  if (file) {
    formData.append('proofFile', file);
  }
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDelete(endpoint: string): Promise<void> {
  const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}
