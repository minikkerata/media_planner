import { useState } from 'react';
import { Globe } from 'lucide-react';
import SelectDropdown from './SelectDropdown';
import SettingsSection from './SettingsSection';
import { t } from '../../utils/translations';

export default function LanguageTab({ language, setLanguage, onClose, highlight = (x) => x }) {
  const [tempLang, setTempLang] = useState(language);

  const handleSave = () => {
    setLanguage(tempLang);
    onClose();
  };

  return (
    <SettingsSection 
      description={highlight(t('choose_lang_desc', language))}
      onSave={handleSave}
      saveLabel={t('save_language', language)}
    >
      <div className="flex items-center justify-between py-4 border-b border-foreground/5 group relative z-10">
        <label className="text-sm font-medium text-foreground">{highlight(t('interface_lang', language))}</label>
        <SelectDropdown
          value={tempLang}
          onChange={setTempLang}
          icon={Globe}
          classic={true}
          options={[
            { value: 'tr', label: 'Türkçe' },
            { value: 'en', label: 'English' }
          ]}
        />
      </div>
    </SettingsSection>
  );
}
