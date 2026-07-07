import React, { useEffect, useRef, useState } from 'react';
import { Star, X, Zap, Trash2, Plus } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function TemplateMode({
  isOpen,
  templates,
  selectedIndex,
  setSelectedIndex,
  onApply,
  onClose,
  onRemove,
  onUpdate,
  onAdd,
  duplicateSuggestion,
  onAcceptDuplicate,
  language = 'tr'
}) {
  const listRef = useRef(null);
  const selectedRef = useRef(null);
  const searchInputRef = useRef(null);
  const textareaRef = useRef(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const prevTemplatesLengthRef = useRef(templates.length);
  const prevSelectedItemIdRef = useRef(null);
  const templatesRef = useRef(templates);

  // Keep templates ref updated for unmount cleanup
  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  // Filter templates based on searchQuery and sort them so that matches closer to the start rank higher
  const filteredTemplates = templates
    .filter(t => !searchQuery.trim() || t.content.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (!searchQuery.trim()) return 0;
      const indexA = a.content.toLowerCase().indexOf(searchQuery.toLowerCase());
      const indexB = b.content.toLowerCase().indexOf(searchQuery.toLowerCase());
      // Ascending sort: smaller index means closer to the beginning of the text
      return indexA - indexB;
    });

  const dupEntry = duplicateSuggestion
    ? [{ id: '__dup__', content: duplicateSuggestion.description, isDuplicate: true }]
    : [];
  const filteredDupEntry = dupEntry.filter(item =>
    !searchQuery.trim() || item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allItems = [...filteredDupEntry, ...filteredTemplates];

  // Selected item reference
  const selectedItem = allItems[selectedIndex];

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, isOpen]);

  // Focus the search input when the modal opens to allow instant template search
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset selected index to 0 when search query changes
  useEffect(() => {
    if (searchQuery) {
      setSelectedIndex(0);
    }
  }, [searchQuery, setSelectedIndex]);

  // Sync index if list shifts or items are removed
  useEffect(() => {
    if (isOpen && selectedItem === undefined && allItems.length > 0) {
      setSelectedIndex(Math.min(selectedIndex, allItems.length - 1));
    }
  }, [templates, selectedIndex, allItems.length, selectedItem, setSelectedIndex, isOpen]);

  // Reactive selection of newly added templates and auto-focusing the editor textarea
  useEffect(() => {
    if (templates.length > prevTemplatesLengthRef.current) {
      const dupEntryLength = duplicateSuggestion ? 1 : 0;
      setSelectedIndex(dupEntryLength + templates.length - 1);
      
      // Auto-focus the template textarea immediately
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
    prevTemplatesLengthRef.current = templates.length;
  }, [templates.length, duplicateSuggestion, setSelectedIndex]);

  // Cleanup empty templates when switching templates
  useEffect(() => {
    if (!isOpen) return;
    const prevId = prevSelectedItemIdRef.current;
    const currentId = selectedItem?.id;

    if (prevId && prevId !== currentId && prevId !== '__dup__') {
      const prevTemplate = templatesRef.current.find(t => t.id === prevId);
      if (prevTemplate && (!prevTemplate.content || !prevTemplate.content.trim())) {
        onRemove(prevId);
      }
    }
    prevSelectedItemIdRef.current = currentId;
  }, [selectedIndex, isOpen, selectedItem?.id, onRemove]);

  // Cleanup all empty templates on modal close or component unmount
  useEffect(() => {
    if (!isOpen) {
      templatesRef.current.forEach(t => {
        if (!t.content || !t.content.trim()) {
          onRemove(t.id);
        }
      });
    }
  }, [isOpen, onRemove]);

  useEffect(() => {
    return () => {
      templatesRef.current.forEach(t => {
        if (!t.content || !t.content.trim()) {
          onRemove(t.id);
        }
      });
    };
  }, [onRemove]);

  // Modal keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleTemplateKeyDown = (e) => {
      const isTextarea = document.activeElement?.tagName === 'TEXTAREA';
      
      if (e.key === 'Escape' && searchQuery) {
        e.preventDefault();
        e.stopPropagation();
        setSearchQuery('');
        return;
      }

      // If user is inside the textarea, let them type normally. Apply on Ctrl+Enter.
      if (e.key === 'Enter') {
        if (isTextarea && !e.ctrlKey) {
          return;
        }
        e.preventDefault();
        const item = allItems[selectedIndex];
        if (!item) return;
        if (item.isDuplicate) {
          onAcceptDuplicate?.(item.content);
        } else {
          onApply(item);
        }
      } else if (e.key === 'ArrowDown') {
        if (isTextarea) return;
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        if (isTextarea) return;
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleTemplateKeyDown, true);
    return () => window.removeEventListener('keydown', handleTemplateKeyDown, true);
  }, [isOpen, allItems, selectedIndex, onApply, onAcceptDuplicate, setSelectedIndex, searchQuery]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="bg-modal-surface border border-muted/15 rounded-ui-xl shadow-2xl overflow-hidden animate-scale-up w-full max-w-4xl h-[700px] flex flex-row relative z-50"
    >
      {/* Left Column: Template List */}
      <div className="w-80 border-r border-muted/15 flex flex-col h-full bg-modal-surface shrink-0">
        {/* Left Column Header */}
        <div className="h-12 flex items-center justify-between px-4 shrink-0 bg-element/5 select-none">
          <span className="text-[11px] font-semibold text-foreground/50 tracking-wider">
            {language === 'tr' ? 'ŞABLONLAR' : 'TEMPLATES'}
          </span>
          <Button
            variant="primary"
            onClick={() => {
              if (onAdd) onAdd(null, '');
            }}
            className="flex items-center gap-1.5 font-bold"
          >
            <Plus size={14} strokeWidth={3} />
            <span>{language === 'tr' ? 'Oluştur' : 'Create'}</span>
          </Button>
        </div>

        {/* Mini Search input - matching Settings/Note Finder style */}
        <div className="px-3.5 py-2 mb-0.5 relative shrink-0">
          <div className="flex items-center justify-between gap-2 px-2.5 py-1 bg-foreground/[0.06] backdrop-blur-md border border-foreground/[0.08] focus-within:border-accent/40 rounded-ui-md h-[30px] relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={language === 'tr' ? 'Şablonlarda ara...' : 'Search templates...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs text-foreground placeholder-foreground/30 p-0"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-0.5 rounded hover:bg-hover text-foreground/45 hover:text-foreground transition shrink-0 cursor-pointer"
                title={language === 'tr' ? 'Temizle' : 'Clear'}
              >
                <X size={12} className="stroke-[2.5]" />
              </button>
            )}
            {searchQuery.trim() && allItems.length > 0 && (
              <span className="text-[10px] text-foreground/45 font-mono select-none shrink-0 mr-0.5">
                {allItems.length}
              </span>
            )}
          </div>
        </div>

        {/* List items */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-3 pt-1.5 flex flex-col gap-1.5 scrollbar-thin focus:outline-none"
        >
          {allItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-foreground/20 gap-2 py-8">
              <Star size={26} strokeWidth={1.2} />
              <p className="text-[11px] text-center leading-relaxed px-2 select-none">
                {language === 'tr' ? (
                  <>Şablon bulunamadı.<br />Aramayı temizlemeyi deneyin.</>
                ) : (
                  <>No templates found.<br />Try clearing your search query.</>
                )}
              </p>
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isDup = item.isDuplicate;
              
              const isEmpty = !item.content || !item.content.trim();
              const textToShow = item.content || (language === 'tr' ? 'Şablon içeriği...' : 'Template content...');

              return (
                <div
                  key={item.id}
                  ref={isSelected ? selectedRef : null}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setSelectedIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === ' ') {
                      e.preventDefault(); // Prevent page scroll on space key
                    }
                  }}
                  onDoubleClick={() => {
                    if (isDup) {
                      onAcceptDuplicate?.(item.content);
                    } else {
                      onApply(item);
                    }
                  }}
                  className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl border border-solid cursor-pointer transition-all duration-100 relative focus:outline-none focus:ring-1 focus:ring-accent/20 ${
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
                    {/* Suggestion label (no numbers shown) */}
                    {isDup && (
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold select-none">
                        <span className="flex items-center gap-1 text-amber-500">
                          <Zap size={10} className="shrink-0" />
                          <span>{language === 'tr' ? 'Öneri' : 'Suggested'}</span>
                        </span>
                      </div>
                    )}
                    {/* Content preview flows naturally as single block with line clamp */}
                    <div
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                      className={`text-xs leading-relaxed break-words ${
                        isEmpty ? 'text-foreground/20 italic' : (
                          isSelected
                            ? isDup ? 'text-amber-300/70' : 'text-foreground/75'
                            : 'text-foreground/45'
                        )
                      }`}
                    >
                      {textToShow}
                    </div>
                  </div>
                  {!isDup && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemove(item.id);
                        setSelectedIndex(0);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-hover text-foreground/45 hover:text-foreground transition cursor-pointer shrink-0 mt-0.5"
                      title={language === 'tr' ? 'Şablonu Sil' : 'Delete Template'}
                    >
                      <Trash2 size={12} className="text-foreground/40 hover:text-danger" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Template Content Preview & Editor */}
      <div className="flex-1 flex flex-col h-full bg-modal-base min-w-0">
        {/* Right Column Header */}
        <div className="h-12 flex items-center justify-end px-5 shrink-0 bg-element/5 select-none">
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-hover text-foreground/60 hover:text-foreground transition cursor-pointer"
            title={language === 'tr' ? 'Kapat' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Right Editor Area */}
        <div className="flex-1 p-6 flex flex-col min-h-0">
          {selectedItem ? (
            selectedItem.isDuplicate ? (
              <pre className="text-sm text-foreground font-sans whitespace-pre-wrap leading-relaxed overflow-y-auto pr-1 flex-1 select-text select-all">
                {selectedItem.content || (language === 'tr' ? '(Şablon içeriği boş)' : '(Template content is empty)')}
              </pre>
            ) : (
              <textarea
                ref={textareaRef}
                value={selectedItem.content}
                onChange={(e) => onUpdate?.(selectedItem.id, e.target.value)}
                placeholder={language === 'tr' ? 'Şablon içeriğini buraya yazın...' : 'Write template content here...'}
                className="w-full flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-sm text-foreground placeholder-foreground/20 resize-none font-sans leading-relaxed overflow-y-auto p-0"
              />
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-foreground/20 gap-2 py-8 select-none">
              <Star size={36} strokeWidth={1} />
              <p className="text-xs text-center">
                {language === 'tr' ? 'Seçili şablon yok' : 'No template selected'}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-5 border-t border-muted/15 bg-element/5 mt-auto shrink-0 select-none">
          <Button
            variant="secondary"
            onClick={onClose}
            className="text-xs"
          >
            {language === 'tr' ? 'Vazgeç' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (selectedItem) {
                if (selectedItem.isDuplicate) {
                  onAcceptDuplicate?.(selectedItem.content);
                } else {
                  onApply(selectedItem);
                }
              }
            }}
            disabled={!selectedItem}
            className="text-xs font-bold"
          >
            {language === 'tr' ? 'Onayla' : 'Accept'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
