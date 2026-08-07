import { useState, useEffect } from 'react';

export function useContextMenuState() {
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, visible: false, targetPath: null, isFolder: false });
  const [hoveredFolder, setHoveredFolder] = useState(null);

  useEffect(() => {
    const handleWindowClick = () => setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  return {
    contextMenu,
    setContextMenu,
    hoveredFolder,
    setHoveredFolder
  };
}
