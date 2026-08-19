const rawApiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const formatApiBase = (url) => {
  let trimmed = url.replace(/\/+$/, '');
  if (!trimmed.endsWith('/api/v1')) {
    trimmed = `${trimmed}/api/v1`;
  }
  return trimmed;
};
const API_BASE = rawApiBase.startsWith('http') ? formatApiBase(rawApiBase) : rawApiBase;

async function request(endpoint, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // IMPORTANT: sends cookies
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Something went wrong');
  }

  return data;
}

export const authAPI = {
  sendOTP: (email) =>
    request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verifyOTP: (otpToken, code) =>
    request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ otpToken, code }),
    }),
  register: (email, password, otpToken, otpCode) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, otpToken, otpCode }),
    }),
  login: (email, password, otpToken, otpCode) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, otpToken, otpCode }),
    }),
  logout: () =>
    request('/auth/logout', { method: 'POST' }),
  getMe: () =>
    request('/auth/me'),
  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token, newPassword) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
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
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
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

export const roleAPI = {
  getRoles: () => request('/roles'),
  getUserTargetRole: () => request('/roles/target'),
  saveTargetRole: (roleId, customRole) => request('/roles/target', {
    method: 'POST',
    body: JSON.stringify({ roleId, customRole }),
  }),
};

export const roadmapAPI = {
  getRoadmap: () => request('/roadmap'),
  generateRoadmap: () => request('/roadmap/generate', { method: 'POST' }),
};
