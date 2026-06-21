import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, FileVideo, Check } from 'lucide-react';
import { IconCheck } from '../Icons';
import Button from '../ui/Button';
import { t } from '../../utils/translations';

import SelectionList from './SelectionList';
import VideoPlayer from './VideoPlayer';
import NotesEditor from './NotesEditor';
import FixedSectionEditor from './FixedSectionEditor';
import AIAssistant from '../AIAssistant/AIAssistant';
import TemplateMode from '../TemplateMode';

export default function DetailPanel({
  selectionMode, selectedPaths, activePath, videos, currentFolder, openInExplorer,
  noteInputRef, noteText, handleNoteChange, handleInputFocus, copyCurrentNote, applyBulkNotes, exitSelectionMode,
  videoRef, muted, volume, videoTime, videoDuration, muteFeedback, handleSeek, toggleMute, toggleSharedState,
  API_URL, copyCurrentPaths, showToast, handleVolumeChange, setVideoTime, setVideoDuration, language, completedFeedback, handleOpenLink,
  showNoteSearch, setShowNoteSearch, noteSearchQuery, setNoteSearchQuery, activeMatchIndex, setActiveMatchIndex,
  getVisibleVideos, handleItemClick,
  isDetailCollapsed, setIsDetailCollapsed,
  fixedText, handleFixedTextChange, extractUsername, resolveFixedText,
  aiAssistant, defaultPrompt,
  templateMode, templates, addTemplate, removeTemplate, toggleTemplates,
  duplicateSuggestion, setDuplicateSuggestion
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [showCopyTick, setShowCopyTick] = useState(false);
  const [showNoteCopyTick, setShowNoteCopyTick] = useState(false);
  const isCollapsed = isDetailCollapsed;
  const setIsCollapsed = setIsDetailCollapsed;
  const [templateSelectedIndex, setTemplateSelectedIndex] = useState(0);
  // Pending suggestion: shown inline in note area, Enter confirms, ESC cancels
  const [pendingSuggestion, setPendingSuggestion] = useState(null); // { content: string, label: string }

  const [detailWidth, setDetailWidth] = useState(() => {
    const saved = localStorage.getItem('detail_panel_width');
    return saved ? parseInt(saved, 10) : 720;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const [isFixedFocused, setIsFixedFocused] = useState(false);
  const [allTextSelected, setAllTextSelected] = useState(false);

  const overlayRef = useRef(null);
  const fixedOverlayRef = useRef(null);
  const fixedInputRef = useRef(null);
  const searchBarInputRef = useRef(null);
  const isNavigatingMatchesRef = useRef(false);
  const pendingMatchDirectionRef = useRef(null);

  useEffect(() => {
    const handleGlobalMouseDown = () => {
      setAllTextSelected(false);
    };
    window.addEventListener('mousedown', handleGlobalMouseDown);
    return () => window.removeEventListener('mousedown', handleGlobalMouseDown);
  }, []);

  useEffect(() => {
    const handleTriggerAI = () => {
      if (aiAssistant) {
        aiAssistant.openAIPrompt();
      }
    };
    window.addEventListener('trigger-ai-assistant', handleTriggerAI);
    return () => window.removeEventListener('trigger-ai-assistant', handleTriggerAI);
  }, [aiAssistant]);

  // Live preview: update pendingSuggestion as template selection changes (or mode closes)
  useEffect(() => {
    if (!templateMode) {
      setPendingSuggestion(null);
      return;
    }
    const dupEntry = duplicateSuggestion
      ? [{ id: '__dup__', content: duplicateSuggestion.description, isDuplicate: true, name: `↳ ${duplicateSuggestion.sourceFileName}` }]
      : [];
    const allItems = [...dupEntry, ...(templates || [])];
    const item = allItems[templateSelectedIndex];
    setPendingSuggestion(item ? { content: item.content, label: item.isDuplicate ? item.name : item.name } : null);
  }, [templateMode, templateSelectedIndex, templates, duplicateSuggestion]);

  // Template mode keyboard navigation
  useEffect(() => {
    if (!templateMode) return;
    const dupEntry = duplicateSuggestion
      ? [{ id: '__dup__', content: duplicateSuggestion.description, isDuplicate: true }]
      : [];
    const allItems = [...dupEntry, ...(templates || [])];

    const handleTemplateKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setTemplateSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setTemplateSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = allItems[templateSelectedIndex];
        if (!item) return;
        handleNoteChange(item.content);
        if (item.isDuplicate) setDuplicateSuggestion(null);
        if (toggleTemplates) toggleTemplates(); // closes mode → live preview effect clears pendingSuggestion
      }
    };
    window.addEventListener('keydown', handleTemplateKeyDown, true);
    return () => window.removeEventListener('keydown', handleTemplateKeyDown, true);
  }, [templateMode, templates, templateSelectedIndex, handleNoteChange, toggleTemplates, duplicateSuggestion, setDuplicateSuggestion]);

  // Reset pending suggestion on video change
  useEffect(() => {
    setPendingSuggestion(null);
  }, [activePath]);

  // Reset selected index when template mode opens
  useEffect(() => {
    if (templateMode) setTemplateSelectedIndex(0);
  }, [templateMode]);


  const [mentionMenu, setMentionMenu] = useState({
    visible: false,
    target: null, // 'note' or 'fixed'
    query: '',
    index: 0,
    options: []
  });

  const checkMentionTrigger = (textarea, targetType) => {
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    
    // Check if the character before cursor is '@'
    const textBeforeCursor = value.substring(0, selectionStart);
    const lastWordMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (lastWordMatch) {
      const query = lastWordMatch[1];
      const activeVideo = videos.find(v => v.path === activePath);
      const username = activeVideo ? extractUsername(activeVideo.name) : '';
      const folder = currentFolder ? currentFolder.split(/[\\/]/).pop() : '';
      
      const allOptions = [
        { token: '@username', label: 'Kullanıcı Adı (@username)', desc: username ? `@${username}` : '@username' },
        { token: '@filename', label: 'Dosya Adı (@filename)', desc: activeVideo ? activeVideo.name : '@filename' },
        { token: '@folder', label: 'Klasör Adı (@folder)', desc: folder ? folder : '@folder' }
      ];
      
      const filtered = allOptions.filter(opt => opt.token.toLowerCase().includes(`@${query.toLowerCase()}`));
      
      setMentionMenu({
        visible: true,
        target: targetType,
        query: query,
        index: 0,
        options: filtered
      });
    } else {
      setMentionMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const insertMention = (option, textarea, targetType) => {
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, selectionStart);
    const lastWordStart = textBeforeCursor.lastIndexOf('@');
    
    if (lastWordStart !== -1) {
      const newValue = value.substring(0, lastWordStart) + option.token + ' ' + value.substring(selectionStart);
      if (targetType === 'note') {
        handleNoteChange(newValue);
      } else {
        handleFixedTextChange(newValue);
      }
      
      // Reset focus and cursor position after the inserted token
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = lastWordStart + option.token.length + 1;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        checkMentionTrigger(textarea, targetType);
      }, 50);
    }
    
    setMentionMenu(prev => ({ ...prev, visible: false }));
  };

  const handleMentionKeyDown = (e, textarea, targetType) => {
    if (!mentionMenu.visible || mentionMenu.target !== targetType) return false;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionMenu(prev => ({
        ...prev,
        index: prev.options.length > 0 ? (prev.index + 1) % prev.options.length : 0
      }));
      return true;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionMenu(prev => ({
        ...prev,
        index: prev.options.length > 0 ? (prev.index - 1 + prev.options.length) % prev.options.length : 0
      }));
      return true;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (mentionMenu.options[mentionMenu.index]) {
        insertMention(mentionMenu.options[mentionMenu.index], textarea, targetType);
      }
      return true;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMentionMenu(prev => ({ ...prev, visible: false }));
      return true;
    }
    return false;
  };

  // Focus and select note search input when focus-note-search event is received
  useEffect(() => {
    const handleFocusSearch = () => {
      setShowNoteSearch(true);
      setTimeout(() => {
        if (searchBarInputRef.current) {
          searchBarInputRef.current.focus();
          searchBarInputRef.current.select();
        }
      }, 50);
    };
    window.addEventListener('focus-note-search', handleFocusSearch);

    // Also focus when showNoteSearch becomes true
    if (showNoteSearch) {
      setTimeout(handleFocusSearch, 50);
    }

    return () => window.removeEventListener('focus-note-search', handleFocusSearch);
  }, [showNoteSearch, setShowNoteSearch]);

  const localMatches = React.useMemo(() => {
    if (!noteSearchQuery.trim() || !showNoteSearch) return [];
    const matches = [];
    const text = noteText.toLowerCase();
    const query = noteSearchQuery.toLowerCase();
    let index = 0;
    while ((index = text.indexOf(query, index)) !== -1) {
      matches.push({ start: index, end: index + query.length });
      index += query.length;
    }
    return matches;
  }, [noteText, noteSearchQuery, showNoteSearch]);

  const hasMatchesInFolder = React.useMemo(() => {
    const query = noteSearchQuery.trim().toLowerCase();
    if (!query) return false;
    return (videos || []).some(v => v.description?.toLowerCase().includes(query));
  }, [videos, noteSearchQuery]);

  const folderMatchesInfo = React.useMemo(() => {
    const query = noteSearchQuery.trim().toLowerCase();
    if (!query) return { current: 0, total: 0 };
    const matchingVideos = (videos || []).filter(v => 
      v.description?.toLowerCase().includes(query)
    );
    const currentIdx = matchingVideos.findIndex(v => v.path === activePath);
    return {
      current: currentIdx !== -1 ? currentIdx + 1 : 0,
      total: matchingVideos.length
    };
  }, [videos, activePath, noteSearchQuery]);

  // Clean note search when activePath changes naturally
  useEffect(() => {
    if (isNavigatingMatchesRef.current) {
      isNavigatingMatchesRef.current = false;
      return;
    }
    setShowNoteSearch(false);
    setNoteSearchQuery('');
  }, [activePath]);

  // Reset active match index when query changes
  useEffect(() => {
    setActiveMatchIndex(0);
  }, [noteSearchQuery]);

  // Helper to scroll active match into view in the overlay and sync to textarea
  const scrollActiveMatchIntoView = () => {
    setTimeout(() => {
      if (!overlayRef.current || !noteInputRef.current) return;
      const activeMark = overlayRef.current.querySelector('[data-active-match="true"]');
      if (activeMark) {
        const container = overlayRef.current;
        const markTop = activeMark.offsetTop;
        const markHeight = activeMark.offsetHeight;
        const containerHeight = container.clientHeight;
        
        // Center the active mark in the viewport of the scrollable container
        container.scrollTop = markTop - containerHeight / 2 + markHeight / 2;
        
        // Sync the textarea scroll position
        noteInputRef.current.scrollTop = container.scrollTop;
      }
    }, 60);
  };

  // Scroll active match when index or match count changes
  useEffect(() => {
    if (showNoteSearch && localMatches.length > 0) {
      scrollActiveMatchIntoView();
    }
  }, [activeMatchIndex, localMatches.length, showNoteSearch]);

  // Handle cross-video navigation matching transitions
  useEffect(() => {
    if (pendingMatchDirectionRef.current !== null && showNoteSearch && noteSearchQuery.trim()) {
      const matches = localMatches;
      if (matches.length > 0) {
        const targetIndex = pendingMatchDirectionRef.current === 1 ? 0 : matches.length - 1;
        setActiveMatchIndex(targetIndex);
        scrollActiveMatchIntoView();
      }
      pendingMatchDirectionRef.current = null;
      
      // Explicitly restore focus to the Note Finder search input to prevent blur auto-close
      setTimeout(() => {
        if (searchBarInputRef.current) {
          searchBarInputRef.current.focus();
        }
      }, 80);
    }
  }, [activePath, noteText, showNoteSearch, noteSearchQuery]);

  const handleInputBlur = (e) => {
    if (isNavigatingMatchesRef.current) return;
    setTimeout(() => {
      if (isNavigatingMatchesRef.current) return;
      const activeEl = document.activeElement;
      const finderToolbar = document.getElementById('note-finder-toolbar');
      if (finderToolbar && !finderToolbar.contains(activeEl)) {
        setShowNoteSearch(false);
        setNoteSearchQuery('');
      }
    }, 150);
  };

  const navigateMatches = (direction) => {
    const query = noteSearchQuery.trim().toLowerCase();
    if (!query) return;

    const matchesCount = localMatches.length;
    
    // Get all videos in the current folder that contain the query in their notes
    const matchingVideos = (videos || []).filter(v => 
      v.description?.toLowerCase().includes(query)
    );

    if (matchesCount > 0) {
      const nextIndex = activeMatchIndex + direction;
      if (nextIndex >= 0 && nextIndex < matchesCount) {
        setActiveMatchIndex(nextIndex);
      } else {
        // Current video matches exhausted. Move to next/prev video with matches.
        if (matchingVideos.length > 1) {
          const currentVideoIdx = matchingVideos.findIndex(v => v.path === activePath);
          if (currentVideoIdx !== -1) {
            const nextVideoIdx = (currentVideoIdx + direction + matchingVideos.length) % matchingVideos.length;
            const nextVideo = matchingVideos[nextVideoIdx];
            if (nextVideo && nextVideo.path !== activePath) {
              isNavigatingMatchesRef.current = true;
              handleItemClick(nextVideo.path);
              pendingMatchDirectionRef.current = direction;
            }
          }
        } else {
          // Wrap around in current video
          setActiveMatchIndex(direction === 1 ? 0 : matchesCount - 1);
        }
      }
    } else {
      // Current video has no matches. Move to next/prev video that has matches.
      if (matchingVideos.length > 0) {
        const allVisibleVideos = getVisibleVideos();
        const currentFolderIdx = allVisibleVideos.findIndex(v => v.path === activePath);
        
        if (currentFolderIdx !== -1) {
          let targetVideo = null;
          if (direction === 1) {
            // Find first matching video after current
            targetVideo = allVisibleVideos.slice(currentFolderIdx + 1).find(v => 
              matchingVideos.some(mv => mv.path === v.path)
            );
            if (!targetVideo) {
              // Wrap around to first
              targetVideo = allVisibleVideos.find(v => 
                matchingVideos.some(mv => mv.path === v.path)
              );
            }
          } else {
            // Find last matching video before current
            const beforeVideos = allVisibleVideos.slice(0, currentFolderIdx);
            for (let i = beforeVideos.length - 1; i >= 0; i--) {
              if (matchingVideos.some(mv => mv.path === beforeVideos[i].path)) {
                targetVideo = beforeVideos[i];
                break;
              }
            }
            if (!targetVideo) {
              // Wrap around to last
              for (let i = allVisibleVideos.length - 1; i >= 0; i--) {
                if (matchingVideos.some(mv => mv.path === allVisibleVideos[i].path)) {
                  targetVideo = allVisibleVideos[i];
                  break;
                }
              }
            }
          }

          if (targetVideo && targetVideo.path !== activePath) {
            isNavigatingMatchesRef.current = true;
            handleItemClick(targetVideo.path);
            pendingMatchDirectionRef.current = direction;
          }
        } else {
          const targetVideo = matchingVideos[0];
          if (targetVideo && targetVideo.path !== activePath) {
            isNavigatingMatchesRef.current = true;
            handleItemClick(targetVideo.path);
            pendingMatchDirectionRef.current = direction;
          }
        }
      }
    }
  };

  const renderHighlightedNote = () => {
    if (!noteSearchQuery.trim() || !showNoteSearch) {
      return noteText;
    }
    const escapedQuery = noteSearchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = noteText.split(regex);
    let matchCounter = 0;
    return parts.map((part, i) => {
      if (part.toLowerCase() === noteSearchQuery.toLowerCase()) {
        const isCurrentActive = matchCounter === activeMatchIndex;
        matchCounter++;
        return (
          <mark 
            key={i} 
            data-active-match={isCurrentActive ? "true" : "false"}
            className={`rounded-sm px-0 py-0 transition-all duration-150 ${
              isCurrentActive 
                ? 'bg-amber-500/35 text-amber-100 border-b-2 border-amber-500 font-semibold shadow-sm' 
                : 'bg-yellow-500/15 text-yellow-200/90 border-b border-yellow-500/30'
            }`}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const renderNoteOverlay = (text, isFocused) => {
    // If there's a pending suggestion, show it as an inline badge instead of actual text
    if (pendingSuggestion) {
      return (
        <span className="bg-white/10 text-white font-medium rounded-sm shadow-[0_0_0_2px_rgba(255,255,255,0.15)] inline select-none">
          {pendingSuggestion.content}
        </span>
      );
    }

    if (!text) return '';
    
    if (showNoteSearch && noteSearchQuery.trim()) {
      return renderHighlightedNote();
    }
    
    const username = activeVideo ? extractUsername(activeVideo.name) : '';
    const folder = currentFolder ? currentFolder.split(/[\\/]/).pop() : '';
    const regex = /(@(?:username|user_name|filename|folder))/g;
    
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part === '@username' || part === '@user_name' || part === '@filename' || part === '@folder') {
        let displayVal = part;
        if (!isFocused) {
          if (part === '@username' || part === '@user_name') {
            displayVal = username ? `@${username}` : '@username';
          } else if (part === '@filename') {
            displayVal = activeVideo ? `@${activeVideo.name}` : '@filename';
          } else if (part === '@folder') {
            displayVal = folder ? `@${folder}` : '@folder';
          }
        }
        
        return isFocused ? (
          <mark key={i} className="bg-white/10 text-transparent font-medium px-0 py-0 rounded-sm border-0 text-sm shadow-[0_0_0_3px_rgba(255,255,255,0.12)] inline-block select-none mx-0">
            {part}
          </mark>
        ) : (
          <span key={i} className="bg-white/10 text-white font-medium px-0 py-0 rounded-sm border-0 text-sm shadow-[0_0_0_3px_rgba(255,255,255,0.12)] inline-block select-none mx-0">
            {displayVal}
          </span>
        );
      }
      return part;
    });
  };

  const renderFixedOverlay = (text, isFocused) => {
    if (!text) return '';
    
    const username = activeVideo ? extractUsername(activeVideo.name) : '';
    const folder = currentFolder ? currentFolder.split(/[\\/]/).pop() : '';
    const regex = /(@(?:username|user_name|filename|folder))/g;
    
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (part === '@username' || part === '@user_name' || part === '@filename' || part === '@folder') {
        let displayVal = part;
        if (!isFocused) {
          if (part === '@username' || part === '@user_name') {
            displayVal = username ? `@${username}` : '@username';
          } else if (part === '@filename') {
            displayVal = activeVideo ? `@${activeVideo.name}` : '@filename';
          } else if (part === '@folder') {
            displayVal = folder ? `@${folder}` : '@folder';
          }
        }
        
        return isFocused ? (
          <mark key={i} className="bg-white/10 text-transparent font-medium px-0 py-0 rounded-sm border-0 text-xs shadow-[0_0_0_3px_rgba(255,255,255,0.12)] inline-block select-none mx-0">
            {part}
          </mark>
        ) : (
          <span key={i} className="bg-white/10 text-white font-medium px-0 py-0 rounded-sm border-0 text-xs shadow-[0_0_0_3px_rgba(255,255,255,0.12)] inline-block select-none mx-0">
            {displayVal}
          </span>
        );
      }
      return part;
    });
  };

  // Sync play state with video element
  useEffect(() => {
    if (videoRef.current) {
      setIsPlaying(!videoRef.current.paused);
    }
  }, [activePath, videoRef]);

  // Auto-expand panel when active video changes
  useEffect(() => {
    if (activePath) {
      setIsCollapsed(false);
    }
  }, [activePath]);

  // Native video events to guarantee duration and time updates
  useEffect(() => {
    if (!videoRef.current) return;
    
    const videoEl = videoRef.current;
    
    const handleTimeUpdate = () => {
      if (!isDragging && setVideoTime) {
        setVideoTime(videoEl.currentTime);
      }
    };
    
    const handleDurationChange = () => {
      if (setVideoDuration) {
        setVideoDuration(videoEl.duration || 0);
      }
    };
    
    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('durationchange', handleDurationChange);
    videoEl.addEventListener('loadedmetadata', handleDurationChange);
    
    // Initial sync
    if (videoEl.duration) {
      setVideoDuration(videoEl.duration);
    }
    if (!isDragging) {
      setVideoTime(videoEl.currentTime);
    }
    
    return () => {
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('durationchange', handleDurationChange);
      videoEl.removeEventListener('loadedmetadata', handleDurationChange);
    };
  }, [activePath, setVideoTime, setVideoDuration, isDragging]);

  const getMinAllowedWidth = () => {
    const avHeight = window.innerHeight - 32;
    if (selectionMode) {
      return 560;
    }
    if (activePath) {
      const vidHeight = avHeight - 32;
      const vidWidth = Math.max(120, Math.floor((vidHeight * 9) / 16));
      return vidWidth + 220 + 32 + 16;
    }
    return 300;
  };

  // Resize handler
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      let newWidth = window.innerWidth - e.clientX;
      const minAllowedWidth = getMinAllowedWidth();
      if (newWidth < minAllowedWidth - 60) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
        if (newWidth < minAllowedWidth) newWidth = minAllowedWidth;
        if (newWidth > 1200) newWidth = 1200;
        setDetailWidth(newWidth);
        localStorage.setItem('detail_panel_width', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, selectionMode, activePath, detailWidth]);

  // Handle automatic width constraint adjustments
  useEffect(() => {
    if (isCollapsed) return;

    const checkAndConstrainWidth = () => {
      const minAllowedWidth = getMinAllowedWidth();
      if (detailWidth < minAllowedWidth) {
        const constrained = Math.max(150, minAllowedWidth);
        setDetailWidth(constrained);
        localStorage.setItem('detail_panel_width', constrained.toString());
      }
    };

    checkAndConstrainWidth();

    window.addEventListener('resize', checkAndConstrainWidth);
    return () => window.removeEventListener('resize', checkAndConstrainWidth);
  }, [activePath, selectionMode, detailWidth, isCollapsed]);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handlePlayPause = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error(err));
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleMuteClick = (e) => {
    e.stopPropagation();
    toggleMute();
  };

  if (!currentFolder) {
    return null;
  }

  const activeVideo = videos.find(v => v.path === activePath);
  const lowerName = activeVideo?.name?.toLowerCase() || '';
  const shouldShowOpenLink = /^(https?_)?(www\.)?(instagram\.com|youtube\.com|tiktok\.com)/i.test(lowerName);
  const sortedSelected = videos.filter(v => selectedPaths.has(v.path));
  const transitionClass = isResizing ? '' : 'transition-all duration-300 ease-in-out';

  // Collapsed Sidebar View
  if (isCollapsed) {
    return (
      <div 
        onClick={() => setIsCollapsed(false)}
        className={`${transitionClass} h-screen flex flex-col items-center justify-center shrink-0 relative z-40 w-[8px] hover:w-[50px] bg-transparent hover:bg-surface border-l border-transparent hover:border-muted/15 group/collapsed cursor-pointer`}
        title={t('expand', language)}
      >
        <div className="opacity-0 group-hover/collapsed:opacity-100 transition-opacity duration-200 pointer-events-none">
          <ChevronLeft size={18} className="text-foreground/60" />
        </div>
      </div>
    );
  }

  const availableHeight = window.innerHeight - 32;
  const videoHeight = availableHeight - 32;
  const videoWidth = Math.max(120, Math.floor((videoHeight * 9) / 16));

  return (
    <div 
      className={`${transitionClass} border-l border-muted/15 bg-surface flex flex-col h-full overflow-hidden shrink-0 relative select-none z-45`}
      style={{ width: `${detailWidth}px` }}
    >
      {/* Resizer Handle */}
      <div 
        onMouseDown={startResizing}
        className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-accent/20 active:bg-accent/40 transition-colors z-50"
      />

      {/* Main Content Area */}
      <div className="flex-1 p-4 flex flex-row gap-4 min-h-0 overflow-hidden">
        {selectionMode ? (
          /* Selection Mode View */
          <SelectionList sortedSelected={sortedSelected} API_URL={API_URL} language={language} />
        ) : activeVideo ? (
          /* Single Playing Video View */
          <div className="flex flex-col gap-2 shrink-0 animate-scale-up" style={{ width: `${videoWidth}px` }}>
            {templateMode ? (
              <TemplateMode
                templates={templates || []}
                selectedIndex={templateSelectedIndex}
                setSelectedIndex={setTemplateSelectedIndex}
                onApply={(tpl) => {
                  const label = tpl.name;
                  setPendingSuggestion({ content: tpl.content, label });
                  if (toggleTemplates) toggleTemplates();
                }}
                onClose={toggleTemplates}
                onRemove={removeTemplate}
                duplicateSuggestion={duplicateSuggestion}
                onAcceptDuplicate={(desc) => {
                  setPendingSuggestion({ content: desc, label: `↳ ${duplicateSuggestion?.sourceFileName}` });
                  setDuplicateSuggestion(null);
                  if (toggleTemplates) toggleTemplates();
                }}
              />
            ) : (
              <VideoPlayer
                activeVideo={activeVideo}
                API_URL={API_URL}
                language={language}
                videoRef={videoRef}
                muted={muted}
                volume={volume}
                videoTime={videoTime}
                videoDuration={videoDuration}
                setVideoTime={setVideoTime}
                setVideoDuration={setVideoDuration}
                muteFeedback={muteFeedback}
                completedFeedback={completedFeedback}
                handleSeek={handleSeek}
                toggleMute={toggleMute}
                copyCurrentPaths={copyCurrentPaths}
                handleOpenLink={handleOpenLink}
                openInExplorer={openInExplorer}
                handleVolumeChange={handleVolumeChange}
                isPlaying={isPlaying}
                handlePlayPause={handlePlayPause}
                showCopyTick={showCopyTick}
                setShowCopyTick={setShowCopyTick}
                shouldShowOpenLink={shouldShowOpenLink}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                dragTime={dragTime}
                setDragTime={setDragTime}
                currentFolder={currentFolder}
              />
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-foreground/30 gap-3 py-12">
            <FileVideo size={48} strokeWidth={1} />
            <p className="text-xs text-center px-4 leading-relaxed">
              {t('empty_state_desc', language)}
            </p>
          </div>
        )}

        {/* Input & Metadata Editor Section */}
        {(selectionMode ? selectedPaths.size > 0 : !!activePath) && (
          <div className={`flex flex-col gap-2 pl-4 h-full ${
            selectionMode ? 'w-[320px] shrink-0' : 'flex-1 min-w-0'
          }`}>
            <NotesEditor
              noteText={noteText}
              handleNoteChange={handleNoteChange}
              noteInputRef={noteInputRef}
              overlayRef={overlayRef}
              isNoteFocused={isNoteFocused}
              setIsNoteFocused={setIsNoteFocused}
              showNoteSearch={showNoteSearch}
              setShowNoteSearch={setShowNoteSearch}
              noteSearchQuery={noteSearchQuery}
              setNoteSearchQuery={setNoteSearchQuery}
              activeMatchIndex={activeMatchIndex}
              setActiveMatchIndex={setActiveMatchIndex}
              searchBarInputRef={searchBarInputRef}
              localMatches={localMatches}
              hasMatchesInFolder={hasMatchesInFolder}
              folderMatchesInfo={folderMatchesInfo}
              navigateMatches={navigateMatches}
              handleInputBlur={handleInputBlur}
              renderNoteOverlay={renderNoteOverlay}
              mentionMenu={mentionMenu}
              insertMention={insertMention}
              handleMentionKeyDown={handleMentionKeyDown}
              checkMentionTrigger={checkMentionTrigger}
              setMentionMenu={setMentionMenu}
              allTextSelected={allTextSelected}
              setAllTextSelected={setAllTextSelected}
              copyCurrentNote={copyCurrentNote}
              applyBulkNotes={applyBulkNotes}
              showNoteCopyTick={showNoteCopyTick}
              setShowNoteCopyTick={setShowNoteCopyTick}
              selectionMode={selectionMode}
              selectedPathsCount={selectedPaths.size}
              language={language}
              exitSelectionMode={exitSelectionMode}
              setIsCollapsed={setIsCollapsed}
              activePath={activePath}
              aiAssistant={aiAssistant}
              addTemplate={addTemplate}
              templates={templates}
              pendingSuggestion={pendingSuggestion}
              activeVideo={activeVideo}
            />

            {/* Tamamlandı Olarak İşaretle button */}
            {!selectionMode && activeVideo && (
              <Button
                variant={activeVideo.shared ? "secondary" : "primary"}
                onClick={(e) => toggleSharedState(activeVideo, e)}
                tabIndex="-1"
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs transition-all duration-300 cursor-pointer shrink-0 h-[34px] mt-2.5 mb-2 ${
                  activeVideo.shared 
                    ? 'bg-success/20 hover:bg-success/30 text-success border border-success/30 shadow-none' 
                    : ''
                }`}
              >
                {activeVideo.shared && (
                  <IconCheck className="w-3.5 h-3.5 text-success animate-scale-up" />
                )}
                <span className="whitespace-nowrap truncate">
                  {activeVideo.shared ? t('completed', language) : t('mark_completed', language)}
                </span>
              </Button>
            )}

            {/* Divider */}
            <div className="h-[1px] bg-muted/10 shrink-0" />

            <FixedSectionEditor
              fixedText={fixedText}
              handleFixedTextChange={handleFixedTextChange}
              fixedInputRef={fixedInputRef}
              fixedOverlayRef={fixedOverlayRef}
              isFixedFocused={isFixedFocused}
              setIsFixedFocused={setIsFixedFocused}
              renderFixedOverlay={renderFixedOverlay}
              mentionMenu={mentionMenu}
              insertMention={insertMention}
              handleMentionKeyDown={handleMentionKeyDown}
              checkMentionTrigger={checkMentionTrigger}
              allTextSelected={allTextSelected}
              setAllTextSelected={setAllTextSelected}
              copyCurrentNote={copyCurrentNote}
              handleNoteChange={handleNoteChange}
              language={language}
              aiAssistant={aiAssistant}
            />

            {/* Apply bulk notes button when in selection mode */}
            {selectionMode && (
              <Button
                variant="primary"
                onClick={() => applyBulkNotes(noteText)}
                disabled={selectedPaths.size === 0}
                tabIndex={-1}
                className="w-full mt-2 gap-2 font-bold text-xs bg-blue-600 hover:bg-blue-500 hover:opacity-100 text-white shadow-none h-[34px]"
              >
                <Check size={14} />
                <span>{t('apply_changes', language)}</span>
              </Button>
            )}
          </div>
        )}
      </div>

      <AIAssistant
        selectedText={aiAssistant.selectedText}
        promptCoords={aiAssistant.promptCoords}
        isPromptOpen={aiAssistant.isPromptOpen}
        isDiffMode={aiAssistant.isDiffMode}
        openAIPrompt={aiAssistant.openAIPrompt}
        closeAIPrompt={aiAssistant.closeAIPrompt}
        submitAIPrompt={aiAssistant.submitAIPrompt}
        applyAIChanges={aiAssistant.applyAIChanges}
        discardAIChanges={aiAssistant.discardAIChanges}
        defaultPrompt={defaultPrompt}
        currentFullText={aiAssistant.selectionRange.target === 'fixed' ? fixedText : noteText}
        onApplyText={aiAssistant.selectionRange.target === 'fixed' ? handleFixedTextChange : handleNoteChange}
        language={language}
      />
    </div>
  );
}
