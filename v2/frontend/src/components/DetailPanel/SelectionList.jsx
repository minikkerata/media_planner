import React from 'react';
import MiniSelectionPlayer from './MiniSelectionPlayer';
import { t } from '../../utils/translations';

export default function SelectionList({ sortedSelected, API_URL, language }) {
  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0">
      {/* Selection Header */}
      <div className="h-8 flex items-center shrink-0">
        <span className="text-xs font-bold text-foreground/80">
          {t('selected_videos_count', language).replace('{count}', sortedSelected.length)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 p-2 bg-element border border-muted/10 rounded-lg content-start">
        {sortedSelected.map(video => (
          <MiniSelectionPlayer key={video.path} video={video} API_URL={API_URL} />
        ))}
      </div>
    </div>
  );
}
