import { useState, useRef } from 'react';
import { t } from '../utils/translations';

export function useFileOperations({ language, contextMenu, selectionMode, selectedPaths, activePath, currentFolder, api, showToast, scanFolder, setSelectedPaths, setActivePath, videos, setVideos, getSortedSelectedVideos, exitSelectionMode }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePaths, setDeletePaths] = useState(new Set());
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiText, setAiText] = useState('');
  
  const noteDebounceTimeout = useRef(null);

  const triggerDeleteAction = () => {
    let paths = contextMenu.visible && contextMenu.targetPath ? (selectionMode && selectedPaths.has(contextMenu.targetPath) ? selectedPaths : new Set([contextMenu.targetPath])) : (selectionMode ? selectedPaths : new Set([activePath].filter(Boolean)));
    if (paths.size === 0) return; setDeletePaths(paths); setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    setShowDeleteModal(false); showToast(t('deleting', language), 'info');
    const data = await api.delete(Array.from(deletePaths));
    if (data.success) {
      setSelectedPaths(prev => { const next = new Set(prev); deletePaths.forEach(p => next.delete(p)); return next; });
      if (deletePaths.has(activePath)) setActivePath(null); scanFolder(currentFolder); showToast(t('deleted_msg', language));
    }
  };

  const openInExplorer = async () => {
    let paths = selectionMode ? getSortedSelectedVideos().map(v => v.path) : [activePath].filter(Boolean); if (paths.length === 0) return;
    if (selectionMode) navigator.clipboard.writeText(getSortedSelectedVideos().map((v, i) => `${i + 1}. ${v.description || ''}`).join('\n'));
    else navigator.clipboard.writeText(videos.find(v => v.path === activePath)?.description || '');
    await api.openExplorer(paths); showToast(t('explorer_opened_msg', language));
  };

  const handleUndo = async () => {
    try {
      const data = await api.undo();
      if (data.success) {
        showToast(data.message, 'success');
        scanFolder(currentFolder);
      } else {
        showToast(data.detail || t('undo_failed_msg', language), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('undo_failed_msg', language), 'error');
    }
  };

  const handleNoteChange = (val, setNoteText) => {
    setNoteText(val);
    if (selectionMode) return;
    const activeVideo = videos.find(v => v.path === activePath);
    if (!activeVideo) return;
    
    setVideos(prev => prev.map(v => v.path === activePath ? { ...v, description: val } : v));
    
    if (noteDebounceTimeout.current) {
      clearTimeout(noteDebounceTimeout.current);
    }
    noteDebounceTimeout.current = setTimeout(async () => {
      try {
        const data = await api.updateMetadata(currentFolder, [{ name: activeVideo.name, description: val }]);
        if (data.success && data.updated_notes && data.updated_notes[activeVideo.name]) {
          const newTime = data.updated_notes[activeVideo.name];
          setVideos(prev => prev.map(v => v.path === activePath ? { ...v, updated_at: newTime } : v));
        }
      } catch (err) {
        console.error('Failed to update note description', err);
      }
    }, 300);
  };

  const applyBulkNotes = async (noteText) => {
    if (!selectionMode || selectedPaths.size === 0) return;
    const sorted = getSortedSelectedVideos(); const lines = noteText.split('\n'); const updates = [];
    const isNum = lines.some(l => /^\s*(\d+)[.)]\s*(.*)/.test(l));
    if (isNum) {
      let cur = -1;
      lines.forEach(l => {
        const m = l.match(/^\s*(\d+)[.)]\s*(.*)/);
        if (m) { const idx = parseInt(m[1]) - 1; if (idx >= 0 && idx < sorted.length) { cur = idx; updates.push({ name: sorted[idx].name, description: m[2].trim() }); } else cur = -1; }
        else if (cur !== -1) { const ex = updates.find(u => u.name === sorted[cur].name); if (ex) ex.description += "\n" + l.trim(); }
      });
      updates.forEach(u => u.description = u.description.trim());
    } else { sorted.forEach(v => updates.push({ name: v.name, description: noteText.trim() })); }
    if (updates.length === 0) return;
    const data = await api.updateMetadata(currentFolder, updates);
    if (data.success) { 
      setVideos(p => p.map(v => { 
        const upd = updates.find(u => u.name === v.name); 
        if (!upd) return v;
        const newTime = (data.updated_notes && data.updated_notes[v.name]) || Date.now();
        return { ...v, description: upd.description, updated_at: newTime }; 
      })); 
      showToast(t('bulk_notes_applied_msg', language)); 
    }
  };

  const handleAIDistribution = async () => {
    const lines = aiText.split('\n').map(l => l.trim()).filter(Boolean); const sorted = getSortedSelectedVideos(); if (lines.length === 0) return;
    const updates = []; const isNum = lines.some(l => /^\s*(\d+)[.)]\s*(.*)/.test(l));
    let descs = isNum ? lines.map(l => l.match(/^\s*(\d+)[.)]\s*(.*)/)).filter(Boolean).map(m => m[2].trim()) : lines;
    const count = Math.min(sorted.length, descs.length);
    for (let i = 0; i < count; i++) updates.push({ name: sorted[i].name, description: descs[i] });
    if (updates.length === 0) return;
    const data = await api.updateMetadata(currentFolder, updates);
    if (data.success) {
      setVideos(p => p.map(v => { 
        const upd = updates.find(u => u.name === v.name); 
        if (!upd) return v;
        const newTime = (data.updated_notes && data.updated_notes[v.name]) || Date.now();
        return { ...v, description: upd.description, updated_at: newTime }; 
      }));
      setShowAIModal(false); setAiText(''); exitSelectionMode(); showToast(t('ai_notes_distributed_msg', language));
    }
  };

  return {
    showDeleteModal, setShowDeleteModal, deletePaths, setDeletePaths,
    showAIModal, setShowAIModal, aiText, setAiText,
    triggerDeleteAction, executeDelete, openInExplorer, handleUndo, handleNoteChange, applyBulkNotes, handleAIDistribution
  };
}
