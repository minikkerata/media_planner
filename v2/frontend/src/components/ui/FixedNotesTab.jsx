import React, { useState, useEffect } from 'react';
import SettingsSection from './SettingsSection';
import { t } from '../../utils/translations';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';

export default function FixedNotesTab({ language, onClose, showToast, highlight = (x) => x }) {
  const [fixedText, setFixedText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSettings()
      .then(data => {
        if (data) {
          setFixedText(data.fixed_text || '');
        }
      })
      .catch(err => {
        console.error("Failed to load settings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    try {
      // Fetch existing settings first, update only fixed_text to preserve integrations credentials
      const currentSettings = await api.getSettings();
      const updated = { ...currentSettings, fixed_text: fixedText };
      const res = await api.saveSettings(updated);
      if (res.success) {
        if (showToast) showToast(t('save_success_toast', language), 'success');
        window.dispatchEvent(new Event('settings-changed'));
        onClose();
      } else {
        if (showToast) showToast(res.message || 'Hata', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast(t('cannot_connect_backend', language), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-foreground/50">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <SettingsSection 
      description={highlight(t('fixed_notes_desc', language))}
      onSave={handleSave}
      saveLabel={t('save_btn', language)}
    >
      <div className="flex-1 flex flex-col gap-3 py-2 min-h-0">
        <div className="flex-1 flex flex-col gap-1.5 min-h-0">
          <label className="text-sm font-medium text-foreground shrink-0">
            {language === 'tr' ? 'Varsayılan Sabit Metin Şablonu' : 'Default Fixed Text Template'}
          </label>
          <textarea
            value={fixedText}
            onChange={(e) => setFixedText(e.target.value)}
            className="w-full flex-1 bg-input-bg border border-muted/10 focus:border-accent/40 focus:ring-0 focus:outline-none rounded-ui-lg p-3 text-xs text-foreground resize-none min-h-0"
            placeholder={language === 'tr' ? 'Varsayılan sabit metni girin... @username, @filename, @folder gibi etiketleri kullanabilirsiniz.' : 'Enter default fixed text suffix...'}
          />
        </div>
      </div>
    </SettingsSection>
  );
}
