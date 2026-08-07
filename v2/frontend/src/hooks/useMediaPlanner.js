import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { useSorting } from './useSorting';
import { useClipboard } from './useClipboard';
import { useFileOperations } from './useFileOperations';
import { useKeybindings } from './useKeybindings';
import { useNavigation } from './useNavigation';
import { useAIAssistant } from './useAIAssistant';
import { useTemplates } from './useTemplates';
import { useFolderScanner } from './useFolderScanner';
import { useUploadQueue } from './useUploadQueue';
import { usePublishTask } from './usePublishTask';
import { useMediaPlayerState } from './useMediaPlayerState';
import { useFixedTextResolver } from './useFixedTextResolver';
import { useDragSelection } from './useDragSelection';
import { t } from '../utils/translations';

export function useMediaPlanner() {
  const [activePath, setActivePath] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'tr');
  const [completedFeedback, setCompletedFeedback] = useState(false);
  const [processToast, setProcessToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
  };

  const triggerCompletedFeedback = () => {
    setCompletedFeedback(true);
    setTimeout(() => setCompletedFeedback(false), 500);
  };

  const clipboardOpsRef = useRef(null);
  const videoRef = useRef(null);

  // Folder scanning sub-hook
  const {
    currentFolder, setCurrentFolder, parentFolder, setParentFolder,
    subfolders, setSubfolders, videos, setVideos, forwardStack, setForwardStack,
    scanFolder, goBack, goForward, canGoBack, canGoForward
  } = useFolderScanner(language, showToast, selectionMode, activePath, setActivePath, clipboardOpsRef);

  const scanFolderRef = useRef(scanFolder);
  useEffect(() => { scanFolderRef.current = scanFolder; });

  // Upload/Queue management sub-hook
  const {
    uploadQueue, setUploadQueue, uploadCurrentIndex, setUploadCurrentIndex,
    uploadStatus, setUploadStatus, uploadErrorMsg, uploadCompletedPaths,
    uploadFailedPaths, uploadCurrentStep, showBulkUploadModal, setShowBulkUploadModal,
    startPublishQueue, cancelPublishQueue,
    resumePublishQueue, skipAndResumePublishQueue
  } = useUploadQueue(videos, setVideos, showToast, triggerCompletedFeedback, setProcessToast);

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
  const [folderInput, setFolderInput] = useState('');
  const [noteText, setNoteText] = useState('');
  const [activeViewTab, setActiveViewTab] = useState('library');

  // Media Player State Sub-hook
  const mediaPlayer = useMediaPlayerState({ activePath, videoRef });

  // Drag Selection Sub-hook
  const dragSel = useDragSelection({ selectionMode, setSelectionMode, setActivePath, selectedPaths, setSelectedPaths });

  const getSortedSelectedVideos = useCallback(() => videos.filter(v => selectedPaths.has(v.path)), [videos, selectedPaths]);

  const getVisibleVideos = useCallback(() => {
    let visible = showUnsharedOnly === 'unshared'
      ? videos.filter(v => !v.shared && !v.hidden)
      : showUnsharedOnly === 'shared'
        ? videos.filter(v => v.shared && !v.hidden)
        : showUnsharedOnly === 'hidden'
          ? videos.filter(v => v.hidden)
          : videos.filter(v => !v.hidden);
    return sortVideos(visible);
  }, [videos, showUnsharedOnly, sortVideos]);

  // Fixed Text & Username Resolver Sub-hook
  const fixedTextOps = useFixedTextResolver({
    videos, setVideos, activePath, selectionMode, currentFolder, selectedPaths, getSortedSelectedVideos, showToast
  });

  const [showUploadModal, setShowUploadModal] = useState(false);

  // Single Publishing Task Sub-hook
  const publishTaskOps = usePublishTask({
    videos, setVideos, language, showToast, triggerCompletedFeedback, setProcessToast,
    setShowUploadModal, setActivePath, setFixedText: fixedTextOps.setFixedText
  });

  const [defaultPrompt, setDefaultPrompt] = useState(() => {
    return localStorage.getItem('ai_default_prompt') || 'Metni imla ve dilbilgisi açısından düzelt, daha akıcı hale getir.';
  });

  const aiAssistant = useAIAssistant();
  const templateOps = useTemplates();
  const [templateMode, setTemplateMode] = useState(false);
  const [duplicateSuggestion, setDuplicateSuggestion] = useState(null);

  useEffect(() => {
    const handleAISettingsChanged = () => {
      setDefaultPrompt(localStorage.getItem('ai_default_prompt') || 'Metni imla ve dilbilgisi açısından düzelt, daha akıcı hale getir.');
    };
    const handleShowToast = (e) => {
      if (e.detail) {
        showToast(e.detail.message, e.detail.type || 'success');
      }
    };
    const loadGlobalSettings = () => {
      const cachedFolder = localStorage.getItem('last_folder');
      if (cachedFolder && typeof cachedFolder === 'string' && cachedFolder.trim()) {
        scanFolderRef.current(cachedFolder.trim(), 'manual');
      }

      api.getSettings()
        .then(data => {
          if (!data) return;
          if (data.fixed_text !== undefined) {
            fixedTextOps.setGlobalFixedText(data.fixed_text);
            localStorage.setItem('fixed_text', data.fixed_text);
          }
          if (data.app_theme) {
            localStorage.setItem('app_theme', data.app_theme);
          }
          if (data.sidebar_panel_collapsed !== undefined) {
            setIsSidebarCollapsed(Boolean(data.sidebar_panel_collapsed));
            localStorage.setItem('sidebar_panel_collapsed', String(data.sidebar_panel_collapsed));
          }
          if (data.sidebar_width !== undefined && Number(data.sidebar_width) > 0) {
            localStorage.setItem('sidebar_width', String(data.sidebar_width));
          }
          if (data.detail_panel_collapsed !== undefined) {
            setIsDetailCollapsed(Boolean(data.detail_panel_collapsed));
            localStorage.setItem('detail_panel_collapsed', String(data.detail_panel_collapsed));
          }
          if (data.detail_panel_width !== undefined && Number(data.detail_panel_width) > 0) {
            localStorage.setItem('detail_panel_width', String(data.detail_panel_width));
          }
          if (data.last_folder && typeof data.last_folder === 'string' && data.last_folder.trim()) {
            const serverFolder = data.last_folder.trim();
            localStorage.setItem('last_folder', serverFolder);
            if (!cachedFolder || cachedFolder !== serverFolder) {
              scanFolderRef.current(serverFolder, 'manual');
            }
          }
        })
        .catch(err => console.error("Failed to load settings:", err));
    };

    loadGlobalSettings();
    window.addEventListener('ai-settings-changed', handleAISettingsChanged);
    window.addEventListener('show-toast', handleShowToast);
    window.addEventListener('settings-changed', loadGlobalSettings);
    return () => {
      window.removeEventListener('ai-settings-changed', handleAISettingsChanged);
      window.removeEventListener('show-toast', handleShowToast);
      window.removeEventListener('settings-changed', loadGlobalSettings);
    };
  }, [showToast, fixedTextOps]);

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
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, visible: false, targetPath: null, isFolder: false });
  const [hoveredFolder, setHoveredFolder] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState('folder');
  const [showSearchModal, setShowSearchModal] = useState(false);

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

  const exitSelectionMode = useCallback(() => {
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
  }, [videos]);

  const enterSelectionMode = useCallback((p) => {
    setSelectionMode(true);
    setActivePath(null);
    if (p) {
      setSelectedPaths(new Set([p]));
    }
  }, []);

  const toggleSelection = useCallback((p) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }, []);

  const navOps = useNavigation({
    language, videos, getVisibleVideos, activePath, setActivePath, selectionMode,
    setSelectedPaths, showToast, parentFolder, scanFolder, setSelectionMode, getSortedSelectedVideos
  });

  const toggleSharedState = useCallback(async (video, e) => {
    if (e) e.stopPropagation();
    if (selectionMode) { toggleSelection(video.path); return; }
    const nextState = !video.shared;

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
      if (lastSlash !== -1) videoFolder = video.path.substring(0, lastSlash);
    }

    const finalPublishTime = nextState ? new Date().toISOString() : '';
    const data = await api.updateMetadata(videoFolder, [{
      name: video.name,
      shared: nextState,
      publish_time: finalPublishTime
    }]);

    if (data.success) {
      setVideos(p => p.map(v => v.path === video.path ? {
        ...v,
        shared: nextState,
        publish_time: finalPublishTime,
        updated_at: Date.now()
      } : v));

      const performJump = () => {
        if (nextVideoPathToJump) {
          setActivePath(nextVideoPathToJump);
        } else if (activePath === video.path) {
          const oppositePool = getVisibleVideos().filter(v => v.shared !== video.shared);
          if (oppositePool.length > 0) {
            setActivePath(oppositePool[0].path);
          } else {
            setActivePath(null);
          }
        }
      };

      if (nextState) {
        triggerCompletedFeedback();
        showToast(t('shared_msg', language));
        setTimeout(performJump, 500);
      } else {
        showToast(t('unshared_msg', language));
        performJump();
      }
    }
  }, [activePath, currentFolder, getVisibleVideos, language, selectionMode, setVideos, showToast, toggleSelection, triggerCompletedFeedback]);

  const toggleHidden = useCallback(async (video, e) => {
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
      if (activePath === video.path && nextHidden) {
        const visible = getVisibleVideos().filter(v => v.path !== video.path);
        setActivePath(visible.length > 0 ? visible[0].path : null);
      }
      showToast(nextHidden ? 'Video gizlendi' : 'Video görünür yapıldı');
    }
  }, [activePath, currentFolder, getVisibleVideos, setVideos, showToast]);

  const clipboardOps = useClipboard({ language, contextMenu, selectionMode, selectedPaths, activePath, hoveredFolder, currentFolder, api, showToast, scanFolder });
  clipboardOpsRef.current = clipboardOps;

  const copyCurrentPaths = useCallback(() => {
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
  }, [activePath, language, selectedPaths, selectionMode, showToast]);

  const handleOpenLink = useCallback((e) => {
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
    let transformed = baseName;
    if (/\[[sqeacb]\]/.test(transformed)) {
      transformed = transformed
        .replace(/\[s\]/g, '/')
        .replace(/\[q\]/g, '?')
        .replace(/\[e\]/g, '=')
        .replace(/\[a\]/g, '&')
        .replace(/\[c\]/g, ':')
        .replace(/\[b\]/g, '\\');
    } else {
      if (/^https?_/i.test(transformed)) {
        transformed = transformed.replace(/^https?_/i, '');
      }
      transformed = transformed.replace(/_/g, '/');
    }
    let url = transformed;
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [activePath, videos]);

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
    toggleMute: mediaPlayer.toggleMute, toggleSharedState, openInExplorer: fileOps.openInExplorer,
    triggerClipboardAction: clipboardOps.triggerClipboardAction, pasteClipboard: clipboardOps.pasteClipboard,
    handleUndo: fileOps.handleUndo, applyBulkNotes: () => fileOps.applyBulkNotes(noteText), triggerDeleteAction: fileOps.triggerDeleteAction,
    navigateToParent: navOps.navigateToParent,
    jumpToNextShared: navOps.jumpToNextShared,
    copyCurrentPaths,
    copyCurrentNote: fixedTextOps.copyCurrentNote,
    handleOpenLink,
    toggleSidebar: () => setIsSidebarCollapsed(p => !p),
    toggleDetailPanel: () => setIsDetailCollapsed(p => !p),
    isDetailCollapsed,
    setIsDetailCollapsed,
    toggleTemplates: () => setTemplateMode(p => !p),
    templateMode,
    showNoteSearch, setShowNoteSearch,
    aiAssistant,
    selectAll: () => setSelectedPaths(new Set(getVisibleVideos().map(v => v.path))),
    showUploadModal, setShowUploadModal
  });

  useEffect(() => {
    const savedFolder = localStorage.getItem('last_folder');
    if (savedFolder) { setFolderInput(savedFolder); scanFolder(savedFolder); }
  }, []);

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('detail_panel_collapsed', isDetailCollapsed.toString());
    api.saveSettings({ detail_panel_collapsed: isDetailCollapsed }).catch(() => {});
  }, [isDetailCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar_panel_collapsed', isSidebarCollapsed.toString());
    api.saveSettings({ sidebar_panel_collapsed: isSidebarCollapsed }).catch(() => {});
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!templateMode) return;
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
  }, [activePath, templateMode, videos]);

  useEffect(() => {
    if (keybindingOps.preventAutoFocusRef.current) {
      keybindingOps.preventAutoFocusRef.current = false;
      return;
    }
    const hasSelection = selectionMode ? selectedPaths.size > 0 : !!activePath;
    if (hasSelection && noteInputRef.current && !showNoteSearch) {
      setTimeout(() => noteInputRef.current?.focus(), 50);
    }
  }, [activePath, selectedPaths.size, selectionMode, showNoteSearch, keybindingOps.preventAutoFocusRef]);

  useEffect(() => {
    if (selectionMode) {
      const sorted = getSortedSelectedVideos();
      setNoteText(sorted.length > 0 ? sorted.map((v, i) => `${i + 1}. ${v.description || ''}`).join('\n') : '');
    } else if (activePath) {
      const activeVideo = videos.find(v => v.path === activePath);
      setNoteText(activeVideo ? (activeVideo.description || '') : '');
    } else { setNoteText(''); }
  }, [activePath, getSortedSelectedVideos, selectedPaths, selectionMode, videos]);

  const lastActivePathRef = useRef(null);

  useEffect(() => {
    if (activePath) {
      lastActivePathRef.current = activePath;
    }
  }, [activePath]);

  useEffect(() => {
    if (activeViewTab === 'library') {
      if (!activePath && lastActivePathRef.current) {
        const exists = videos.some(v => v.path === lastActivePathRef.current);
        if (exists) {
          setActivePath(lastActivePathRef.current);
        } else if (videos.length > 0) {
          setActivePath(videos[0].path);
        }
      }
    }
  }, [activeViewTab, activePath, videos]);

  useEffect(() => {
    if (selectionMode) {
      fixedTextOps.setFixedText('');
    } else if (activePath) {
      const activeVideo = videos.find(v => v.path === activePath);
      const globalDefault = localStorage.getItem('fixed_text') || 'Daha fazla yamaç paraşütü videosu görmek için takip etmeyi unutmayın';
      fixedTextOps.setFixedText(activeVideo && activeVideo.fixed_text ? activeVideo.fixed_text : globalDefault);
    } else {
      fixedTextOps.setFixedText('');
    }
  }, [activePath, fixedTextOps, selectionMode, videos]);

  useEffect(() => {
    if (toast.visible) { const timer = setTimeout(() => setToast(p => ({ ...p, visible: false })), 2500); return () => clearTimeout(timer); }
  }, [toast.visible]);

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
  const handleItemClick = (p) => {
    if (selectionMode) {
      toggleSelection(p);
    } else {
      setActivePath(p);
      if (activePath === p && isDetailCollapsed) {
        setIsDetailCollapsed(false);
      }
    }
  };

  const handleInputFocus = (isFocused) => { isInputFocusedRef.current = isFocused; };

  return {
    currentFolder, parentFolder, subfolders, videos, selectedPaths, activePath, selectionMode,
    volume: mediaPlayer.volume, muted: mediaPlayer.muted, muteFeedback: mediaPlayer.muteFeedback,
    gridSize, setGridSize, showUnsharedOnly, setShowUnsharedOnly,
    sortOption, setSortOption, sortDirection, setSortDirection,
    isClosed, videoTime: mediaPlayer.videoTime, setVideoTime: mediaPlayer.setVideoTime,
    videoDuration: mediaPlayer.videoDuration, setVideoDuration: mediaPlayer.setVideoDuration,
    folderInput, setFolderInput, noteText, toast, contextMenu, setContextMenu, scanFolder, handleShutdown,
    navigateToParent: navOps.navigateToParent, exitSelectionMode, selectAll, clearSelection,
    copyCurrentNote: fixedTextOps.copyCurrentNote, handleInputFocus,
    handleCardMouseDown: dragSel.handleCardMouseDown,
    handleCardMouseEnter: dragSel.handleCardMouseEnter,
    handleItemClick,
    toggleMute: mediaPlayer.toggleMute,
    toggleSharedState,
    noteInputRef, aiInputRef, isInputFocusedRef, videoRef,
    handleVolumeChange: mediaPlayer.handleVolumeChange,
    handleSeek: mediaPlayer.handleSeek,
    getVisibleVideos, pickFolder, enterSelectionMode,
    showSettingsModal, setShowSettingsModal, settingsActiveTab, setSettingsActiveTab,
    showSearchModal, setShowSearchModal, hoveredFolder, setHoveredFolder,
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
    uploadingPath: publishTaskOps.uploadingPath,
    setUploadingPath: publishTaskOps.setUploadingPath,
    uploadQueue,
    setUploadQueue,
    uploadCurrentIndex,
    setUploadCurrentIndex,
    uploadStatus,
    setUploadStatus,
    uploadErrorMsg,
    uploadCompletedPaths,
    uploadFailedPaths,
    uploadCurrentStep,
    showBulkUploadModal,
    setShowBulkUploadModal,
    startPublishQueue,
    cancelPublishQueue,
    resumePublishQueue,
    skipAndResumePublishQueue,
    setVideos,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    handleNoteChange: (val) => fileOps.handleNoteChange(val, setNoteText),
    completedFeedback,
    triggerCompletedFeedback,
    fixedText: fixedTextOps.fixedText,
    handleFixedTextChange: fixedTextOps.handleFixedTextChange,
    extractUsername: fixedTextOps.extractUsername,
    resolveFixedText: fixedTextOps.resolveFixedText,
    aiAssistant,
    defaultPrompt,
    ...templateOps,
    templateMode,
    setTemplateMode,
    toggleTemplates: () => setTemplateMode(p => !p),
    duplicateSuggestion,
    setDuplicateSuggestion,
    toggleHidden,
    processToast,
    setProcessToast,
    activeViewTab,
    setActiveViewTab,
    customScheduleTime: publishTaskOps.customScheduleTime,
    setCustomScheduleTime: publishTaskOps.setCustomScheduleTime,
    openPublishModalWithTime: publishTaskOps.openPublishModalWithTime,
    activeUploads: publishTaskOps.activeUploads,
    setActiveUploads: publishTaskOps.setActiveUploads,
    startPublishTask: publishTaskOps.startPublishTask,
    isDetailView: publishTaskOps.isDetailView,
    setIsDetailView: publishTaskOps.setIsDetailView,
    openVideoDetailModal: publishTaskOps.openVideoDetailModal,
    openPublishModal: publishTaskOps.openPublishModal,
  };
}