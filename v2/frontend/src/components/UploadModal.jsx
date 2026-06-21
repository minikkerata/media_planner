import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Calendar, Share2, X } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { api } from '../services/api';
import { t } from '../utils/translations';

export default function UploadModal({ isOpen, onClose, activeVideo, onPublishSuccess, language, showToast }) {
  const [scheduleTime, setScheduleTime] = useState('');
  const [postInterval, setPostInterval] = useState(24);
  const [caption, setCaption] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [publishStatus, setPublishStatus] = useState('idle'); // 'idle' | 'cloudinary' | 'buffer'
  const hoverVideoRef = useRef(null);

  const getSuggestedDateTimeString = (hours) => {
    const date = new Date();
    date.setHours(date.getHours() + (hours || 24));
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // Load buffer_post_interval and initialize description state when modal opens
  useEffect(() => {
    if (isOpen && activeVideo) {
      setPublishStatus('idle');
      setCaption(activeVideo.description || '');
      api.getSettings()
        .then(data => {
          if (data && data.buffer_post_interval) {
            setPostInterval(data.buffer_post_interval);
            setScheduleTime(getSuggestedDateTimeString(data.buffer_post_interval));
          } else {
            setScheduleTime(getSuggestedDateTimeString(24));
          }
        })
        .catch(err => {
          console.error(err);
          setScheduleTime(getSuggestedDateTimeString(24));
        });
    }
  }, [isOpen, activeVideo]);

  if (!isOpen || !activeVideo) return null;

  const handlePublish = async (isScheduled) => {
    const videoPath = activeVideo.path;
    const captionToUse = caption;
    const formattedScheduleTime = isScheduled ? new Date(scheduleTime).toISOString() : null;

    try {
      setPublishStatus('cloudinary');
      
      // Simulating intermediate step transition since backend does both
      const transitionTimer = setTimeout(() => {
        setPublishStatus('buffer');
      }, 3000);

      const res = await api.uploadPublish(videoPath, captionToUse, formattedScheduleTime);
      clearTimeout(transitionTimer);
      
      if (res.success) {
        // Step 2: Mark shared and update description in DB
        let videoFolder = '';
        const lastSlash = Math.max(videoPath.lastIndexOf('\\'), videoPath.lastIndexOf('/'));
        if (lastSlash !== -1) {
          videoFolder = videoPath.substring(0, lastSlash);
        }
        await api.updateMetadata(videoFolder, [{ name: activeVideo.name, shared: true, description: captionToUse }]);
        
        if (showToast) showToast(t('publish_success_msg', language), 'success');
        if (onPublishSuccess) onPublishSuccess(videoPath, captionToUse);
        onClose();
      } else {
        if (showToast) showToast(res.message || 'Hata', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Yükleme işlemi başarısız.', 'error');
    } finally {
      setPublishStatus('idle');
    }
  };

  const API_URL = 'http://127.0.0.1:' + (import.meta.env.VITE_BACKEND_PORT || '8085');

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => publishStatus === 'idle' && onClose()}
      className="bg-modal-surface border border-foreground/5 rounded-2xl w-full max-w-4xl h-[660px] shadow-2xl flex overflow-hidden animate-in fade-in zoom-in duration-200"
    >
      {/* Left Column: Video Preview - Styling matches Settings modal left side layout */}
      <div className="w-80 bg-modal-surface border-r border-foreground/5 flex flex-col items-center justify-center p-6 shrink-0 relative">
        <div
          className="relative w-full aspect-[9/16] max-h-[460px] rounded-ui-xl overflow-hidden bg-black/40 border border-muted/10 group cursor-pointer shadow-md"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <img
            src={`${API_URL}/api/thumbnail?path=${encodeURIComponent(activeVideo.path)}`}
            onError={(e) => { e.target.style.display = 'none'; }}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition duration-150 z-10 rounded-card-dynamic ${isHovering ? 'opacity-0' : ''}`}
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
        <span className="text-[11px] text-foreground/45 mt-4 truncate max-w-full font-mono">{activeVideo.name}</span>
      </div>

      {/* Right Column: Form (Details & Actions) */}
      <div className="flex-1 flex flex-col bg-modal-base relative h-full">
        {/* Header */}
        <div className="px-8 py-5 border-b border-foreground/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5 text-accent">
            <Share2 className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">{t('upload_modal_title', language)}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={publishStatus !== 'idle'}
            className="p-1.5 rounded-md text-foreground/60 hover:text-foreground hover:bg-hover transition cursor-pointer disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form Area */}
        <div className="flex-1 p-8 flex flex-col gap-5 min-h-0 overflow-y-auto relative">
          {/* Description input - Now editable & much larger */}
          <div className="flex-1 flex flex-col gap-2 min-h-[260px]">
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
              Video Açıklaması / Altyazı (Düzenlenebilir)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={publishStatus !== 'idle'}
              rows="10"
              className="flex-1 w-full bg-foreground/[0.03] border border-muted/10 focus:border-accent/40 focus:ring-0 focus:outline-none rounded-ui-lg px-4 py-3 text-sm text-foreground placeholder-foreground/30 resize-none transition"
              placeholder="Videonuz için bir açıklama girin..."
            />
          </div>

          {/* Schedule time input */}
          <div className="flex flex-col gap-2 shrink-0">
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-accent" />
              <span>{t('schedule_time_label', language)}</span>
            </label>
            <Input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              disabled={publishStatus !== 'idle'}
            />
            <span className="text-[10px] text-foreground/45">
              {t('suggested_time', language)} {postInterval} saat sonra
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-5 border-t border-foreground/5 mt-auto shrink-0">
            <Button
              variant="secondary"
              onClick={() => handlePublish(true)}
              disabled={publishStatus !== 'idle'}
              className="flex-1 py-2.5 text-xs font-semibold"
            >
              {t('schedule_btn', language)}
            </Button>
            <Button
              variant="primary"
              onClick={() => handlePublish(false)}
              disabled={publishStatus !== 'idle'}
              className="flex-1 py-2.5 text-xs font-bold"
            >
              {t('upload_now_btn', language)}
            </Button>
          </div>

          {/* Loading status overlay */}
          {publishStatus !== 'idle' && (
            <div className="absolute inset-0 bg-modal-surface/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-50">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm font-semibold text-foreground">
                {publishStatus === 'cloudinary' ? t('uploading_status', language) : t('publishing_status', language)}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
