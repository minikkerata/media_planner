import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useAppLayout() {
  const [gridSize, setGridSizeRaw] = useState(() => {
    const saved = localStorage.getItem('grid_size');
    return saved ? (saved === 'list' ? 'list' : parseInt(saved, 10)) : 220;
  });

  const setGridSize = useCallback((val) => {
    setGridSizeRaw(val);
    localStorage.setItem('grid_size', val);
  }, []);

  const [showUnsharedOnly, setShowUnsharedOnlyRaw] = useState(() =>
    localStorage.getItem('filter_mode') || 'all'
  );

  const setShowUnsharedOnly = useCallback((val) => {
    setShowUnsharedOnlyRaw(val);
    localStorage.setItem('filter_mode', val);
  }, []);

  const [activeViewTab, setActiveViewTab] = useState('library');

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_panel_collapsed');
    return saved === 'true';
  });

  const [isDetailCollapsed, setIsDetailCollapsed] = useState(() => {
    const saved = localStorage.getItem('detail_panel_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('detail_panel_collapsed', isDetailCollapsed.toString());
    api.saveSettings({ detail_panel_collapsed: isDetailCollapsed }).catch(() => {});
  }, [isDetailCollapsed]);

  useEffect(() => {
    localStorage.setItem('sidebar_panel_collapsed', isSidebarCollapsed.toString());
    api.saveSettings({ sidebar_panel_collapsed: isSidebarCollapsed }).catch(() => {});
  }, [isSidebarCollapsed]);

  const toggleSidebar = useCallback(() => setIsSidebarCollapsed(p => !p), []);
  const toggleDetailPanel = useCallback(() => setIsDetailCollapsed(p => !p), []);

  return {
    gridSize,
    setGridSize,
    showUnsharedOnly,
    setShowUnsharedOnly,
    activeViewTab,
    setActiveViewTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isDetailCollapsed,
    setIsDetailCollapsed,
    toggleSidebar,
    toggleDetailPanel
  };
}
