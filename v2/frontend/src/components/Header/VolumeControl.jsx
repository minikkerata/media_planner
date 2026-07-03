import React from 'react';
import { IconVolume, IconMute } from '../Icons';
import Slider from '../ui/Slider';

export default function VolumeControl({ muted, toggleMute, volume, handleVolumeChange }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={toggleMute} tabIndex={-1} className="p-1 rounded-ui-md hover:bg-hover text-foreground/80 hover:text-foreground transition cursor-pointer">
        {muted ? <IconVolume className="w-4.5 h-4.5" /> : <IconMute className="w-4.5 h-4.5" />}
      </button>
      <Slider
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : volume}
        onChange={handleVolumeChange}
        widthClass="w-24"
      />
    </div>
  );
}
