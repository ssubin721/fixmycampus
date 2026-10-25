/**
 * FixMyCampus Core API & Client-Side Engine v2.0
 * Universal Mobile, Offline, & Network Resilience Architecture
 */

// Global Server & Network Configuration Manager
const ApiConfig = {
  // Default fallback local Wi-Fi IP for direct mobile testing over LAN/Wi-Fi
  DEFAULT_WIFI_URL: 'http://172.20.10.11:5000',

  getServerUrl() {
    const saved = localStorage.getItem('fmc_server_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }

    // If running inside Capacitor Native Android Container or file://
    const isNative = window.Capacitor !== undefined || window.location.protocol === 'file:' || window.location.hostname === 'localhost' && window.location.port === '';
    if (isNative) {
      return this.DEFAULT_WIFI_URL;
    }

    // If running in browser served by Express or deployed host
    if (window.location.protocol.startsWith('http')) {
      if (window.location.port === '5000' || window.location.port === '80' || window.location.port === '443' || window.location.port === '') {
        return ''; // Same-origin relative path
      }
    }

    return this.DEFAULT_WIFI_URL;
  },

  setServerUrl(url) {
    if (!url) {
      localStorage.removeItem('fmc_server_url');
    } else {
      let clean = url.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'http://' + clean;
      }
      localStorage.setItem('fmc_server_url', clean);
    }
  },

  async testConnection(url) {
    const targetUrl = (url !== undefined ? url : this.getServerUrl()).replace(/\/+$/, '');
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${targetUrl}/api/health`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timer);
      const latency = Date.now() - startTime;
      if (res.ok) {
        const data = await res.json();
        return { ok: true, latency, data };
      }
      return { ok: false, latency, error: `HTTP ${res.status}` };
    } catch (err) {
      const latency = Date.now() - startTime;
      return { ok: false, latency, error: err.name === 'AbortError' ? 'Connection timed out (6s)' : err.message };
    }
  },

  openSettingsModal() {
    let modal = document.getElementById('serverSettingsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'serverSettingsModal';
      modal.className = 'server-settings-modal';
      modal.innerHTML = `
        <div class="server-settings-card">
          <div class="server-settings-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:22px;">⚙️</span>
              <h3 style="font-family:'Outfit',sans-serif; margin:0; font-size:18px; color:var(--navy);">Network & Server Settings</h3>
            </div>
            <button class="modal-close-btn" onclick="ApiConfig.closeSettingsModal()">✕</button>
          </div>

          <p style="font-size:13px; color:var(--text-muted); margin:10px 0 16px; line-height:1.5;">
            Configure the backend server URL so this mobile app can connect across Wi-Fi, 4G, 5G, and local networks.
          </p>

          <div class="network-status-badge mb-12" id="modalNetworkStatusBadge">
            <span class="status-indicator-dot online"></span>
            <span id="modalNetworkTypeText">Detecting connection...</span>
          </div>

          <div class="form-group">
            <label style="font-size:13px; font-weight:700;">Backend Server API URL</label>
            <div class="input-wrap">
              <span class="icon">🌐</span>
              <input type="url" id="cfgServerUrlInput" placeholder="http://172.20.10.11:5000" style="font-size:13px;">
            </div>
          </div>

          <div style="font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">Quick Presets:</div>
          <div class="server-presets-grid mb-16">
            <button type="button" class="preset-btn" onclick="ApiConfig.applyPreset('wifi')">📱 Local Wi-Fi<br><span style="font-size:11px; opacity:0.8;">172.20.10.11:5000</span></button>
            <button type="button" class="preset-btn" onclick="ApiConfig.applyPreset('local')">💻 Localhost<br><span style="font-size:11px; opacity:0.8;">127.0.0.1:5000</span></button>
            <button type="button" class="preset-btn" onclick="ApiConfig.applyPreset('relative')">🔄 Same Host<br><span style="font-size:11px; opacity:0.8;">Auto / Relative</span></button>
          </div>

          <div id="pingResultBox" class="ping-result-box mb-16" style="display:none;"></div>

          <div style="display:flex; gap:10px;">
            <button type="button" class="btn btn-outline" id="testPingBtn" onclick="ApiConfig.runPingTest()" style="flex:1; padding:10px;">⚡ Test Ping</button>
            <button type="button" class="btn btn-primary" onclick="ApiConfig.saveAndApply()" style="flex:1; padding:10px;">💾 Save & Apply</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) ApiConfig.closeSettingsModal();
      });
    }

    const input = document.getElementById('cfgServerUrlInput');
    input.value = this.getServerUrl();
    this.updateModalNetworkBadge();
    modal.classList.add('active');
  },

  closeSettingsModal() {
    const modal = document.getElementById('serverSettingsModal');
    if (modal) modal.classList.remove('active');
  },

  applyPreset(type) {
    const input = document.getElementById('cfgServerUrlInput');
    if (type === 'wifi') input.value = this.DEFAULT_WIFI_URL;
    else if (type === 'local') input.value = 'http://127.0.0.1:5000';
    else if (type === 'relative') input.value = '';
    this.runPingTest();
  },

  async runPingTest() {
    const input = document.getElementById('cfgServerUrlInput');
    const resultBox = document.getElementById('pingResultBox');
    const btn = document.getElementById('testPingBtn');
    const url = input.value.trim();

    resultBox.style.display = 'block';
    resultBox.className = 'ping-result-box loading';
    resultBox.innerHTML = `<span>⏳ Pinging server at ${url || 'Current Origin'}...</span>`;
    btn.disabled = true;

    const res = await this.testConnection(url);
    btn.disabled = false;

    if (res.ok) {
      resultBox.className = 'ping-result-box success';
      resultBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span>🟢 <b>Connected!</b> Latency: ${res.latency}ms</span>
          <span class="badge" style="background:#10B981; color:#fff; font-size:11px;">v${res.data.version || '2.0'}</span>
        </div>
        <div style="font-size:11.5px; margin-top:4px; opacity:0.85;">DB Mode: ${res.data.dbMode ? res.data.dbMode.toUpperCase() : 'OK'} · Uptime: ${res.data.uptime}s</div>
      `;
    } else {
      resultBox.className = 'ping-result-box error';
      resultBox.innerHTML = `
        <div>🔴 <b>Cannot Connect</b> (${res.latency}ms)</div>
        <div style="font-size:11.5px; margin-top:4px; opacity:0.9;">${res.error}</div>
        <div style="font-size:11px; margin-top:4px; color:var(--text-muted);">Ensure the backend server is running and your phone is on the same Wi-Fi.</div>
      `;
    }
  },

  async saveAndApply() {
    const input = document.getElementById('cfgServerUrlInput');
    const url = input.value.trim();
    this.setServerUrl(url);
    Toast.success(`Server URL updated: ${this.getServerUrl() || 'Relative'}`);
    this.closeSettingsModal();
    // Test in background
    const ping = await this.testConnection();
    if (ping.ok) {
      Toast.success(`🟢 Server active (${ping.latency}ms)`);
    } else {
      Toast.warning(`⚠️ Cannot reach server. Please check Wi-Fi/IP.`);
    }
  },

  updateModalNetworkBadge() {
    const textEl = document.getElementById('modalNetworkTypeText');
    if (!textEl) return;
    const isOnline = navigator.onLine;
    let netType = 'Active';
    if (navigator.connection) {
      netType = navigator.connection.effectiveType ? navigator.connection.effectiveType.toUpperCase() : (navigator.connection.type || 'Wi-Fi/Cellular');
    }
    textEl.textContent = isOnline ? `Online (${netType} connection)` : 'Offline (No internet connection)';
  }
};

// Global Service Worker registration (for browser/PWA; skipped inside native Capacitor container)
if ('serviceWorker' in navigator && !window.Capacitor && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('Service worker registration note:', err.message);
    });
  });
}

/* ---------- Network Status & Offline Resilience Engine ---------- */
const NetworkManager = {
  isOnline: navigator.onLine,
  init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.removeOfflineBanner();
      const connInfo = this.getConnectionInfo();
      Toast.success(`🟢 Online: Connected to network (${connInfo})`);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showOfflineBanner();
      Toast.warning('📡 Connection lost. Operating in offline resilience mode.');
    });

    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        const info = this.getConnectionInfo();
        console.log('Mobile network condition update:', info);
      });
    }

    document.addEventListener('DOMContentLoaded', () => {
      if (!navigator.onLine) this.showOfflineBanner();
      this.injectNetworkPill();
    });
  },

  getConnectionInfo() {
    if (!navigator.connection) return 'Active';
    const type = navigator.connection.effectiveType || navigator.connection.type || '';
    return type ? type.toUpperCase() : 'Mobile / Wi-Fi';
  },

  showOfflineBanner() {
    let banner = document.getElementById('offlineBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'offlineBanner';
      banner.className = 'offline-alert-banner';
      banner.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <span>📡 <b>You are offline.</b> Retrying on reconnection...</span>
          <button onclick="ApiConfig.openSettingsModal()" style="background:rgba(255,255,255,0.2); border:none; color:#fff; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer;">⚙️ Settings</button>
        </div>
      `;
      document.body.prepend(banner);
    }
  },

  removeOfflineBanner() {
    const banner = document.getElementById('offlineBanner');
    if (banner) banner.remove();
  },

  injectNetworkPill() {
    const topbar = document.querySelector('.topbar');
    if (topbar && !document.getElementById('topbarSettingsBtn')) {
      const btn = document.createElement('button');
      btn.id = 'topbarSettingsBtn';
      btn.className = 'topbar-btn';
      btn.title = 'Server & Network Settings';
      btn.innerHTML = '⚙️';
      btn.onclick = () => ApiConfig.openSettingsModal();

      const spacer = topbar.querySelector('.spacer');
      if (spacer) topbar.insertBefore(btn, spacer);
      else topbar.appendChild(btn);
    }
  }
};
NetworkManager.init();

/* ---------- Client-Side Image Compression Engine ---------- */
// Downsamples heavy mobile camera photos (8MB-25MB) to optimal dimensions (~1280px) and quality
// Eliminates network timeouts, failures on slow 3G/4G, and server payload limits!
const ImageCompressor = {
  compress(file, { maxWidth = 1280, maxHeight = 1280, quality = 0.8 } = {}) {
    return new Promise((resolve) => {
      // If file is not an image or is very small (< 250KB), no need to compress
      if (!file.type.startsWith('image/') || file.size < 250 * 1024) {
        return resolve(file);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Output as JPEG with specified quality
          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                // If compression didn't save size, use original
                return resolve(file);
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              console.log(`📸 Image compressed: ${(file.size / 1024).toFixed(0)}KB ➔ ${(compressedFile.size / 1024).toFixed(0)}KB`);
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }
};

/* ---------- Draft Form Preservation Engine ---------- */
// Auto-saves student complaints into localStorage so network drops or accidental refreshes don't lose data!
const DraftManager = {
  KEY: 'fmc_complaint_draft',
  save(draft) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({ ...draft, timestamp: Date.now() }));
    } catch (e) { /* ignore */ }
  },
  load() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  clear() {
    try {
      localStorage.removeItem(this.KEY);
    } catch (e) { /* ignore */ }
  }
};

/* ---------- Session & Authentication System ---------- */
const Auth = {
  getToken() { return localStorage.getItem('fmc_token'); },
  getUser() {
    const raw = localStorage.getItem('fmc_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('fmc_token', token);
    localStorage.setItem('fmc_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('fmc_token');
    localStorage.removeItem('fmc_user');
  },
  isLoggedIn() { return !!this.getToken(); },
  isAdmin() {
    const u = this.getUser();
    return u && u.role === 'admin';
  },
  requireStudent() {
    if (!this.isLoggedIn() || this.isAdmin()) {
      window.location.href = 'login.html';
    }
  },
  requireAdmin() {
    if (!this.isLoggedIn() || !this.isAdmin()) {
      window.location.href = 'admin-login.html';
    }
  },
  logout(redirectTo = 'welcome.html') {
    this.clearSession();
    window.location.href = redirectTo;
  }
};

/* ---------- Resilient Fetch Wrapper with Auto-Retry & Timeout ---------- */
async function apiRequest(path, { method = 'GET', body = null, isFormData = false, retries = 2, timeoutMs = 15000 } = {}) {
  const base = ApiConfig.getServerUrl();
  const url = base + path;

  const headers = {};
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      let data;
      try { data = await res.json(); } catch (e) { data = {}; }

      if (!res.ok) {
        if (res.status === 401 || (res.status === 403 && data.message && data.message.toLowerCase().includes('token'))) {
          const wasAdmin = Auth.isAdmin();
          Auth.clearSession();
          const currentPath = window.location.pathname;
          if (!currentPath.endsWith('login.html') && !currentPath.endsWith('welcome.html') && !currentPath.endsWith('register.html') && !currentPath.endsWith('admin-login.html')) {
            Toast.error('Session expired. Please log in again.');
            setTimeout(() => {
              window.location.href = wasAdmin ? 'admin-login.html' : 'login.html';
            }, 600);
          }
        }
        const err = new Error(data.message || `Request failed with status ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // If the server responded with an HTTP status code, throw the server's error message directly
      if (err.status) {
        throw err;
      }

      // Check if timeout or connection drop
      if (attempt < retries) {
        const delay = (attempt + 1) * 700;
        console.warn(`⚠️ Network attempt ${attempt + 1} failed (${err.message}). Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // If all retries failed
  const isTimeout = lastError && lastError.name === 'AbortError';
  const customMessage = isTimeout
    ? `Request timed out (${(timeoutMs / 1000).toFixed(0)}s). Please check your internet connection.`
    : `Cannot connect to server at ${base || 'localhost'}. Check your network or server URL in Settings (⚙️).`;

  const finalErr = new Error(customMessage);
  finalErr.originalError = lastError;
  throw finalErr;
}

/* ---------- Master API Client ---------- */
const Api = {
  // Auth
  register: (payload) => apiRequest('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiRequest('/api/auth/login', { method: 'POST', body: payload }),
  adminLogin: (payload) => apiRequest('/api/auth/admin-login', { method: 'POST', body: payload }),
  getProfile: () => apiRequest('/api/auth/profile'),
  updateProfile: (payload) => apiRequest('/api/auth/profile', { method: 'PUT', body: payload }),

  // Complaints
  createComplaint: (formData) => apiRequest('/api/complaints', { method: 'POST', body: formData, isFormData: true }),
  getMyComplaints: () => apiRequest('/api/complaints/my'),
  getMyStats: () => apiRequest('/api/complaints/stats/summary'),
  getComplaint: (id) => apiRequest(`/api/complaints/${id}`),
  getCategories: () => apiRequest('/api/complaints/categories'),

  // Admin Dashboard & Complaints
  getAdminStats: () => apiRequest('/api/admin/stats'),
  getAllComplaints: (query = '') => apiRequest(`/api/admin/complaints${query}`),
  updateComplaint: (id, payload, isFormData = false) => apiRequest(`/api/admin/complaints/${id}`, { method: 'PUT', body: payload, isFormData }),

  // Admin User Management
  getUsers: (query = '') => apiRequest(`/api/admin/users${query}`),
  updateUserRole: (id, role) => apiRequest(`/api/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  deleteUser: (id) => apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' }),

  // Admin Category Management
  getAdminCategories: () => apiRequest('/api/admin/categories'),
  addCategory: (payload) => apiRequest('/api/admin/categories', { method: 'POST', body: payload }),
  deleteCategory: (id) => apiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => apiRequest('/api/notifications'),
  markNotificationsRead: () => apiRequest('/api/notifications/read', { method: 'PUT' }),
  markNotificationRead: (id) => apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' }),

  // System Health
  getHealth: () => apiRequest('/api/health')
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function statusClass(status) {
  return (status || 'Pending').replace(/\s+/g, '-');
}

/* ---------- Theme & View Mode Engine ---------- */
const ThemeManager = {
  getTheme() {
    return localStorage.getItem('fmc_theme') || 'light';
  },
  setTheme(theme) {
    localStorage.setItem('fmc_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.updateToggleIcon();
  },
  toggleTheme() {
    const current = this.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    Toast.info(`Switched to ${next === 'dark' ? 'Dark 🌙' : 'Light ☀️'} Theme`);
  },
  getViewMode() {
    return localStorage.getItem('fmc_viewmode') || 'mobile';
  },
  setViewMode(mode) {
    localStorage.setItem('fmc_viewmode', mode);
    const screen = document.querySelector('.phone-screen');
    if (screen) {
      if (mode === 'desktop') screen.classList.add('desktop-wide');
      else screen.classList.remove('desktop-wide');
    }
    this.updateViewModeIcon();
  },
  toggleViewMode() {
    const current = this.getViewMode();
    const next = current === 'desktop' ? 'mobile' : 'desktop';
    this.setViewMode(next);
    Toast.info(`Switched to ${next === 'desktop' ? 'Wide View 🖥️' : 'Standard View 📱'}`);
  },
  updateToggleIcon() {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerHTML = this.getTheme() === 'dark' ? '☀️' : '🌙';
  },
  updateViewModeIcon() {
    const btn = document.getElementById('viewModeToggleBtn');
    if (btn) btn.innerHTML = this.getViewMode() === 'desktop' ? '📱' : '🖥️';
  },
  init() {
    document.documentElement.setAttribute('data-theme', this.getTheme());
    document.addEventListener('DOMContentLoaded', () => {
      this.setViewMode(this.getViewMode());
      this.injectTopbarActions();
      this.updateToggleIcon();
      this.updateViewModeIcon();
    });
  },
  injectTopbarActions() {
    const topbar = document.querySelector('.topbar');
    if (topbar && !topbar.querySelector('.topbar-actions')) {
      const actions = document.createElement('div');
      actions.className = 'topbar-actions';
      actions.innerHTML = `
        <button id="serverCfgBtn" class="topbar-btn" onclick="ApiConfig.openSettingsModal()" title="Network & Server Settings">⚙️</button>
        <button id="viewModeToggleBtn" class="topbar-btn" onclick="ThemeManager.toggleViewMode()" title="Toggle View Mode">🖥️</button>
        <button id="themeToggleBtn" class="topbar-btn" onclick="ThemeManager.toggleTheme()" title="Toggle Dark/Light Mode">🌙</button>
      `;
      const logo = topbar.querySelector('.topbar-logo');
      if (logo) topbar.insertBefore(actions, logo);
      else topbar.appendChild(actions);
    }
  }
};
ThemeManager.init();

/* ---------- Toast Notification Engine ---------- */
const Toast = {
  getContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }
    return container;
  },
  show(message, type = 'info', duration = 3200) {
    const container = this.getContainer();
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    const icons = { success: '✅', error: '⚠️', warning: '🔔', info: 'ℹ️' };

    toast.innerHTML = `
      <span style="font-size:18px;">${icons[type] || '📌'}</span>
      <span style="flex:1; line-height:1.4;">${message}</span>
      <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.2s ease forwards';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  },
  success(msg, duration) { this.show(msg, 'success', duration); },
  error(msg, duration) { this.show(msg, 'error', duration); },
  warning(msg, duration) { this.show(msg, 'warning', duration); },
  info(msg, duration) { this.show(msg, 'info', duration); }
};

/* ---------- Skeleton Loader Renderer ---------- */
function renderSkeletons(count = 3) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton-shimmer skeleton-thumb"></div>
        <div class="skeleton-info">
          <div class="skeleton-shimmer skeleton-line long"></div>
          <div class="skeleton-shimmer skeleton-line medium"></div>
          <div class="skeleton-shimmer skeleton-line short"></div>
        </div>
      </div>
    `;
  }
  return html;
}

/* ---------- Interactive Lightbox Image Zoom System ---------- */
const ImageViewer = {
  currentScale: 1,
  modalEl: null,
  imgEl: null,

  init() {
    if (document.getElementById('imageZoomModal')) return;

    const modal = document.createElement('div');
    modal.id = 'imageZoomModal';
    modal.className = 'image-zoom-modal';
    modal.innerHTML = `
      <button class="zoom-close-btn" id="zoomCloseBtn" title="Close Zoom View">✕</button>
      <div class="zoom-viewport" id="zoomViewport">
        <img src="" alt="Enlarged View" class="zoom-img-target" id="zoomImgTarget">
      </div>
      <div class="zoom-controls-bar">
        <button class="zoom-btn" id="zoomInBtn">🔍 Zoom (+)</button>
        <button class="zoom-btn" id="zoomOutBtn">🔎 Zoom (-)</button>
        <button class="zoom-btn" id="zoomResetBtn">🔄 Reset</button>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
    this.imgEl = document.getElementById('zoomImgTarget');

    document.getElementById('zoomCloseBtn').addEventListener('click', () => this.close());
    document.getElementById('zoomInBtn').addEventListener('click', () => this.zoom(0.3));
    document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoom(-0.3));
    document.getElementById('zoomResetBtn').addEventListener('click', () => this.reset());

    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.id === 'zoomViewport') this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalEl.classList.contains('active')) this.close();
    });

    // Delegate listener for zoomable photos
    document.addEventListener('click', (e) => {
      const img = e.target.closest('img.preview, .complaint-thumb, .zoomable-img, .detail-photo, #currentResImg, #resPreviewImg, img[data-zoomable="true"]');
      if (img && img.src && !img.src.includes('logo.png') && !img.classList.contains('topbar-logo') && !img.classList.contains('brand-logo-img')) {
        this.open(img.src);
      }
    });
  },

  open(src) {
    this.init();
    this.imgEl.src = src;
    this.reset();
    this.modalEl.classList.add('active');
  },

  close() {
    if (this.modalEl) this.modalEl.classList.remove('active');
  },

  zoom(delta) {
    this.currentScale = Math.min(Math.max(0.5, this.currentScale + delta), 4);
    this.imgEl.style.transform = `scale(${this.currentScale})`;
  },

  reset() {
    this.currentScale = 1;
    if (this.imgEl) this.imgEl.style.transform = 'scale(1)';
  }
};

/* ---------- Notification Bell & Drawer Engine ---------- */
const NotificationSystem = {
  drawerEl: null,
  bellBtnEl: null,
  badgeEl: null,

  async init() {
    if (!Auth.isLoggedIn()) return;
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('topbarBellBtn')) return;

    const bellBtn = document.createElement('button');
    bellBtn.id = 'topbarBellBtn';
    bellBtn.className = 'topbar-bell-btn';
    bellBtn.title = 'Notifications';
    bellBtn.innerHTML = `🔔 <span class="bell-badge" id="bellBadge" style="display:none;">0</span>`;

    const spacer = topbar.querySelector('.spacer');
    if (spacer) topbar.insertBefore(bellBtn, spacer);
    else topbar.appendChild(bellBtn);

    const drawer = document.createElement('div');
    drawer.id = 'notificationDrawer';
    drawer.className = 'notification-drawer';
    drawer.innerHTML = `
      <div class="notification-drawer-header">
        <span>🔔 Recent Notifications</span>
      </div>
      <div class="notification-list" id="notificationList">
        <div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;">Loading notifications...</div>
      </div>
    `;
    document.body.appendChild(drawer);

    this.drawerEl = drawer;
    this.bellBtnEl = bellBtn;
    this.badgeEl = document.getElementById('bellBadge');

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDrawer();
    });

    document.addEventListener('click', (e) => {
      if (this.drawerEl && !this.drawerEl.contains(e.target) && e.target !== this.bellBtnEl) {
        this.drawerEl.style.display = 'none';
      }
    });

    this.fetchUnread();
    setInterval(() => this.fetchUnread(), 20000);
  },

  async fetchUnread() {
    try {
      const data = await Api.getNotifications();
      if (this.badgeEl) {
        if (data.unreadCount > 0) {
          this.badgeEl.textContent = data.unreadCount > 9 ? '9+' : data.unreadCount;
          this.badgeEl.style.display = 'flex';
        } else {
          this.badgeEl.style.display = 'none';
        }
      }
    } catch (err) { /* silent */ }
  },

  async toggleDrawer() {
    if (this.drawerEl.style.display === 'flex') {
      this.drawerEl.style.display = 'none';
    } else {
      this.drawerEl.style.display = 'flex';
      await this.renderList();
    }
  },

  async markItemRead(cardEl, id, complaintId) {
    try {
      if (cardEl && cardEl.classList.contains('unread')) {
        cardEl.classList.remove('unread');
        await Api.markNotificationRead(id);
        this.fetchUnread();
      }
      if (complaintId) {
        this.drawerEl.style.display = 'none';
        if (Auth.isAdmin()) {
          window.location.href = `complaint-management.html?id=${complaintId}`;
        } else {
          window.location.href = `complaint-details.html?id=${complaintId}`;
        }
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  },

  async renderList() {
    const listEl = document.getElementById('notificationList');
    try {
      const data = await Api.getNotifications();
      if (!data.notifications || data.notifications.length === 0) {
        listEl.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:13px;">No notifications yet 🔕</div>`;
        return;
      }
      let html = '';
      data.notifications.forEach(n => {
        html += `
          <div class="notification-item-card ${n.is_read ? '' : 'unread'}" style="cursor:pointer;" onclick="NotificationSystem.markItemRead(this, ${n.id}, ${n.complaint_id || 'null'})" title="Click to view & mark as read">
            <div style="font-size:18px;">${n.role === 'admin' ? '🚨' : '🔔'}</div>
            <div style="flex:1;">
              <div class="nt-title">${n.title}</div>
              <div class="nt-msg">${n.message}</div>
              <div class="nt-time">${formatDate(n.created_at)}</div>
            </div>
          </div>
        `;
      });
      listEl.innerHTML = html;
    } catch (err) {
      listEl.innerHTML = `<div style="padding:16px; color:var(--danger); font-size:13px;">${err.message || 'Failed to load alerts.'}</div>`;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ImageViewer.init();
  NotificationSystem.init();
});
