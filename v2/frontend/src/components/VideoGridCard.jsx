import React, { useRef, useEffect, useState } from 'react';
import { IconCheck, IconCopy } from './Icons';
import { t } from '../utils/translations';

export default function VideoGridCard({
  video, activePath, selectedPaths, clipboardState, selectionMode, EXT_COLORS, API_URL,
  videoRef, muted, volume, videoTime, videoDuration, muteFeedback, handleSeek, toggleMute,
  toggleSharedState, handleCardMouseDown, handleCardMouseEnter, handleContextMenu, handleItemClick,
  setVideoDuration, setVideoTime, handleCopyPath, language
}) {
  const isActive = activePath === video.path;
  const isSelected = selectedPaths.has(video.path);
  const isCut = clipboardState.operation === 'cut' && clipboardState.paths.includes(video.path);
  const isCopied = clipboardState.operation === 'copy' && clipboardState.paths.includes(video.path);
  
  const [isHovering, setIsHovering] = useState(false);
  const [showCopyTick, setShowCopyTick] = useState(false);
  const hoverVideoRef = useRef(null);
  
  const isSelectedOrActive = (selectionMode && isSelected) || (!selectionMode && isActive);
  const scaleClass = isSelectedOrActive 
    ? 'z-30' 
    : 'hover:z-20';

  let borderClass = 'border-card-border border-[var(--theme-card-border-width)]';
  let bgClass = 'bg-card-bg hover:bg-card-hover-bg';
  if (video.shared) {
    bgClass = 'bg-success/10 hover:bg-success/15';
    borderClass = 'border-success/30 border-[var(--theme-card-border-width)]';
  }

  if (selectionMode && isSelected) {
    bgClass = 'bg-blue-600/10 hover:bg-blue-600/15';
    borderClass = 'border-transparent border-[var(--theme-card-border-width)]';
  } else if (isActive) {
    bgClass = 'bg-active';
    borderClass = 'border-transparent border-[var(--theme-card-border-width)]';
  } else if (isCopied) {
    borderClass = 'border-copied-border border-[var(--theme-card-border-width)]';
  } else if (video.shared) {
    borderClass = 'border-success/30 hover:border-success/55 border-[var(--theme-card-border-width)]';
  } else {
    borderClass = 'border-card-border hover:border-card-hover-border border-[var(--theme-card-border-width)]';
  }

  const cardRef = useRef(null);

  useEffect(() => {
    if (isActive || (selectionMode && isSelected)) {
      cardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isActive, isSelected, selectionMode]);

  const outerBgClass = isSelectedOrActive ? bgClass : 'bg-transparent';
  const outerBorderClass = isSelectedOrActive ? borderClass : 'border-transparent';
  const outerPaddingClass = isSelectedOrActive ? 'p-1.5 rounded-card-dynamic border border-solid shadow-md hover:shadow-lg' : 'p-0 border-transparent';

  const innerBgClass = isSelectedOrActive ? 'bg-black/20' : bgClass;
  const innerBorderClass = isSelectedOrActive ? 'border-transparent' : borderClass;
  const innerShadowClass = isSelectedOrActive ? '' : 'shadow-md hover:shadow-lg border border-solid';

  return (
    <div
      ref={cardRef}
      draggable="false"
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={(e) => handleCardMouseDown(video.path, e)}
      onMouseEnter={() => handleCardMouseEnter(video.path)}
      onClick={() => !selectionMode && handleItemClick(video.path)}
      onContextMenu={(e) => handleContextMenu(e, video.path, false)}
      className={`group flex flex-col transition-all duration-150 ease-out cursor-pointer transform video-card-container ${isSelectedOrActive ? 'is-selected-active' : ''} ${scaleClass} ${isCut ? 'opacity-50' : ''} ${outerBgClass} ${outerBorderClass} ${outerPaddingClass}`}
    >
      <div 
        className={`relative aspect-[9/16] rounded-card-dynamic overflow-hidden group isolate transition-all duration-150 ${innerBgClass} ${innerBorderClass} ${innerShadowClass}`}
        draggable="false"
        onDragStart={(e) => e.preventDefault()}
      >
        <div 
          className="w-full h-full relative group/scrub rounded-card-dynamic"
          draggable="false"
          onDragStart={(e) => e.preventDefault()}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <img
            src={`${API_URL}/api/thumbnail?path=${encodeURIComponent(video.path)}`}
            onError={(e) => { e.target.style.display = 'none'; }}
            draggable="false"
            onDragStart={(e) => e.preventDefault()}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition duration-150 z-10 rounded-card-dynamic ${video.shared ? 'opacity-80' : ''} ${isHovering ? 'opacity-0' : 'group-hover:opacity-88'}`}
          />
          {isHovering && (
             <video
               ref={hoverVideoRef}
               src={`${API_URL}/api/video?path=${encodeURIComponent(video.path)}`}
               autoPlay
               loop
               muted
               preload="auto"
               className={`absolute inset-0 w-full h-full object-cover z-0 rounded-card-dynamic ${video.shared ? 'opacity-90' : ''}`}
               draggable="false"
             />
          )}
          {video.shared && (
            <div className="absolute inset-0 bg-success/15 pointer-events-none z-15 rounded-card-dynamic transition-all duration-150" />
          )}
          <span className={`absolute bottom-2 left-2 px-1.5 py-0.5 rounded-ui-sm text-[8px] font-bold text-white uppercase z-20 pointer-events-none ${EXT_COLORS[video.extension] || 'bg-slate-600/80'}`}>
            {video.extension.replace('.', '')}
          </span>
        </div>

        {!selectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (handleCopyPath) handleCopyPath(video.path);
              setShowCopyTick(true);
              setTimeout(() => setShowCopyTick(false), 1500);
            }}
            tabIndex={-1}
            className="absolute top-2 right-[42px] p-1.5 rounded-full transition-all cursor-pointer z-30 bg-black/40 opacity-0 group-hover:opacity-100 hover:bg-white/10"
            title={t('copy_path', language)}
          >
            {showCopyTick ? (
              <IconCheck className="w-4.5 h-4.5 text-success" />
            ) : (
              <IconCopy className="w-4.5 h-4.5 text-white/80" />
            )}
          </button>
        )}

        <button
          onClick={(e) => toggleSharedState(video, e)}
          tabIndex={-1}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all cursor-pointer z-30 ${
            (selectionMode ? isSelected : video.shared) 
              ? 'bg-black/60 opacity-100 hover:bg-white/10' 
              : 'bg-black/40 opacity-0 group-hover:opacity-100 hover:bg-white/10'
          }`}
          title={selectionMode ? t('select_label', language) : (video.shared ? t('remove_shared', language) : t('make_shared', language))}
        >
          {selectionMode ? (
            <div className={`w-4.5 h-4.5 rounded border border-solid flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-400 bg-transparent'}`}>
              {isSelected && <IconCheck className="w-3.5 h-3.5 text-white" />}
            </div>
          ) : (
            <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-solid ${video.shared ? 'bg-success border-success' : 'border-slate-400 bg-transparent'}`}>
              {video.shared && <IconCheck className="w-3.5 h-3.5 text-white" />}
            </div>
          )}
        </button>
      </div>

      <div className="mt-1.5 px-0.5 pb-0.5 overflow-hidden">
        <p className={`text-xs font-semibold truncate transition-colors duration-150 ${isActive ? 'text-accent' : 'text-foreground group-hover:text-foreground'}`}>
          {video.name}
        </p>
        <p className={`text-[10px] truncate italic transition-colors duration-150 ${isActive ? 'text-accent/70' : 'text-foreground/60'}`}>
          {video.description || t('no_desc_entered', language)}
        </p>
      </div>
    </div>
  );
}
