import { useState, useCallback } from 'react';

export function useSelectionMode({ videos, setActivePath }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState(new Set());

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedPaths(new Set());
    if (videos && videos.length > 0) {
      const uns = videos.find(v => !v.shared);
      setActivePath(uns ? uns.path : videos[0].path);
    }
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA' ||
      document.activeElement.isContentEditable
    )) {
      document.activeElement.blur();
    }
  }, [videos, setActivePath]);

  const enterSelectionMode = useCallback((p) => {
    setSelectionMode(true);
    setActivePath(null);
    if (p) {
      setSelectedPaths(new Set([p]));
    }
  }, [setActivePath]);

  const toggleSelection = useCallback((p) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }, []);

  const selectAll = useCallback((visibleVideos) => {
    if (visibleVideos) {
      setSelectedPaths(new Set(visibleVideos.map(v => v.path)));
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
  }, []);

  return {
    selectionMode,
    setSelectionMode,
    selectedPaths,
    setSelectedPaths,
    exitSelectionMode,
    enterSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection
  };
}
