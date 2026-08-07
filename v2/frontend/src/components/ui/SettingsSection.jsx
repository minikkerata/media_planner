import React from 'react';
import Button from './Button';

export default function SettingsSection({ 
  description, 
  children, 
  onSave, 
  saveLabel = 'Kaydet' 
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden text-left w-full">
      <div className="flex-1 flex flex-col gap-4 pr-2 min-h-0 w-full text-left">
        {description && <p className="text-xs text-foreground/50 shrink-0 text-left">{description}</p>}
        {children}
      </div>
      
      {onSave && (
        <div className="flex justify-end w-full pt-4 border-t border-foreground/5 mt-auto shrink-0">
          <Button variant="primary" onClick={onSave}>
            {saveLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
