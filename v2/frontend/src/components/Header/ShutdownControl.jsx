import React from 'react';
import { IconPower } from '../Icons';
import { t } from '../../utils/translations';

export default function ShutdownControl({ handleShutdown, uiStyle, language, isServerHealthy = true }) {
  return (
    <button 
      onClick={handleShutdown} 
      tabIndex={-1} 
      className="p-1.5 h-8 w-8 transition-all flex items-center justify-center hover:bg-hover rounded-ui-md cursor-pointer" 
      title={t('shutdown_tooltip', language)}
    >
      <IconPower className={`w-4.5 h-4.5 shrink-0 transition-colors ${isServerHealthy ? 'text-white/80 hover:text-white' : 'text-danger animate-pulse'}`} />
    </button>
  );
}

