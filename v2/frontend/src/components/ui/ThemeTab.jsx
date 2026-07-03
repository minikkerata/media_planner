import { useState } from 'react';
import { Moon, Sun, Monitor, Palette } from 'lucide-react';
import SelectDropdown from './SelectDropdown';
import SettingsSection from './SettingsSection';
import { t } from '../../utils/translations';

export default function ThemeTab({ theme, setTheme, uiStyle, setUiStyle, language, onClose, highlight = (x) => x }) {
  const [tempTheme, setTempTheme] = useState(theme);
  const [tempUiStyle, setTempUiStyle] = useState(uiStyle);

  const handleSave = () => {
    setUiStyle(tempUiStyle);
    setTheme(tempTheme);
    onClose();
  };

  return (
    <SettingsSection 
      description={highlight(t('choose_theme_desc', language))}
      onSave={handleSave}
      saveLabel={t('save_btn', language)}
    >
      <div className="flex flex-col gap-1">
        {/* Arayüz Tasarım Stili */}
        <div className="flex items-center justify-between py-4 border-b border-foreground/5 group relative z-20">
          <label className="text-sm font-medium text-foreground">{highlight(t('interface_style', language))}</label>
          <SelectDropdown
            value={tempUiStyle}
            onChange={setTempUiStyle}
            icon={Palette}
            classic={true}
            options={[
              { value: 'old', label: t('classic_style', language) },
              { value: 'new', label: t('modern_style', language) }
            ]}
          />
        </div>

        {/* Renk Teması Seçenekleri */}
        {tempUiStyle === 'new' && (
          <div className="flex items-center justify-between py-4 border-b border-foreground/5 group relative z-10 animate-fade-in">
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
        )}
      </div>
    </SettingsSection>
  );
}
