import { useState, useEffect, useRef } from 'react';
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
import { t } from '../utils/translations';

export function useMediaPlanner() {
  const [activePath, setActivePath] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'tr');
  const [completedFeedback, setCompletedFeedback] = useState(false);
  const [processToast, setProcessToast] = useState(null);

  const showToast = (message, type = 'success') => { setToast({ message, type, visible: true }); };

  const triggerCompletedFeedback = () => {
    setCompletedFeedback(true);
    setTimeout(() => setCompletedFeedback(false), 500);
  };

  // Ref to resolve circular dependency between clipboard and scanner
  const clipboardOpsRef = useRef(null);

  // Folder scanning sub-hook
  const {
    currentFolder, setCurrentFolder, parentFolder, setParentFolder,
    subfolders, setSubfolders, videos, setVideos, forwardStack, setForwardStack,
    scanFolder, goBack, goForward, canGoBack, canGoForward
  } = useFolderScanner(language, showToast, selectionMode, activePath, setActivePath, clipboardOpsRef);

  // Upload/Queue management sub-hook
  const {
    uploadQueue, setUploadQueue, uploadCurrentIndex, setUploadCurrentIndex,
    uploadStatus, setUploadStatus, uploadErrorMsg, uploadCompletedPaths,
    uploadFailedPaths, uploadCurrentStep, showBulkUploadModal, setShowBulkUploadModal,
    uploadingPath, setUploadingPath, startPublishQueue, cancelPublishQueue,
    resumePublishQueue, skipAndResumePublishQueue
  } = useUploadQueue(videos, setVideos, showToast, triggerCompletedFeedback, setProcessToast);

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
  const [folderInput, setFolderInput] = useState('');
  const [noteText, setNoteText] = useState('');
  const [activeViewTab, setActiveViewTab] = useState('library');
  const [customScheduleTime, setCustomScheduleTime] = useState(null);
  const [activeUploads, setActiveUploads] = useState({});

  const [isDetailView, setIsDetailView] = useState(false);

  const openPublishModalWithTime = (path, timeStr) => {
    setIsDetailView(false);
    setCustomScheduleTime(timeStr);
    setActivePath(path);
    // Explicitly compute and set fixedText so UploadModal always gets the right value
    // regardless of tab/render order (avoids race with the reactive fixedText useEffect)
    const targetVideo = videos.find(v => v.path === path);
    const globalDefault = localStorage.getItem('fixed_text') || '';
    setFixedText(targetVideo?.fixed_text || globalDefault);
    setShowUploadModal(true);
  };

  const openVideoDetailModal = (videoPath) => {
    setIsDetailView(true);
    setActivePath(videoPath);
    setShowUploadModal(true);
  };

  const openPublishModal = () => {
    setIsDetailView(false);
    setShowUploadModal(true);
  };

  const startPublishTask = (video, caption, formattedScheduleTime, isScheduled) => {
    const videoPath = video.path;
    
    // Close the upload modal immediately
    setShowUploadModal(false);
    
    // Initialize task state
    setActiveUploads(prev => ({
      ...prev,
      [videoPath]: {
        video,
        caption,
        publish_time: formattedScheduleTime || new Date().toISOString(),
        isScheduled,
        status: 'running',
        progress: 5,
        steps: [
          { id: 'file', label: language === 'tr' ? 'Dosya doğrulama' : 'File verification', status: 'running' },
          { id: 'cloudinary', label: language === 'tr' ? 'Cloudinary bulut sunucusuna yükleme' : 'Uploading to Cloudinary', status: 'idle' },
          { id: 'buffer', label: language === 'tr' ? 'Buffer sosyal medya entegrasyonu' : 'Buffer publishing', status: 'idle' },
          { id: 'db', label: language === 'tr' ? 'Yerel veritabanı (SQLite) güncellemesi' : 'Local database (SQLite) update', status: 'idle' }
        ],
        error: null
      }
    }));

    if (setProcessToast) {
      setProcessToast({
        type: 'publish',
        name: video.name,
        image: video.path,
        status: 'running',
        progress: 5,
        error: null
      });
    }

    const runTask = async () => {
      const updateTaskStep = (stepId, stepStatus) => {
        setActiveUploads(prev => {
          const task = prev[videoPath];
          if (!task) return prev;
          return {
            ...prev,
            [videoPath]: {
              ...task,
              steps: task.steps.map(s => s.id === stepId ? { ...s, status: stepStatus } : s)
            }
          };
        });
      };
      
      const updateTaskProgress = (progress) => {
        setActiveUploads(prev => {
          const task = prev[videoPath];
          if (!task) return prev;
          return {
            ...prev,
            [videoPath]: { ...task, progress }
          };
        });
      };

      try {
        // Step 1: File Verification
        await new Promise(resolve => setTimeout(resolve, 600));
        updateTaskStep('file', 'success');
        updateTaskStep('cloudinary', 'running');
        updateTaskProgress(25);
        if (setProcessToast) {
          setProcessToast(prev => prev ? { ...prev, progress: 25 } : null);
        }

        // Step 2: Upload to Cloudinary
        const uploadRes = await api.uploadCloudinary(videoPath);
        if (!uploadRes.success || !uploadRes.video_url) {
          updateTaskStep('cloudinary', 'error');
          throw new Error(language === 'tr' ? 'Cloudinary yüklemesi başarısız oldu.' : 'Cloudinary upload failed.');
        }
        const videoUrl = uploadRes.video_url;
        updateTaskStep('cloudinary', 'success');
        updateTaskStep('buffer', 'running');
        updateTaskProgress(60);
        if (setProcessToast) {
          setProcessToast(prev => prev ? { ...prev, progress: 60 } : null);
        }

        // Step 3: Publish to Buffer
        const bufferRes = await api.publishBuffer(caption, videoUrl, formattedScheduleTime);
        if (!bufferRes.success) {
          updateTaskStep('buffer', 'error');
          throw new Error(bufferRes.message || (language === 'tr' ? 'Buffer paylaşımı başarısız oldu.' : 'Buffer publishing failed.'));
        }
        updateTaskStep('buffer', 'success');
        updateTaskStep('db', 'running');
        updateTaskProgress(85);
        if (setProcessToast) {
          setProcessToast(prev => prev ? { ...prev, progress: 85 } : null);
        }

        // Step 4: Update SQLite Database
        let videoFolder = '';
        const lastSlash = Math.max(videoPath.lastIndexOf('\\'), videoPath.lastIndexOf('/'));
        if (lastSlash !== -1) {
          videoFolder = videoPath.substring(0, lastSlash);
        }
        const finalPublishTime = formattedScheduleTime || new Date().toISOString();
        await api.updateMetadata(videoFolder, [{ 
          name: video.name, 
          shared: true, 
          description: caption,
          publish_time: finalPublishTime
        }]);

        // Update local videos array
        setVideos(p => p.map(v => v.path === videoPath ? { 
          ...v, 
          shared: true, 
          description: caption, 
          publish_time: finalPublishTime,
          updated_at: Date.now() 
        } : v));
        
        updateTaskStep('db', 'success');
        updateTaskProgress(100);

        setActiveUploads(prev => {
          const task = prev[videoPath];
          if (!task) return prev;
          return {
            ...prev,
            [videoPath]: { ...task, status: 'success' }
          };
        });

        if (showToast) showToast(t('publish_success_msg', language), 'success');
        if (setProcessToast) {
          setProcessToast({
            type: 'publish',
            name: video.name,
            image: video.path,
            status: 'completed',
            progress: 100,
            error: null
          });
        }

        triggerCompletedFeedback();

        // Clear override schedule time
        setCustomScheduleTime(null);

        // Keep it in activeUploads for a few seconds to let them see success
        setTimeout(() => {
          setActiveUploads(prev => {
            const copy = { ...prev };
            delete copy[videoPath];
            return copy;
          });
        }, 5000);

      } catch (err) {
        console.error(err);
        setActiveUploads(prev => {
          const task = prev[videoPath];
          if (!task) return prev;
          return {
            ...prev,
            [videoPath]: { 
              ...task, 
              status: 'error', 
              error: err.message || 'Paylaşım başarısız.',
              steps: task.steps.map(s => s.status === 'running' ? { ...s, status: 'error' } : s)
            }
          };
        });
        if (showToast) showToast(err.message || 'Paylaşım başarısız.', 'error');
        if (setProcessToast) {
          setProcessToast({
            type: 'publish',
            name: video.name,
            image: video.path,
            status: 'failed',
            progress: 100,
            error: err.message || 'Paylaşım başarısız.',
            retryPayload: { video, caption, formattedScheduleTime, isScheduled }
          });
        }
      }
    };

    runTask();
  };

  const [fixedText, setFixedText] = useState(() => {
    return localStorage.getItem('fixed_text') || 'Daha fazla yamaç paraşütü videosu görmek için takip etmeyi unutmayın';
  });
  const [globalFixedText, setGlobalFixedText] = useState(() => {
    return localStorage.getItem('fixed_text') || 'Daha fazla yamaç paraşütü videosu görmek için takip etmeyi unutmayın';
  });
  const [defaultPrompt, setDefaultPrompt] = useState(() => {
    return localStorage.getItem('ai_default_prompt') || 'Metni imla ve dilbilgisi açısından düzelt, daha akıcı hale getir.';
  });

  const aiAssistant = useAIAssistant();
  const templateOps = useTemplates();
  const [templateMode, setTemplateMode] = useState(false);
  const [duplicateSuggestion, setDuplicateSuggestion] = useState(null); // { description, sourceFileName }
  const fixedTextDebounceRef = useRef(null);

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
      api.getSettings()
        .then(data => {
          if (data && data.fixed_text !== undefined) {
            setGlobalFixedText(data.fixed_text);
            localStorage.setItem('fixed_text', data.fixed_text);
          }
          // Auto-restore last opened folder on startup
          if (data && data.last_folder && typeof data.last_folder === 'string' && data.last_folder.trim()) {
            scanFolder(data.last_folder.trim(), 'manual');
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

  const getSortedSelectedVideos = () => videos.filter(v => selectedPaths.has(v.path));

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
      if (activePath === video.path && nextHidden) {
        const visible = getVisibleVideos().filter(v => v.path !== video.path);
        setActivePath(visible.length > 0 ? visible[0].path : null);
      }
      showToast(nextHidden ? 'Video gizlendi' : 'Video görünür yapıldı');
    }
  };

  const clipboardOps = useClipboard({ language, contextMenu, selectionMode, selectedPaths, activePath, hoveredFolder, currentFolder, api, showToast, scanFolder });
  clipboardOpsRef.current = clipboardOps;

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
    isDetailCollapsed,
    setIsDetailCollapsed,
    toggleTemplates: () => setTemplateMode(p => !p),
    templateMode,
    showNoteSearch, setShowNoteSearch,
    aiAssistant,
    selectAll: () => selectAll(),
    showUploadModal, setShowUploadModal
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
    if (activeViewTab === 'calendar') {
      setActivePath(null);
    }
  }, [activeViewTab]);

  useEffect(() => {
    if (selectionMode) {
      setFixedText('');
    } else if (activePath) {
      const activeVideo = videos.find(v => v.path === activePath);
      const globalDefault = localStorage.getItem('fixed_text') || 'Daha fazla yamaç paraşütü videosu görmek için takip etmeyi unutmayın';
      setFixedText(activeVideo && activeVideo.fixed_text ? activeVideo.fixed_text : globalDefault);
    } else {
      setFixedText('');
    }
  }, [activePath, selectionMode, videos]);

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
    if (selectionMode) return;
    if (!activePath) {
      localStorage.setItem('fixed_text', val);
      return;
    }
    const activeVideo = videos.find(v => v.path === activePath);
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
    const userReplacement = username ? `@${username}` : '@username';
    resolved = resolved.replace(/@(username|user_name)/g, userReplacement);
    resolved = resolved.replace(/@filename/g, video.name);
    resolved = resolved.replace(/@folder/g, folder);
    
    return resolved;
  };

  const copyCurrentNote = () => {
    if (selectionMode) {
      if (selectedPaths.size === 0) return;
      const text = getSortedSelectedVideos().map((v, i) => {
        const desc = resolveFixedText(v, v.description || '');
        return `${i + 1}. ${desc}`;
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
    uploadingPath,
    setUploadingPath,
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
    fixedText,
    handleFixedTextChange,
    extractUsername,
    resolveFixedText,
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
    customScheduleTime,
    setCustomScheduleTime,
    openPublishModalWithTime,
    activeUploads,
    setActiveUploads,
    startPublishTask,
    isDetailView,
    setIsDetailView,
    openVideoDetailModal,
    openPublishModal,
  };
}