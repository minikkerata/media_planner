import { useState } from 'react';

export function useModalState() {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState('folder');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  return {
    showSettingsModal,
    setShowSettingsModal,
    settingsActiveTab,
    setSettingsActiveTab,
    showSearchModal,
    setShowSearchModal,
    showUploadModal,
    setShowUploadModal
  };
}
