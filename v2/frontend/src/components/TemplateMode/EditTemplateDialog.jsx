import React, { useState, useEffect, useRef } from 'react';
import { LayoutTemplate, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * A standard modal dialog to edit a template's name and text content.
 * Reuses the application's base Modal and Button design system components.
 */
export default function EditTemplateDialog({
  isOpen,
  template,
  onSave,
  onCancel
}) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && template) {
      setName(template.name || '');
      setContent(template.content || '');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, template]);

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSave = () => {
    onSave(template.id, name.trim() || 'Şablon', content);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      className="bg-modal-surface border border-muted/15 rounded-ui-xl shadow-2xl overflow-hidden animate-scale-up"
    >
      <div className="flex flex-col w-full h-full" onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-muted/15">
          <div className="flex items-center gap-2 text-accent">
            <LayoutTemplate className="w-5 h-5" />
            <h3 className="font-bold text-foreground">Şablonu Düzenle</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-ui-md text-foreground/60 hover:text-foreground hover:bg-hover transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-foreground/50 font-semibold">Şablon Adı</label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Şablon adı..."
              className="w-full bg-modal-base border border-muted/15 focus:border-accent rounded-ui-md px-3 py-2 text-sm text-foreground placeholder-foreground/45 focus:outline-none transition"
            />
          </div>

          <div className="flex flex-col gap-1 flex-1 min-h-0">
            <label className="text-[11px] text-foreground/50 font-semibold">Şablon İçeriği</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Şablon içeriği..."
              className="w-full flex-1 bg-modal-base border border-muted/15 focus:border-accent rounded-ui-md px-3 py-2 text-sm text-foreground placeholder-foreground/45 focus:outline-none resize-none transition font-sans min-h-[250px]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-3 border-t border-muted/15 bg-element/30">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="text-xs"
          >
            İptal
          </Button>
          <Button
            variant="accent"
            onClick={handleSave}
            className="text-xs font-bold"
          >
            Kaydet
          </Button>
        </div>
      </div>
    </Modal>
  );
}
