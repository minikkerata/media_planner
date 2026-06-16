import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, X, ArrowRight, Loader2 } from 'lucide-react';
import Button from '../ui/Button';

export default function AIAssistant({
  selectedText,
  promptCoords,
  isPromptOpen,
  isDiffMode,
  openAIPrompt,
  closeAIPrompt,
  submitAIPrompt,
  applyAIChanges,
  discardAIChanges,
  defaultPrompt,
  currentFullText,
  onApplyText,
  language
}) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus input when prompt overlay opens
  useEffect(() => {
    if (isPromptOpen) {
      setCustomPrompt('');
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isPromptOpen]);

  const handleSend = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await submitAIPrompt(customPrompt, defaultPrompt, currentFullText);
    } catch (err) {
      console.error("AI execution error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      if (!isLoading) {
        e.preventDefault();
        e.stopPropagation();
        closeAIPrompt();
      }
    }
  };

  // 1. Floating Ask AI pill button has been disabled per user request to only trigger via Alt+I.

  // 2. Render Prompt Input Overlay box
  if (isPromptOpen) {
    const inputLeft = Math.min(window.innerWidth - 304, Math.max(16, promptCoords.x - 144));
    const inputTop = Math.max(50, promptCoords.y - 70); // Position exactly above the selection
    return (
      <div 
        className="fixed z-50 bg-white rounded-ui-lg shadow-2xl p-1 w-72 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto border-0"
        style={{ left: `${inputLeft}px`, top: `${inputTop}px` }}
        onMouseDown={(e) => e.stopPropagation()} // Prevent closing on global click
      >
        <div className="flex items-center gap-1.5 bg-[#efefef] rounded-ui-md px-2 py-1.5 transition">
          <input
            ref={inputRef}
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={isLoading ? "AI yanıt üretiyor..." : "AI'dan ne yapmasını istiyorsunuz?..."}
            className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs text-gray-900 placeholder-gray-400 p-0 disabled:opacity-60"
          />
          {isLoading ? (
            <Loader2 size={12} className="animate-spin text-blue-600 shrink-0" />
          ) : (
            <button
              onClick={handleSend}
              className="p-1 rounded hover:bg-gray-200 text-gray-500 transition cursor-pointer flex items-center justify-center shrink-0"
              title="Gönder (Enter)"
            >
              <ArrowRight size={12} />
            </button>
          )}
          <div className="w-[1px] h-3 bg-gray-300 shrink-0" />
          <button 
            onClick={closeAIPrompt}
            disabled={isLoading}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-40"
            title="Kapat (Esc)"
          >
            <X size={12} />
          </button>
        </div>

        <span className="text-[7.5px] text-gray-400 leading-tight px-1.5 select-none">
          {isLoading ? "Yapay zeka yanıt üretiyor, lütfen bekleyin..." : "Boş bırakıp Enter'a basarsanız varsayılan prompt ile revize edilir."}
        </span>
      </div>
    );
  }

  // 3. Render Diff Acceptance floating controls
  if (isDiffMode) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-surface/95 backdrop-blur border border-muted/20 rounded-ui-xl p-2.5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 pointer-events-auto">
        <span className="text-[10px] font-semibold text-foreground/60 mr-2 uppercase tracking-wide">
          AI Değişiklik Önizlemesi
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={discardAIChanges}
          className="flex items-center gap-1 bg-element/50 hover:bg-hover border border-muted/10 cursor-pointer"
        >
          <X size={14} />
          <span>Reddet</span>
        </Button>
        <Button
          variant="success"
          size="sm"
          onClick={() => applyAIChanges(onApplyText)}
          className="flex items-center gap-1 cursor-pointer"
        >
          <Check size={14} />
          <span>Onayla</span>
        </Button>
      </div>
    );
  }

  return null;
}
