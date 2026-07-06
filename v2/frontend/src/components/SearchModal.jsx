import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import Fuse from 'fuse.js';
import Modal from './ui/Modal';
import VideoListCard from './VideoListCard';
import { t } from '../utils/translations';

const matchesBinding = (e, binding) => {
  if (!binding) return false;
  const eventKey = e.key.toLowerCase();
  const bindingKey = binding.key.toLowerCase();
  
  if (eventKey === ' ' && bindingKey === 'space') return true;
  if (eventKey === 'space' && bindingKey === ' ') return true;
  
  const keyMatch = eventKey === bindingKey;
  const altMatch = !!e.altKey === !!binding.altKey;
  const ctrlMatch = !!e.ctrlKey === !!binding.ctrlKey;
  const shiftMatch = !!e.shiftKey === !!binding.shiftKey;
  return keyMatch && altMatch && ctrlMatch && shiftMatch;
};

export default function SearchModal({
  isOpen, onClose, API_URL, scanFolder, handleItemClick, activePath, selectedPaths,
  clipboardState, selectionMode, EXT_COLORS, toggleSharedState, handleCopyPath, keybindings, videos,
  language, handleNoteChange, showToast
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState(null); // 'name' | 'description' | 'folderName'
  const inputRef = useRef(null);
  const fuseRef = useRef(null);

  const handleCopyDescriptionToActive = (video) => {
    if (!activePath) {
      if (showToast) {
        showToast(language === 'tr' ? 'Açıklamanın kopyalanacağı aktif bir video seçilmedi!' : 'No active video selected to copy description to!', 'error');
      }
      return;
    }
    const desc = video.description || '';
    if (handleNoteChange) {
      handleNoteChange(desc);
      if (showToast) {
        const activeVideo = videos.find(v => v.path === activePath);
        const targetName = activeVideo ? activeVideo.name : '';
        showToast(
          language === 'tr'
            ? `Açıklama "${targetName}" videosuna kopyalandı ✓`
            : `Description copied to "${targetName}" ✓`,
          'success'
        );
      }
    }
  };

  useEffect(() => {
    if (videos && videos.length > 0) {
      const videosWithFolder = videos.map(v => {
        const lastSlash = Math.max(v.path.lastIndexOf('\\'), v.path.lastIndexOf('/'));
        if (lastSlash === -1) return { ...v, folderName: '' };
        const dirPath = v.path.substring(0, lastSlash);
        const lastSlashDir = Math.max(dirPath.lastIndexOf('\\'), dirPath.lastIndexOf('/'));
        const dirName = lastSlashDir !== -1 ? dirPath.substring(lastSlashDir + 1) : dirPath;
        return { ...v, folderName: dirName };
      });

      fuseRef.current = new Fuse(videosWithFolder, {
        keys: [
          { name: 'description', weight: 0.6 },
          { name: 'folderName', weight: 0.3 },
          { name: 'name', weight: 0.1 }
        ],
        threshold: 0.45,
        distance: 100,
        ignoreLocation: true
      });
    } else {
      fuseRef.current = null;
    }
  }, [videos]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setActiveFilter(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        // 1. Fetch matching notes globally from SQLite database
        let dbResults = [];
        try {
          const res = await fetch(`${API_URL}/api/notes/search?query=${encodeURIComponent(query)}`);
          const data = await res.json();
          if (data.success && data.results) {
            dbResults = data.results;
            
            // Filter database results to only match active filter if set
            if (activeFilter) {
              const lowerQuery = query.toLowerCase();
              dbResults = dbResults.filter(r => {
                if (activeFilter === 'description') {
                  return (r.description || '').toLowerCase().includes(lowerQuery);
                } else if (activeFilter === 'name') {
                  return (r.name || '').toLowerCase().includes(lowerQuery);
                } else if (activeFilter === 'folderName') {
                  const lastSlash = Math.max(r.path.lastIndexOf('\\'), r.path.lastIndexOf('/'));
                  const dirPath = lastSlash !== -1 ? r.path.substring(0, lastSlash) : '';
                  const lastSlashDir = Math.max(dirPath.lastIndexOf('\\'), dirPath.lastIndexOf('/'));
                  const dirName = lastSlashDir !== -1 ? dirPath.substring(lastSlashDir + 1) : dirPath;
                  return dirName.toLowerCase().includes(lowerQuery);
                }
                return true;
              });
            }
          }
        } catch (dbErr) {
          console.error("Database search failed, falling back to local folder only:", dbErr);
        }

        // 2. Search client-side inside current folder's videos using Fuse or fallback filter
        let localResults = [];
        if (fuseRef.current) {
          const searchResults = fuseRef.current.search(query);
          const lowerQuery = query.toLowerCase();
          localResults = searchResults.map(r => r.item).filter(v => {
            if (!activeFilter) return true;
            if (activeFilter === 'description') {
              return (v.description || '').toLowerCase().includes(lowerQuery);
            } else if (activeFilter === 'name') {
              return (v.name || '').toLowerCase().includes(lowerQuery);
            } else if (activeFilter === 'folderName') {
              const lastSlash = Math.max(v.path.lastIndexOf('\\'), v.path.lastIndexOf('/'));
              const dirPath = lastSlash !== -1 ? v.path.substring(0, lastSlash) : '';
              const lastSlashDir = Math.max(dirPath.lastIndexOf('\\'), dirPath.lastIndexOf('/'));
              const dirName = lastSlashDir !== -1 ? dirPath.substring(lastSlashDir + 1) : dirPath;
              return dirName.toLowerCase().includes(lowerQuery);
            }
            return true;
          });
        } else {
          const lowerQuery = query.toLowerCase();
          localResults = (videos || []).filter(v => {
            if (activeFilter) {
              if (activeFilter === 'description') {
                return (v.description || '').toLowerCase().includes(lowerQuery);
              } else if (activeFilter === 'name') {
                return (v.name || '').toLowerCase().includes(lowerQuery);
              } else if (activeFilter === 'folderName') {
                const lastSlash = Math.max(v.path.lastIndexOf('\\'), v.path.lastIndexOf('/'));
                const dirPath = lastSlash !== -1 ? v.path.substring(0, lastSlash) : '';
                const lastSlashDir = Math.max(dirPath.lastIndexOf('\\'), dirPath.lastIndexOf('/'));
                const dirName = lastSlashDir !== -1 ? dirPath.substring(lastSlashDir + 1) : dirPath;
                return dirName.toLowerCase().includes(lowerQuery);
              }
              return false;
            }
            const lastSlash = Math.max(v.path.lastIndexOf('\\'), v.path.lastIndexOf('/'));
            const dirPath = lastSlash !== -1 ? v.path.substring(0, lastSlash) : '';
            const lastSlashDir = Math.max(dirPath.lastIndexOf('\\'), dirPath.lastIndexOf('/'));
            const dirName = lastSlashDir !== -1 ? dirPath.substring(lastSlashDir + 1) : dirPath;
            return (
              v.name?.toLowerCase().includes(lowerQuery) || 
              v.description?.toLowerCase().includes(lowerQuery) ||
              dirName.toLowerCase().includes(lowerQuery)
            );
          });
        }

        // 3. Merge results, removing duplicates based on path
        const merged = [...dbResults];
        const pathSet = new Set(dbResults.map(r => r.path));

        localResults.forEach(v => {
          if (!pathSet.has(v.path)) {
            merged.push(v);
            pathSet.add(v.path);
          }
        });

        // 4. Sort merged results by priority: Description match -> Folder name match -> File name match
        //    Additionally, matching items are sorted by how close the match is to the start of the text (indexOf).
        const lowerQuery = query.toLowerCase().trim();
        if (lowerQuery) {
          merged.sort((a, b) => {
            // Priority 1: description match & match proximity
            const aDescText = (a.description || '').toLowerCase();
            const bDescText = (b.description || '').toLowerCase();
            const aDescIdx = aDescText.indexOf(lowerQuery);
            const bDescIdx = bDescText.indexOf(lowerQuery);

            const aHasDesc = aDescIdx !== -1;
            const bHasDesc = bDescIdx !== -1;

            if (aHasDesc && !bHasDesc) return -1;
            if (!aHasDesc && bHasDesc) return 1;
            if (aHasDesc && bHasDesc) {
              if (aDescIdx !== bDescIdx) {
                return aDescIdx - bDescIdx; // earlier match index goes first
              }
            }

            // Helper to get folder name
            const getDirName = (filePath) => {
              if (!filePath) return '';
              const lastSlash = Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/'));
              if (lastSlash === -1) return '';
              const dirPath = filePath.substring(0, lastSlash);
              const lastSlashDir = Math.max(dirPath.lastIndexOf('\\'), dirPath.lastIndexOf('/'));
              return lastSlashDir !== -1 ? dirPath.substring(lastSlashDir + 1) : dirPath;
            };

            // Priority 2: folder match & match proximity
            const aDirText = getDirName(a.path).toLowerCase();
            const bDirText = getDirName(b.path).toLowerCase();
            const aDirIdx = aDirText.indexOf(lowerQuery);
            const bDirIdx = bDirText.indexOf(lowerQuery);

            const aHasDir = aDirIdx !== -1;
            const bHasDir = bDirIdx !== -1;

            if (aHasDir && !bHasDir) return -1;
            if (!aHasDir && bHasDir) return 1;
            if (aHasDir && bHasDir) {
              if (aDirIdx !== bDirIdx) {
                return aDirIdx - bDirIdx;
              }
            }

            // Priority 3: name match & match proximity
            const aNameText = (a.name || '').toLowerCase();
            const bNameText = (b.name || '').toLowerCase();
            const aNameIdx = aNameText.indexOf(lowerQuery);
            const bNameIdx = bNameText.indexOf(lowerQuery);

            const aHasName = aNameIdx !== -1;
            const bHasName = bNameIdx !== -1;

            if (aHasName && !bHasName) return -1;
            if (!aHasName && bHasName) return 1;
            if (aHasName && bHasName) {
              if (aNameIdx !== bNameIdx) {
                return aNameIdx - bNameIdx;
              }
            }

            return 0;
          });
        }

        // Set combined results
        setResults(merged);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [query, videos, API_URL, activeFilter]);

  const getDirectoryInfo = (filePath) => {
    if (!filePath) return { path: '', name: '' };
    const lastSlash = Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/'));
    if (lastSlash === -1) return { path: '', name: t('other_folder', language) };
    const dirPath = filePath.substring(0, lastSlash);
    const lastSlashDir = Math.max(dirPath.lastIndexOf('\\'), dirPath.lastIndexOf('/'));
    const dirName = lastSlashDir !== -1 ? dirPath.substring(lastSlashDir + 1) : dirPath;
    return { path: dirPath, name: dirName };
  };

  const handleResultClick = (videoPath) => {
    const { path: dir } = getDirectoryInfo(videoPath);
    if (dir) {
      scanFolder(dir);
    }
    handleItemClick(videoPath);
    onClose();
  };

  const handleToggleShared = async (video, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await toggleSharedState(video);
    setResults(prev => prev.map(v => v.path === video.path ? { ...v, shared: !v.shared } : v));
  };

  const handleKeyDown = (e) => {
    if (matchesBinding(e, keybindings?.prevVideo)) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (matchesBinding(e, keybindings?.nextVideo)) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (matchesBinding(e, keybindings?.markShared)) {
      e.preventDefault();
      e.stopPropagation();
      if (results.length > 0 && results[selectedIndex]) {
        handleToggleShared(results[selectedIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      if (results.length > 0 && results[selectedIndex]) {
        handleCopyDescriptionToActive(results[selectedIndex]);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0 && results[selectedIndex]) {
        handleResultClick(results[selectedIndex].path);
      }
    }
  };


  // Group results by folder path
  const getGroupedResults = () => {
    const groups = [];
    const groupsMap = {};

    results.forEach(video => {
      const { path: dirPath, name: dirName } = getDirectoryInfo(video.path);
      if (!groupsMap[dirPath]) {
        groupsMap[dirPath] = {
          path: dirPath,
          name: dirName,
          videos: []
        };
        groups.push(groupsMap[dirPath]);
      }
      groupsMap[dirPath].videos.push(video);
    });

    return groups;
  };

  const groupedResults = getGroupedResults();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="bg-modal-surface border border-foreground/5 rounded-2xl w-full max-w-3xl h-[550px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 p-4"
    >
      <div className="flex flex-col h-full w-full" onClick={() => inputRef.current?.focus()}>
      {/* Top Searchbox Area */}
      <div className="flex items-center gap-3 relative shrink-0">
        <Search size={20} className="text-foreground/45 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('search_placeholder', language)}
          className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-lg text-foreground placeholder-foreground/20 pl-9 pr-24 py-2"
        />
        <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <Loader2 size={16} className="text-foreground/45 animate-spin" />
          )}
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-xs text-foreground/45 hover:text-foreground cursor-pointer transition"
            >
              {t('clear_btn', language)}
            </button>
          )}
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-md text-foreground/45 hover:text-foreground hover:bg-hover absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer transition"
          title={t('close_btn', language)}
        >
          <X size={18} />
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-1.5 mb-2 px-2 mt-1 select-none shrink-0" onClick={(e) => e.stopPropagation()}>
        {['name', 'description', 'folderName'].map((filter) => {
          const isActive = activeFilter === filter;
          const label = language === 'tr' 
            ? (filter === 'description' ? 'Açıklama' : filter === 'folderName' ? 'Klasör' : 'İsim')
            : (filter === 'description' ? 'Description' : filter === 'folderName' ? 'Folder' : 'Name');
          
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(isActive ? null : filter)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer select-none uppercase tracking-wider
                ${isActive 
                  ? 'bg-accent/15 text-accent border-accent/25 shadow-sm' 
                  : 'bg-muted/10 text-foreground/50 border-transparent hover:bg-hover hover:text-foreground'
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-muted/15 my-1.5 shrink-0" />

      {/* Results ListView Area */}
      <div className="flex-1 overflow-y-auto px-1 py-0 flex flex-col gap-0 min-h-0 custom-scrollbar">
        {groupedResults.length > 0 ? (
          groupedResults.map((group) => (
            <div key={group.path} className="flex flex-col gap-0.5 pb-3">
              {/* Folder Group Header */}
              <div className="text-[11px] font-medium text-foreground/45 border-b border-muted/5 px-2.5 py-1.5 select-none sticky top-0 z-10 bg-modal-surface flex items-center">
                <span>{group.name}</span>
              </div>
              
              {/* Videos list inside this group */}
              <div className="flex flex-col gap-0.5 pl-2">
                {group.videos.map((video) => {
                  const flatIdx = results.findIndex(r => r.path === video.path);
                  return (
                    <VideoListCard
                      key={video.path}
                      video={video}
                      activePath={results[selectedIndex]?.path}
                      selectedPaths={selectedPaths}
                      clipboardState={clipboardState}
                      selectionMode={false} // force single click navigation
                      EXT_COLORS={EXT_COLORS}
                      API_URL={API_URL}
                      videoRef={{ current: null }} // stub to avoid active scrub conflicts
                      muted={true}
                      volume={0}
                      videoTime={0}
                      videoDuration={0}
                      muteFeedback={null}
                      handleSeek={() => {}}
                      toggleMute={() => {}}
                      toggleSharedState={handleToggleShared}
                      handleCardMouseDown={() => {}}
                      handleCardMouseEnter={() => {}}
                      handleContextMenu={(e) => e.preventDefault()}
                      handleItemClick={handleResultClick}
                      setVideoDuration={() => {}}
                      setVideoTime={() => {}}
                      handleCopyPath={handleCopyPath}
                      language={language}
                      onCopyDescription={handleCopyDescriptionToActive}
                    />
                  );
                })}
              </div>
            </div>
          ))
        ) : query.trim() ? (
          <div className="text-sm text-foreground/40 italic text-center py-12">
            {t('no_matching_videos', language)}
          </div>
        ) : (
          <div className="text-xs text-foreground/35 italic text-center py-12 leading-relaxed">
            {t('search_desc_line1', language)}<br />
            {t('search_desc_line2', language)}
          </div>
        )}
      </div>
      </div>
    </Modal>
  );
}
