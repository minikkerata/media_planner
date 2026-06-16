import React from 'react';
import { IconClose, IconCopy, IconPower } from '../Icons';
import Button from '../ui/Button';
import { t } from '../../utils/translations';

export default function SelectionToolbar({
  selectedPaths, exitSelectionMode, selectAll, clearSelection,
  copyCurrentNote, setShowSettingsModal, handleShutdown, keybindings, getShortcutString,
  uiStyle, language
}) {
  return (
    <div className="flex items-center gap-3 h-[38px] animate-fade-in">
      <Button 
        variant="header-flat" 
        size="none" 
        onClick={exitSelectionMode} 
        tabIndex={-1} 
        className="cursor-pointer transition-all" 
        title={t('exit_selection_title', language)}
      >
        <span>{t('cancel', language)}</span>
      </Button>
      <span className="text-sm font-semibold text-foreground">{t('videos_selected', language).replace('{count}', selectedPaths.size)}</span>
      <div className="h-4 w-[1px] bg-muted/15" />
      
      <Button 
        variant="header-flat" 
        size="none" 
        onClick={selectAll} 
        tabIndex={-1} 
        className="cursor-pointer transition-all"
      >
        <span>{t('select_all', language)}</span>
      </Button>
      
      <Button 
        variant="header-flat" 
        size="none" 
        onClick={clearSelection} 
        tabIndex={-1} 
        className="cursor-pointer transition-all"
      >
        <span>{t('clear_selection', language)}</span>
      </Button>
      
      <Button 
        variant="header-flat" 
        size="none" 
        onClick={handleShutdown} 
        tabIndex={-1} 
        className="cursor-pointer transition-all ml-auto hover:text-danger!" 
        title={t('shutdown_tooltip', language)}
      >
        <span>{t('shutdown_short', language)}</span>
      </Button>
    </div>
  );
}

