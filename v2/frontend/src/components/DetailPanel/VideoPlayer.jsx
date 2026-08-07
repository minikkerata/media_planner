import React from 'react';
import { 
  Play, Pause, Volume2, VolumeX, FolderOpen, 
  Check, ExternalLink
} from 'lucide-react';
import { IconCheck, IconMute, IconVolume, IconCopy } from '../Icons';
import Button from '../ui/Button';
import { t } from '../../utils/translations';
import Slider from '../ui/Slider';

const formatTime = (secs) => {
  if (typeof secs === 'string') return secs;
  if (isNaN(secs) || secs === null || secs === undefined) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function VideoPlayer({
  activeVideo,
  API_URL,
  language,
  videoRef,
  muted,
  volume,
  videoTime,
  videoDuration,
  setVideoTime,
  setVideoDuration,
  muteFeedback,
  completedFeedback,
  handleSeek,
  toggleMute,
  copyCurrentPaths,
  handleOpenLink,
  openInExplorer,
  handleVolumeChange,
  isPlaying,
  handlePlayPause,
  showCopyTick,
  setShowCopyTick,
  shouldShowOpenLink,
  isDragging,
  setIsDragging,
  dragTime,
  setDragTime,
  currentFolder
}) {
  const activeTime = isDragging ? dragTime : videoTime;

  return (
    <div className="flex flex-col gap-2 shrink-0 h-full w-full">
      {/* Video Header */}
      <div className="h-8 flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <span className="text-xs font-bold text-foreground/80 truncate pr-1" title={activeVideo.name}>
            {activeVideo.name}
          </span>
          <Button
            variant="filled"
            size="none"
            onClick={(e) => {
              e.stopPropagation();
              if (copyCurrentPaths) copyCurrentPaths();
              setShowCopyTick(true);
              setTimeout(() => setShowCopyTick(false), 1500);
            }}
            tabIndex={-1}
            className="transition-all flex items-center gap-1.5"
            title={t('copy_path_title', language)}
          >
            {showCopyTick ? (
              <>
                <IconCheck className="w-3.5 h-3.5 text-success" />
                <span>{t('copied_msg', language)}</span>
              </>
            ) : (
              <>
                <IconCopy className="w-3.5 h-3.5 text-foreground/80" />
                <span>{t('copy_path_title', language)}</span>
              </>
            )}
          </Button>
          {shouldShowOpenLink && (
            <Button
              variant="filled"
              size="none"
              onClick={handleOpenLink}
              tabIndex={-1}
              className="transition-all flex items-center gap-1.5"
              title={t('open_link', language)}
            >
              <ExternalLink className="w-3.5 h-3.5 text-foreground/80" />
              <span>{t('open_link', language)}</span>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Open in Explorer */}
          {currentFolder && (
            <Button
              variant="filled"
              size="none"
              onClick={openInExplorer}
              tabIndex={-1}
              className="p-1.5 h-8 w-8 transition-all flex items-center justify-center"
              title={t('openExplorer', language)}
            >
              <FolderOpen size={14} className="text-foreground shrink-0" />
            </Button>
          )}
          {/* Volume controls */}
          <div className="flex items-center gap-1 shrink-0">
            <Button 
              variant="none"
              size="none"
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              className="p-1 rounded hover:bg-foreground/5 text-foreground/80 hover:text-foreground transition-all flex items-center justify-center shrink-0"
              title={muted ? t('unmute_title', language) : t('mute_title', language)}
            >
              {muted ? <VolumeX size={15} className="shrink-0" /> : <Volume2 size={15} className="shrink-0" />}
            </Button>
            <div className="flex items-center shrink-0 ml-1.5">
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                onMouseDown={(e) => e.stopPropagation()}
                widthClass="w-32"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Player Container */}
      <div className="relative flex-1 min-h-0 bg-black/80 rounded-lg overflow-hidden border border-muted/15 shadow-md flex items-center justify-center group/player">
        <video
          ref={videoRef}
          src={`${API_URL}/api/video?path=${encodeURIComponent(activeVideo.path)}`}
          autoPlay
          loop
          muted={muted}
          onLoadedMetadata={(e) => {
            e.target.volume = muted ? 0 : volume;
            setVideoDuration(e.target.duration);
          }}
          onTimeUpdate={(e) => setVideoTime(e.target.currentTime)}
          onDurationChange={(e) => setVideoDuration(e.target.duration)}
          className={`w-full h-full object-cover ${activeVideo.shared ? 'opacity-90' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
          draggable="false"
          onDragStart={(e) => e.preventDefault()}
          tabIndex="-1"
        />

        {/* Mute/Volume visual feedback overlay */}
        {muteFeedback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-mute-feedback">
            <div className="p-3.5 rounded-full bg-black/75 text-white backdrop-blur-sm shadow-xl">
              {muteFeedback === 'muted' ? (
                <IconMute className="w-8 h-8 text-slate-100" />
              ) : (
                <IconVolume className="w-8 h-8 text-slate-100" />
              )}
            </div>
          </div>
        )}

        {/* Completed visual feedback overlay */}
        {completedFeedback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-mute-feedback">
            <div className="w-20 h-20 rounded-full bg-success/90 text-white backdrop-blur-sm shadow-xl flex items-center justify-center border border-success/30 animate-scale-up">
              <Check size={44} strokeWidth={3.5} className="text-white" />
            </div>
          </div>
        )}

        {/* In-player Controls (Visible on Hover) */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 z-30 opacity-0 group-hover/player:opacity-100 transition-opacity duration-200">
          {/* Timeline Slider */}
          <Slider
            min={0}
            max={videoDuration || 100}
            step={0.05}
            value={isDragging ? dragTime : videoTime}
            onMouseDown={() => {
              setIsDragging(true);
              setDragTime(videoTime);
            }}
            onTouchStart={() => {
              setIsDragging(true);
              setDragTime(videoTime);
            }}
            onInput={(e) => {
              const val = parseFloat(e.target.value);
              setDragTime(val);
              if (videoRef.current) {
                videoRef.current.currentTime = val;
              }
            }}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              handleSeek(val);
              setIsDragging(false);
            }}
            onMouseUp={() => {
              setIsDragging(false);
            }}
            onTouchEnd={() => {
              setIsDragging(false);
            }}
            accentColor="var(--theme-selected-border-color)"
          />

          {/* Bottom Row Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayPause}
                className="p-1 rounded text-white/95 hover:bg-white/10 hover:text-white transition cursor-pointer"
                title={isPlaying ? t('pause_title', language) : t('play_title', language)}
              >
                {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
              </button>
              <button
                onClick={toggleMute}
                className="p-1 rounded text-white/95 hover:bg-white/10 hover:text-white transition cursor-pointer"
                title={muted ? t('unmute_title', language) : t('mute_title', language)}
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <span className="text-[10px] text-white/80 font-mono select-none">
                {formatTime(videoTime)} / {formatTime(videoDuration)}
              </span>
            </div>

            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-600/80 text-white uppercase select-none">
              {activeVideo.extension ? activeVideo.extension.replace('.', '') : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
