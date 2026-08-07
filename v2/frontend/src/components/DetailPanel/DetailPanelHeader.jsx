import React from 'react';
import { PanelRightClose, Video } from 'lucide-react';
import Button from '../ui/Button';

export default function DetailPanelHeader({ selectionMode, sortedSelectedCount, activeVideo, setIsDetailCollapsed }) {
  return (
    <div className="p-4 border-b border-foreground/5 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-2 overflow-hidden">
        <Video size={16} className="text-accent shrink-0" />
        <h2 className="text-sm font-semibold text-foreground truncate">
          {selectionMode ? (
            `${sortedSelectedCount} Video Seçildi`
          ) : activeVideo ? (
            activeVideo.name
          ) : (
            'Detaylar'
          )}
        </h2>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsDetailCollapsed(true)}
        className="p-1 rounded-md text-foreground/50 hover:text-foreground shrink-0"
        title="Detay panelini daralt"
      >
        <PanelRightClose size={16} />
      </Button>
    </div>
  );
}
