import React from 'react';
import { t } from '../utils/translations';

export default function SettingsSidebarSearch({
  settingsQuery,
  handleSettingsSearch,
  handleSettingsCycle,
  setSettingsQuery,
  totalSettingsMatches,
  settingsMatchIndex,
  settingsSearchInputRef,
  language
}) {
  return (
    <div className="px-1.5 py-1 mb-1 relative shrink-0">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-foreground/[0.06] backdrop-blur-md border border-foreground/[0.08] focus-within:border-accent/40 rounded-ui-md h-[30px] relative">
        <input
          ref={settingsSearchInputRef}
          type="text"
          placeholder={t('settings_search_placeholder', language)}
          value={settingsQuery}
          onChange={(e) => handleSettingsSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSettingsCycle(e);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setSettingsQuery('');
            }
          }}
          className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs text-foreground placeholder-foreground/30 p-0"
        />
        {settingsQuery.trim() && totalSettingsMatches > 0 && (
          <span className="text-[10px] text-foreground/45 font-mono select-none shrink-0 mr-0.5">
            {settingsMatchIndex + 1} / {totalSettingsMatches}
          </span>
        )}
      </div>
    </div>
  );
}
