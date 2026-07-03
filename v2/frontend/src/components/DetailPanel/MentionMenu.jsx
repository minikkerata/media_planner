import React from 'react';

export default function MentionMenu({ menu, textareaRef, targetType, insertMention }) {
  if (!menu.visible || menu.target !== targetType) return null;

  return (
    <div className="absolute left-2 bottom-2 bg-surface/95 backdrop-blur border border-muted/20 rounded-ui-lg shadow-2xl p-1 w-64 z-50 flex flex-col gap-0.5 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
      {menu.options.map((opt, idx) => (
        <button
          key={opt.token}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            insertMention(opt, textareaRef.current, targetType);
          }}
          className={`flex flex-col text-left px-2 py-1.5 rounded-ui-sm cursor-pointer transition ${
            menu.index === idx ? 'bg-white/10 text-white font-bold' : 'text-foreground/75 hover:bg-white/5 hover:text-foreground'
          }`}
        >
          <span className="text-xs font-semibold">{opt.label}</span>
          {opt.desc && (
            <span className="text-[10px] text-foreground/45 truncate mt-0.5">Değer: {opt.desc}</span>
          )}
        </button>
      ))}
      {menu.options.length === 0 && (
        <span className="text-[10px] text-foreground/30 p-2 text-center">Eşleşme bulunamadı</span>
      )}
    </div>
  );
}
