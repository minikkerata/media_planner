import React, { useEffect } from 'react';

// Keep track of open modal close handlers at the module level
const openModals = new Set();

export default function Modal({ 
  isOpen, 
  onClose, 
  children, 
  className = "bg-modal-surface border border-foreground/5 rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in duration-200", 
  backdropClassName = "bg-black/50 backdrop-blur-sm" 
}) {
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

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 ${backdropClassName}`}
      onClick={onClose}
    >
      <div 
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
