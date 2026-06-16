import React from 'react';
import { IconFolder } from './Icons';
import { t } from '../utils/translations';

export default function FolderCard({ folder, clipboardState, selectionMode, scanFolder, handleCardMouseDown, handleCardMouseEnter, handleContextMenu, setHoveredFolder, language }) {
  const isCut = clipboardState.operation === 'cut' && clipboardState.paths.includes(folder.path);
  
  return (
    <div
      draggable="false"
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={(e) => handleCardMouseDown(folder.path, e)}
      onMouseEnter={() => { handleCardMouseEnter(folder.path); if(setHoveredFolder) setHoveredFolder(folder.path); }}
      onMouseLeave={() => { if(setHoveredFolder) setHoveredFolder(null); }}
      onClick={() => !selectionMode && scanFolder(folder.path)}
      onContextMenu={(e) => handleContextMenu(e, folder.path, true)}
      className={`group flex flex-col p-2 rounded-ui-lg bg-card-bg hover:bg-card-hover-bg border border-card-border hover:border-card-hover-border transition-all duration-150 ease-out cursor-pointer transform hover:scale-[1.04] shadow-md hover:shadow-lg ${isCut ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-center py-6 text-amber-500/90 group-hover:opacity-88 transition duration-150">
        <IconFolder className="w-14 h-14" />
      </div>
      <div className="mt-1 overflow-hidden">
        <p className="text-xs font-semibold text-foreground truncate group-hover:text-foreground">
          {folder.name}
        </p>
        <p className="text-[10px] text-foreground/50">{t('folder', language)}</p>
      </div>
    </div>
  );
}