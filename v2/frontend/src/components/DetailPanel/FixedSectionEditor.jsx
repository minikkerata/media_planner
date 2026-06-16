import React from 'react';
import MentionMenu from './MentionMenu';
import { t } from '../../utils/translations';

export default function FixedSectionEditor({
  fixedText,
  handleFixedTextChange,
  fixedInputRef,
  fixedOverlayRef,
  isFixedFocused,
  setIsFixedFocused,
  renderFixedOverlay,
  mentionMenu,
  insertMention,
  handleMentionKeyDown,
  checkMentionTrigger,
  allTextSelected,
  setAllTextSelected,
  copyCurrentNote,
  handleNoteChange,
  language,
  aiAssistant
}) {
  React.useEffect(() => {
    if (
      aiAssistant &&
      aiAssistant.selectionRange?.target === 'fixed' &&
      aiAssistant.selectionRange?.start !== aiAssistant.selectionRange?.end &&
      !aiAssistant.isDiffMode &&
      !aiAssistant.isPromptOpen
    ) {
      const timer = setTimeout(() => {
        const marker = document.getElementById('ai-selection-marker');
        if (marker && fixedInputRef.current && fixedOverlayRef.current) {
          fixedOverlayRef.current.scrollTop = fixedInputRef.current.scrollTop;
          const markerRect = marker.getBoundingClientRect();
          aiAssistant.setPromptCoords({
            x: markerRect.right,
            y: markerRect.top,
            bottom: markerRect.bottom
          });
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [
    aiAssistant?.selectionRange?.start,
    aiAssistant?.selectionRange?.end,
    aiAssistant?.selectionRange?.target,
    aiAssistant?.isDiffMode,
    aiAssistant?.isPromptOpen,
    fixedText
  ]);

  return (
    <div className="flex-[1] min-h-[120px] max-h-[180px] flex flex-col gap-1.5 bg-element/20 p-2.5 rounded-ui-lg border border-muted/10 shrink-0 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
          {t('fixed_suffix_title', language)}
        </span>
      </div>
      
      <div className="relative flex-1 min-h-0">
        {/* Fixed Suffix Highlight Overlay */}
        <div 
          ref={fixedOverlayRef}
          className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-y-auto p-0 border-0 z-10 ${
            !isFixedFocused || (aiAssistant?.isDiffMode && aiAssistant?.selectionRange?.target === 'fixed') ? 'text-foreground font-normal' : 'text-foreground/0'
          } ${allTextSelected ? 'bg-[var(--theme-selected-border-color)]/20 rounded-ui-md transition-colors duration-150' : ''}`}
          style={{
            fontFamily: 'inherit',
            fontSize: '0.75rem',
            lineHeight: '1rem',
            scrollbarWidth: 'none',
          }}
        >
          {aiAssistant?.isDiffMode && aiAssistant?.selectionRange?.target === 'fixed'
            ? aiAssistant.diffResult?.diffData?.map((part, index) => {
                if (part.type === 'removed') {
                  return (
                    <del 
                      key={index} 
                      className="bg-red-500/25 text-red-300 line-through px-0.5 rounded select-none inline-block font-normal"
                    >
                      {part.text}
                    </del>
                  );
                } else if (part.type === 'added') {
                  return (
                    <ins 
                      key={index} 
                      className="bg-green-500/25 text-green-300 no-underline px-0.5 rounded select-none inline-block font-normal"
                    >
                      {part.text}
                    </ins>
                  );
                }
                return part.text;
              })
            : (aiAssistant?.selectionRange?.target === 'fixed' && aiAssistant?.selectionRange?.start !== aiAssistant?.selectionRange?.end
                ? (
                    <>
                      {fixedText.substring(0, aiAssistant.selectionRange.start)}
                      <span 
                        id="ai-selection-marker" 
                        className={aiAssistant?.isPromptOpen
                          ? "bg-white/10 text-white font-medium px-1.5 py-0.5 rounded-sm shadow-[0_0_0_3px_rgba(255,255,255,0.12)] inline-block select-none mx-0.5"
                          : "bg-transparent text-transparent select-none"
                        }
                      >
                        {fixedText.substring(aiAssistant.selectionRange.start, aiAssistant.selectionRange.end)}
                      </span>
                      {fixedText.substring(aiAssistant.selectionRange.end)}
                    </>
                  )
                : renderFixedOverlay(fixedText, isFixedFocused)
              )}
        </div>
        <textarea
          ref={fixedInputRef}
          value={fixedText}
          onChange={(e) => {
            handleFixedTextChange(e.target.value);
            checkMentionTrigger(e.target, 'fixed');
          }}
          onFocus={() => {
            setIsFixedFocused(true);
            setTimeout(() => checkMentionTrigger(fixedInputRef.current, 'fixed'), 100);
          }}
          onBlur={() => {
            setIsFixedFocused(false);
            setTimeout(() => setMentionMenu(prev => ({ ...prev, visible: false })), 200);
          }}
          onSelect={(e) => aiAssistant?.handleSelection(e, 'fixed')}
          onMouseUp={(e) => aiAssistant?.handleSelection(e, 'fixed')}
          onKeyUp={(e) => {
            aiAssistant?.handleSelection(e, 'fixed');
            checkMentionTrigger(e.target, 'fixed');
          }}
          onClick={(e) => checkMentionTrigger(e.target, 'fixed')}
          onScroll={(e) => {
            if (fixedOverlayRef.current) {
              fixedOverlayRef.current.scrollTop = e.target.scrollTop;
            }
          }}
          onKeyDown={(e) => {
            if (handleMentionKeyDown(e, e.target, 'fixed')) {
              return;
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'a') {
              e.preventDefault();
              setAllTextSelected(true);
              e.target.select();
            } else {
              if (allTextSelected) {
                setAllTextSelected(false);
              }
            }
          }}
          onCopy={(e) => {
            if (allTextSelected) {
              e.preventDefault();
              copyCurrentNote();
            }
          }}
          onCut={(e) => {
            if (allTextSelected) {
              e.preventDefault();
              copyCurrentNote();
              handleNoteChange('');
              handleFixedTextChange('');
              setAllTextSelected(false);
            }
          }}
          placeholder="Sabit kısım şablonu yazın... @username etiketini kullanabilirsiniz."
          readOnly={aiAssistant?.isDiffMode}
          className={`w-full h-full bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-xs placeholder-foreground/20 p-0 overflow-y-auto relative z-20 ${
            !isFixedFocused || (aiAssistant?.isDiffMode && aiAssistant?.selectionRange?.target === 'fixed') ? 'text-transparent' : 'text-foreground'
          }`}
        />

        {/* Autocomplete Menu */}
        <MentionMenu 
          menu={mentionMenu} 
          textareaRef={fixedInputRef} 
          targetType="fixed" 
          insertMention={insertMention} 
        />
      </div>
    </div>
  );
}
