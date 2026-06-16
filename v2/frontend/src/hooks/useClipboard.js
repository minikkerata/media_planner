import { useState } from 'react';
import { t } from '../utils/translations';

export function useClipboard({ language, contextMenu, selectionMode, selectedPaths, activePath, hoveredFolder, currentFolder, api, showToast, scanFolder }) {
  const [clipboardState, setClipboardState] = useState({ operation: null, paths: [] });

  const triggerClipboardAction = async (operation, override = null) => {
    const target = override || (contextMenu.visible ? contextMenu.targetPath : null);
    let paths = target ? (selectionMode && selectedPaths.has(target) ? Array.from(selectedPaths) : [target]) : (selectionMode ? Array.from(selectedPaths) : [activePath].filter(Boolean));
    if (paths.length === 0) return;
    const data = await api.setClipboard(operation, paths);
    if (data.success) {
      setClipboardState(data.clipboard);
      showToast(t('clipboard_added_msg', language).replace('{count}', paths.length));
    }
  };

  const cancelClipboard = async () => {
    if (clipboardState.operation) {
      const data = await api.setClipboard(null, []);
      if (data.success) {
        setClipboardState(data.clipboard);
        showToast(t('clipboard_cancelled_msg', language), 'info');
      }
    }
  };

  const pasteClipboard = async (override = null) => {
    let dest;
    if (override) {
      dest = override;
    } else if (contextMenu.visible) {
      dest = contextMenu.isFolder ? contextMenu.targetPath : currentFolder;
    } else {
      dest = hoveredFolder || currentFolder;
    }
    
    if (!dest) {
      showToast(t('dest_folder_not_determined', language), 'error');
      return;
    }

    if (!clipboardState.operation || clipboardState.paths.length === 0) {
      showToast(t('clipboard_empty', language), 'error');
      return;
    }
    showToast(t('pasting', language), 'info');
    const data = await api.paste(dest);
    if (data.success) { 
      setClipboardState(data.clipboard); 
      scanFolder(currentFolder); 
      if (data.errors && data.errors.length > 0) {
        showToast(t('some_errors_occurred', language) + data.errors[0], 'error');
      } else {
        showToast(t('pasted_msg', language)); 
      }
    } else {
      showToast(data.detail || t('paste_failed', language), 'error');
    }
  };

  return { clipboardState, setClipboardState, triggerClipboardAction, cancelClipboard, pasteClipboard };
}
