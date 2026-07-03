import React, { useState } from 'react';
import SettingsSection from './SettingsSection';
import { t } from '../../utils/translations';

export default function AITab({ language, onClose, highlight = (x) => x }) {
  const [defaultPrompt, setDefaultPrompt] = useState(() => {
    return localStorage.getItem('ai_default_prompt') || 'Metni imla ve dilbilgisi açısından düzelt, daha akıcı hale getir.';
  });

  const handleSave = () => {
    localStorage.setItem('ai_default_prompt', defaultPrompt);
    window.dispatchEvent(new Event('ai-settings-changed'));
    onClose();
  };

  return (
    <SettingsSection 
      description={highlight(t('ai_settings_desc', language))}
      onSave={handleSave}
      saveLabel={t('save_btn', language)}
    >
      <div className="flex-1 flex flex-col gap-3 py-2 min-h-0">
        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          <label className="text-sm font-medium text-foreground shrink-0">
            {highlight(t('ai_default_prompt_label', language))}
          </label>
          <textarea
            value={defaultPrompt}
            onChange={(e) => setDefaultPrompt(e.target.value)}
            className="w-full flex-1 bg-input-bg border border-muted/10 focus:border-accent/40 focus:ring-0 focus:outline-none rounded-ui-lg p-3 text-xs text-foreground resize-none min-h-0"
            placeholder="Yapay zekanın metni nasıl düzelteceğini açıklayan varsayılan sistem talimatını girin..."
          />
        </div>
      </div>
    </SettingsSection>
  );
}
