import React, { useState, useEffect, useRef } from 'react';
import { Star, X } from 'lucide-react';

/**
 * A small inline dialog to name a new template before saving.
 * Renders as a floating popover-style overlay.
 */
export default function SaveTemplateDialog({
  isOpen,
  defaultName,
  onSave,
  onCancel
}) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName || '');
      // Biraz daha uzun timeout — dialog animasyonu tamamlandıktan sonra focus
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    // Dışarıdaki global keydown yakalayıcıların (ESC vb.) bu dialog üzerinde çalışmaması için
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(name.trim() || defaultName || 'Şablon');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] rounded-lg animate-in fade-in duration-100"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="bg-surface border border-muted/25 rounded-xl shadow-2xl p-4 flex flex-col gap-3 w-64">
        <div className="flex items-center gap-2">
          <Star size={13} className="text-amber-400 fill-amber-400" />
          <span className="text-xs font-semibold text-foreground">Şablon Adı</span>
        </div>
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={defaultName || 'Şablon adı...'}
          className="w-full bg-active border border-muted/20 rounded-lg px-3 py-2 text-xs text-foreground placeholder-foreground/30 focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSave(name.trim() || defaultName || 'Şablon')}
            className="flex-1 bg-accent text-accent-foreground text-xs font-semibold py-1.5 rounded-lg hover:opacity-90 transition cursor-pointer"
          >
            Kaydet
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-lg transition cursor-pointer"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
