import { useState, useEffect, useRef, useCallback } from 'react';

export function useDragSelection({ selectionMode, setSelectionMode, setActivePath, selectedPaths, setSelectedPaths, onDragEnd }) {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragAction, setDragAction] = useState('select');
  const [pendingDragPath, setPendingDragPath] = useState(null);

  const isMouseDownRef = useRef(false);
  const dragActionRef = useRef('select');
  const pendingDragPathRef = useRef(null);
  const selectionModeRef = useRef(selectionMode);
  const selectedPathsRef = useRef(selectedPaths);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    isMouseDownRef.current = isMouseDown;
    dragActionRef.current = dragAction;
    pendingDragPathRef.current = pendingDragPath;
    selectionModeRef.current = selectionMode;
    selectedPathsRef.current = selectedPaths;
    onDragEndRef.current = onDragEnd;
  });

  useEffect(() => {
    const handleMouseUp = () => {
      const wasDragging = isMouseDownRef.current;
      setIsMouseDown(false);
      isMouseDownRef.current = false;
      setPendingDragPath(null);
      pendingDragPathRef.current = null;
      if (wasDragging && onDragEndRef.current) {
        onDragEndRef.current();
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleCardMouseDown = useCallback((p, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsMouseDown(true);
    isMouseDownRef.current = true;
    setPendingDragPath(p);
    pendingDragPathRef.current = p;

    if (selectionModeRef.current) {
      const act = selectedPathsRef.current.has(p) ? 'deselect' : 'select';
      setDragAction(act);
      dragActionRef.current = act;
      setSelectedPaths(prev => {
        const next = new Set(prev);
        if (act === 'select') next.add(p);
        else next.delete(p);
        return next;
      });
    }
  }, [setSelectedPaths]);

  const handleCardMouseEnter = useCallback((p) => {
    if (isMouseDownRef.current) {
      if (!selectionModeRef.current) {
        setSelectionMode(true);
        setActivePath(null);
        setDragAction('select');
        dragActionRef.current = 'select';
        setSelectedPaths(new Set([pendingDragPathRef.current, p]));
      } else {
        const act = dragActionRef.current;
        setSelectedPaths(prev => {
          const next = new Set(prev);
          if (act === 'select') next.add(p);
          else next.delete(p);
          return next;
        });
      }
    }
  }, [setSelectionMode, setActivePath, setSelectedPaths]);

  return {
    isMouseDown,
    dragAction,
    pendingDragPath,
    handleCardMouseDown,
    handleCardMouseEnter
  };
}
