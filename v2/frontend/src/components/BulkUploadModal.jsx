import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Share2, X, Check, AlertCircle, Play, ArrowRight, Calendar } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { api } from '../services/api';
import { t } from '../utils/translations';

export default function BulkUploadModal({ isOpen, onClose, selectedVideos, planner, language }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const hoverVideoRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [intervalHours, setIntervalHours] = useState(1);
  const [sharedToday, setSharedToday] = useState(false);

  useEffect(() => {
    if (isOpen && selectedVideos.length > 0) {
      setActiveIdx(0);
    }
  }, [isOpen, selectedVideos.length]);

  useEffect(() => {
    if (isOpen) {
      api.checkSharedToday()
        .then(data => {
          if (data && data.success) {
            setSharedToday(data.shared_today);
          }
        })
        .catch(err => {
          console.error("Failed to check if shared today:", err);
        });
    }
  }, [isOpen]);

  if (!isOpen || selectedVideos.length === 0) return null;

  const activeVideo = selectedVideos[activeIdx] || selectedVideos[0];
  const API_URL = 'http://127.0.0.1:' + (import.meta.env.VITE_BACKEND_PORT || '8085');

  // Handle active video description update
  const handleDescriptionChange = (e) => {
    const newText = e.target.value;
    planner.setVideos(prev => prev.map(v => v.path === activeVideo.path ? { ...v, description: newText } : v));
    
    // Save to SQLite
    let videoFolder = '';
    const lastSlash = Math.max(activeVideo.path.lastIndexOf('\\'), activeVideo.path.lastIndexOf('/'));
    if (lastSlash !== -1) {
      videoFolder = activeVideo.path.substring(0, lastSlash);
    }
    api.updateMetadata(videoFolder, [{ name: activeVideo.name, description: newText }]);
  };

  const handleStartPublish = () => {
    planner.startPublishQueue(selectedVideos, intervalHours);
  };

  const isUploading = planner.uploadStatus === 'publishing';
  const isError = planner.uploadStatus === 'error';
  const isSuccess = planner.uploadStatus === 'success';

  const getDisplayScheduleTime = (idx) => {
    const queuedItem = planner.uploadQueue?.find(v => v.path === selectedVideos[idx]?.path);
    let targetTimeStr = queuedItem ? queuedItem.scheduleTime : null;
    
    if (!planner.uploadStatus || planner.uploadStatus === 'idle') {
      if (sharedToday) {
        const dt = new Date();
        dt.setHours(dt.getHours() + (idx + 1) * intervalHours);
        targetTimeStr = dt.toISOString();
      } else {
        if (idx === 0) {
          targetTimeStr = null;
        } else {
          const dt = new Date();
          dt.setHours(dt.getHours() + idx * intervalHours);
          targetTimeStr = dt.toISOString();
        }
      }
    }
    
    if (!targetTimeStr) {
      return language === 'tr' ? 'Şimdi (Hemen)' : 'Share Now';
    }
    
    const dt = new Date(targetTimeStr);
    const timeString = dt.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const dateString = dt.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
    return `${dateString}, ${timeString}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isUploading && onClose()}
      className="bg-modal-surface border border-foreground/5 rounded-2xl shadow-2xl flex flex-col p-8 w-full max-w-6xl h-[780px] overflow-hidden animate-in fade-in zoom-in duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-foreground/5 shrink-0">
        <div className="flex items-center text-accent">
          <h3 className="text-sm font-bold text-foreground">Toplu Sosyal Medya Paylaşımı (Bulk Upload)</h3>
        </div>
        {!isUploading && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-foreground/45 hover:text-foreground hover:bg-hover transition cursor-pointer"
            title={t('close_title', language) || "Kapat"}
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Horizontal Carousel of Video Thumbnails */}
      <div className="flex gap-4 overflow-x-auto py-5 px-3 my-3 bg-black/15 border border-muted/5 rounded-xl shrink-0 scrollbar-thin scrollbar-thumb-muted">
        {selectedVideos.map((video, idx) => {
          const isActive = idx === activeIdx;
          
          // Queue states
          const queueIdx = planner.uploadQueue.findIndex(v => v.path === video.path);
          const isItemActiveUploading = planner.uploadingPath === video.path;
          const isItemQueued = queueIdx !== -1 && queueIdx > planner.uploadCurrentIndex;
          const isItemCompleted = planner.uploadCompletedPaths?.has(video.path) || video.shared;
          const isItemFailed = planner.uploadFailedPaths?.has(video.path);

          return (
            <div
              key={video.path}
              onClick={() => setActiveIdx(idx)}
              className={`relative w-28 aspect-[9/16] rounded-xl shrink-0 transition-all duration-150 cursor-pointer hover:scale-105 ${
                isActive 
                  ? 'p-1.5 bg-active border border-accent ring-2 ring-accent/30 scale-102 z-10 shadow-lg' 
                  : 'p-1.5 border border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <div className="relative w-full h-full rounded-lg overflow-hidden bg-black/40">
                <img
                  src={`${API_URL}/api/thumbnail?path=${encodeURIComponent(video.path)}`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />

                {/* Item status overlays on carousel */}
                {isItemActiveUploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 z-10 animate-fade-in">
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    <span className="text-[7px] text-white font-extrabold uppercase tracking-wider">Uploading</span>
                  </div>
                )}

                {isItemQueued && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5 z-10 animate-fade-in">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[7px] text-amber-400 font-extrabold uppercase tracking-wider">Sırada</span>
                  </div>
                )}

                {isItemCompleted && !isItemActiveUploading && (
                  <div className="absolute inset-0 bg-success/80 flex flex-col items-center justify-center gap-1.5 z-10 animate-fade-in">
                    <Check className="w-5 h-5 text-white stroke-[3px]" />
                    <span className="text-[7px] text-white font-extrabold uppercase tracking-wider">
                      {video.scheduleTime ? 'Scheduled' : 'Published'}
                    </span>
                  </div>
                )}

                {isItemFailed && (
                  <div className="absolute inset-0 bg-danger/80 flex flex-col items-center justify-center gap-1.5 z-10">
                    <X className="w-5 h-5 text-white stroke-[3px]" />
                    <span className="text-[7px] text-white font-extrabold uppercase tracking-wider">Hata</span>
                  </div>
                )}

                {/* Index Number Indicator */}
                <span className="absolute top-1 left-1 bg-black/60 text-[8px] font-bold text-white px-1.5 py-0.5 rounded">
                  {idx + 1}
                </span>

                {/* Calculated target schedule time badge */}
                <div className="absolute bottom-1 inset-x-1 bg-black/65 text-[7px] text-white/95 text-center py-0.5 rounded font-mono truncate z-20 border border-white/5">
                  {getDisplayScheduleTime(idx)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor & Preview Area */}
      <div className="flex-1 flex gap-6 min-h-0 py-3 border-b border-foreground/5">
        {/* Left Column: Larger preview of active video */}
        <div className="w-56 bg-black/20 border border-muted/5 rounded-2xl flex flex-col items-center p-4 shrink-0 relative justify-center">
          <div
            className="relative w-full aspect-[9/16] max-h-[340px] rounded-xl overflow-hidden bg-black/40 border border-muted/10 group cursor-pointer shadow-md"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <img
              src={`${API_URL}/api/thumbnail?path=${encodeURIComponent(activeVideo.path)}`}
              onError={(e) => { e.target.style.display = 'none'; }}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover transition duration-150 z-10 ${isHovering ? 'opacity-0' : ''}`}
            />
            {isHovering && (
              <video
                ref={hoverVideoRef}
                src={`${API_URL}/api/video?path=${encodeURIComponent(activeVideo.path)}`}
                autoPlay
                loop
                muted
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            )}
          </div>
          <span className="text-[10px] text-foreground/45 mt-4 truncate max-w-full font-mono">{activeVideo.name}</span>
        </div>

        {/* Right Column: Editable description text box */}
        <div className="flex-1 flex flex-col gap-3.5 h-full min-w-0">
          <div className="flex justify-between items-center shrink-0">
            <label className="text-[11px] font-bold text-foreground/50 uppercase tracking-wider">
              Seçili Videonun Açıklaması ({activeIdx + 1} / {selectedVideos.length})
            </label>
            <div className="text-xs bg-accent/10 border border-accent/20 px-3 py-1 rounded-md text-accent font-semibold flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5" />
              <span>{getDisplayScheduleTime(activeIdx)}</span>
            </div>
          </div>
          <textarea
            value={activeVideo.description || ''}
            onChange={handleDescriptionChange}
            disabled={isUploading}
            rows="10"
            className="flex-1 w-full bg-foreground/[0.02] border border-muted/10 focus:border-accent/40 focus:ring-0 focus:outline-none rounded-xl px-4 py-3.5 text-sm text-foreground placeholder-foreground/30 resize-none transition"
            placeholder="Seçtiğiniz video için bir açıklama girin..."
          />
        </div>
      </div>

      {/* Action Footer & Queued status bar */}
      <div className="pt-4 flex flex-col gap-4 shrink-0">
        {/* Status indicator bar */}
        {(isUploading || isError || isSuccess) && (
          <div className="flex items-center justify-between bg-foreground/[0.02] border border-muted/5 px-4 py-3 rounded-xl text-xs gap-3">
            <div className="flex items-center gap-2">
              {isUploading && <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />}
              {isSuccess && <Check className="w-3.5 h-3.5 text-green-500 stroke-[3px]" />}
              {isError && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              <span className={`font-semibold ${isError ? 'text-danger' : isSuccess ? 'text-green-500' : 'text-foreground'}`}>
                {isUploading && (
                  `Yayınlanıyor: ${planner.uploadCurrentIndex + 1} / ${selectedVideos.length} Video (${
                    planner.uploadCurrentStep === 'cloudinary' ? 'Cloudinary\'ye yükleniyor...' :
                    planner.uploadCurrentStep === 'buffer' ? 'Buffer\'da planlanıyor...' :
                    planner.uploadCurrentStep === 'db' ? 'Veritabanı güncelleniyor...' :
                    'Hazırlanıyor...'
                  })`
                )}
                {isSuccess && 'Toplu gönderim başarıyla tamamlandı!'}
                {isError && `Gönderim hatası: ${planner.uploadErrorMsg}`}
              </span>
            </div>
            {isUploading && (
              <span className="text-[10px] text-foreground/45 font-mono italic">
                Aktif: {selectedVideos[planner.uploadCurrentIndex]?.name}
              </span>
            )}
          </div>
        )}

        {/* Buttons & Interval Selector */}
        <div className="flex gap-3 justify-between items-center w-full">
          {planner.uploadStatus === 'idle' ? (
            <>
              {/* Interval Selection */}
              <div className="flex items-center gap-2.5 animate-in fade-in slide-in-from-left-2 duration-200">
                <span className="text-xs text-foreground/60 font-bold uppercase tracking-wider">Paylaşım Aralığı:</span>
                <select
                  value={intervalHours}
                  onChange={(e) => setIntervalHours(parseInt(e.target.value))}
                  className="bg-foreground/[0.03] border border-muted/10 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/40 text-foreground font-semibold cursor-pointer hover:bg-foreground/[0.05] transition"
                >
                  <option value={1} className="bg-modal-surface text-foreground">1 Saat Aralıklarla</option>
                  <option value={2} className="bg-modal-surface text-foreground">2 Saat Aralıklarla</option>
                  <option value={3} className="bg-modal-surface text-foreground">3 Saat Aralıklarla</option>
                  <option value={4} className="bg-modal-surface text-foreground">4 Saat Aralıklarla</option>
                  <option value={6} className="bg-modal-surface text-foreground">6 Saat Aralıklarla</option>
                  <option value={12} className="bg-modal-surface text-foreground">12 Saat Aralıklarla</option>
                  <option value={24} className="bg-modal-surface text-foreground">24 Saat (1 Gün) Aralıklarla</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end items-center ml-auto">
                <Button variant="secondary" onClick={onClose} className="px-5 py-2.5 text-xs font-bold">
                  Kapat
                </Button>
                <Button variant="primary" onClick={handleStartPublish} className="px-6 py-2.5 text-xs font-bold gap-2">
                  <Share2 size={14} />
                  <span>Yayınlamayı Başlat ({selectedVideos.length} Video)</span>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-3 justify-end items-center ml-auto w-full">
              {isUploading && (
                <>
                  <Button variant="secondary" onClick={onClose} className="px-5 py-2.5 text-xs font-semibold">
                    Arka Planda Devam Et
                  </Button>
                  <Button
                    variant="primary"
                    onClick={planner.cancelPublishQueue}
                    className="px-6 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-500! text-white"
                  >
                    Kuyruğu İptal Et / Durdur
                  </Button>
                </>
              )}

              {isError && (
                <>
                  <Button
                    variant="secondary"
                    onClick={planner.cancelPublishQueue}
                    className="px-5 py-2.5 text-xs font-semibold bg-red-600/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                  >
                    Kuyruğu Temizle
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={planner.skipAndResumePublishQueue}
                    className="px-5 py-2.5 text-xs font-bold gap-1.5"
                  >
                    <span>Bu Videoyu Geç</span>
                    <ArrowRight size={13} />
                  </Button>
                  <Button
                    variant="primary"
                    onClick={planner.resumePublishQueue}
                    className="px-6 py-2.5 text-xs font-bold gap-2"
                  >
                    <Play size={14} />
                    <span>Yayınlamaya Devam Et</span>
                  </Button>
                </>
              )}

              {isSuccess && (
                <Button
                  variant="primary"
                  onClick={() => {
                    planner.cancelPublishQueue(); // reset status to idle
                    onClose();
                  }}
                  className="px-6 py-2.5 text-xs font-bold"
                >
                  Tamam
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
