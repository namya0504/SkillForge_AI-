const rawApiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const formatApiBase = (url) => {
  let trimmed = url.replace(/\/+$/, '');
  if (!trimmed.endsWith('/api/v1')) {
    trimmed = `${trimmed}/api/v1`;
  }
  return trimmed;
};
const API_BASE = rawApiBase.startsWith('http') ? formatApiBase(rawApiBase) : rawApiBase;

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(success) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

async function request(endpoint, options = {}) {
  const { _isRetry, ...customOptions } = options;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // IMPORTANT: sends cookies
    ...customOptions,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (response.status === 401) {
    const isExcluded = endpoint === '/auth/login' || endpoint === '/auth/me' || endpoint === '/auth/refresh';
    if (!isExcluded && !_isRetry) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });
          if (refreshRes.ok) {
            isRefreshing = false;
            onRefreshed(true);
            return request(endpoint, { ...options, _isRetry: true });
          } else {
            isRefreshing = false;
            onRefreshed(false);
          }
        } catch (e) {
          isRefreshing = false;
          onRefreshed(false);
        }
      } else {
        // Wait for active refresh
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((success) => {
            if (success) {
              resolve(request(endpoint, { ...options, _isRetry: true }));
            } else {
              try {
                localStorage.removeItem('user');
              } catch (e) {}
              window.location.href = '/login';
              reject(new Error(data.error || data.message || 'Session expired. Redirecting to login.'));
            }
          });
        });
      }

      // If refresh failed
      try {
        localStorage.removeItem('user');
      } catch (e) {}
      window.location.href = '/login';
      throw new Error(data.error || data.message || 'Session expired. Redirecting to login.');
    } else if (!isExcluded && _isRetry) {
      try {
        localStorage.removeItem('user');
      } catch (e) {}
      window.location.href = '/login';
      throw new Error(data.error || data.message || 'Session expired. Redirecting to login.');
    }
  }

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
  refresh: () =>
    request('/auth/refresh', { method: 'POST' }),
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
  deleteAccount: (password) =>
    request('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
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
      if (res.status === 401) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });
          if (refreshRes.ok) {
            // Retry upload
            const retryRes = await fetch(`${API_BASE}/resume/upload`, {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });
            const retryText = await retryRes.text();
            const retryData = retryText ? JSON.parse(retryText) : {};
            if (!retryRes.ok) throw new Error(retryData.error || retryData.message || 'Upload failed');
            return retryData;
          }
        } catch (e) {}

        try {
          localStorage.removeItem('user');
        } catch (e) {}
        window.location.href = '/login';
        throw new Error(data.error || data.message || 'Session expired. Redirecting to login.');
      }
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

export const progressAPI = {
  getAll: () => request('/progress'),
  getSummary: () => request('/progress/summary'),
  update: (itemId, status) => request(`/progress/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
};

export const chatAPI = {
  createSession: (title) => request('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ title }),
  }),
  getSessions: () => request('/chat/sessions'),
  getSessionMessages: (sessionId) => request(`/chat/sessions/${sessionId}/messages`),
  deleteSession: (sessionId) => request(`/chat/sessions/${sessionId}`, { method: 'DELETE' }),
  streamMessage: async (sessionId, message, onChunk, onCitations, onMetadata, onDone, onError) => {
    try {
      const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Chat error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const trimmed = block.trim();
          if (!trimmed) continue;

          let eventType = 'chunk';
          let dataStr = '';

          const eventMatch = trimmed.match(/^event:\s*(\w+)/m);
          if (eventMatch) eventType = eventMatch[1];

          const dataMatch = trimmed.match(/^data:\s*(.+)$/ms);
          if (dataMatch) dataStr = dataMatch[1];

          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === 'chunk' && onChunk) onChunk(parsed.text);
            if (eventType === 'citations' && onCitations) onCitations(parsed.citations);
            if (eventType === 'metadata' && onMetadata) onMetadata(parsed);
            if (eventType === 'done' && onDone) onDone(parsed);
            if (eventType === 'error' && onError) onError(parsed.error);
          } catch (e) {
            // Buffer parsing
          }
        }
      }
    } catch (err) {
      if (onError) onError(err.message);
    }
  },
};

export const certificationAPI = {
  getProgress: () => request('/certifications/progress'),
  updateStatus: (certIdentifier, status) => request(`/certifications/progress/${encodeURIComponent(certIdentifier)}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
};


