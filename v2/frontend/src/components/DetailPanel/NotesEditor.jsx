import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronRight, X, Star } from 'lucide-react';
import { IconCheck, IconCopy } from '../Icons';
import Button from '../ui/Button';
import MentionMenu from './MentionMenu';
import SaveTemplateDialog from '../TemplateMode/SaveTemplateDialog';
import { t } from '../../utils/translations';

export default function NotesEditor({
  noteText,
  handleNoteChange,
  noteInputRef,
  overlayRef,
  isNoteFocused,
  setIsNoteFocused,
  showNoteSearch,
  setShowNoteSearch,
  noteSearchQuery,
  setNoteSearchQuery,
  activeMatchIndex,
  setActiveMatchIndex,
  searchBarInputRef,
  localMatches,
  hasMatchesInFolder,
  folderMatchesInfo,
  navigateMatches,
  handleInputBlur,
  renderNoteOverlay,
  mentionMenu,
  insertMention,
  handleMentionKeyDown,
  checkMentionTrigger,
  setMentionMenu,
  allTextSelected,
  setAllTextSelected,
  copyCurrentNote,
  applyBulkNotes,
  showNoteCopyTick,
  setShowNoteCopyTick,
  selectionMode,
  selectedPathsCount,
  language,
  exitSelectionMode,
  setIsCollapsed,
  activePath,
  aiAssistant,
  addTemplate,
  templates,
  pendingSuggestion,
  activeVideo
}) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  // Mevcut not metni herhangi bir template ile eşleşiyorsa yıldız dolu göster
  const isTemplated = !!(noteText?.trim() && templates?.some(t => t.content?.trim() === noteText.trim()));

  const getFormattedEditTime = () => {
    if (selectionMode || !activeVideo || !activeVideo.updated_at) return null;
    try {
      const date = new Date(activeVideo.updated_at);
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
      const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
      return `${t('last_edited', language)}: ${dateStr} ${timeStr}`;
    } catch (e) {
      return null;
    }
  };

  React.useEffect(() => {
    if (
      aiAssistant &&
      aiAssistant.selectionRange?.target === 'note' &&
      aiAssistant.selectionRange?.start !== aiAssistant.selectionRange?.end &&
      !aiAssistant.isDiffMode &&
      !aiAssistant.isPromptOpen
    ) {
      const timer = setTimeout(() => {
        const marker = document.getElementById('ai-selection-marker');
        if (marker && noteInputRef.current && overlayRef.current) {
          overlayRef.current.scrollTop = noteInputRef.current.scrollTop;
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
    noteText
  ]);

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0 min-w-0">
      {/* Notes Header */}
      <div className="h-8 flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground/80">
            {t('notes_title', language)}
          </span>
          {pendingSuggestion && (
            <span className="text-[9px] font-mono text-foreground/30">Enter onayla · ESC iptal</span>
          )}

          {/* Copy note button */}
          {((!selectionMode && activePath) || (selectionMode && selectedPathsCount > 0)) && (
            <Button
              variant="filled"
              size="none"
              onClick={(e) => {
                e.stopPropagation();
                if (copyCurrentNote) {
                  copyCurrentNote();
                } else {
                  navigator.clipboard.writeText(noteText);
                }
                setShowNoteCopyTick(true);
                setTimeout(() => setShowNoteCopyTick(false), 1500);
              }}
              tabIndex={-1}
              className="transition-all flex items-center gap-1.5"
              title={selectionMode ? t('copy_selected_notes_combined', language) : t('copy_desc_title', language)}
            >
              {showNoteCopyTick ? (
                <>
                  <IconCheck className="w-3.5 h-3.5 text-success" />
                  <span>{t('copied_msg', language)}</span>
                </>
              ) : (
                <>
                  <IconCopy className="w-3.5 h-3.5 text-foreground/80" />
                  <span>{t('copy', language)}</span>
                </>
              )}
            </Button>
          )}

          {/* Edit time label */}
          {!selectionMode && activeVideo && activeVideo.updated_at > 0 && (
            <span className="text-[10px] text-foreground/30 font-medium select-none pointer-events-none whitespace-nowrap ml-1 shrink-0">
              {getFormattedEditTime()}
            </span>
          )}
        </div>

        {/* Panel Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Save as template (star) button */}
          {!selectionMode && activePath && addTemplate && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="p-1 rounded hover:bg-amber-400/15 text-foreground/40 hover:text-amber-400 transition cursor-pointer"
              title="Şablon olarak kaydet"
              tabIndex={-1}
            >
              <Star size={16} className={isTemplated ? 'fill-amber-400 text-amber-400' : ''} />
            </button>
          )}
          {selectionMode && (
            <button 
              onClick={exitSelectionMode}
              className="p-1 rounded hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition cursor-pointer mr-1"
              title={t('exit_selection_title', language)}
            >
              <X size={14} />
            </button>
          )}
          <button 
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition cursor-pointer"
            title={t('close_btn', language)}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Note search bar (Chrome style) */}
      {showNoteSearch && (
        <div id="note-finder-toolbar" className="flex items-center justify-between gap-2 px-3 py-1 bg-foreground/[0.06] backdrop-blur-md border border-foreground/[0.08] rounded-ui-md mb-2 shrink-0 animate-in fade-in slide-in-from-top-2 duration-150 h-[34px] relative">
          <input
            ref={searchBarInputRef}
            type="text"
            value={noteSearchQuery}
            onChange={(e) => {
              setNoteSearchQuery(e.target.value);
              setActiveMatchIndex(0);
            }}
            onBlur={handleInputBlur}
            placeholder={t('search_in_notes', language)}
            className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs text-foreground placeholder-foreground/35 p-0"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setShowNoteSearch(false);
                setNoteSearchQuery('');
                noteInputRef.current?.focus();
              } else if (e.key === 'Enter') {
                e.preventDefault();
                navigateMatches(e.shiftKey ? -1 : 1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateMatches(1);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateMatches(-1);
              }
            }}
          />
          
          {noteSearchQuery.trim() && (
            <div className="flex items-center gap-1.5 text-[10px] text-foreground/45 font-mono select-none mr-1 shrink-0">
              {folderMatchesInfo.total > 0 && (
                <span className="border-r border-foreground/10 pr-1.5">
                  {t('video_match_count', language).replace('{current}', folderMatchesInfo.current).replace('{total}', folderMatchesInfo.total)}
                </span>
              )}
              <span>
                {localMatches.length > 0 ? `${activeMatchIndex + 1} / ${localMatches.length}` : '0 / 0'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => navigateMatches(-1)}
              onMouseDown={(e) => e.preventDefault()}
              disabled={!hasMatchesInFolder}
              tabIndex="-1"
              className="p-1 rounded hover:bg-hover text-foreground/50 hover:text-foreground disabled:opacity-20 cursor-pointer flex items-center justify-center shrink-0"
              title={t('prev_match_title', language)}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => navigateMatches(1)}
              onMouseDown={(e) => e.preventDefault()}
              disabled={!hasMatchesInFolder}
              tabIndex="-1"
              className="p-1 rounded hover:bg-hover text-foreground/50 hover:text-foreground disabled:opacity-20 cursor-pointer flex items-center justify-center shrink-0"
              title={t('next_match_title', language)}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-muted/15 shrink-0" />

          <button
            onClick={() => {
              setShowNoteSearch(false);
              setNoteSearchQuery('');
              noteInputRef.current?.focus();
            }}
            onMouseDown={(e) => e.preventDefault()}
            tabIndex="-1"
            className="p-1 rounded hover:bg-hover text-foreground/45 hover:text-foreground cursor-pointer flex items-center justify-center shrink-0"
            title={t('close_title', language)}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Description container */}
      <div className="relative flex-1 min-h-0 group/note-container">
        <div 
          ref={overlayRef}
          className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-y-auto pl-0 pr-2 py-1 border-0 z-20 ${
            (showNoteSearch && noteSearchQuery.trim()) || !isNoteFocused || (aiAssistant?.isDiffMode && aiAssistant?.selectionRange?.target === 'note') ? 'text-foreground font-normal' : 'text-foreground/0'
          } ${allTextSelected ? 'bg-[var(--theme-selected-border-color)]/20 rounded-ui-md transition-colors duration-150' : ''}`}
          style={{
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
            scrollbarWidth: 'none',
          }}
        >
          {aiAssistant?.isDiffMode && aiAssistant?.selectionRange?.target === 'note'
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
            : (aiAssistant?.selectionRange?.target === 'note' && aiAssistant?.selectionRange?.start !== aiAssistant?.selectionRange?.end
                ? (
                    <>
                      {noteText.substring(0, aiAssistant.selectionRange.start)}
                      <span 
                        id="ai-selection-marker" 
                        className={aiAssistant?.isPromptOpen
                          ? "bg-white/10 text-white font-medium px-1.5 py-0.5 rounded-sm shadow-[0_0_0_3px_rgba(255,255,255,0.12)] inline-block select-none mx-0.5"
                          : "bg-transparent text-transparent select-none"
                        }
                      >
                        {noteText.substring(aiAssistant.selectionRange.start, aiAssistant.selectionRange.end)}
                      </span>
                      {noteText.substring(aiAssistant.selectionRange.end)}
                    </>
                  )
                : renderNoteOverlay(noteText, isNoteFocused)
              )}
        </div>
        <textarea
          ref={noteInputRef}
          readOnly={!!pendingSuggestion}
          value={noteText}
          onChange={(e) => {
            handleNoteChange(e.target.value);
            checkMentionTrigger(e.target, 'note');
          }}
          style={{
            caretColor: 'var(--theme-foreground)',
          }}
          onFocus={() => {
            setIsNoteFocused(true);
            setTimeout(() => checkMentionTrigger(noteInputRef.current, 'note'), 100);
          }}
          onBlur={() => {
            setIsNoteFocused(false);
            setTimeout(() => setMentionMenu(prev => ({ ...prev, visible: false })), 200);
          }}
          onSelect={(e) => aiAssistant?.handleSelection(e, 'note')}
          onMouseUp={(e) => aiAssistant?.handleSelection(e, 'note')}
          onKeyUp={(e) => {
            aiAssistant?.handleSelection(e, 'note');
            checkMentionTrigger(e.target, 'note');
          }}
          onClick={(e) => checkMentionTrigger(e.target, 'note')}
          onScroll={(e) => {
            if (overlayRef.current) {
              overlayRef.current.scrollTop = e.target.scrollTop;
            }
          }}
          onKeyDown={(e) => {
            if (handleMentionKeyDown(e, e.target, 'note')) {
              return;
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'a') {
              e.preventDefault();
              setAllTextSelected(true);
              e.target.select();
            } else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
              e.preventDefault();
              e.stopPropagation();
              setShowNoteSearch(true);
              setTimeout(() => searchBarInputRef.current?.focus(), 80);
            } else if (e.key === 'Escape') {
              if (showNoteSearch) {
                e.preventDefault();
                e.stopPropagation();
                setShowNoteSearch(false);
                setNoteSearchQuery('');
              }
            } else if (e.ctrlKey && e.key === 'Enter') {
              e.preventDefault();
              // Accept duplicate diff via AI mechanism
              if (aiAssistant?.isDiffMode && aiAssistant?.selectionRange?.target === 'note') {
                aiAssistant.applyAIChanges((newText) => handleNoteChange(newText));
              } else if (selectionMode) {
                applyBulkNotes(noteText);
              }
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
              setAllTextSelected(false);
            }
          }}
          placeholder={selectionMode ? t('bulk_notes_placeholder', language) : t('notes_placeholder', language)}
          readOnly={aiAssistant?.isDiffMode}
          tabIndex="-1"
          className={`w-full h-full bg-transparent border-0 focus:ring-0 focus:outline-none resize-none transition-all text-sm placeholder-foreground/20 pl-0 pr-2 py-1 overflow-y-auto relative z-30 ${
            (showNoteSearch && noteSearchQuery.trim()) || !isNoteFocused || (aiAssistant?.isDiffMode && aiAssistant?.selectionRange?.target === 'note') ? 'text-transparent' : 'text-foreground'
          }`}
          style={{
            caretColor: 'var(--theme-foreground)',
          }}
        />

        {/* Autocomplete Menu */}
        <MentionMenu 
          menu={mentionMenu} 
          textareaRef={noteInputRef} 
          targetType="note" 
          insertMention={insertMention} 
        />
      </div>

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        isOpen={showSaveDialog}
        defaultName={`Şablon ${new Date().toLocaleDateString('tr-TR')}`}
        onSave={(name) => {
          if (addTemplate) addTemplate(name, noteText);
          setShowSaveDialog(false);
        }}
        onCancel={() => setShowSaveDialog(false)}
      />
    </div>
  );
}
