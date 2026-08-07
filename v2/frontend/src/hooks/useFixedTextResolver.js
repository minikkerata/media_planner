import { useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

export function useFixedTextResolver({ videos, setVideos, activePath, selectionMode, currentFolder, selectedPaths, getSortedSelectedVideos, showToast }) {
  const [fixedText, setFixedText] = useState(() => {
    return localStorage.getItem('fixed_text') || 'Daha fazla yamaç paraşütü videosu görmek için takip etmeyi unutmayın';
  });
  const [globalFixedText, setGlobalFixedText] = useState(() => {
    return localStorage.getItem('fixed_text') || 'Daha fazla yamaç paraşütü videosu görmek için takip etmeyi unutmayın';
  });
  const fixedTextDebounceRef = useRef(null);

  const handleFixedTextChange = useCallback((val) => {
    setFixedText(val);
    if (selectionMode) return;
    if (!activePath) {
      localStorage.setItem('fixed_text', val);
      return;
    }
    const activeVideo = (videos || []).find(v => v.path === activePath);
    if (!activeVideo) return;

    setVideos(prev => prev.map(v => v.path === activePath ? { ...v, fixed_text: val } : v));

    if (fixedTextDebounceRef.current) {
      clearTimeout(fixedTextDebounceRef.current);
    }
    fixedTextDebounceRef.current = setTimeout(async () => {
      try {
        const data = await api.updateMetadata(currentFolder, [{ name: activeVideo.name, fixed_text: val }]);
        if (data.success && data.updated_notes && data.updated_notes[activeVideo.name]) {
          const newTime = data.updated_notes[activeVideo.name];
          setVideos(prev => prev.map(v => v.path === activePath ? { ...v, updated_at: newTime } : v));
        }
      } catch (err) {
        console.error('Failed to update fixed suffix', err);
      }
    }, 300);
  }, [activePath, currentFolder, selectionMode, setVideos, videos]);

  const extractUsername = useCallback((filename) => {
    if (!filename || !filename.includes('!')) return '';
    let baseName = filename;
    const lastDot = filename.lastIndexOf('.');
    if (lastDot !== -1) {
      baseName = filename.substring(0, lastDot);
    }
    const lastExclamation = baseName.lastIndexOf('!');
    if (lastExclamation !== -1) {
      let username = baseName.substring(lastExclamation + 1).trim();
      username = username.replace(/\s*\(\d+\)\s*$/, '').trim();
      return username;
    }
    return '';
  }, []);

  const resolveFixedText = useCallback((video, template) => {
    if (!template) return '';
    if (!video) return template;
    const username = extractUsername(video.name);
    const folder = currentFolder ? currentFolder.split(/[\\/]/).pop() : '';

    let resolved = template;
    const userReplacement = username ? `@${username}` : '@username';
    resolved = resolved.replace(/@(username|user_name)/g, userReplacement);
    resolved = resolved.replace(/@filename/g, video.name);
    resolved = resolved.replace(/@folder/g, folder);

    return resolved;
  }, [currentFolder, extractUsername]);

  const copyCurrentNote = useCallback(() => {
    if (selectionMode) {
      if (selectedPaths.size === 0) return;
      const text = getSortedSelectedVideos().map((v, i) => {
        const desc = resolveFixedText(v, v.description || '');
        return `${i + 1}. ${desc}`;
      }).join('\n\n');
      navigator.clipboard.writeText(text);
      if (showToast) showToast('Seçili notlar kopyalandı ✓');
    } else {
      if (!activePath) return;
      const activeVideo = (videos || []).find(v => v.path === activePath);
      const desc = activeVideo ? resolveFixedText(activeVideo, activeVideo.description || '') : '';
      const resolved = resolveFixedText(activeVideo, fixedText);
      const text = `${desc}${desc && resolved ? '\n\n' : ''}${resolved}`;
      navigator.clipboard.writeText(text);
      if (showToast) showToast('Açıklama kopyalandı ✓');
    }
  }, [activePath, fixedText, getSortedSelectedVideos, resolveFixedText, selectedPaths, selectionMode, showToast, videos]);

  return {
    fixedText,
    setFixedText,
    globalFixedText,
    setGlobalFixedText,
    handleFixedTextChange,
    extractUsername,
    resolveFixedText,
    copyCurrentNote
  };
}
