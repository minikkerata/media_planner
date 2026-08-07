import React from 'react';
import { Loader2, Check, AlertCircle, X } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function CalendarTaskModal({ viewUploadTask, setViewUploadTask, language }) {
  if (!viewUploadTask) return null;

  return (
    <Modal
      isOpen={!!viewUploadTask}
      onClose={() => setViewUploadTask(null)}
      className="bg-modal-surface border border-foreground/10 rounded-2xl p-6 shadow-2xl max-w-md w-full"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground truncate pr-4">
          {viewUploadTask.video?.name || 'Yayın Süreci'}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewUploadTask(null)}
          className="p-1 rounded-md text-foreground/50 hover:text-foreground"
        >
          <X size={16} />
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        {viewUploadTask.steps?.map((step) => (
          <div key={step.id} className="flex items-center justify-between text-xs py-1 border-b border-foreground/5">
            <span className="text-foreground/70">{step.label}</span>
            {step.status === 'running' && <Loader2 size={14} className="text-accent animate-spin" />}
            {step.status === 'success' && <Check size={14} className="text-green-500" />}
            {step.status === 'error' && <AlertCircle size={14} className="text-red-500" />}
            {step.status === 'idle' && <span className="text-foreground/30">•</span>}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setViewUploadTask(null)}>
          Kapat
        </Button>
      </div>
    </Modal>
  );
}
