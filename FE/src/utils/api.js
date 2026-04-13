const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = {
  post: async (path, body) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan');
    return data;
  },
  get: async (path, token) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan');
    return data;
  },
};

export default api;
