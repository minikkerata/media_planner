import React from 'react';
import { Loader2, CheckCircle2, XCircle, X, RotateCcw } from 'lucide-react';

export default function ProcessToast({ processToast, setProcessToast, language, onRetry, onOpen }) {
  if (!processToast) return null;

  const { type, name, image, status, progress, error, retryPayload } = processToast;

  const isRunning = status === 'running' || status === 'pending';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  const API_URL = 'http://127.0.0.1:' + (import.meta.env.VITE_BACKEND_PORT || '8085');
  const imgSrc = image ? `${API_URL}/api/thumbnail?path=${encodeURIComponent(image)}` : '';

  const getOpTitle = () => {
    if (type === 'publish') {
      if (isRunning) return language === 'tr' ? 'Paylaşılıyor...' : 'Publishing...';
      if (isCompleted) return language === 'tr' ? 'Paylaşım Tamamlandı' : 'Publish Completed';
      return language === 'tr' ? 'Paylaşım Başarısız' : 'Publish Failed';
    } else {
      if (isRunning) return language === 'tr' ? 'Toplu Paylaşılıyor...' : 'Bulk Publishing...';
      if (isCompleted) return language === 'tr' ? 'Toplu Paylaşım Tamamlandı' : 'Bulk Publish Completed';
      return language === 'tr' ? 'Toplu Paylaşım Başarısız' : 'Bulk Publish Failed';
    }
  };

  const isClickable = !!onOpen && !!image;

  const containerClasses = `
    fixed bottom-6 right-6 z-[100] w-72 overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in
    ${isRunning ? 'bg-black/80 border-white/10 text-foreground' : ''}
    ${isCompleted ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 shadow-[0_0_25px_rgba(16,163,127,0.15)]' : ''}
    ${isFailed ? 'bg-red-950/40 border-red-500/30 text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.15)]' : ''}
    ${isClickable ? 'cursor-pointer' : ''}
  `;

  return (
    <div
      className={containerClasses}
      onClick={isClickable ? () => onOpen(image) : undefined}
      title={isClickable ? (language === 'tr' ? 'Publish detaylarını görüntüle' : 'View publish details') : undefined}
    >
      {/* Thumbnail Area */}
      <div className="relative w-full aspect-video bg-black/40 overflow-hidden flex items-center justify-center border-b border-white/5">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-foreground/20 gap-2">
            <Loader2 size={36} className="animate-spin text-foreground/10" />
          </div>
        )}

        {/* Progress overlay */}
        {isRunning && progress > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white tracking-wide border border-white/10">
            {progress}%
          </div>
        )}
        
        {/* Dismiss Button */}
        <button
          onClick={(e) => { e.stopPropagation(); setProcessToast(null); }}
          className="absolute top-2 left-2 p-1 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition duration-150 border-0 cursor-pointer"
          title={language === 'tr' ? 'Kapat' : 'Close'}
        >
          <X size={14} />
        </button>
      </div>

      {/* Details Area */}
      <div className="p-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
            {getOpTitle()}
          </span>
          <div className="shrink-0 flex items-center gap-1.5">
            {isRunning && <Loader2 size={14} className="animate-spin opacity-80" />}
            {isCompleted && <CheckCircle2 size={14} className="text-emerald-400" />}
            {isFailed && onRetry && retryPayload && (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(retryPayload); }}
                title={language === 'tr' ? 'Yeniden Dene' : 'Retry'}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold
                  bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 hover:border-red-400/70
                  text-red-300 hover:text-red-200 transition-all duration-150 cursor-pointer"
              >
                <RotateCcw size={10} />
                {language === 'tr' ? 'Tekrar' : 'Retry'}
              </button>
            )}
            {isFailed && <XCircle size={14} className="text-red-400" />}
          </div>
        </div>

        <p className="text-xs font-semibold truncate text-foreground/90 select-text" title={name}>
          {name}
        </p>

        {isFailed && error && (
          <p className="text-[10px] text-red-400/90 font-medium truncate mt-0.5 select-text" title={error}>
            {error}
          </p>
        )}

        {/* Bottom progress bar */}
        {isRunning && (
          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-white/70 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
