import React from 'react';
import { IconCheck } from '../Icons';
import { Search, PanelLeft } from 'lucide-react';
import Button from '../ui/Button';
import { t } from '../../utils/translations';

export default function NavigationToolbar({
  videos, enterSelectionMode, visibleVideosCount, onOpenSearch, language,
  isSidebarCollapsed, onOpenSidebar
}) {
  return (
    <>
      {/* Sol Kısım */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Sidebar açma butonu — sadece sidebar kapalıyken */}
        {isSidebarCollapsed && (
          <button
            onClick={onOpenSidebar}
            tabIndex={-1}
            className="p-1.5 rounded-ui-md hover:bg-hover text-foreground/50 hover:text-foreground transition cursor-pointer"
            title={t('expand', language)}
          >
            <PanelLeft size={16} />
          </button>
        )}

        {/* Search Trigger Button */}
        <button
          onClick={onOpenSearch}
          tabIndex={-1}
          className="flex items-center gap-2 px-3 py-1.5 rounded-ui-md bg-active hover:bg-hover text-foreground/50 hover:text-foreground/70 text-xs font-semibold transition cursor-pointer h-8 w-48 text-left border-0"
          title={t('search_videos_tooltip', language)}
        >
          <Search size={14} className="text-foreground/45" />
          <span className="truncate">{t('search_input_placeholder', language)}</span>
        </button>

        <Button
          variant="filled"
          size="none"
          onClick={() => videos.length > 0 && enterSelectionMode(videos[0].path)}
          disabled={videos.length === 0} tabIndex={-1}
          className="cursor-pointer transition-all"
          title={t('enter_selection_title', language)}
        >
          <span>{t('select_label', language)}</span>
        </Button>
        {videos.length > 0 && (
          <span className="text-sm font-semibold text-foreground">{t('video_count_label', language).replace('{count}', visibleVideosCount)}</span>
        )}
      </div>
    </>
  );
}

