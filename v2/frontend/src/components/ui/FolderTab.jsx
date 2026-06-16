import { FolderOpen } from 'lucide-react';
import Button from './Button';
import SettingsSection from './SettingsSection';
import { t } from '../../utils/translations';

export default function FolderTab({ saveDir, onSelectFolder, language, onClose, highlight = (x) => x }) {
  const handleSelect = async () => {
    await onSelectFolder();
    if (onClose) onClose();
  };

  return (
    <SettingsSection description={highlight(t('folder_tab_desc', language))}>
      <div className="flex items-center justify-between py-4 border-b border-foreground/5 group">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">{highlight(t('save_location', language))}</label>
          <span className="text-xs text-foreground/50 max-w-[200px] truncate" title={saveDir || t('no_folder_selected', language)}>
            {highlight(saveDir || t('no_folder_selected', language))}
          </span>
        </div>
        
        <Button 
          variant="secondary"
          onClick={handleSelect}
          className="gap-2"
        >
          <FolderOpen size={16} />
          {highlight(t('folder', language))}
        </Button>
      </div>
    </SettingsSection>
  );
}
