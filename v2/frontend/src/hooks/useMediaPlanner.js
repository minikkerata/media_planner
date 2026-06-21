import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useSorting } from './useSorting';
import { useClipboard } from './useClipboard';
import { useFileOperations } from './useFileOperations';
import { useKeybindings } from './useKeybindings';
import { useNavigation } from './useNavigation';
import { useAIAssistant } from './useAIAssistant';
import { useTemplates } from './useTemplates';
import { t } from '../utils/translations';

export function useMediaPlanner() {
  const [currentFolder, setCurrentFolder] = useState(null);
  const [parentFolder, setParentFolder] = useState(null);
  const [subfolders, setSubfolders] = useState([]);
  const [videos, setVideos] = useState([]);
  const [forwardStack, setForwardStack] = useState([]);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [activePath, setActivePath] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('volume');
    return saved !== null ? parseFloat(saved) : 1.0;
  });
  const [muted, setMuted] = useState(() => {
    const saved = localStorage.getItem('muted');
    return saved !== null ? saved === 'true' : false;
  });
  const [muteFeedback, setMuteFeedback] = useState(null); 
  const isFirstMuteRender = useRef(true);
  const [gridSize, setGridSizeRaw] = useState(() => {
    const saved = localStorage.getItem('grid_size');
    return saved ? (saved === 'list' ? 'list' : parseInt(saved, 10)) : 220;
  });
  const setGridSize = (val) => {
    setGridSizeRaw(val);
    localStorage.setItem('grid_size', val);
  };
  const [showUnsharedOnly, setShowUnsharedOnlyRaw] = useState(() =>
    localStorage.getItem('filter_mode') || 'all'
  );
  const setShowUnsharedOnly = (val) => {
    setShowUnsharedOnlyRaw(val);
    localStorage.setItem('filter_mode', val);
  };
  
  const { sortOption, setSortOption, sortDirection, setSortDirection, sortVideos } = useSorting('date', 'desc');
  
  const [isClosed, setIsClosed] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [completedFeedback, setCompletedFeedback] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const [noteText, setNoteText] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [fixedText, setFixedText] = useState(() => {
    return localStorage.getItem('fixed_text') || 'Daha fazla yamaç paraşütü videosu görmek için takip etmeyi unutmayın';
  });
  const [defaultPrompt, setDefaultPrompt] = useState(() => {
    return localStorage.getItem('ai_default_prompt') || 'Metni imla ve dilbilgisi açısından düzelt, daha akıcı hale getir.';
  });

  const aiAssistant = useAIAssistant();
  const templateOps = useTemplates();
  const [templateMode, setTemplateMode] = useState(false);
  const [duplicateSuggestion, setDuplicateSuggestion] = useState(null); // { description, sourceFileName }

  useEffect(() => {
    const handleAISettingsChanged = () => {
      setDefaultPrompt(localStorage.getItem('ai_default_prompt') || 'Metni imla ve dilbilgisi açısından düzelt, daha akıcı hale getir.');
    };
    const handleShowToast = (e) => {
      if (e.detail) {
        showToast(e.detail.message, e.detail.type || 'success');
      }
    };
    window.addEventListener('ai-settings-changed', handleAISettingsChanged);
    window.addEventListener('show-toast', handleShowToast);
    return () => {
      window.removeEventListener('ai-settings-changed', handleAISettingsChanged);
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, []);

  const [isServerHealthy, setIsServerHealthy] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const backendRes = await fetch('http://127.0.0.1:8085/api/health', { mode: 'cors' });
        const backendOk = backendRes.ok;

        const frontendRes = await fetch(window.location.origin + '/index.html', { method: 'HEAD' });
        const frontendOk = frontendRes.ok;

        setIsServerHealthy(backendOk && frontendOk);
      } catch (err) {
        setIsServerHealthy(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, visible: false, targetPath: null, isFolder: false });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragAction, setDragAction] = useState('select'); 
  const [pendingDragPath, setPendingDragPath] = useState(null);
  const [hoveredFolder, setHoveredFolder] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState('folder');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'tr');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_panel_collapsed');
    return saved === 'true';
  });
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(() => {
    const saved = localStorage.getItem('detail_panel_collapsed');
    return saved === 'true';
  });

  const noteInputRef = useRef(null);
  const aiInputRef = useRef(null);
  const isInputFocusedRef = useRef(false);
  const videoRef = useRef(null);

  const showToast = (message, type = 'success') => { setToast({ message, type, visible: true }); };

  const getSortedSelectedVideos = () => videos.filter(v => selectedPaths.has(v.path));
  
  const scanFolder = async (path, actionType = 'manual') => {
    if (!path || typeof path !== 'string' || path.trim() === '') {
      showToast(t('empty_folder_path', language).replace('{val}', JSON.stringify(path)), 'error');
      return;
    }
    const oldFolder = currentFolder;
    try {
      const data = await api.scan(path);
      if (data.success) {
        setCurrentFolder(data.current_folder); setParentFolder(data.parent_folder);
        setSubfolders(data.subfolders); setVideos(data.videos); 
        clipboardOps.setClipboardState(data.clipboard);
        setFolderInput(data.current_folder); localStorage.setItem('last_folder', data.current_folder);
        if (!selectionMode && data.videos.length > 0) {
          const activeExist = data.videos.find(v => v.path === activePath);
          if (!activeExist) { const unshared = data.videos.find(v => !v.shared); setActivePath(unshared ? unshared.path : data.videos[0].path); }
        }
        
        if (actionType === 'back') {
          if (oldFolder) {
            setForwardStack(prev => {
              if (prev[prev.length - 1] === oldFolder) return prev;
              return [...prev, oldFolder];
            });
          }
        } else if (actionType === 'forward') {
          setForwardStack(prev => prev.slice(0, -1));
        } else {
          setForwardStack([]);
        }
      } else {
        showToast(data.detail || data.message || t('scan_failed', language), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('cannot_connect_backend', language), 'error');
    }
  };

  const goBack = () => {
    if (parentFolder) {
      scanFolder(parentFolder, 'back');
    }
  };

  const goForward = () => {
    if (forwardStack.length > 0) {
      const nextFolder = forwardStack[forwardStack.length - 1];
      scanFolder(nextFolder, 'forward');
    }
  };

  const getVisibleVideos = () => {
    let visible = showUnsharedOnly === 'unshared' 
      ? videos.filter(v => !v.shared && !v.hidden) 
      : showUnsharedOnly === 'shared' 
        ? videos.filter(v => v.shared && !v.hidden) 
        : showUnsharedOnly === 'hidden'
          ? videos.filter(v => v.hidden)
          : videos.filter(v => !v.hidden); // 'all' — gizliler hariç
    return sortVideos(visible);
  };

  const exitSelectionMode = () => { 
    setSelectionMode(false); 
    setSelectedPaths(new Set()); 
    if (videos.length > 0) { 
      const uns = videos.find(v => !v.shared); 
      setActivePath(uns ? uns.path : videos[0].path); 
    } 
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA' ||
      document.activeElement.isContentEditable
    )) {
      document.activeElement.blur();
    }
  };
  const enterSelectionMode = (p) => { 
    setSelectionMode(true); 
    setActivePath(null); 
    if (p) {
      setSelectedPaths(new Set([p])); 
    }
  };
  const toggleSelection = (p) => setSelectedPaths(prev => { const next = new Set(prev); if (next.has(p)) next.delete(p); else next.add(p); return next; });

  const navOps = useNavigation({
    language,
    videos,
    getVisibleVideos,
    activePath,
    setActivePath,
    selectionMode,
    setSelectedPaths,
    showToast,
    parentFolder,
    scanFolder,
    setSelectionMode,
    getSortedSelectedVideos
  });

  const toggleSharedState = async (video, e) => {
    if (e) e.stopPropagation();
    if (selectionMode) { toggleSelection(video.path); return; }
    const nextState = !video.shared;
    
    // Durumu değişen video şu an aktif videoyken,
    // state değişmeden hemen önce kendi havuzundaki (paylaşılanlar veya paylaşılmayanlar) bir sonraki videoyu bulup ona atlamalıyız.
    let nextVideoPathToJump = null;
    if (activePath === video.path) {
      const currentPool = getVisibleVideos().filter(v => v.shared === video.shared);
      const idx = currentPool.findIndex(v => v.path === video.path);
      if (idx !== -1 && currentPool.length > 1) {
        nextVideoPathToJump = currentPool[(idx + 1) % currentPool.length].path;
      }
    }

    let videoFolder = currentFolder;
    if (video.path) {
      const lastSlash = Math.max(video.path.lastIndexOf('\\'), video.path.lastIndexOf('/'));
      if (lastSlash !== -1) {
        videoFolder = video.path.substring(0, lastSlash);
      }
    }

    const data = await api.updateMetadata(videoFolder, [{ name: video.name, shared: nextState }]);
    if (data.success) {
      setVideos(p => p.map(v => v.path === video.path ? { ...v, shared: nextState } : v));
      
      const performJump = () => {
        if (nextVideoPathToJump) {
          setActivePath(nextVideoPathToJump);
        } else if (activePath === video.path) {
          // Kendi havuzunda başka video kalmadıysa diğer havuza (zıt duruma) geçmeyi dene
          const oppositePool = getVisibleVideos().filter(v => v.shared !== video.shared);
          if (oppositePool.length > 0) {
            setActivePath(oppositePool[0].path);
          } else {
            setActivePath(null);
          }
        }
      };

      if (nextState) {
        setCompletedFeedback(true);
        setTimeout(() => setCompletedFeedback(false), 500);
        showToast(t('shared_msg', language));
        setTimeout(performJump, 500); // 500ms delay to let checkmark animation play
      } else {
        showToast(t('unshared_msg', language));
        performJump();
      }
    }
  };

  const toggleHidden = async (video, e) => {
    if (e) e.stopPropagation();
    const nextHidden = !video.hidden;

    let videoFolder = currentFolder;
    if (video.path) {
      const lastSlash = Math.max(video.path.lastIndexOf('\\'), video.path.lastIndexOf('/'));
      if (lastSlash !== -1) videoFolder = video.path.substring(0, lastSlash);
    }

    const data = await api.updateMetadata(videoFolder, [{ name: video.name, hidden: nextHidden }]);
    if (data.success) {
      setVideos(p => p.map(v => v.path === video.path ? { ...v, hidden: nextHidden } : v));
      // Eğer gizlenen video aktifse, bir sonrakine geç
      if (activePath === video.path && nextHidden) {
        const visible = getVisibleVideos().filter(v => v.path !== video.path);
        setActivePath(visible.length > 0 ? visible[0].path : null);
      }
      showToast(nextHidden ? 'Video gizlendi' : 'Video görünür yapıldı');
    }
  };


  const clipboardOps = useClipboard({ language, contextMenu, selectionMode, selectedPaths, activePath, hoveredFolder, currentFolder, api, showToast, scanFolder });
  const fileOps = useFileOperations({ language, contextMenu, selectionMode, selectedPaths, activePath, currentFolder, api, showToast, scanFolder, setSelectedPaths, setActivePath, videos, setVideos, getSortedSelectedVideos, exitSelectionMode });
  const keybindingOps = useKeybindings({
    selectionMode, videos, activePath, selectedPaths, clipboardState: clipboardOps.clipboardState,
    showAIModal: fileOps.showAIModal, setShowAIModal: fileOps.setShowAIModal,
    showDeleteModal: fileOps.showDeleteModal, setShowDeleteModal: fileOps.setShowDeleteModal,
    showSettingsModal, setShowSettingsModal,
    settingsActiveTab, setSettingsActiveTab,
    showSearchModal, setShowSearchModal,
    contextMenu, setContextMenu, isInputFocusedRef, videoRef,
    navigateVideo: navOps.navigateVideo, exitSelectionMode, enterSelectionMode,
    cancelClipboard: clipboardOps.cancelClipboard, handleShutdown: async () => { setIsClosed(true); try { await api.shutdown(); } catch { } window.close(); },
    toggleMute: () => setMuted(p => !p), toggleSharedState, openInExplorer: fileOps.openInExplorer,
    triggerClipboardAction: clipboardOps.triggerClipboardAction, pasteClipboard: clipboardOps.pasteClipboard,
    handleUndo: fileOps.handleUndo, applyBulkNotes: () => fileOps.applyBulkNotes(noteText), triggerDeleteAction: fileOps.triggerDeleteAction,
    navigateToParent: navOps.navigateToParent,
    jumpToNextShared: navOps.jumpToNextShared,
    copyCurrentPaths: () => copyCurrentPaths(),
    copyCurrentNote: () => copyCurrentNote(),
    handleOpenLink: () => handleOpenLink(),
    toggleSidebar: () => setIsSidebarCollapsed(p => !p),
    toggleDetailPanel: () => setIsDetailCollapsed(p => !p),
    toggleTemplates: () => setTemplateMode(p => !p),
    templateMode,
    showNoteSearch, setShowNoteSearch,
    aiAssistant,
    selectAll: () => selectAll()
  });

  const copyCurrentPaths = () => {
    let paths = [];
    if (selectionMode && selectedPaths.size > 0) {
      paths = Array.from(selectedPaths);
    } else if (activePath) {
      paths = [activePath];
    }
    if (paths.length > 0) {
      navigator.clipboard.writeText(paths.join('\n'));
      showToast(paths.length > 1 ? `${paths.length} ${t('paths_copied', language)}` : `${paths[0]} ${t('copied_msg', language)}`, "success");
    }
  };
  const handleOpenLink = (e) => {
    if (e) e.stopPropagation();
    if (!activePath) return;
    const activeVideo = videos.find(v => v.path === activePath);
    if (!activeVideo) return;
    let baseName = activeVideo.name;
    if (activeVideo.extension && activeVideo.name.toLowerCase().endsWith(activeVideo.extension.toLowerCase())) {
      baseName = activeVideo.name.slice(0, -activeVideo.extension.length);
    }
    if (baseName.includes('!')) {
      baseName = baseName.split('!')[0];
    }
    if (/^https?_/i.test(baseName)) {
      baseName = baseName.replace(/^https?_/i, '');
    }
    const transformed = baseName.replace(/_/g, '/');
    const url = `https://${transformed}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const savedFolder = localStorage.getItem('last_folder');
    if (savedFolder) { setFolderInput(savedFolder); scanFolder(savedFolder); }
  }, []);

  useEffect(() => {
    localStorage.setItem('volume', volume.toString());
    localStorage.setItem('muted', muted.toString());
  }, [volume, muted]);

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('detail_panel_collapsed', isDetailCollapsed.toString());
  }, [isDetailCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar_panel_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (isFirstMuteRender.current) { isFirstMuteRender.current = false; return; }
    setMuteFeedback(muted ? 'muted' : 'unmuted');
    const timer = setTimeout(() => setMuteFeedback(null), 800);
    return () => clearTimeout(timer);
  }, [muted]);

  useEffect(() => {
    if (videoRef.current) { videoRef.current.volume = muted ? 0 : volume; videoRef.current.muted = muted; }
  }, [volume, muted, activePath]);

  useEffect(() => { setVideoTime(0); setVideoDuration(0); }, [activePath]);

  // Duplicate detection: only when template mode opens
  useEffect(() => {
    if (!templateMode) return; // only run when opening template mode
    if (!activePath || !videos || videos.length === 0) { setDuplicateSuggestion(null); return; }
    const activeVideo = videos.find(v => v.path === activePath);
    if (!activeVideo) { setDuplicateSuggestion(null); return; }

    const getDuplicateBase = (name) => {
      const withoutExt = name.replace(/\.[^.]+$/, '');
      return withoutExt.replace(/\s*\(\d+\)\s*$/, '').toLowerCase().trim();
    };

    const activeBase = getDuplicateBase(activeVideo.name);
    const duplicate = videos.find(v => {
      if (v.path === activePath) return false;
      if (!v.description) return false;
      return getDuplicateBase(v.name) === activeBase;
    });

    if (duplicate && duplicate.description !== (activeVideo.description || '')) {
      setDuplicateSuggestion({ description: duplicate.description, sourceFileName: duplicate.name });
    } else {
      setDuplicateSuggestion(null);
    }
  }, [templateMode]);

  useEffect(() => {
    if (keybindingOps.preventAutoFocusRef.current) {
      keybindingOps.preventAutoFocusRef.current = false;
      return;
    }
    const hasSelection = selectionMode ? selectedPaths.size > 0 : !!activePath;
    if (hasSelection && noteInputRef.current && !showNoteSearch) {
      setTimeout(() => noteInputRef.current?.focus(), 50);
    }
  }, [activePath, selectedPaths.size, selectionMode, showNoteSearch]);

  useEffect(() => {
    if (selectionMode) {
      const sorted = getSortedSelectedVideos();
      setNoteText(sorted.length > 0 ? sorted.map((v, i) => `${i + 1}. ${v.description || ''}`).join('\n') : '');
    } else if (activePath) {
      const activeVideo = videos.find(v => v.path === activePath);
      setNoteText(activeVideo ? (activeVideo.description || '') : '');
    } else { setNoteText(''); }
  }, [activePath, selectedPaths, selectionMode, videos]);

  useEffect(() => {
    if (toast.visible) { const timer = setTimeout(() => setToast(p => ({ ...p, visible: false })), 2500); return () => clearTimeout(timer); }
  }, [toast.visible]);

  useEffect(() => {
    const handleMouseUp = () => { setIsMouseDown(false); setPendingDragPath(null); };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  useEffect(() => {
    const handleWindowClick = () => setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const pickFolder = async () => {
    try {
      const data = await api.pickFolder();
      if (data.success && data.folder) { setFolderInput(data.folder); scanFolder(data.folder); }
    } catch (err) { console.error(err); showToast('Klasör seçici açılamadı', 'error'); }
  };

  const handleShutdown = async () => { setIsClosed(true); try { await api.shutdown(); } catch { } window.close(); };
  const selectAll = () => setSelectedPaths(new Set(getVisibleVideos().map(v => v.path)));
  const clearSelection = () => setSelectedPaths(new Set());
  const handleItemClick = (p) => selectionMode ? toggleSelection(p) : setActivePath(p);

  const handleCardMouseDown = (p, e) => {
    if (e.button !== 0) return; e.preventDefault(); setIsMouseDown(true); setPendingDragPath(p);
    if (selectionMode) {
      const act = selectedPaths.has(p) ? 'deselect' : 'select'; setDragAction(act);
      setSelectedPaths(prev => { const next = new Set(prev); if (act === 'select') next.add(p); else next.delete(p); return next; });
    }
  };

  const handleCardMouseEnter = (p) => {
    if (isMouseDown) {
      if (!selectionMode) { setSelectionMode(true); setActivePath(null); setDragAction('select'); setSelectedPaths(new Set([pendingDragPath, p])); }
      else { setSelectedPaths(prev => { const next = new Set(prev); if (dragAction === 'select') next.add(p); else next.delete(p); return next; }); }
    }
  };

  const handleFixedTextChange = (val) => {
    setFixedText(val);
    localStorage.setItem('fixed_text', val);
  };

  const extractUsername = (filename) => {
    if (!filename || !filename.includes('!')) return '';
    let baseName = filename;
    const lastDot = filename.lastIndexOf('.');
    if (lastDot !== -1) {
      baseName = filename.substring(0, lastDot);
    }
    const lastExclamation = baseName.lastIndexOf('!');
    if (lastExclamation !== -1) {
      let username = baseName.substring(lastExclamation + 1).trim();
      // Strip trailing (1), (2), etc. — e.g. "username (1)" → "username"
      username = username.replace(/\s*\(\d+\)\s*$/, '').trim();
      return username;
    }
    return '';
  };

  const resolveFixedText = (video, template) => {
    if (!template) return '';
    if (!video) return template;
    const username = extractUsername(video.name);
    const folder = currentFolder ? currentFolder.split(/[\\/]/).pop() : '';
    
    let resolved = template;
    
    // Resolve @username / @user_name
    const userReplacement = username ? `@${username}` : '@username';
    resolved = resolved.replace(/@(username|user_name)/g, userReplacement);
    
    // Resolve @filename
    resolved = resolved.replace(/@filename/g, video.name);
    
    // Resolve @folder
    resolved = resolved.replace(/@folder/g, folder);
    
    return resolved;
  };

  const copyCurrentNote = () => {
    if (selectionMode) {
      if (selectedPaths.size === 0) return;
      const text = getSortedSelectedVideos().map((v, i) => {
        const desc = resolveFixedText(v, v.description || '');
        const resolved = resolveFixedText(v, fixedText);
        return `${i + 1}. ${desc}${desc && resolved ? '\n' : ''}${resolved}`;
      }).join('\n\n');
      navigator.clipboard.writeText(text);
      showToast('Seçili notlar kopyalandı ✓');
    } else {
      if (!activePath) return;
      const activeVideo = videos.find(v => v.path === activePath);
      const desc = activeVideo ? resolveFixedText(activeVideo, activeVideo.description || '') : '';
      const resolved = resolveFixedText(activeVideo, fixedText);
      const text = `${desc}${desc && resolved ? '\n\n' : ''}${resolved}`;
      navigator.clipboard.writeText(text);
      showToast('Açıklama kopyalandı ✓');
    }
  };

  const handleInputFocus = (isFocused) => { isInputFocusedRef.current = isFocused; };
  const toggleMute = () => setMuted(prev => !prev);
  const handleSeek = (time) => { if (videoRef.current) { videoRef.current.currentTime = time; setVideoTime(time); } };
  const handleVolumeChange = (e) => { const val = parseFloat(e.target.value); setVolume(val); setMuted(val === 0); };

  return {
    currentFolder, parentFolder, subfolders, videos, selectedPaths, activePath, selectionMode,
    volume, muted, muteFeedback, gridSize, setGridSize, showUnsharedOnly, setShowUnsharedOnly,
    sortOption, setSortOption, sortDirection, setSortDirection,
    isClosed, videoTime, setVideoTime, videoDuration, setVideoDuration, folderInput, setFolderInput,
    noteText, toast, contextMenu, setContextMenu, scanFolder, handleShutdown,
    navigateToParent: navOps.navigateToParent, exitSelectionMode, selectAll, clearSelection, copyCurrentNote, handleInputFocus,
    handleCardMouseDown, handleCardMouseEnter, handleItemClick, toggleMute, toggleSharedState,
    noteInputRef, aiInputRef, isInputFocusedRef, videoRef, handleVolumeChange, handleSeek, getVisibleVideos, pickFolder, enterSelectionMode,
    showSettingsModal, setShowSettingsModal, settingsActiveTab, setSettingsActiveTab, showSearchModal, setShowSearchModal, hoveredFolder, setHoveredFolder,
    showNoteSearch, setShowNoteSearch, noteSearchQuery, setNoteSearchQuery, activeMatchIndex, setActiveMatchIndex,
    ...clipboardOps,
    ...fileOps,
    ...keybindingOps,
    copyCurrentPaths,
    handleOpenLink,
    isSidebarCollapsed,
    isDetailCollapsed,
    setIsSidebarCollapsed,
    setIsDetailCollapsed,
    showToast,
    language,
    setLanguage,
    isServerHealthy,
    showUploadModal,
    setShowUploadModal,
    setVideos,
    goBack,
    goForward,
    canGoBack: !!parentFolder,
    canGoForward: forwardStack.length > 0,
    handleNoteChange: (val) => fileOps.handleNoteChange(val, setNoteText),
    completedFeedback,
    fixedText,
    handleFixedTextChange,
    extractUsername,
    resolveFixedText,
    aiAssistant,
    defaultPrompt,
    // Template system
    ...templateOps,
    templateMode,
    setTemplateMode,
    toggleTemplates: () => setTemplateMode(p => !p),
    // Duplicate suggestion (shown inside template mode)
    duplicateSuggestion,
    setDuplicateSuggestion,
    toggleHidden,
  };
}