const API_URL = 'http://127.0.0.1:8085';

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
    }).then(res => res.json())
};