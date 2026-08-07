import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const STORAGE_KEY = 'description_templates';

function getLocalTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function useTemplates() {
  const [templates, setTemplates] = useState(() => getLocalTemplates());

  // Sync templates with backend settings on mount & migrate local templates
  useEffect(() => {
    api.getSettings()
      .then(data => {
        if (!data) return;
        const serverTemplates = Array.isArray(data.description_templates) ? data.description_templates : [];
        const localTemplates = getLocalTemplates();

        // Merge local & server templates by unique ID to recover any missing templates
        const mergedMap = new Map();
        [...serverTemplates, ...localTemplates].forEach(t => {
          if (t && t.id) mergedMap.set(t.id, t);
        });

        const merged = Array.from(mergedMap.values());
        setTemplates(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

        // Save merged list to backend disk settings.json
        if (merged.length > 0) {
          api.saveSettings({ description_templates: merged }).catch(() => {});
        }
      })
      .catch(err => console.error('Failed to load templates from backend:', err));
  }, []);

  const saveAndSync = useCallback((next) => {
    setTemplates(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    api.saveSettings({ description_templates: next }).catch(() => {});
  }, []);

  const addTemplate = useCallback((name, content) => {
    setTemplates(prev => {
      const newTemplate = {
        id: Date.now().toString(),
        name: name || `Şablon ${prev.length + 1}`,
        content: content || ''
      };
      const next = [...prev, newTemplate];
      saveAndSync(next);
      return next;
    });
  }, [saveAndSync]);

  const removeTemplate = useCallback((id) => {
    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      saveAndSync(next);
      return next;
    });
  }, [saveAndSync]);

  const renameTemplate = useCallback((id, name) => {
    setTemplates(prev => {
      const next = prev.map(t => t.id === id ? { ...t, name } : t);
      saveAndSync(next);
      return next;
    });
  }, [saveAndSync]);

  const updateTemplate = useCallback((id, content) => {
    setTemplates(prev => {
      const next = prev.map(t => t.id === id ? { ...t, content } : t);
      saveAndSync(next);
      return next;
    });
  }, [saveAndSync]);

  return { templates, addTemplate, removeTemplate, renameTemplate, updateTemplate };
}
