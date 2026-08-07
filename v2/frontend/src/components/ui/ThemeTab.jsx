import { useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import SelectDropdown from './SelectDropdown';
import SettingsSection from './SettingsSection';
import { t } from '../../utils/translations';
import { api } from '../../services/api';

export default function ThemeTab({ theme, setTheme, language, onClose, highlight = (x) => x }) {
  const [tempTheme, setTempTheme] = useState(theme);

  const handleSave = () => {
    setTheme(tempTheme);
    api.saveSettings({ app_theme: tempTheme })
      .then(() => window.dispatchEvent(new Event('settings-changed')))
      .catch(() => {});
    onClose();
  };

  return (
    <SettingsSection 
      description={highlight(t('choose_theme_desc', language))}
      onSave={handleSave}
      saveLabel={t('save_btn', language)}
    >
      <div className="flex flex-col gap-1">
        {/* Renk Teması Seçenekleri */}
        <div className="flex items-center justify-between py-4 border-b border-foreground/5 group relative z-10">
          <label className="text-sm font-medium text-foreground">{highlight(t('theme_options', language))}</label>
          <SelectDropdown
            value={tempTheme}
            onChange={setTempTheme}
            classic={true}
            options={[
              { value: 'system', label: t('system_theme', language), icon: Monitor },
              { value: 'dark', label: t('dark_theme', language), icon: Moon },
              { value: 'light', label: t('light_theme', language), icon: Sun }
            ]}
          />
        </div>
      </div>
    </SettingsSection>
  );
}
