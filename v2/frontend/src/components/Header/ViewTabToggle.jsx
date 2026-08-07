import React from 'react';
import { t } from '../../utils/translations';

export default function ViewTabToggle({ activeViewTab, setActiveViewTab, setIsSidebarCollapsed, language }) {
  return (
    <div className="flex items-center gap-1 bg-modal-surface p-1 rounded-lg border border-foreground/5 shrink-0">
      <button
        onClick={() => {
          setActiveViewTab('library');
        }}
        className={`text-[10px] font-bold px-3 py-1 rounded-md transition-all cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none
          ${activeViewTab === 'library'
            ? 'bg-active text-foreground shadow-sm font-black'
            : 'text-foreground/60 hover:text-foreground'
          }`}
      >
        {t('library', language)}
      </button>
      <button
        onClick={() => {
          setActiveViewTab('calendar');
          setIsSidebarCollapsed(true);
        }}
        className={`text-[10px] font-bold px-3 py-1 rounded-md transition-all cursor-pointer focus:outline-none focus:ring-0 focus-visible:outline-none
          ${activeViewTab === 'calendar'
            ? 'bg-active text-foreground shadow-sm font-black'
            : 'text-foreground/60 hover:text-foreground'
          }`}
      >
        {t('weekly_calendar', language)}
      </button>
    </div>
  );
}
