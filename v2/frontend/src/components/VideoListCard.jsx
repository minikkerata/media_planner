import React, { useRef, useState, useEffect } from 'react';
import { IconCheck, IconCopy } from './Icons';
import { t } from '../utils/translations';
import { FileText } from 'lucide-react';

export default function VideoListCard({
  video, activePath, selectedPaths, clipboardState, selectionMode, EXT_COLORS, API_URL,
  videoRef, muted, volume, videoTime, videoDuration, muteFeedback, handleSeek, toggleMute,
  toggleSharedState, handleCardMouseDown, handleCardMouseEnter, handleContextMenu, handleItemClick,
  setVideoDuration, setVideoTime, handleCopyPath, language, onCopyDescription
}) {
  const isActive = activePath === video.path;
  const isSelected = selectedPaths.has(video.path);
  const isCut = clipboardState.operation === 'cut' && clipboardState.paths.includes(video.path);
  const isCopied = clipboardState.operation === 'copy' && clipboardState.paths.includes(video.path);
  
  const [isHovering, setIsHovering] = useState(false);
  const [showCopyTick, setShowCopyTick] = useState(false);
  const hoverVideoRef = useRef(null);

  const isSelectedOrActive = (selectionMode && isSelected) || (!selectionMode && isActive);

  let listBgClass = 'bg-transparent text-foreground/80 hover:bg-hover hover:text-foreground';
  let listBorderClass = 'border-transparent';
  if (video.shared) {
    listBgClass = 'bg-success/[0.09] text-foreground/80 hover:bg-success/[0.13] hover:text-foreground';
    listBorderClass = 'border-success/35';
  }
  if (selectionMode && isSelected) {
    listBgClass = 'bg-active hover:bg-hover text-foreground/80 hover:text-foreground';
    listBorderClass = 'border-transparent';
  } else if (isActive) {
    listBgClass = 'bg-active text-accent font-semibold';
    listBorderClass = 'border-transparent';
  }

  const cardRef = useRef(null);

  useEffect(() => {
    if (isActive || (selectionMode && isSelected)) {
      cardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [isActive, isSelected, selectionMode]);

  return (
    <div
      ref={cardRef}
      draggable="false"
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={(e) => handleCardMouseDown(video.path, e)}
      onMouseEnter={() => handleCardMouseEnter(video.path)}
      onClick={() => !selectionMode && handleItemClick(video.path)}
      onContextMenu={(e) => handleContextMenu(e, video.path, false)}
      className={`group flex flex-row items-center gap-3.5 py-1.5 px-2 rounded-lg border border-solid transition-all duration-150 cursor-pointer relative isolate ${
        isSelectedOrActive ? 'is-selected-active' : ''
      } ${listBgClass} ${listBorderClass} ${isCut ? 'opacity-50' : ''}`}
    >
      {/* Left: Thumbnail/Video that scales up 3.2x on hover and overlaps smoothly */}
      <div 
        className="w-8 aspect-[9/16] rounded-[2px] overflow-hidden relative group/scrub shrink-0 bg-black/20 transition-all duration-250 ease-out hover:scale-[3.2] hover:z-30 hover:shadow-2xl origin-left"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <img
          src={`${API_URL}/api/thumbnail?path=${encodeURIComponent(video.path)}`}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.target.style.display = 'none'; }}
          draggable="false"
          onDragStart={(e) => e.preventDefault()}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition duration-150 z-10 ${isHovering ? 'opacity-0' : ''}`}
        />
        {isHovering && (
           <video
             ref={hoverVideoRef}
             src={`${API_URL}/api/video?path=${encodeURIComponent(video.path)}`}
             autoPlay
             loop
             muted
             preload="auto"
             className={`absolute inset-0 w-full h-full object-cover z-0`}
             draggable="false"
           />
        )}

        <span className={`absolute bottom-0.5 left-0.5 px-0.5 py-0.2 rounded-sm text-[5px] font-bold text-white uppercase z-20 pointer-events-none ${video.extension ? EXT_COLORS[video.extension] || 'bg-slate-600/80' : 'bg-slate-600/80'}`}>
          {video.extension ? video.extension.replace('.', '') : ''}
        </span>
      </div>

      {/* Middle: Details */}
      <div className={`flex-1 min-w-0 flex flex-col gap-0.5 ${onCopyDescription ? 'pr-28' : 'pr-20'}`}>
        <p className="text-xs font-semibold truncate">
          {video.name}
        </p>
        <p className="text-[10px] text-foreground/50 truncate italic font-normal">
          {video.description || t('no_desc_entered', language)}
        </p>
      </div>

      {/* Right: Hover Buttons */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-30">
        {onCopyDescription && !selectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyDescription(video);
            }}
            tabIndex={-1}
            className="p-1.5 rounded-full bg-black/40 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
            title={language === 'tr' ? 'Açıklamayı aktif videoya kopyala (Ctrl+Enter)' : 'Copy description to active video (Ctrl+Enter)'}
          >
            <FileText className="w-4 h-4 text-white/80" />
          </button>
        )}

        {!selectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (handleCopyPath) handleCopyPath(video.path);
              setShowCopyTick(true);
              setTimeout(() => setShowCopyTick(false), 1500);
            }}
            tabIndex={-1}
            className="p-1.5 rounded-full bg-black/40 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
            title={t('copy_path', language)}
          >
            {showCopyTick ? (
              <IconCheck className="w-4 h-4 text-success" />
            ) : (
              <IconCopy className="w-4 h-4 text-white/80" />
            )}
          </button>
        )}

        <button
          onClick={(e) => toggleSharedState(video, e)}
          tabIndex={-1}
          className={`p-1.5 rounded-full transition-all cursor-pointer ${
            (selectionMode && isSelected)
              ? 'bg-black/60 opacity-100 hover:bg-white/10'
              : 'bg-black/40 opacity-0 group-hover:opacity-100 hover:bg-white/10'
          }`}
          title={selectionMode ? t('select_label', language) : (video.shared ? t('remove_shared', language) : t('make_shared', language))}
        >
          {selectionMode ? (
            <div className={`w-4 h-4 rounded border border-solid flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-400 bg-transparent'}`}>
              {isSelected && <IconCheck className="w-3 h-3 text-white" />}
            </div>
          ) : (
            <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 border-solid ${video.shared ? 'bg-success border-success' : 'border-slate-400 bg-transparent'}`}>
              {video.shared && <IconCheck className="w-3 h-3 text-white" />}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
