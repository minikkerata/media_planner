import { t } from './translations';

export const getShortcutString = (binding, language = 'tr') => {
  if (!binding) return t('no_binding', language) || (language === 'tr' ? 'Yok' : 'None');
  const parts = [];
  if (binding.ctrlKey) parts.push('Ctrl');
  if (binding.shiftKey) parts.push('Shift');
  if (binding.altKey) parts.push('Alt');
  
  let keyName = binding.key;
  if (keyName === ' ') keyName = 'Space';
  else if (keyName?.length === 1) keyName = keyName.toUpperCase();
  else if (keyName) keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
  
  parts.push(keyName);
  return parts.join('+');
};
