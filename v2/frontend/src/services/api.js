const API_URL = 'http://127.0.0.1:' + (import.meta.env.VITE_BACKEND_PORT || '8085');

export const api = {
  scan: (folderPath) => 
    fetch(`${API_URL}/api/scan?folder=${encodeURIComponent(folderPath)}`).then(res => res.json()),
    
  pickFolder: () =>
    fetch(`${API_URL}/api/pick-folder`).then(res => res.json()),

    
  updateMetadata: (folder, updates) => 
    fetch(`${API_URL}/api/metadata/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder, updates })
    }).then(res => res.json()),
    
  setClipboard: (operation, paths) => 
    fetch(`${API_URL}/api/clipboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, paths })
    }).then(res => res.json()),
    
  paste: (folder) => 
    fetch(`${API_URL}/api/paste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder })
    }).then(res => res.json()),
    
  delete: (paths) => 
    fetch(`${API_URL}/api/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths })
    }).then(res => res.json()),
    
  openExplorer: (paths) => 
    fetch(`${API_URL}/api/open-explorer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths })
    }).then(res => res.json()),
    
  undo: () => 
    fetch(`${API_URL}/api/undo`, { method: 'POST' }).then(res => res.json()),
    
  shutdown: () => 
    fetch(`${API_URL}/api/shutdown`, { method: 'POST' }),

  rewriteText: (text, defaultPrompt, customPrompt) =>
    fetch(`${API_URL}/api/ai/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, default_prompt: defaultPrompt, custom_prompt: customPrompt })
    }).then(res => res.json()),

  getSettings: () =>
    fetch(`${API_URL}/api/settings`).then(res => res.json()),

  saveSettings: (settings) =>
    fetch(`${API_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    }).then(res => res.json()),

  testBuffer: (buffer_api_key) =>
    fetch(`${API_URL}/api/settings/test-buffer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buffer_api_key })
    }).then(res => res.json()),

  testCloudinary: (cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret) =>
    fetch(`${API_URL}/api/settings/test-cloudinary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret })
    }).then(res => res.json()),

  uploadPublish: (video_path, text, schedule_time) =>
    fetch(`${API_URL}/api/settings/upload-publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_path, text, schedule_time })
    }).then(res => {
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.detail || 'Paylaşım işlemi başarısız oldu.');
        });
      }
      return res.json();
    }),

  uploadCloudinary: (video_path) =>
    fetch(`${API_URL}/api/settings/upload-cloudinary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_path })
    }).then(res => {
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.detail || 'Cloudinary yükleme hatası.');
        });
      }
      return res.json();
    }),

  publishBuffer: (text, video_url, schedule_time) =>
    fetch(`${API_URL}/api/settings/publish-buffer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, video_url, schedule_time })
    }).then(res => {
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.detail || 'Buffer paylaşım hatası.');
        });
      }
      return res.json();
    }),

  checkSharedToday: () =>
    fetch(`${API_URL}/api/notes/shared-today`).then(res => {
      if (!res.ok) {
        throw new Error('Paylaşım durumu kontrol edilemedi.');
      }
      return res.json();
    }),

  getUsernames: () =>
    fetch(`${API_URL}/api/usernames`).then(res => res.json()),

  getScheduledVideos: () =>
    fetch(`${API_URL}/api/scheduled-videos`).then(res => {
      if (!res.ok) {
        throw new Error('Yayın takvimi yüklenemedi.');
      }
      return res.json();
    })
};