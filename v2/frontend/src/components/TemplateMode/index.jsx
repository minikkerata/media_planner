import React, { useEffect, useRef } from 'react';
import { Star, X, LayoutTemplate, Zap } from 'lucide-react';

export default function TemplateMode({
  templates,
  selectedIndex,
  setSelectedIndex,
  onApply,
  onClose,
  onRemove,
  duplicateSuggestion,
  onAcceptDuplicate
}) {
  const listRef = useRef(null);
  const selectedRef = useRef(null);

  // Combined list: duplicate suggestion first (if any), then saved templates
  const dupEntry = duplicateSuggestion
    ? [{ id: '__dup__', name: `↳ ${duplicateSuggestion.sourceFileName}`, content: duplicateSuggestion.description, isDuplicate: true }]
    : [];
  const allItems = [...dupEntry, ...templates];

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  return (
    <div className="flex flex-col gap-2 shrink-0 h-full w-full">
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center gap-2">
          <LayoutTemplate size={14} className="text-accent" />
          <span className="text-xs font-bold text-foreground/80">Şablonlar</span>
          {allItems.length > 0 && (
            <span className="text-[10px] text-foreground/40 font-mono bg-active px-1.5 py-0.5 rounded">
              {allItems.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-hover text-foreground/40 hover:text-foreground transition cursor-pointer"
          title="Şablon modundan çık (ESC)"
        >
          <X size={13} />
        </button>
      </div>

      {/* Template List — full width */}
      <div
        ref={listRef}
        className="flex flex-col gap-0.5 overflow-y-auto flex-1 min-h-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-foreground/30 gap-2 py-8">
            <Star size={26} strokeWidth={1.2} />
            <p className="text-[11px] text-center leading-relaxed px-2">
              Henüz şablon yok.<br />
              Açıklama yazıp ⭐ ile ekleyin.
            </p>
          </div>
        ) : (
          allItems.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const isDup = item.isDuplicate;
            const lines = (item.content || '').split('\n').filter(Boolean).slice(0, 3);

            return (
              <div
                key={item.id}
                ref={isSelected ? selectedRef : null}
                onClick={() => setSelectedIndex(idx)}
                onDoubleClick={() => isDup ? onAcceptDuplicate?.(item.content) : onApply(item)}
                className={`group flex items-start gap-2 px-2.5 py-2.5 rounded-lg border border-solid cursor-pointer transition-all duration-100 ${
                  isSelected
                    ? isDup
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-active border-transparent'
                    : isDup
                      ? 'hover:bg-amber-500/8 border-transparent'
                      : 'hover:bg-hover border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center gap-1.5 mb-1">
                    {isDup && <Zap size={10} className={`shrink-0 ${isSelected ? 'text-amber-400' : 'text-amber-500/60'}`} />}
                    <span className={`text-[11px] font-semibold truncate leading-tight ${
                      isSelected
                        ? isDup ? 'text-amber-300' : 'text-accent'
                        : isDup ? 'text-amber-400/70' : 'text-foreground/80'
                    }`}>
                      {isDup ? 'Önceki paylaşımdan öneri' : item.name}
                    </span>
                  </div>
                  {/* Content preview lines */}
                  {lines.map((line, i) => (
                    <div
                      key={i}
                      className={`text-[10px] leading-snug truncate ${
                        isSelected
                          ? isDup ? 'text-amber-300/55' : 'text-foreground/55'
                          : 'text-foreground/35'
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                  {isDup && (
                    <div className={`text-[9px] mt-0.5 font-mono truncate ${
                      isSelected ? 'text-amber-400/40' : 'text-foreground/20'
                    }`}>
                      {item.name}
                    </div>
                  )}
                </div>
                {!isDup && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-danger/15 text-foreground/30 hover:text-danger transition cursor-pointer shrink-0 mt-0.5"
                    title="Şablonu sil"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer hints */}
      <div className="shrink-0 flex items-center gap-3 px-1 pb-0.5">
        <span className="text-[9px] text-foreground/25 font-mono">↑↓ gezin</span>
        <span className="text-[9px] text-foreground/25 font-mono">Enter uygula</span>
        <span className="text-[9px] text-foreground/25 font-mono">ESC çık</span>
      </div>
    </div>
  );
}
