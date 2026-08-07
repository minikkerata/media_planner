import { useState, useEffect, useCallback } from 'react';

export function useDragSelection({ selectionMode, setSelectionMode, setActivePath, selectedPaths, setSelectedPaths }) {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragAction, setDragAction] = useState('select');
  const [pendingDragPath, setPendingDragPath] = useState(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsMouseDown(false);
      setPendingDragPath(null);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleCardMouseDown = useCallback((p, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsMouseDown(true);
    setPendingDragPath(p);
    if (selectionMode) {
      const act = selectedPaths.has(p) ? 'deselect' : 'select';
      setDragAction(act);
      setSelectedPaths(prev => {
        const next = new Set(prev);
        if (act === 'select') next.add(p);
        else next.delete(p);
        return next;
      });
    }
  }, [selectionMode, selectedPaths, setSelectedPaths]);

  const handleCardMouseEnter = useCallback((p) => {
    if (isMouseDown) {
      if (!selectionMode) {
        setSelectionMode(true);
        setActivePath(null);
        setDragAction('select');
        setSelectedPaths(new Set([pendingDragPath, p]));
      } else {
        setSelectedPaths(prev => {
          const next = new Set(prev);
          if (dragAction === 'select') next.add(p);
          else next.delete(p);
          return next;
        });
      }
    }
  }, [isMouseDown, selectionMode, pendingDragPath, dragAction, setSelectionMode, setActivePath, setSelectedPaths]);

  return {
    isMouseDown,
    dragAction,
    pendingDragPath,
    handleCardMouseDown,
    handleCardMouseEnter
  };
}
