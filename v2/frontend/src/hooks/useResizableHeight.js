import { useState, useEffect } from 'react';

export function useResizableHeight({ defaultHeight = 150, minHeight = 100, maxHeight = 400, storageKey }) {
  const [height, setHeight] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : defaultHeight;
    }
    return defaultHeight;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      // Height increases as the mouse moves up
      let newHeight = window.innerHeight - e.clientY;
      if (newHeight < minHeight) newHeight = minHeight;
      if (newHeight > maxHeight) newHeight = maxHeight;
      
      setHeight(newHeight);
      if (storageKey) {
        localStorage.setItem(storageKey, newHeight.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minHeight, maxHeight, storageKey]);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return { height, isResizing, startResizing };
}
