import React, { useRef, useEffect, useState } from 'react';
import { IconCheck, IconCopy, IconArrowUp } from './Icons';
import { X, Check } from 'lucide-react';
import { t } from '../utils/translations';

export default function VideoGridCard({
  video, activePath, selectedPaths, clipboardState, selectionMode, EXT_COLORS, API_URL,
  videoRef, muted, volume, videoTime, videoDuration, muteFeedback, handleSeek, toggleMute,
  toggleSharedState, handleCardMouseDown, handleCardMouseEnter, handleContextMenu, handleItemClick,
  setVideoDuration, setVideoTime, handleCopyPath, language, uploadingPath,
  uploadQueue = [], uploadCurrentIndex = 0, uploadFailedPaths = new Map()
}) {
  const isActive = activePath === video.path;
  const isSelected = selectedPaths.has(video.path);
  const isCut = clipboardState.operation === 'cut' && clipboardState.paths.includes(video.path);
  const isCopied = clipboardState.operation === 'copy' && clipboardState.paths.includes(video.path);
  
  const [isHovering, setIsHovering] = useState(false);
  const [showCopyTick, setShowCopyTick] = useState(false);
  const hoverVideoRef = useRef(null);

  const formatPublishedDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };
  
  const isSelectedOrActive = (selectionMode && isSelected) || (!selectionMode && isActive);
  const scaleClass = isSelectedOrActive 
    ? 'z-30' 
    : 'hover:z-20';

  let borderClass = 'border-card-border border-[var(--theme-card-border-width)]';
  let bgClass = 'bg-card-bg hover:bg-card-hover-bg';

  if (selectionMode && isSelected) {
    bgClass = 'bg-active hover:bg-hover';
    borderClass = 'border-transparent border-[var(--theme-card-border-width)]';
  } else if (isActive) {
    bgClass = 'bg-active';
    borderClass = 'border-transparent border-[var(--theme-card-border-width)]';
  } else if (isCopied) {
    borderClass = 'border-copied-border border-[var(--theme-card-border-width)]';
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

  const outerBgClass = isSelectedOrActive ? bgClass : video.shared ? 'bg-success/[0.09]' : 'bg-transparent';
  const outerBorderClass = isSelectedOrActive ? borderClass : video.shared ? 'border-success/35 border-[var(--theme-card-border-width)]' : 'border-transparent';
  const outerPaddingClass = isSelectedOrActive ? 'p-1.5 rounded-card-dynamic border border-solid shadow-md hover:shadow-lg' : video.shared ? 'p-0 border border-solid rounded-card-dynamic' : 'p-0 border-transparent';

  const innerBgClass = isSelectedOrActive ? 'bg-black/20' : video.shared ? 'bg-success/[0.09]' : bgClass;
  const innerBorderClass = isSelectedOrActive ? 'border-transparent' : borderClass;
  const innerShadowClass = isSelectedOrActive ? '' : 'shadow-md hover:shadow-lg border border-solid';

  const queueIndex = uploadQueue.findIndex(v => v.path === video.path);
  const isQueued = queueIndex !== -1 && queueIndex > uploadCurrentIndex;
  const isFailed = uploadFailedPaths && uploadFailedPaths.has(video.path);

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
            className={`absolute inset-0 w-full h-full object-cover transition duration-150 z-10 rounded-card-dynamic ${isHovering ? 'opacity-0' : ''}`}
          />
          {isHovering && (
             <video
               ref={hoverVideoRef}
               src={`${API_URL}/api/video?path=${encodeURIComponent(video.path)}`}
               autoPlay
               loop
               muted
               preload="auto"
               className={`absolute inset-0 w-full h-full object-cover z-0 rounded-card-dynamic`}
               draggable="false"
             />
          )}

          {/* Centered Uploading Overlay */}
          {uploadingPath === video.path && (
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-20 animate-fade-in pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/60 border border-white/10 flex items-center justify-center shadow-lg">
                <IconArrowUp className="w-6 h-6 text-white animate-bounce" />
              </div>
              <span className="text-[10px] font-bold text-white tracking-widest uppercase bg-black/50 px-2 py-0.5 rounded border border-white/5">
                Uploading...
              </span>
            </div>
          )}

          {/* Centered Queued Overlay */}
          {isQueued && (
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[0.5px] flex flex-col items-center justify-center gap-2 z-20 animate-fade-in pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/60 border border-amber-500/30 flex items-center justify-center shadow-lg">
                <div className="w-4.5 h-4.5 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase bg-black/60 px-2.5 py-0.5 rounded border border-amber-500/20">
                Sırada...
              </span>
            </div>
          )}

          {/* Centered Failed Overlay */}
          {isFailed && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 z-20 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-danger border border-white/20 flex items-center justify-center shadow-lg">
                <X className="w-8 h-8 text-white" />
              </div>
              <span className="text-[10px] font-black text-white tracking-widest uppercase bg-danger px-2.5 py-1 rounded shadow-md">
                Hata
              </span>
            </div>
          )}

          {/* Centered Published Overlay */}
          {video.shared && uploadingPath !== video.path && !isFailed && (
            <div className={`absolute inset-0 bg-black/35 flex flex-col items-center justify-center gap-2 z-20 pointer-events-none transition-all duration-300 ${isHovering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <div className="w-14 h-14 rounded-full bg-success/90 text-white backdrop-blur-sm shadow-xl flex items-center justify-center border border-success/30 animate-scale-up">
                <Check size={30} strokeWidth={3.5} className="text-white" />
              </div>
              {video.updated_at > 0 && (
                <span className="text-xs font-black text-white text-center select-none tracking-wide" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)' }}>
                  {formatPublishedDate(video.updated_at)}
                </span>
              )}
            </div>
          )}

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
            (selectionMode && isSelected)
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
    </div>
  );
}
