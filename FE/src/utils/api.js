const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getToken = () => localStorage.getItem('token');

const api = {
  post: async (path, body, customHeaders = {}) => {
    const token = getToken();
    const isFormData = body instanceof FormData;
    const headers = { ...customHeaders };
    
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    };
    
    // If headers['Content-Type'] was set to multipart/form-data by caller, delete it so fetch generates it with boundary
    if (isFormData && headers['Content-Type'] === 'multipart/form-data') {
      delete headers['Content-Type'];
    }

    const res = await fetch(`${API_BASE_URL}${path}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan');
    return data;
  },
  get: async (path) => {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan');
    return data;
  },
  put: async (path, body) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan');
    return data;
  },
  patch: async (path, body) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan');
    return data;
  },
};

export default api;
