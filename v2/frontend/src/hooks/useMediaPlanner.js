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
import { useAppLayout } from './useAppLayout';
import { useNoteSearch } from './useNoteSearch';
import { useSelectionMode } from './useSelectionMode';
import { useVideoMetadata } from './useVideoMetadata';
import { useContextMenuState } from './useContextMenuState';
import { useModalState } from './useModalState';
import { t } from '../utils/translations';

export function useMediaPlanner() {
  const [activePath, setActivePath] = useState(null);
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

  // App Layout (Sidebar/Detail collapse, grid size, view tab)
  const layoutOps = useAppLayout();

  // Modal Visibility State
  const modalOps = useModalState();

  // Context Menu State
  const contextMenuOps = useContextMenuState();

  // Folder Scanner Sub-hook
  const {
    currentFolder, setCurrentFolder, parentFolder, setParentFolder,
    subfolders, setSubfolders, videos, setVideos, forwardStack, setForwardStack,
    scanFolder, goBack, goForward, canGoBack, canGoForward
  } = useFolderScanner(language, showToast, false, activePath, setActivePath, clipboardOpsRef);

  // Selection Mode Sub-hook
  const selectionOps = useSelectionMode({ videos, setActivePath });

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

  const { sortOption, setSortOption, sortDirection, setSortDirection, sortVideos } = useSorting('date', 'desc');

  const [isClosed, setIsClosed] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const [noteText, setNoteText] = useState('');

  // Media Player State Sub-hook
  const mediaPlayer = useMediaPlayerState({ activePath, videoRef });

  const getSortedSelectedVideos = useCallback(() => videos.filter(v => selectionOps.selectedPaths.has(v.path)), [videos, selectionOps.selectedPaths]);

  const updateNoteText = useCallback(() => {
    if (selectionOps.selectionMode) {
      const sorted = getSortedSelectedVideos();
      setNoteText(sorted.length > 0 ? sorted.map((v, i) => `${i + 1}. ${v.description || ''}`).join('\n') : '');
    } else if (activePath) {
      const activeVideo = videos.find(v => v.path === activePath);
      setNoteText(activeVideo ? (activeVideo.description || '') : '');
    } else { setNoteText(''); }
  }, [activePath, getSortedSelectedVideos, selectionOps.selectedPaths, selectionOps.selectionMode, videos]);

  // Drag Selection Sub-hook
  const dragSel = useDragSelection({
    selectionMode: selectionOps.selectionMode,
    setSelectionMode: selectionOps.setSelectionMode,
    setActivePath,
    selectedPaths: selectionOps.selectedPaths,
    setSelectedPaths: selectionOps.setSelectedPaths,
    onDragEnd: updateNoteText
  });

  // Note Search Sub-hook
  const noteSearchOps = useNoteSearch();

  const getVisibleVideos = useCallback(() => {
    let visible = layoutOps.showUnsharedOnly === 'unshared'
      ? videos.filter(v => !v.shared && !v.hidden)
      : layoutOps.showUnsharedOnly === 'shared'
        ? videos.filter(v => v.shared && !v.hidden)
        : layoutOps.showUnsharedOnly === 'hidden'
          ? videos.filter(v => v.hidden)
          : videos.filter(v => !v.hidden);
    return sortVideos(visible);
  }, [videos, layoutOps.showUnsharedOnly, sortVideos]);

  // Video Metadata Actions (Starring & Hiding)
  const videoMetaOps = useVideoMetadata({
    activePath, setActivePath, currentFolder, language,
    selectionMode: selectionOps.selectionMode,
    toggleSelection: selectionOps.toggleSelection,
    getVisibleVideos, showToast, triggerCompletedFeedback, setVideos
  });

  // Fixed Text & Username Resolver Sub-hook
  const fixedTextOps = useFixedTextResolver({
    videos, setVideos, activePath,
    selectionMode: selectionOps.selectionMode,
    currentFolder,
    selectedPaths: selectionOps.selectedPaths,
    getSortedSelectedVideos, showToast
  });

  const fixedTextOpsRef = useRef(fixedTextOps);
  useEffect(() => { fixedTextOpsRef.current = fixedTextOps; });

  // Single Publishing Task Sub-hook
  const publishTaskOps = usePublishTask({
    videos, setVideos, language, showToast, triggerCompletedFeedback, setProcessToast,
    setShowUploadModal: modalOps.setShowUploadModal, setActivePath, setFixedText: fixedTextOps.setFixedText
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
            fixedTextOpsRef.current.setGlobalFixedText(data.fixed_text);
            localStorage.setItem('fixed_text', data.fixed_text);
          }
          if (data.app_theme) {
            localStorage.setItem('app_theme', data.app_theme);
          }
          if (data.sidebar_panel_collapsed !== undefined) {
            layoutOps.setIsSidebarCollapsed(Boolean(data.sidebar_panel_collapsed));
            localStorage.setItem('sidebar_panel_collapsed', String(data.sidebar_panel_collapsed));
          }
          if (data.sidebar_width !== undefined && Number(data.sidebar_width) > 0) {
            localStorage.setItem('sidebar_width', String(data.sidebar_width));
          }
          if (data.detail_panel_collapsed !== undefined) {
            layoutOps.setIsDetailCollapsed(Boolean(data.detail_panel_collapsed));
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
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const noteInputRef = useRef(null);
  const aiInputRef = useRef(null);
  const isInputFocusedRef = useRef(false);

  const navOps = useNavigation({
    language, videos, getVisibleVideos, activePath, setActivePath,
    selectionMode: selectionOps.selectionMode,
    setSelectedPaths: selectionOps.setSelectedPaths,
    showToast, parentFolder, scanFolder,
    setSelectionMode: selectionOps.setSelectionMode,
    getSortedSelectedVideos
  });

  const clipboardOps = useClipboard({
    language,
    contextMenu: contextMenuOps.contextMenu,
    selectionMode: selectionOps.selectionMode,
    selectedPaths: selectionOps.selectedPaths,
    activePath,
    hoveredFolder: contextMenuOps.hoveredFolder,
    currentFolder, api, showToast, scanFolder
  });
  clipboardOpsRef.current = clipboardOps;

  const copyCurrentPaths = useCallback(() => {
    let paths = [];
    if (selectionOps.selectionMode && selectionOps.selectedPaths.size > 0) {
      paths = Array.from(selectionOps.selectedPaths);
    } else if (activePath) {
      paths = [activePath];
    }
    if (paths.length > 0) {
      navigator.clipboard.writeText(paths.join('\n'));
      showToast(paths.length > 1 ? `${paths.length} ${t('paths_copied', language)}` : `${paths[0]} ${t('copied_msg', language)}`, "success");
    }
  }, [activePath, language, selectionOps.selectedPaths, selectionOps.selectionMode, showToast]);

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

  const fileOps = useFileOperations({
    language,
    contextMenu: contextMenuOps.contextMenu,
    selectionMode: selectionOps.selectionMode,
    selectedPaths: selectionOps.selectedPaths,
    activePath, currentFolder, api, showToast, scanFolder,
    setSelectedPaths: selectionOps.setSelectedPaths,
    setActivePath, videos, setVideos, getSortedSelectedVideos,
    exitSelectionMode: selectionOps.exitSelectionMode
  });

  const keybindingOps = useKeybindings({
    selectionMode: selectionOps.selectionMode,
    videos, activePath,
    selectedPaths: selectionOps.selectedPaths,
    clipboardState: clipboardOps.clipboardState,
    showAIModal: fileOps.showAIModal, setShowAIModal: fileOps.setShowAIModal,
    showDeleteModal: fileOps.showDeleteModal, setShowDeleteModal: fileOps.setShowDeleteModal,
    showSettingsModal: modalOps.showSettingsModal, setShowSettingsModal: modalOps.setShowSettingsModal,
    settingsActiveTab: modalOps.settingsActiveTab, setSettingsActiveTab: modalOps.setSettingsActiveTab,
    showSearchModal: modalOps.showSearchModal, setShowSearchModal: modalOps.setShowSearchModal,
    contextMenu: contextMenuOps.contextMenu, setContextMenu: contextMenuOps.setContextMenu,
    isInputFocusedRef, videoRef,
    navigateVideo: navOps.navigateVideo,
    exitSelectionMode: selectionOps.exitSelectionMode,
    enterSelectionMode: selectionOps.enterSelectionMode,
    cancelClipboard: clipboardOps.cancelClipboard,
    handleShutdown: async () => { setIsClosed(true); try { await api.shutdown(); } catch { } window.close(); },
    toggleMute: mediaPlayer.toggleMute,
    toggleSharedState: videoMetaOps.toggleSharedState,
    openInExplorer: fileOps.openInExplorer,
    triggerClipboardAction: clipboardOps.triggerClipboardAction,
    pasteClipboard: clipboardOps.pasteClipboard,
    handleUndo: fileOps.handleUndo,
    applyBulkNotes: () => fileOps.applyBulkNotes(noteText),
    triggerDeleteAction: fileOps.triggerDeleteAction,
    navigateToParent: navOps.navigateToParent,
    jumpToNextShared: navOps.jumpToNextShared,
    copyCurrentPaths,
    copyCurrentNote: fixedTextOps.copyCurrentNote,
    handleOpenLink,
    toggleSidebar: layoutOps.toggleSidebar,
    toggleDetailPanel: layoutOps.toggleDetailPanel,
    isDetailCollapsed: layoutOps.isDetailCollapsed,
    setIsDetailCollapsed: layoutOps.setIsDetailCollapsed,
    toggleTemplates: () => setTemplateMode(p => !p),
    templateMode,
    showNoteSearch: noteSearchOps.showNoteSearch, setShowNoteSearch: noteSearchOps.setShowNoteSearch,
    aiAssistant,
    selectAll: () => selectionOps.selectAll(getVisibleVideos()),
    showUploadModal: modalOps.showUploadModal, setShowUploadModal: modalOps.setShowUploadModal
  });

  useEffect(() => {
    const savedFolder = localStorage.getItem('last_folder');
    if (savedFolder) { setFolderInput(savedFolder); scanFolder(savedFolder); }
  }, []);

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

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
    const hasSelection = selectionOps.selectionMode ? selectionOps.selectedPaths.size > 0 : !!activePath;
    if (hasSelection && noteInputRef.current && !noteSearchOps.showNoteSearch) {
      setTimeout(() => noteInputRef.current?.focus(), 50);
    }
  }, [activePath, selectionOps.selectedPaths.size, selectionOps.selectionMode, noteSearchOps.showNoteSearch, keybindingOps.preventAutoFocusRef]);

  useEffect(() => {
    if (dragSel.isMouseDown) return;
    updateNoteText();
  }, [dragSel.isMouseDown, updateNoteText]);

  const lastActivePathRef = useRef(null);

  useEffect(() => {
    if (activePath) {
      lastActivePathRef.current = activePath;
    }
  }, [activePath]);

  useEffect(() => {
    if (layoutOps.activeViewTab === 'library') {
      if (!activePath && lastActivePathRef.current) {
        const exists = videos.some(v => v.path === lastActivePathRef.current);
        if (exists) {
          setActivePath(lastActivePathRef.current);
        } else if (videos.length > 0) {
          setActivePath(videos[0].path);
        }
      }
    }
  }, [layoutOps.activeViewTab, activePath, videos]);

  useEffect(() => {
    if (selectionOps.selectionMode) {
      fixedTextOps.setFixedText('');
    } else if (activePath) {
      const activeVideo = videos.find(v => v.path === activePath);
      const globalDefault = localStorage.getItem('fixed_text') || 'Daha fazla yamaç paraşütü videosu görmek için takip etmeyi unutmayın';
      fixedTextOps.setFixedText(activeVideo && activeVideo.fixed_text ? activeVideo.fixed_text : globalDefault);
    } else {
      fixedTextOps.setFixedText('');
    }
  }, [activePath, fixedTextOps, selectionOps.selectionMode, videos]);

  useEffect(() => {
    if (toast.visible) { const timer = setTimeout(() => setToast(p => ({ ...p, visible: false })), 2500); return () => clearTimeout(timer); }
  }, [toast.visible]);

  const pickFolder = async () => {
    try {
      const data = await api.pickFolder();
      if (data.success && data.folder) { setFolderInput(data.folder); scanFolder(data.folder); }
    } catch (err) { console.error(err); showToast('Klasör seçici açılamadı', 'error'); }
  };

  const handleShutdown = async () => { setIsClosed(true); try { await api.shutdown(); } catch { } window.close(); };
  
  const handleItemClick = (p) => {
    if (selectionOps.selectionMode) {
      selectionOps.toggleSelection(p);
    } else {
      setActivePath(p);
      if (activePath === p && layoutOps.isDetailCollapsed) {
        layoutOps.setIsDetailCollapsed(false);
      }
    }
  };

  const handleInputFocus = (isFocused) => { isInputFocusedRef.current = isFocused; };

  return {
    currentFolder, parentFolder, subfolders, videos,
    selectedPaths: selectionOps.selectedPaths,
    activePath,
    selectionMode: selectionOps.selectionMode,
    volume: mediaPlayer.volume, muted: mediaPlayer.muted, muteFeedback: mediaPlayer.muteFeedback,
    gridSize: layoutOps.gridSize, setGridSize: layoutOps.setGridSize,
    showUnsharedOnly: layoutOps.showUnsharedOnly, setShowUnsharedOnly: layoutOps.setShowUnsharedOnly,
    sortOption, setSortOption, sortDirection, setSortDirection,
    isClosed, videoTime: mediaPlayer.videoTime, setVideoTime: mediaPlayer.setVideoTime,
    videoDuration: mediaPlayer.videoDuration, setVideoDuration: mediaPlayer.setVideoDuration,
    folderInput, setFolderInput, noteText, toast,
    contextMenu: contextMenuOps.contextMenu,
    setContextMenu: contextMenuOps.setContextMenu,
    scanFolder, handleShutdown,
    navigateToParent: navOps.navigateToParent,
    exitSelectionMode: selectionOps.exitSelectionMode,
    selectAll: () => selectionOps.selectAll(getVisibleVideos()),
    clearSelection: selectionOps.clearSelection,
    copyCurrentNote: fixedTextOps.copyCurrentNote, handleInputFocus,
    handleCardMouseDown: dragSel.handleCardMouseDown,
    handleCardMouseEnter: dragSel.handleCardMouseEnter,
    handleItemClick,
    toggleMute: mediaPlayer.toggleMute,
    toggleSharedState: videoMetaOps.toggleSharedState,
    noteInputRef, aiInputRef, isInputFocusedRef, videoRef,
    handleVolumeChange: mediaPlayer.handleVolumeChange,
    handleSeek: mediaPlayer.handleSeek,
    getVisibleVideos, pickFolder,
    enterSelectionMode: selectionOps.enterSelectionMode,
    showSettingsModal: modalOps.showSettingsModal,
    setShowSettingsModal: modalOps.setShowSettingsModal,
    settingsActiveTab: modalOps.settingsActiveTab,
    setSettingsActiveTab: modalOps.setSettingsActiveTab,
    showSearchModal: modalOps.showSearchModal,
    setShowSearchModal: modalOps.setShowSearchModal,
    hoveredFolder: contextMenuOps.hoveredFolder,
    setHoveredFolder: contextMenuOps.setHoveredFolder,
    showNoteSearch: noteSearchOps.showNoteSearch, setShowNoteSearch: noteSearchOps.setShowNoteSearch,
    noteSearchQuery: noteSearchOps.noteSearchQuery, setNoteSearchQuery: noteSearchOps.setNoteSearchQuery,
    activeMatchIndex: noteSearchOps.activeMatchIndex, setActiveMatchIndex: noteSearchOps.setActiveMatchIndex,
    ...clipboardOps,
    ...fileOps,
    ...keybindingOps,
    copyCurrentPaths,
    handleOpenLink,
    isSidebarCollapsed: layoutOps.isSidebarCollapsed,
    isDetailCollapsed: layoutOps.isDetailCollapsed,
    setIsSidebarCollapsed: layoutOps.setIsSidebarCollapsed,
    setIsDetailCollapsed: layoutOps.setIsDetailCollapsed,
    showToast,
    language,
    setLanguage,
    isServerHealthy,
    showUploadModal: modalOps.showUploadModal,
    setShowUploadModal: modalOps.setShowUploadModal,
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
    toggleHidden: videoMetaOps.toggleHidden,
    processToast,
    setProcessToast,
    activeViewTab: layoutOps.activeViewTab,
    setActiveViewTab: layoutOps.setActiveViewTab,
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