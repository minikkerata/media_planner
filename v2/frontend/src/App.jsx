import React from 'react';
import { useMediaPlanner } from './hooks/useMediaPlanner';
import { useTheme } from './hooks/useTheme';
import Header from './components/Header';
import DetailPanel from './components/DetailPanel';
import VideoCard from './components/VideoCard';
import { DeleteModal } from './components/Modals';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';
import SearchModal from './components/SearchModal';
import { IconCopy, IconCut, IconFolder, IconDelete } from './components/Icons';
import { t } from './utils/translations';

export default function App() {
  const planner = useMediaPlanner();
  const themeProps = useTheme();

  if (planner.isClosed) {
    return (
      <div className="flex h-screen items-center justify-center bg-base text-foreground font-sans">
        <div className="bg-surface border border-muted/15 rounded-ui-xl p-8 text-center max-w-md w-full">
          {t('app_closed', planner.language)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-screen text-foreground font-sans select-none overflow-hidden bg-base w-full">
      <Sidebar 
        currentFolder={planner.currentFolder}
        subfolders={planner.subfolders}
        scanFolder={planner.scanFolder}
        setShowSettingsModal={planner.setShowSettingsModal}
        language={planner.language}
        keybindings={planner.keybindings}
        isCollapsed={planner.isSidebarCollapsed}
        setIsCollapsed={planner.setIsSidebarCollapsed}
        onContextMenu={(e, p, f) => {
          e.preventDefault();
          e.stopPropagation();
          planner.setContextMenu({ x: e.clientX, y: e.clientY, visible: true, targetPath: p, isFolder: f });
        }}
        goBack={planner.goBack}
        goForward={planner.goForward}
        canGoBack={planner.canGoBack}
        canGoForward={planner.canGoForward}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header 
          {...planner} 
          sortOption={planner.sortOption} 
          sortDirection={planner.sortDirection} 
          {...themeProps} 
          onOpenSearch={() => planner.setShowSearchModal(true)} 
        />
        <main 
          className="flex-1 overflow-y-auto px-4 pb-4 pt-10 relative" 
          onContextMenu={(e) => { 
            e.preventDefault(); 
            planner.setContextMenu({ x: e.clientX, y: e.clientY, visible: true, targetPath: null, isFolder: false }); 
          }}
        >
          {!planner.currentFolder ? (
            <div className="flex flex-col items-center justify-center h-full text-foreground/40 gap-2">
              <p className="text-sm">{t('enter_folder_start', planner.language)}</p>
            </div>
          ) : planner.getVisibleVideos().length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-foreground/40 gap-2">
              <p className="text-sm">{t('no_videos_found', planner.language)}</p>
            </div>
          ) : (
            <div 
              className={planner.gridSize === 'list' ? 'flex flex-col gap-0.5' : 'grid gap-4'}
              style={planner.gridSize === 'list' ? undefined : { 
                gridTemplateColumns: `repeat(auto-fill, minmax(${
                  (planner.activePath || planner.selectionMode)
                    ? (planner.gridSize === 320 ? 250 : planner.gridSize === 220 ? 175 : planner.gridSize === 150 ? 120 : planner.gridSize)
                    : planner.gridSize
                }px, 1fr))` 
              }}
            >
              {planner.getVisibleVideos().map((video, idx) => (
                <React.Fragment key={video.path}>
                  {planner.gridSize === 'list' && idx > 0 && (
                    <div className="h-[1px] bg-muted/15 my-0.5 shrink-0" />
                  )}
                  <VideoCard 
                    key={video.path} 
                  video={video} 
                  activePath={planner.activePath} 
                  selectedPaths={planner.selectedPaths} 
                  clipboardState={planner.clipboardState} 
                  selectionMode={planner.selectionMode} 
                  EXT_COLORS={{ ".mp4": "bg-blue-500/80", ".mov": "bg-purple-500/80", ".avi": "bg-red-500/80", ".mkv": "bg-amber-500/80", ".webm": "bg-green-500/80" }} 
                  API_URL="http://127.0.0.1:8085" 
                  videoRef={planner.videoRef} 
                  muted={planner.muted} 
                  volume={planner.volume} 
                  videoTime={planner.videoTime || 0} 
                  videoDuration={planner.videoDuration || 0} 
                  muteFeedback={planner.muteFeedback} 
                  handleSeek={planner.handleSeek} 
                  toggleMute={planner.toggleMute} 
                  toggleSharedState={planner.toggleSharedState} 
                  handleCardMouseDown={planner.handleCardMouseDown} 
                  handleCardMouseEnter={planner.handleCardMouseEnter} 
                  handleContextMenu={(e, p, f) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    planner.setContextMenu({ x: e.clientX, y: e.clientY, visible: true, targetPath: p, isFolder: f }); 
                  }} 
                  handleItemClick={planner.handleItemClick} 
                  setVideoDuration={planner.setVideoDuration} 
                  setVideoTime={planner.setVideoTime} 
                  handleCopyPath={(path) => { 
                    navigator.clipboard.writeText(path); 
                    planner.showToast(`${path} ${t('copied_msg', planner.language)}`, "success"); 
                  }} 
                  isListView={planner.gridSize === 'list'}
                  language={planner.language}
                />
              </React.Fragment>
            ))}
            </div>
          )}
        </main>
      </div>
      <DetailPanel {...planner} API_URL="http://127.0.0.1:8085" />
      
      {planner.contextMenu.visible && (
        <div 
          className="absolute bg-surface border border-muted/15 rounded-ui-lg p-1.5 shadow-2xl w-48 flex flex-col gap-0.5 z-50" 
          style={{ top: planner.contextMenu.y, left: planner.contextMenu.x }} 
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => { 
              planner.setContextMenu(p => ({ ...p, visible: false })); 
              planner.triggerClipboardAction('copy', planner.contextMenu.targetPath); 
            }} 
            disabled={planner.contextMenu.isFolder || (!planner.contextMenu.targetPath && (planner.selectionMode ? planner.selectedPaths.size === 0 : !planner.activePath))} 
            className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-ui-sm text-foreground/80 hover:text-foreground hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer w-full text-left"
          >
            <span className="flex items-center gap-2">
              <IconCopy className="w-3.5 h-3.5 text-accent" />
              <span>{t('copy', planner.language)}</span>
            </span>
            <span className="text-[10px] text-foreground/40 font-mono">Ctrl+C</span>
          </button>
          
          <button 
            onClick={() => { 
              planner.setContextMenu(p => ({ ...p, visible: false })); 
              let paths = []; 
              if (planner.selectionMode && planner.selectedPaths.has(planner.contextMenu.targetPath)) { 
                paths = Array.from(planner.selectedPaths); 
              } else if (planner.contextMenu.targetPath) { 
                paths = [planner.contextMenu.targetPath]; 
              } else if (planner.activePath) { 
                paths = [planner.activePath]; 
              } 
              if (paths.length > 0) { 
                navigator.clipboard.writeText(paths.join('\n')); 
                planner.showToast(paths.length > 1 ? `${paths.length} ${t('paths_copied', planner.language)}` : `${paths[0]} ${t('copied_msg', planner.language)}`, "success"); 
              } 
            }} 
            disabled={!planner.contextMenu.targetPath && (planner.selectionMode ? planner.selectedPaths.size === 0 : !planner.activePath)} 
            className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-ui-sm text-foreground/80 hover:text-foreground hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer w-full text-left"
          >
            <span className="flex items-center gap-2">
              <IconCopy className="w-3.5 h-3.5 text-accent" />
              <span>{t('copy_path', planner.language)}</span>
            </span>
          </button>
          
          <button 
            onClick={() => { 
              planner.setContextMenu(p => ({ ...p, visible: false })); 
              planner.triggerClipboardAction('cut', planner.contextMenu.targetPath); 
            }} 
            disabled={planner.contextMenu.isFolder || (!planner.contextMenu.targetPath && (planner.selectionMode ? planner.selectedPaths.size === 0 : !planner.activePath))} 
            className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-ui-sm text-foreground/80 hover:text-foreground hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer w-full text-left"
          >
            <span className="flex items-center gap-2">
              <IconCut className="w-3.5 h-3.5 text-accent" />
              <span>{t('cut', planner.language)}</span>
            </span>
            <span className="text-[10px] text-foreground/40 font-mono">Ctrl+X</span>
          </button>
          
          <div className="h-[1px] bg-muted/15 my-1" />
          
          <button 
            onClick={() => { 
              const target = planner.contextMenu.isFolder ? planner.contextMenu.targetPath : null; 
              planner.setContextMenu(p => ({ ...p, visible: false })); 
              planner.pasteClipboard(target); 
            }} 
            disabled={!planner.clipboardState.operation || planner.clipboardState.paths.length === 0} 
            className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-ui-sm text-foreground/80 hover:text-foreground hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer w-full text-left"
          >
            <span className="flex items-center gap-2">
              <IconFolder className="w-3.5 h-3.5 text-accent" />
              <span>{t('paste', planner.language)}</span>
            </span>
            <span className="text-[10px] text-foreground/40 font-mono">Ctrl+V</span>
          </button>
          
          <div className="h-[1px] bg-muted/15 my-1" />
          
          <button 
            onClick={() => { 
              planner.setContextMenu(p => ({ ...p, visible: false })); 
              planner.triggerDeleteAction(); 
            }} 
            disabled={planner.contextMenu.isFolder || (!planner.contextMenu.targetPath && (planner.selectionMode ? planner.selectedPaths.size === 0 : !planner.activePath))} 
            className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-ui-sm text-foreground/80 hover:text-foreground hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer w-full text-left"
          >
            <span className="flex items-center gap-2">
              <IconDelete className="w-3.5 h-3.5 text-danger" />
              <span>{t('delete', planner.language)}</span>
            </span>
            <span className="text-[10px] text-foreground/40 font-mono">Del</span>
          </button>
        </div>
      )}
      <DeleteModal {...planner} />
      <SettingsModal 
        {...planner} 
        theme={themeProps.theme} 
        setTheme={themeProps.setTheme} 
        uiStyle={themeProps.uiStyle} 
        setUiStyle={themeProps.setUiStyle} 
        API_URL="http://127.0.0.1:8085"
      />
      <SearchModal 
        isOpen={planner.showSearchModal} 
        onClose={() => planner.setShowSearchModal(false)}
        API_URL="http://127.0.0.1:8085"
        scanFolder={planner.scanFolder}
        handleItemClick={planner.handleItemClick}
        activePath={planner.activePath}
        selectedPaths={planner.selectedPaths}
        clipboardState={planner.clipboardState}
        selectionMode={planner.selectionMode}
        EXT_COLORS={{ ".mp4": "bg-blue-500/80", ".mov": "bg-purple-500/80", ".avi": "bg-red-500/80", ".mkv": "bg-amber-500/80", ".webm": "bg-green-500/80" }}
        toggleSharedState={planner.toggleSharedState}
        handleCopyPath={(path) => {
          navigator.clipboard.writeText(path);
          planner.showToast(`${path} ${t('copied_msg', planner.language)}`, "success");
        }}
        keybindings={planner.keybindings}
        videos={planner.videos}
        language={planner.language}
      />
      {planner.toast.visible && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex justify-center z-50">
          <div 
            className={`px-4 py-2 rounded-ui-md text-xs font-semibold shadow-xl flex items-center gap-2 ${
              planner.toast.type === 'error' 
                ? 'bg-danger text-white border border-danger/30' 
                : planner.toast.type === 'info' 
                  ? 'bg-accent text-accent-foreground border border-accent/30' 
                  : 'bg-toast-success-bg text-toast-success-text border border-toast-success-border'
            }`}
          >
            <span>{planner.toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}