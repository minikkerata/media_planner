import React from 'react';
import { IconClose, IconCopy, IconPower } from '../Icons';
import { Loader2, X, Check } from 'lucide-react';
import Button from '../ui/Button';
import { t } from '../../utils/translations';

export default function SelectionToolbar({
  selectedPaths, exitSelectionMode, selectAll, clearSelection,
  copyCurrentNote, setShowSettingsModal, handleShutdown, keybindings, getShortcutString,
  uiStyle, language,
  uploadStatus, uploadQueue, uploadCurrentIndex, setShowBulkUploadModal
}) {
  return (
    <div className="flex items-center gap-3 h-[38px] animate-fade-in">
      <Button 
        variant="header-flat" 
        size="none" 
        onClick={exitSelectionMode} 
        tabIndex={-1} 
        className="transition-all" 
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
        className="transition-all"
      >
        <span>{t('select_all', language)}</span>
      </Button>
      
      <Button 
        variant="header-flat" 
        size="none" 
        onClick={clearSelection} 
        tabIndex={-1} 
        className="transition-all"
      >
        <span>{t('clear_selection', language)}</span>
      </Button>
      
      {uploadStatus !== 'idle' && (
        <>
          <div className="h-4 w-[1px] bg-muted/15" />
          <Button
            onClick={() => setShowBulkUploadModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-all shadow-md ${
              uploadStatus === 'success'
                ? 'bg-success text-white hover:bg-success/80'
                : uploadStatus === 'error'
                  ? 'bg-danger text-white hover:bg-danger/80'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {uploadStatus === 'publishing' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : uploadStatus === 'error' ? (
              <X className="w-3.5 h-3.5 text-white" />
            ) : (
              <Check className="w-3.5 h-3.5 text-white" />
            )}
            <span className="whitespace-nowrap text-white">
              {uploadStatus === 'success'
                ? 'Paylaşıldı ✓'
                : uploadStatus === 'error'
                  ? `${uploadQueue.filter((_, idx) => idx < uploadCurrentIndex).length}/${uploadQueue.length} Durduruldu`
                  : `${uploadCurrentIndex}/${uploadQueue.length} Paylaşılıyor`}
            </span>
          </Button>
        </>
      )}

    </div>
  );
}

