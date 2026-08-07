import { useState, useEffect } from 'react';
import { PanelLeft, Settings, Folder, FolderOpen, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import Button from './ui/Button';
import { t } from '../utils/translations';
import { getShortcutString } from '../utils/shortcutUtils';
import logoLight from '../assets/logo_light.svg';
import logoDark from '../assets/logo_dark.svg';

function FolderTreeNode({ path, label, depth, currentFolder, scannedFolders, expandedFolders, onToggleExpand, onNavigate, onContextMenu }) {
  const children = scannedFolders[path] || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedFolders.has(path);
  const isActive = currentFolder === path;

  return (
    <div className="flex flex-col">
      {/* Folder Row */}
      <div 
        className={`flex items-center group py-1.5 px-2 rounded-lg cursor-pointer text-sm ${
          isActive 
            ? 'bg-active text-accent font-semibold' 
            : 'text-foreground/80 hover:bg-hover hover:text-foreground'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onNavigate(path)}
        onContextMenu={(e) => {
          if (onContextMenu) {
            onContextMenu(e, path, true);
          }
        }}
      >
        {/* Toggle Chevron */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(path);
          }}
          className={`p-1 rounded hover:bg-foreground/10 text-foreground/50 hover:text-foreground mr-1 flex items-center justify-center w-5 h-5 ${!hasChildren ? 'opacity-0 pointer-events-none' : ''}`}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Folder Icon */}
        <span className="mr-2 text-foreground/60 shrink-0">
          {isActive ? <FolderOpen size={16} className="text-accent" /> : <Folder size={16} />}
        </span>

        {/* Folder Label */}
        <span className="truncate flex-1 select-none">{label}</span>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="flex flex-col">
          {children.map(child => (
            <FolderTreeNode
              key={child.path}
              path={child.path}
              label={child.name}
              depth={depth + 1}
              currentFolder={currentFolder}
              scannedFolders={scannedFolders}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onNavigate={onNavigate}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to get folder name from path
const getFolderName = (path) => {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || path;
};



export default function Sidebar({ 
  currentFolder, subfolders, scanFolder, setShowSettingsModal, language, keybindings,
  isCollapsed, setIsCollapsed, onContextMenu, goBack, goForward, canGoBack, canGoForward,
  activeViewTab
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar_width');
    return saved ? parseInt(saved, 10) : 260;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [scannedFolders, setScannedFolders] = useState({});
  const [treeRoot, setTreeRoot] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  // Resize handler
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      let newWidth = e.clientX;
      if (newWidth < 120) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
        if (newWidth > 500) newWidth = 500;
        setSidebarWidth(newWidth);
        localStorage.setItem('sidebar_width', newWidth.toString());
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
  }, [isResizing]);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Listen to folder navigation to update tree structure
  useEffect(() => {
    if (currentFolder) {
      setScannedFolders(prev => ({
        ...prev,
        [currentFolder]: subfolders || []
      }));

      // Update treeRoot dynamically
      setTreeRoot(prev => {
        if (!prev) return currentFolder;

        const normPrev = prev.replace(/\\/g, '/').toLowerCase();
        const normCurrent = currentFolder.replace(/\\/g, '/').toLowerCase();

        // If current path is ancestor/parent of previous root, expand root upwards
        if (normPrev.startsWith(normCurrent) && normPrev !== normCurrent) {
          return currentFolder;
        }

        // If current path is completely outside previous root, reset root to current folder
        if (!normCurrent.startsWith(normPrev)) {
          return currentFolder;
        }

        return prev;
      });

      // Automatically expand current folder
      setExpandedFolders(prev => {
        const next = new Set(prev);
        next.add(currentFolder);
        return next;
      });
    }
  }, [currentFolder, subfolders]);

  const toggleExpand = (folderPath) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const handleNavigate = (path) => {
    scanFolder(path);
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  };

  // Safe wrapper for rendering node recursively
  const renderFolderNode = (path, label, depth) => {
    return (
      <FolderTreeNode
        key={path}
        path={path}
        label={label}
        depth={depth}
        currentFolder={currentFolder}
        scannedFolders={scannedFolders}
        expandedFolders={expandedFolders}
        onToggleExpand={toggleExpand}
        onNavigate={handleNavigate}
        onContextMenu={onContextMenu}
      />
    );
  };

  const transitionClass = '';

  return (
    <div 
      className={`${transitionClass} h-screen flex flex-col shrink-0 text-foreground font-sans relative z-40 ${
        isCollapsed 
          ? 'w-0 bg-transparent border-r border-transparent overflow-hidden' 
          : 'bg-surface border-r border-foreground/5'
      }`}
      style={{ width: isCollapsed ? undefined : `${sidebarWidth}px` }}
    >
      <div className="flex flex-col h-full w-full">
        {/* Header with App Icon and Toggle */}
        <div className="flex items-center justify-between px-3 py-2.5 shrink-0 h-[58px]">
          {!isCollapsed && (
            <div className="flex items-center justify-between flex-1 mr-2 overflow-hidden">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <img src={logoLight} alt="Logo" className="w-full h-full object-contain drop-shadow-md show-in-light" />
                  <img src={logoDark} alt="Logo" className="w-full h-full object-contain drop-shadow-md show-in-dark" />
                </div>
                <span className="font-semibold text-foreground tracking-wide text-sm truncate">Media Planner</span>
              </div>
            </div>
          )}
          {activeViewTab !== 'calendar' && (
            <Button 
              variant="ghost"
              size="icon"
              onClick={(e) => {
                if (isCollapsed) e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className={isCollapsed ? 'mx-auto' : 'p-1.5'}
              title={isCollapsed ? t('expand', language) : t('collapse', language)}
            >
              <PanelLeft size={18} />
            </Button>
          )}
        </div>

        {/* Folder Tree Body */}
        <div className="flex-1 overflow-y-auto px-2 py-3 select-none">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 mb-3 select-none">
              <span className="text-[10px] font-bold text-foreground/45 uppercase tracking-wider">
                {t('folders', language)}
              </span>
              
              {/* Back/Forward Buttons */}
              <div className="flex items-center gap-0.5 bg-element border border-muted/15 rounded-ui-md p-0.5 h-7">
                <button
                  onClick={goBack}
                  disabled={!canGoBack}
                  tabIndex={-1}
                  className="flex items-center justify-center rounded-ui-sm text-foreground/60 hover:text-foreground hover:bg-hover disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer h-5.5 w-5.5"
                  title={t('back', language)}
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={goForward}
                  disabled={!canGoForward}
                  tabIndex={-1}
                  className="flex items-center justify-center rounded-ui-sm text-foreground/60 hover:text-foreground hover:bg-hover disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer h-5.5 w-5.5"
                  title={t('forward', language)}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

          {isCollapsed ? (
            <div className="flex flex-col items-center gap-4 text-foreground/40 mt-4">
              <Folder size={18} title={t('folders', language)} />
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {treeRoot ? (
                renderFolderNode(treeRoot, getFolderName(treeRoot) || treeRoot, 0)
              ) : (
                <div className="text-xs text-foreground/40 px-2 py-4 italic">
                  {t('no_folder_selected_sidebar', language)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Bottom Area */}
        <div className="p-2 shrink-0">
          <Button 
            variant="none"
            size="none"
            onClick={() => setShowSettingsModal(true)}
            className={`flex items-center gap-3 w-full rounded-lg hover:bg-hover ${isCollapsed ? 'justify-center p-2' : 'p-2.5'}`}
            title={`${t('settings', language)} (${keybindings ? getShortcutString(keybindings.toggleSettings, language) : 'Alt+,'})`}
          >
            <div className="w-7 h-7 bg-active text-foreground rounded-full flex items-center justify-center shrink-0 border border-foreground/5">
              <Settings size={14} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left overflow-hidden">
                <span className="font-semibold text-sm text-foreground truncate">{t('settings', language)}</span>
                <span className="text-[10px] text-foreground/50 truncate">
                  {keybindings ? getShortcutString(keybindings.toggleSettings, language) : 'Alt+,'}
                </span>
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Resizer Handle */}
      {!isCollapsed && (
        <div 
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/20 active:bg-accent/40 z-50"
        />
      )}
    </div>
  );
}
