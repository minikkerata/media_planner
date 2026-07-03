import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Keep track of open modal close handlers at the module level
const openModals = new Set();

export default function Modal({ 
  isOpen, 
  onClose, 
  children, 
  className = "bg-modal-surface border border-foreground/5 rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in duration-200", 
  backdropClassName = "bg-black/50 backdrop-blur-sm" 
}) {
  // Determine if width and height are specified in className
  const hasWidth = /\b(w-|max-w-|min-w-)/.test(className);
  const hasHeight = /\b(h-|max-h-|min-h-)/.test(className);

  // If no custom dimensions are provided, default to the settings modal dimensions
  const finalClassName = [
    className,
    (!hasWidth && !hasHeight) ? "w-full max-w-4xl h-[660px]" : ""
  ].filter(Boolean).join(" ");

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle singleton modal behavior: when this modal opens, close all others
  useEffect(() => {
    if (isOpen) {
      // Trigger onClose for all other registered modals
      openModals.forEach((closeFn) => {
        if (closeFn !== onClose) {
          closeFn();
        }
      });
      openModals.add(onClose);
    }
    return () => {
      openModals.delete(onClose);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 ${backdropClassName}`}
      onClick={onClose}
    >
      <div 
        className={finalClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
