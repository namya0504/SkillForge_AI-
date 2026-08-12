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

export const resumeAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    return fetch(`${API_BASE}/resume/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Upload failed');
      return data;
    });
  },
  getCurrent: () => request('/resume/current'),
};

export const jobAPI = {
  getStatus: (jobId) => request(`/jobs/${jobId}`),
};

export const skillAPI = {
  getSkills: () => request('/skills'),
  addSkill: (skillName, proficiency) => request('/skills', {
    method: 'POST',
    body: JSON.stringify({ skillName, proficiency }),
  }),
  updateSkill: (id, proficiency) => request(`/skills/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ proficiency }),
  }),
  deleteSkill: (id) => request(`/skills/${id}`, { method: 'DELETE' }),
};
