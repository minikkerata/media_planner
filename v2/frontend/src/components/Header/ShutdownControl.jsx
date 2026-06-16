import React from 'react';
import { IconPower } from '../Icons';
import { t } from '../../utils/translations';

export default function ShutdownControl({ handleShutdown, uiStyle, language }) {
  return (
    <button 
      onClick={handleShutdown} 
      tabIndex={-1} 
      className="p-1.5 h-8 w-8 transition-all flex items-center justify-center hover:bg-hover text-foreground/60 hover:text-foreground rounded-ui-md cursor-pointer" 
      title={t('shutdown_tooltip', language)}
    >
      <IconPower className="w-4.5 h-4.5 text-danger shrink-0" />
    </button>
  );
}

