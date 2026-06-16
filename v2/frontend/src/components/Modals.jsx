import React from 'react';
import { IconEdit, IconClose, IconWarning } from './Icons';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { t } from '../utils/translations';

export function AIModal({ showAIModal, setShowAIModal, aiText, setAiText, aiInputRef, handleInputFocus, handleAIDistribution, language }) {
  return (
    <Modal
      isOpen={showAIModal}
      onClose={() => { setShowAIModal(false); setAiText(''); }}
      className="bg-modal-surface border border-muted/15 rounded-ui-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up"
    >
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-muted/15">
          <div className="flex items-center gap-2 text-success">
            <IconEdit className="w-5 h-5" />
            <h3 className="font-bold text-foreground">{t('bulk_desc_change', language)}</h3>
          </div>
          <button
            onClick={() => { setShowAIModal(false); setAiText(''); }}
            className="p-1 rounded-ui-md text-foreground/60 hover:text-foreground hover:bg-hover transition cursor-pointer"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 flex flex-col gap-3">
          <textarea
            ref={aiInputRef}
            rows="8"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            onFocus={() => handleInputFocus(true)}
            onBlur={() => handleInputFocus(false)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                handleAIDistribution();
              }
            }}
            placeholder={t('bulk_desc_placeholder', language)}
            className="w-full bg-modal-base border border-muted/15 focus:border-success rounded-ui-md px-3 py-2 text-sm text-foreground placeholder-foreground/40 focus:outline-none resize-none transition"
          />
        </div>
        
        <div className="flex justify-end gap-3 px-5 py-3 border-t border-muted/15 bg-element/30">
          <Button
            variant="secondary"
            onClick={() => { setShowAIModal(false); setAiText(''); }}
            className="text-xs"
          >
            {t('cancel_btn', language)}
          </Button>
          <Button
            variant="success"
            onClick={handleAIDistribution}
            disabled={aiText.trim().length === 0}
            className="text-xs font-bold"
          >
            {t('distribute', language)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function DeleteModal({ showDeleteModal, setShowDeleteModal, deletePaths, executeDelete, language }) {
  return (
    <Modal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      className="bg-modal-surface border border-muted/15 rounded-ui-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up"
    >
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-muted/15">
          <div className="flex items-center gap-2 text-danger">
            <IconWarning className="w-5.5 h-5.5" />
            <h3 className="font-bold text-foreground">{t('delete_items', language)}</h3>
          </div>
          <button
            onClick={() => setShowDeleteModal(false)}
            className="p-1 rounded-ui-md text-foreground/60 hover:text-foreground hover:bg-hover transition cursor-pointer"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 text-sm text-foreground/80">
          <p>{t('delete_confirm', language).replace('{count}', deletePaths.size)}</p>
        </div>
        
        <div className="flex justify-end gap-3 px-5 py-3 border-t border-muted/15 bg-element/30">
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            className="text-xs"
          >
            {t('cancel_btn', language)}
          </Button>
          <Button
            variant="danger"
            onClick={executeDelete}
            className="text-xs font-bold"
          >
            {t('delete', language)}
          </Button>
        </div>
      </div>
    </Modal>
  );
}