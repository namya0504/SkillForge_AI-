const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // IMPORTANT: sends cookies
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Something went wrong');
  }

  return data;
}

export const authAPI = {
  register: (email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    request('/auth/logout', { method: 'POST' }),
  getMe: () =>
    request('/auth/me'),
};

export const healthAPI = {
  check: () => request('/health'),
};
