import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export default function PublishStepProgress({ publishSteps }) {
  if (!publishSteps || publishSteps.length === 0) return null;

  return (
    <div className="space-y-2 py-1">
      {publishSteps.map((step) => (
        <div key={step.id} className="flex items-center justify-between text-xs py-1.5 px-3 bg-active/30 rounded-lg">
          <span className="text-foreground/80 font-medium">{step.label}</span>
          {step.status === 'running' && <Loader2 size={14} className="text-accent animate-spin" />}
          {step.status === 'success' && <Check size={14} className="text-green-500" />}
          {step.status === 'error' && <AlertCircle size={14} className="text-red-500" />}
          {step.status === 'idle' && <span className="text-foreground/30">•</span>}
        </div>
      ))}
    </div>
  );
}
