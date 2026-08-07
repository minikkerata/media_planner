import { useCallback } from 'react';
import { api } from '../services/api';
import { t } from '../utils/translations';

export function useVideoMetadata({ activePath, setActivePath, currentFolder, language, selectionMode, toggleSelection, getVisibleVideos, showToast, triggerCompletedFeedback, setVideos }) {
  const toggleSharedState = useCallback(async (video, e) => {
    if (e) e.stopPropagation();
    if (selectionMode) { toggleSelection(video.path); return; }
    const nextState = !video.shared;

    let nextVideoPathToJump = null;
    if (activePath === video.path) {
      const currentPool = getVisibleVideos().filter(v => v.shared === video.shared);
      const idx = currentPool.findIndex(v => v.path === video.path);
      if (idx !== -1 && currentPool.length > 1) {
        nextVideoPathToJump = currentPool[(idx + 1) % currentPool.length].path;
      }
    }

    let videoFolder = currentFolder;
    if (video.path) {
      const lastSlash = Math.max(video.path.lastIndexOf('\\'), video.path.lastIndexOf('/'));
      if (lastSlash !== -1) videoFolder = video.path.substring(0, lastSlash);
    }

    const finalPublishTime = nextState ? new Date().toISOString() : '';
    const data = await api.updateMetadata(videoFolder, [{
      name: video.name,
      shared: nextState,
      publish_time: finalPublishTime
    }]);

    if (data.success) {
      setVideos(p => p.map(v => v.path === video.path ? {
        ...v,
        shared: nextState,
        publish_time: finalPublishTime,
        updated_at: Date.now()
      } : v));

      const performJump = () => {
        if (nextVideoPathToJump) {
          setActivePath(nextVideoPathToJump);
        } else if (activePath === video.path) {
          const oppositePool = getVisibleVideos().filter(v => v.shared !== video.shared);
          if (oppositePool.length > 0) {
            setActivePath(oppositePool[0].path);
          } else {
            setActivePath(null);
          }
        }
      };

      if (nextState) {
        triggerCompletedFeedback();
        showToast(t('shared_msg', language));
        setTimeout(performJump, 500);
      } else {
        showToast(t('unshared_msg', language));
        performJump();
      }
    }
  }, [activePath, currentFolder, getVisibleVideos, language, selectionMode, setActivePath, setVideos, showToast, toggleSelection, triggerCompletedFeedback]);

  const toggleHidden = useCallback(async (video, e) => {
    if (e) e.stopPropagation();
    const nextHidden = !video.hidden;

    let videoFolder = currentFolder;
    if (video.path) {
      const lastSlash = Math.max(video.path.lastIndexOf('\\'), video.path.lastIndexOf('/'));
      if (lastSlash !== -1) videoFolder = video.path.substring(0, lastSlash);
    }

    const data = await api.updateMetadata(videoFolder, [{ name: video.name, hidden: nextHidden }]);
    if (data.success) {
      setVideos(p => p.map(v => v.path === video.path ? { ...v, hidden: nextHidden } : v));
      if (activePath === video.path && nextHidden) {
        const visible = getVisibleVideos().filter(v => v.path !== video.path);
        setActivePath(visible.length > 0 ? visible[0].path : null);
      }
      showToast(nextHidden ? 'Video gizlendi' : 'Video görünür yapıldı');
    }
  }, [activePath, currentFolder, getVisibleVideos, setActivePath, setVideos, showToast]);

  return {
    toggleSharedState,
    toggleHidden
  };
}
