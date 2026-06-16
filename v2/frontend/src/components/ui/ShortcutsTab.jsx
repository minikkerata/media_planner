import React, { useState, useEffect } from 'react';
import Button from './Button';
import SettingsSection from './SettingsSection';
import { t } from '../../utils/translations';
import { getShortcutString } from '../../utils/shortcutUtils';

export default function ShortcutsTab({ keybindings, saveKeybindings, resetKeybindings, onClose, language, highlight = (x) => x }) {
  const [listening, setListening] = useState(null);
  const [tempKeybindings, setTempKeybindings] = useState(keybindings);

  useEffect(() => {
    setTempKeybindings(keybindings);
    setListening(null);
  }, [keybindings]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!listening) return;
      e.preventDefault();
      e.stopPropagation();
      
      // Ignore modifier keys on their own
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
      
      const newBinding = {
        key: e.key.toLowerCase(),
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey
      };
      
      setTempKeybindings(prev => ({
        ...prev,
        [listening]: newBinding
      }));
      setListening(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listening]);

  const getShortcutStringValue = (binding) => {
    return getShortcutString(binding, language);
  };

  const handleSave = () => {
    saveKeybindings(tempKeybindings);
    if (onClose) onClose();
  };

  const handleClear = (action) => {
    setTempKeybindings(prev => ({
      ...prev,
      [action]: null
    }));
  };

  const shortcutGroups = [
    {
      titleKey: 'shortcut_group_player',
      keys: ['playPause', 'seekBackward', 'seekForward', 'toggleMute']
    },
    {
      titleKey: 'shortcut_group_nav',
      keys: ['prevVideo', 'nextVideo', 'jumpToNextShared', 'markShared', 'openNoteFinder']
    },
    {
      titleKey: 'shortcut_group_ops',
      keys: ['copyPath', 'copyText', 'openLink', 'openExplorer', 'toggleSidebar', 'toggleDetailPanel']
    },
    {
      titleKey: 'shortcut_group_sys',
      keys: ['goUp', 'toggleSettings', 'shutdown']
    }
  ];

  return (
    <SettingsSection 
      description={t('shortcuts_desc', language)}
      onSave={handleSave}
      saveLabel={t('save_shortcuts', language)}
    >
      <div className="flex flex-col gap-y-0 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
        {shortcutGroups.map(group => {
          const validKeys = group.keys.filter(k => tempKeybindings[k] !== undefined);
          if (validKeys.length === 0) return null;

          return (
            <React.Fragment key={group.titleKey}>
              {/* Group Sticky Header */}
              <div className="pt-4 pb-2 border-b border-foreground/10 text-xs font-bold text-accent uppercase tracking-wider sticky top-0 bg-modal-base z-10">
                {highlight(t(group.titleKey, language))}
              </div>
              
              {/* Group Items */}
              {validKeys.map(key => {
                const binding = tempKeybindings[key];
                return (
                  <div key={key} className="flex items-center justify-between py-2.5 border-b border-foreground/5 group">
                    <label className="text-xs font-semibold text-foreground truncate pr-2" title={t(key, language)}>
                      {highlight(t(key, language))}
                    </label>
                    <div className="flex gap-2 w-48 shrink-0 items-center justify-end">
                      <Button 
                        variant="none"
                        size="none"
                        onClick={() => setListening(key)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-ui-md transition-colors select-none h-8
                          ${listening === key 
                            ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' 
                            : 'bg-active hover:bg-hover text-foreground'}`}
                      >
                        {listening === key ? (
                          <span className="animate-pulse">{t('press_keys', language) || 'Tuşlara Basın...'}</span>
                        ) : (
                          <>{highlight(getShortcutStringValue(binding))}</>
                        )}
                      </Button>
                      
                      {listening === key ? (
                        <Button 
                          variant="secondary"
                          size="none"
                          onClick={() => setListening(null)}
                          className="h-8 px-2 py-0"
                        >
                          {t('cancel', language) || 'İptal'}
                        </Button>
                      ) : (
                        binding && (
                          <Button
                            variant="ghost"
                            size="none"
                            onClick={() => handleClear(key)}
                            className="text-[10px] text-danger hover:bg-danger/10 hover:text-danger h-8 px-2.5 py-0"
                            title={t('clear', language)}
                          >
                            {t('clear', language) || 'Temizle'}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Reset Defaults button floated at bottom left */}
      <div className="absolute bottom-8 left-8">
        <Button
          variant="secondary"
          size="none"
          onClick={() => {
            resetKeybindings();
            if (onClose) onClose();
          }}
          className="hover:bg-danger/10 hover:text-danger hover:border-danger/30 text-xs py-2 px-4 transition-colors"
        >
          {t('reset_defaults', language) || 'Varsayılana Sıfırla'}
        </Button>
      </div>
    </SettingsSection>
  );
}
