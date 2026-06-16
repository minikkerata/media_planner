import React from 'react';
import { IconVolume, IconMute } from '../Icons';

export default function VolumeControl({ muted, toggleMute, volume, handleVolumeChange }) {
  const volPercent = (muted ? 0 : volume) * 100;

  return (
    <div className="flex items-center gap-2">
      <button onClick={toggleMute} tabIndex={-1} className="p-1 rounded-ui-md hover:bg-hover text-foreground/80 hover:text-foreground transition cursor-pointer">
        {muted ? <IconVolume className="w-4.5 h-4.5" /> : <IconMute className="w-4.5 h-4.5" />}
      </button>
      <input
        type="range" min="0" max="1" step="0.05"
        value={muted ? 0 : volume}
        onChange={handleVolumeChange}
        tabIndex={-1}
        className="w-24 h-1 rounded-ui-sm appearance-none cursor-pointer accent-foreground"
        style={{ background: `linear-gradient(to right, var(--theme-foreground) ${volPercent}%, var(--theme-active) ${volPercent}%)` }}
      />
    </div>
  );
}
