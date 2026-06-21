import { useState, useCallback } from 'react';

const STORAGE_KEY = 'description_templates';

function loadTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveTemplates(templates) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {}
}

export function useTemplates() {
  const [templates, setTemplates] = useState(() => loadTemplates());

  const addTemplate = useCallback((name, content) => {
    setTemplates(prev => {
      const newTemplate = {
        id: Date.now().toString(),
        name: name || `Şablon ${prev.length + 1}`,
        content: content || ''
      };
      const next = [...prev, newTemplate];
      saveTemplates(next);
      return next;
    });
  }, []);

  const removeTemplate = useCallback((id) => {
    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      saveTemplates(next);
      return next;
    });
  }, []);

  const renameTemplate = useCallback((id, name) => {
    setTemplates(prev => {
      const next = prev.map(t => t.id === id ? { ...t, name } : t);
      saveTemplates(next);
      return next;
    });
  }, []);

  const updateTemplate = useCallback((id, content) => {
    setTemplates(prev => {
      const next = prev.map(t => t.id === id ? { ...t, content } : t);
      saveTemplates(next);
      return next;
    });
  }, []);

  return { templates, addTemplate, removeTemplate, renameTemplate, updateTemplate };
}
