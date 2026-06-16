import { t } from '../utils/translations';

export function useNavigation({
  language,
  videos,
  getVisibleVideos,
  activePath,
  setActivePath,
  selectionMode,
  setSelectedPaths,
  showToast,
  parentFolder,
  scanFolder,
  setSelectionMode,
  getSortedSelectedVideos
}) {

  const navigateVideo = (dir) => {
    const allVis = getVisibleVideos();
    if (allVis.length === 0) return;

    if (selectionMode) {
      const sortedSelected = getSortedSelectedVideos();
      if (sortedSelected.length === 0) return;
      const lastSelected = sortedSelected[sortedSelected.length - 1];
      const isSharedPool = lastSelected.shared;
      const pool = allVis.filter(v => v.shared === isSharedPool);
      
      const idx = pool.findIndex(v => v.path === lastSelected.path);
      const nextIdx = (idx !== -1) ? (idx + dir + pool.length) % pool.length : (dir === -1 ? pool.length - 1 : 0);
      if (pool.length > 0) setSelectedPaths(new Set([pool[nextIdx].path]));

    } else {
      if (!activePath) return;
      const activeVideo = videos.find(v => v.path === activePath);
      if (!activeVideo) return;
      
      const isSharedPool = activeVideo.shared;
      const pool = allVis.filter(v => v.shared === isSharedPool);
      
      const idx = pool.findIndex(v => v.path === activePath);
      const nextIdx = (idx !== -1) ? (idx + dir + pool.length) % pool.length : (dir === -1 ? pool.length - 1 : 0);
      if (pool.length > 0) setActivePath(pool[nextIdx].path);
    }
  };

  const jumpToNextShared = () => {
    const allVis = getVisibleVideos();
    if (allVis.length === 0) return;
    
    let targetState = true; // varsayılan olarak paylaşılanı ara
    if (activePath) {
      const activeVid = allVis.find(v => v.path === activePath);
      if (activeVid) {
        targetState = !activeVid.shared; // Aktif videonun zıt havuzunu hedefle
      }
    }
    
    // Hedef havuzdaki en baştaki videoyu bul
    const targetVid = allVis.find(v => v.shared === targetState);
    if (targetVid) {
      if (selectionMode) {
        setSelectedPaths(new Set([targetVid.path]));
      } else {
        setActivePath(targetVid.path);
      }
    } else {
      showToast(targetState ? t('no_shared_videos', language) : t('no_unshared_videos', language), 'info');
    }
  };

  const navigateToParent = () => {
    if (parentFolder) {
      setSelectedPaths(new Set());
      setSelectionMode(false);
      scanFolder(parentFolder);
    }
  };

  return { navigateVideo, jumpToNextShared, navigateToParent };
}

