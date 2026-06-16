import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import Button from './Button';

export default function DropdownMenu({ isOpen, onClose, position, items, children, className = "w-40" }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        // If click was on the trigger button of this menu, ignore here (let button click handle it)
        const trigger = menuRef.current.previousElementSibling;
        if (trigger && (trigger === event.target || trigger.contains(event.target))) {
          return;
        }
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style = position ? { top: position.y, left: position.x } : { top: '100%', right: 0, marginTop: '4px' };

  return (
    <div 
      ref={menuRef}
      className={`absolute z-50 bg-surface border border-foreground/5 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150 dropdown-menu-open ${className}`}
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {items ? items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <React.Fragment key={idx}>
            <Button 
              variant={item.variant || "none"}
              size="none"
              onClick={(e) => { 
                if (item.onClick) {
                  item.onClick(e); 
                }
                onClose(); 
              }}
              className={`w-full px-3 py-2 text-sm flex items-center gap-2 text-left rounded-none transition-colors ${
                item.selected 
                  ? 'bg-element text-foreground font-medium' 
                  : item.className 
                      ? item.className 
                      : 'text-foreground hover:bg-element'
              }`}
            >
              {Icon && <Icon size={14} className="shrink-0" />}
              <span className="flex-1 whitespace-nowrap text-left">{item.label}</span>
              <div className="w-4 h-4 shrink-0 flex items-center justify-center ml-2">
                {item.selected && <Check size={16} className="text-blue-400" strokeWidth={3} />}
              </div>
            </Button>
            {idx < items.length - 1 && <div className="h-[1px] bg-foreground/5" />}
          </React.Fragment>
        );
      }) : children}
    </div>
  );
}
