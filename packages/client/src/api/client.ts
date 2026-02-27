const API_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
});

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
};

export const apiClient = {
  get: (endpoint: string) =>
    fetch(`${API_URL}${endpoint}`, { headers: getHeaders() }).then(handleResponse),

  post: (endpoint: string, data?: unknown) =>
    fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    }).then(handleResponse),

  patch: (endpoint: string, data?: unknown) =>
    fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    }).then(handleResponse),

  delete: (endpoint: string) =>
    fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    }).then(handleResponse),

  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return fetch(`${API_URL}/uploads/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      body: form,
    }).then(handleResponse);
  },
};

