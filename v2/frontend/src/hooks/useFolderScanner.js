import { useState } from 'react';
import { api } from '../services/api';
import { t } from '../utils/translations';

export function useFolderScanner(language, showToast, selectionMode, activePath, setActivePath, clipboardOps) {
  const [currentFolder, setCurrentFolder] = useState(null);
  const [parentFolder, setParentFolder] = useState(null);
  const [subfolders, setSubfolders] = useState([]);
  const [videos, setVideos] = useState([]);
  const [forwardStack, setForwardStack] = useState([]);

  const scanFolder = async (path, actionType = 'manual') => {
    if (!path || typeof path !== 'string' || path.trim() === '') {
      showToast(t('empty_folder_path', language).replace('{val}', JSON.stringify(path)), 'error');
      return;
    }
    const oldFolder = currentFolder;
    try {
      const data = await api.scan(path);
      if (data.success) {
        setCurrentFolder(data.current_folder);
        setParentFolder(data.parent_folder);
        setSubfolders(data.subfolders);
        setVideos(data.videos);
        const clipboard = clipboardOps?.current || clipboardOps;
        if (clipboard?.setClipboardState) {
          clipboard.setClipboardState(data.clipboard);
        }
        if (!selectionMode && data.videos.length > 0) {
          const activeExist = data.videos.find(v => v.path === activePath);
          if (!activeExist) {
            const unshared = data.videos.find(v => !v.shared);
            setActivePath(unshared ? unshared.path : data.videos[0].path);
          }
        }
        if (actionType === 'back') {
          if (oldFolder) {
            setForwardStack(prev => prev[prev.length - 1] === oldFolder ? prev : [...prev, oldFolder]);
          }
        } else if (actionType === 'forward') {
          setForwardStack(prev => prev.slice(0, -1));
        } else {
          setForwardStack([]);
        }
      } else {
        showToast(data.detail || data.message || t('scan_failed', language), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('cannot_connect_backend', language), 'error');
    }
  };

  const goBack = () => parentFolder && scanFolder(parentFolder, 'back');
  const goForward = () => forwardStack.length > 0 && scanFolder(forwardStack[forwardStack.length - 1], 'forward');

  return {
    currentFolder,
    setCurrentFolder,
    parentFolder,
    setParentFolder,
    subfolders,
    setSubfolders,
    videos,
    setVideos,
    forwardStack,
    setForwardStack,
    scanFolder,
    goBack,
    goForward,
    canGoBack: !!parentFolder,
    canGoForward: forwardStack.length > 0,
  };
}
