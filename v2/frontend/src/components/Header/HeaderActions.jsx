import React from 'react';
import { Search, Power, SlidersHorizontal } from 'lucide-react';
import Button from '../ui/Button';
import VolumeControl from './VolumeControl';
import ShutdownControl from './ShutdownControl';
import { t } from '../../utils/translations';

export default function HeaderActions({ 
  setShowSearchModal, 
  setShowSettingsModal, 
  handleShutdown, 
  volume, 
  muted, 
  handleVolumeChange, 
  toggleMute, 
  isServerHealthy, 
  language 
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSearchModal(true)}
        className="gap-2 text-foreground/70 hover:text-foreground"
        title="Video Ara (Ctrl+F)"
      >
        <Search size={14} />
        <span className="text-xs hidden sm:inline">{t('search_title', language)}</span>
        <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-active border border-foreground/10 rounded text-foreground/50 font-mono">
          Ctrl+F
        </kbd>
      </Button>

      <VolumeControl
        volume={volume}
        muted={muted}
        handleVolumeChange={handleVolumeChange}
        toggleMute={toggleMute}
        language={language}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSettingsModal(true)}
        className="gap-1.5 text-foreground/70 hover:text-foreground"
        title={t('settings', language)}
      >
        <SlidersHorizontal size={14} />
      </Button>

      <ShutdownControl
        handleShutdown={handleShutdown}
        isServerHealthy={isServerHealthy}
        language={language}
      />
    </div>
  );
}
