import { useState, useEffect, useRef } from 'react';

const matchesBinding = (e, binding) => {
  if (!binding) return false;
  let eventKey = e.key.toLowerCase();
  let bindingKey = binding.key.toLowerCase();
  
  // Normalize Turkish i/ı/İ characters to ensure layout compatibility
  if (eventKey === 'ı' || eventKey === 'İ' || eventKey === 'i') eventKey = 'i';
  if (bindingKey === 'ı' || bindingKey === 'İ' || bindingKey === 'i') bindingKey = 'i';
  
  if (eventKey === ' ' && bindingKey === 'space') return true;
  if (eventKey === 'space' && bindingKey === ' ') return true;
  
  const keyMatch = eventKey === bindingKey;
  const altMatch = !!e.altKey === !!binding.altKey;
  const ctrlMatch = !!e.ctrlKey === !!binding.ctrlKey;
  const shiftMatch = !!e.shiftKey === !!binding.shiftKey;
  return keyMatch && altMatch && ctrlMatch && shiftMatch;
};

const defaultKeybindings = {
  seekBackward: { key: 'j', altKey: true, ctrlKey: false, shiftKey: false },
  playPause: { key: 'k', altKey: true, ctrlKey: false, shiftKey: false },
  seekForward: { key: 'l', altKey: true, ctrlKey: false, shiftKey: false },
  toggleMute: { key: 'm', altKey: true, ctrlKey: false, shiftKey: false },
  shutdown: { key: 'w', altKey: true, ctrlKey: false, shiftKey: false },
  markShared: { key: 'a', altKey: true, ctrlKey: false, shiftKey: false },
  openExplorer: { key: 'c', altKey: true, ctrlKey: false, shiftKey: false },
  prevVideo: { key: 's', altKey: true, ctrlKey: false, shiftKey: false },
  nextVideo: { key: 'd', altKey: true, ctrlKey: false, shiftKey: false },
  toggleSettings: { key: ',', altKey: true, ctrlKey: false, shiftKey: false },
  goUp: { key: 'z', altKey: true, ctrlKey: false, shiftKey: false },
  jumpToNextShared: { key: 'g', altKey: true, ctrlKey: false, shiftKey: false },
  copyPath: { key: 'e', altKey: true, ctrlKey: false, shiftKey: false },
  copyText: { key: 't', altKey: true, ctrlKey: false, shiftKey: false },
  openLink: { key: 'o', altKey: true, ctrlKey: false, shiftKey: false },
  toggleSidebar: { key: 'b', altKey: true, ctrlKey: false, shiftKey: false },
  openNoteFinder: { key: 'f', altKey: true, ctrlKey: false, shiftKey: false },
  toggleDetailPanel: { key: 'p', altKey: true, ctrlKey: false, shiftKey: false },
  triggerAI: { key: 'i', altKey: true, ctrlKey: false, shiftKey: false },
  triggerUpload: { key: 'u', altKey: true, ctrlKey: false, shiftKey: false },
  toggleTemplates: null, // default: no binding (user can assign)
};

export function useKeybindings({
  selectionMode, videos, activePath, selectedPaths, clipboardState,
  showAIModal, setShowAIModal, showDeleteModal, setShowDeleteModal,
  showSettingsModal, setShowSettingsModal,
  settingsActiveTab, setSettingsActiveTab,
  showSearchModal, setShowSearchModal,
  contextMenu, setContextMenu, isInputFocusedRef, videoRef,
  navigateVideo, exitSelectionMode, enterSelectionMode,
  cancelClipboard, handleShutdown, toggleMute, toggleSharedState, openInExplorer,
  triggerClipboardAction, pasteClipboard, handleUndo, applyBulkNotes, triggerDeleteAction,
  navigateToParent, jumpToNextShared, copyCurrentPaths, copyCurrentNote, handleOpenLink, toggleSidebar,
  showNoteSearch, setShowNoteSearch,
  toggleDetailPanel,
  toggleTemplates, templateMode,
  aiAssistant,
  selectAll
}) {
  const [keybindings, setKeybindings] = useState(() => {
    const saved = localStorage.getItem('keybindings');
    return saved ? { ...defaultKeybindings, ...JSON.parse(saved) } : defaultKeybindings;
  });

  const saveKeybindings = (newBindings) => {
    setKeybindings(newBindings);
    localStorage.setItem('keybindings', JSON.stringify(newBindings));
  };

  const resetKeybindings = () => {
    setKeybindings(defaultKeybindings);
    localStorage.removeItem('keybindings');
  };

  const preventAutoFocusRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        preventAutoFocusRef.current = true;
        if (templateMode) { toggleTemplates(); return; }
        if (showNoteSearch) setShowNoteSearch(false);
        else if (aiAssistant?.isPromptOpen) aiAssistant.closeAIPrompt();
        else if (aiAssistant?.isDiffMode) aiAssistant.discardAIChanges();
        else if (showAIModal) setShowAIModal(false);
        else if (showDeleteModal) setShowDeleteModal(false);
        else if (showSettingsModal) setShowSettingsModal(false);
        else if (showSearchModal) setShowSearchModal(false);
        else if (selectionMode) exitSelectionMode();
        else if (clipboardState.operation) cancelClipboard();
        return;
      }

      // Block default browser Ctrl+F and Alt+F (openNoteFinder) globally to trigger our note finder
      if ((e.ctrlKey && e.key.toLowerCase() === 'f') || matchesBinding(e, keybindings.openNoteFinder)) {
        e.preventDefault();
        e.stopPropagation();
        if (activePath) {
          setShowNoteSearch(true);
          window.dispatchEvent(new CustomEvent('focus-note-search'));
        }
        return;
      }

      if ((e.altKey && e.key === 'Tab') || (e.altKey && e.key.toLowerCase() === 'q')) {
        e.preventDefault();
        setShowSearchModal(true);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        navigateVideo(e.shiftKey ? -1 : 1);
        return;
      }

      const activeEl = document.activeElement;
      const isInputFocused = isInputFocusedRef.current || (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      ));
      const hasModifier = e.altKey || e.ctrlKey || e.metaKey;

      if (!isInputFocused || hasModifier) {
        if (matchesBinding(e, keybindings.shutdown)) { e.preventDefault(); handleShutdown(); return; }
        if (matchesBinding(e, keybindings.seekBackward)) { e.preventDefault(); if (videoRef.current) { videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5); } return; }
        if (matchesBinding(e, keybindings.playPause)) { e.preventDefault(); if (videoRef.current) { if (videoRef.current.paused) { videoRef.current.play().catch(err => console.error(err)); } else { videoRef.current.pause(); } } return; }
        if (matchesBinding(e, keybindings.seekForward)) { e.preventDefault(); if (videoRef.current) { videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 5); } return; }
        if (matchesBinding(e, keybindings.toggleMute)) { e.preventDefault(); toggleMute(); return; }
        if (matchesBinding(e, keybindings.markShared)) { e.preventDefault(); if (activePath) { const activeVideo = videos.find(v => v.path === activePath); if (activeVideo) { toggleSharedState(activeVideo, e); } } return; }
        if (matchesBinding(e, keybindings.openExplorer)) { e.preventDefault(); openInExplorer(); return; }
        if (matchesBinding(e, keybindings.triggerAI)) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('trigger-ai-assistant'));
          return;
        }
        if (matchesBinding(e, keybindings.triggerUpload)) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('trigger-upload-modal'));
          return;
        }
        if (matchesBinding(e, keybindings.prevVideo)) { 
          e.preventDefault(); 
          if (showSettingsModal) {
            const SETTINGS_TABS = ['folder', 'shortcuts', 'language', 'theme', 'backup', 'ai'];
            setSettingsActiveTab(prev => {
              const idx = SETTINGS_TABS.indexOf(prev);
              return SETTINGS_TABS[(idx - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length];
            });
          } else {
            navigateVideo(-1); 
          }
          return; 
        }
        if (matchesBinding(e, keybindings.nextVideo)) { 
          e.preventDefault(); 
          if (showSettingsModal) {
            const SETTINGS_TABS = ['folder', 'shortcuts', 'language', 'theme', 'backup', 'ai'];
            setSettingsActiveTab(prev => {
              const idx = SETTINGS_TABS.indexOf(prev);
              return SETTINGS_TABS[(idx + 1) % SETTINGS_TABS.length];
            });
          } else {
            navigateVideo(1); 
          }
          return; 
        }
        if (matchesBinding(e, keybindings.toggleSettings)) { e.preventDefault(); setShowSettingsModal(prev => !prev); return; }
        if (matchesBinding(e, keybindings.goUp)) { e.preventDefault(); navigateToParent(); return; }
        if (matchesBinding(e, keybindings.jumpToNextShared)) { e.preventDefault(); jumpToNextShared(); return; }
        if (matchesBinding(e, keybindings.copyPath)) { e.preventDefault(); copyCurrentPaths(); return; }
        if (matchesBinding(e, keybindings.copyText)) { e.preventDefault(); copyCurrentNote(); return; }
        if (matchesBinding(e, keybindings.openLink)) { e.preventDefault(); handleOpenLink(); return; }
        if (matchesBinding(e, keybindings.toggleSidebar)) { e.preventDefault(); toggleSidebar(); return; }
        if (matchesBinding(e, keybindings.toggleDetailPanel)) { e.preventDefault(); toggleDetailPanel(); return; }
        if (keybindings.toggleTemplates && matchesBinding(e, keybindings.toggleTemplates)) { e.preventDefault(); if (activePath) toggleTemplates(); return; }
      }

      if (isInputFocused) return;

      if (e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === 'c') { e.preventDefault(); triggerClipboardAction('copy'); }
        else if (key === 'x') { e.preventDefault(); triggerClipboardAction('cut'); }
        else if (key === 'v') { e.preventDefault(); pasteClipboard(); }
        else if (key === 'z') { e.preventDefault(); handleUndo(); }
        else if (key === 'a') {
          e.preventDefault();
          selectAll();
          if (!selectionMode) {
            enterSelectionMode();
          }
        }
        else if (e.key === 'Enter') { e.preventDefault(); if (selectionMode) { applyBulkNotes(); } }
        return;
      }

      const key = e.key;
      if (key === 's' || key === 'S') {
        e.preventDefault();
        if (selectionMode) { exitSelectionMode(); }
        else if (videos.length > 0) { const uns = videos.find(v => !v.shared); enterSelectionMode(uns ? uns.path : videos[0].path); }
      } else if (key === ' ') {
        e.preventDefault(); toggleMute();
      } else if (key === 'ArrowLeft') {
        e.preventDefault(); navigateVideo(-1);
      } else if (key === 'ArrowRight') {
        e.preventDefault(); navigateVideo(1);
      } else if (key === 'Delete') {
        e.preventDefault(); triggerDeleteAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionMode, videos, activePath, selectedPaths, clipboardState, showAIModal, showDeleteModal, showSettingsModal, settingsActiveTab, setSettingsActiveTab, showSearchModal, setShowSearchModal, contextMenu, keybindings, navigateVideo, exitSelectionMode, enterSelectionMode, cancelClipboard, handleShutdown, toggleMute, toggleSharedState, openInExplorer, triggerClipboardAction, pasteClipboard, handleUndo, applyBulkNotes, triggerDeleteAction, navigateToParent, jumpToNextShared, copyCurrentPaths, copyCurrentNote, handleOpenLink, toggleSidebar, toggleDetailPanel, showNoteSearch, setShowNoteSearch, aiAssistant, selectAll, toggleTemplates, templateMode]);

  return { keybindings, saveKeybindings, resetKeybindings, preventAutoFocusRef };
}
