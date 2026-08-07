import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Calendar, Share2, X, Check, AlertTriangle } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { api } from '../services/api';
import { t } from '../utils/translations';

export default function UploadModal({ 
  isOpen, 
  onClose, 
  activeVideo, 
  onPublishSuccess, 
  onPublishStart,
  onPublishEnd,
  language, 
  showToast,
  fixedText = '',
  resolveFixedText,
  setProcessToast,
  setVideos,
  initialScheduleTime,
  startPublishTask,
  isDetailView,
  videos = [],
  activeUploads = {},
  openVideoDetailModal
}) {
  const [scheduleTime, setScheduleTime] = useState('');
  const [postInterval, setPostInterval] = useState(24);
  const [caption, setCaption] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [publishStatus, setPublishStatus] = useState('idle'); // 'idle' | 'publishing' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [publishSteps, setPublishSteps] = useState([
    { id: 'file', label: 'Dosya doğrulama', status: 'idle' },
    { id: 'cloudinary', label: 'Cloudinary bulut sunucusuna yükleme', status: 'idle' },
    { id: 'buffer', label: 'Buffer sosyal medya entegrasyonu', status: 'idle' },
    { id: 'db', label: 'Yerel veritabanı (SQLite) güncellemesi', status: 'idle' }
  ]);

  const activeUpload = activeUploads && activeVideo ? activeUploads[activeVideo.path] : null;
  const isActivelyUploading = activeUpload && (activeUpload.status === 'running');
  const isFailedUpload = activeUpload && activeUpload.status === 'error';
  const failedErrorMessage = activeUpload ? activeUpload.error : '';

  const updateStepStatus = (id, status) => {
    setPublishSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };
  const hoverVideoRef = useRef(null);

  const hasInitializedRef = useRef(false);

  const getLocalDateString = (d = new Date()) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseLocalISOToDate = (isoStr) => {
    if (!isoStr) return new Date();
    const [dPart, tPart] = isoStr.split('T');
    if (!dPart || !tPart) return new Date(isoStr);
    const [year, month, day] = dPart.split('-').map(Number);
    const [hours, minutes] = tPart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const getNextSlotForToday = () => {
    const today = new Date();
    const todayVideos = (videos || []).filter(v => v.publish_time && isSameDay(today, v.publish_time));
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    // Helper: 5 minutes from now (small safety buffer)
    const nowPlus5 = () => {
      const n = new Date();
      n.setMinutes(n.getMinutes() + 5, 0, 0);
      return n;
    };

    let candidate;
    if (todayVideos.length === 0) {
      // Default to 09:00
      candidate = new Date(`${yyyy}-${mm}-${dd}T09:00:00`);
    } else {
      // Find the latest scheduled video for today
      const latest = todayVideos.reduce((max, v) =>
        new Date(v.publish_time) > new Date(max.publish_time) ? v : max
      );
      candidate = new Date(latest.publish_time);
      candidate.setHours(candidate.getHours() + 1, 0, 0, 0);
      // Cap at 23:00
      if (candidate.getHours() === 0) candidate.setHours(23);
    }

    // If candidate is in the past, snap to now+5min
    const now = new Date();
    if (candidate <= now) {
      candidate = nowPlus5();
    }

    const hh = String(candidate.getHours()).padStart(2, '0');
    const min = String(candidate.getMinutes()).padStart(2, '0');
    const candYYYY = candidate.getFullYear();
    const candMM = String(candidate.getMonth() + 1).padStart(2, '0');
    const candDD = String(candidate.getDate()).padStart(2, '0');
    return `${candYYYY}-${candMM}-${candDD}T${hh}:${min}`;
  };

  // Load buffer_post_interval and initialize description state when modal opens
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      return;
    }

    if (isOpen && activeVideo && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setPublishStatus('idle');
      setErrorMessage('');
      
      const originalDesc = activeVideo.description || '';
      let resolvedFixed = '';
      if (resolveFixedText && fixedText) {
        resolvedFixed = resolveFixedText(activeVideo, fixedText);
      }
      const combinedCaption = originalDesc + (originalDesc && resolvedFixed ? '\n\n' : '') + resolvedFixed;
      setCaption(combinedCaption);

      api.getSettings()
        .then(data => {
          if (data && data.buffer_post_interval) {
            setPostInterval(data.buffer_post_interval);
          }
          if (initialScheduleTime) {
            setScheduleTime(initialScheduleTime);
          } else {
            setScheduleTime(getNextSlotForToday());
          }
        })
        .catch(err => {
          console.error(err);
          if (initialScheduleTime) {
            setScheduleTime(initialScheduleTime);
          } else {
            setScheduleTime(getNextSlotForToday());
          }
        });
    }
  }, [isOpen, activeVideo, fixedText, resolveFixedText, initialScheduleTime]);

  if (!isOpen || !activeVideo) return null;

  const handlePublish = async (isScheduled) => {
    const videoPath = activeVideo.path;
    const captionToUse = caption;
    const localDate = parseLocalISOToDate(scheduleTime);
    const formattedScheduleTime = isScheduled ? localDate.toISOString() : null;

    if (startPublishTask) {
      startPublishTask(activeVideo, captionToUse, formattedScheduleTime, isScheduled);
      return;
    }

    setPublishSteps([
      { id: 'file', label: 'Dosya doğrulama', status: 'running' },
      { id: 'cloudinary', label: 'Cloudinary bulut sunucusuna yükleme', status: 'idle' },
      { id: 'buffer', label: 'Buffer sosyal medya entegrasyonu', status: 'idle' },
      { id: 'db', label: 'Yerel veritabanı (SQLite) güncellemesi', status: 'idle' }
    ]);
    setPublishStatus('publishing');
    setErrorMessage('');
    if (onPublishStart) onPublishStart(videoPath);
    if (setProcessToast) {
      setProcessToast({
        type: 'publish',
        name: activeVideo.name,
        image: activeVideo.path,
        status: 'running',
        progress: 5,
        error: null
      });
    }

    try {
      // Step 1: File Verification
      await new Promise(resolve => setTimeout(resolve, 600)); // Delay for readability
      if (!videoPath) {
        updateStepStatus('file', 'error');
        throw new Error('Dosya yolu bulunamadı.');
      }
      updateStepStatus('file', 'success');
      updateStepStatus('cloudinary', 'running');
      if (setProcessToast) {
        setProcessToast(prev => prev ? { ...prev, progress: 25 } : null);
      }

      // Step 2: Upload to Cloudinary
      const uploadRes = await api.uploadCloudinary(videoPath);
      if (!uploadRes.success || !uploadRes.video_url) {
        updateStepStatus('cloudinary', 'error');
        throw new Error('Cloudinary yüklemesi başarısız oldu.');
      }
      const videoUrl = uploadRes.video_url;
      updateStepStatus('cloudinary', 'success');
      updateStepStatus('buffer', 'running');
      if (setProcessToast) {
        setProcessToast(prev => prev ? { ...prev, progress: 60 } : null);
      }

      // Step 3: Publish to Buffer
      const bufferRes = await api.publishBuffer(captionToUse, videoUrl, formattedScheduleTime);
      if (!bufferRes.success) {
        updateStepStatus('buffer', 'error');
        throw new Error(bufferRes.message || 'Buffer paylaşımı başarısız oldu.');
      }
      updateStepStatus('buffer', 'success');
      updateStepStatus('db', 'running');
      if (setProcessToast) {
        setProcessToast(prev => prev ? { ...prev, progress: 85 } : null);
      }

      // Step 4: Update SQLite Database
      let videoFolder = '';
      const lastSlash = Math.max(videoPath.lastIndexOf('\\'), videoPath.lastIndexOf('/'));
      if (lastSlash !== -1) {
        videoFolder = videoPath.substring(0, lastSlash);
      }
      const finalPublishTime = formattedScheduleTime || new Date().toISOString();
      await api.updateMetadata(videoFolder, [{ 
        name: activeVideo.name, 
        shared: true, 
        description: captionToUse,
        publish_time: finalPublishTime
      }]);
      if (setVideos) {
        setVideos(p => p.map(v => v.path === videoPath ? { 
          ...v, 
          shared: true, 
          description: captionToUse, 
          publish_time: finalPublishTime,
          updated_at: Date.now() 
        } : v));
      }
      updateStepStatus('db', 'success');

      if (showToast) showToast(t('publish_success_msg', language), 'success');
      if (setProcessToast) {
        setProcessToast({
          type: 'publish',
          name: activeVideo.name,
          image: activeVideo.path,
          status: 'completed',
          progress: 100,
          error: null
        });
      }
      
      if (onPublishSuccess) onPublishSuccess(videoPath, captionToUse);
      setPublishStatus('success');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Paylaşım işlemi başarısız.');
      setPublishStatus('error');
      // Mark the active/running steps as error
      setPublishSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
      if (showToast) showToast(err.message || 'Paylaşım işlemi başarısız.', 'error');
      if (setProcessToast) {
        setProcessToast({
          type: 'publish',
          name: activeVideo.name,
          image: activeVideo.path,
          status: 'failed',
          progress: 100,
          error: err.message || 'Paylaşım işlemi başarısız.'
        });
      }
    } finally {
      if (onPublishEnd) onPublishEnd(videoPath);
    }
  };

  const handleSaveDetails = async () => {
    const videoPath = activeVideo.path;
    const captionToUse = caption;
    
    setPublishStatus('publishing');
    setPublishSteps([
      { id: 'db', label: language === 'tr' ? 'Detaylar kaydediliyor' : 'Saving details', status: 'running' }
    ]);
    
    try {
      let videoFolder = '';
      const lastSlash = Math.max(videoPath.lastIndexOf('\\'), videoPath.lastIndexOf('/'));
      if (lastSlash !== -1) {
        videoFolder = videoPath.substring(0, lastSlash);
      }
      await api.updateMetadata(videoFolder, [{ 
        name: activeVideo.name, 
        shared: activeVideo.shared, 
        description: captionToUse,
        publish_time: activeVideo.publish_time
      }]);
      
      if (setVideos) {
        setVideos(p => p.map(v => v.path === videoPath ? { 
          ...v, 
          description: captionToUse,
          updated_at: Date.now() 
        } : v));
      }
      
      if (showToast) showToast(language === 'tr' ? 'Değişiklikler başarıyla kaydedildi.' : 'Changes successfully saved.', 'success');
      setPublishStatus('idle');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Kaydetme işlemi başarısız.');
      setPublishStatus('error');
      setPublishSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
    }
  };

  const API_URL = 'http://127.0.0.1:' + (import.meta.env.VITE_BACKEND_PORT || '8085');

  const datePart = scheduleTime ? scheduleTime.split('T')[0] : '';
  const timePart = scheduleTime ? scheduleTime.split('T')[1] : '';

  const isScheduleInPast = scheduleTime
    ? new Date(scheduleTime) < new Date()
    : false;

  // Past video in detail (calendar) view – show read-only
  const isPastVideo = isDetailView && activeVideo?.publish_time
    ? new Date(activeVideo.publish_time) < new Date()
    : false;

  const formatFullDateTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) + ' – ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => publishStatus === 'idle' && !isActivelyUploading && onClose()}
      className="bg-modal-surface border border-foreground/5 rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in duration-200 w-full max-w-4xl h-[780px] relative"
    >
      {/* Left Column: Video Preview - Styling matches Settings modal left side layout */}
      <div className="w-80 bg-modal-surface border-r border-foreground/5 flex flex-col items-center p-6 shrink-0 relative">
        {/* Header Title above Video */}
        <div className="w-full flex items-center mb-5 shrink-0">
          <h3 className="text-sm font-semibold text-foreground">
            {isDetailView 
              ? (language === 'tr' ? 'Video Detayları' : 'Video Details') 
              : (language === 'tr' ? 'Videoyu Paylaş' : 'Publish Video')
            }
          </h3>
        </div>

        <div
          className="relative w-full aspect-[9/16] max-h-[480px] rounded-ui-xl overflow-hidden bg-black/40 border border-muted/10 group cursor-pointer shadow-md"
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
      <div className="flex-1 flex flex-col bg-modal-base relative h-full min-h-0">
        {/* Absolute Close Button */}
        <button
          onClick={onClose}
          disabled={publishStatus !== 'idle' || isActivelyUploading}
          className="absolute top-4 right-4 p-1.5 rounded-md text-foreground/60 hover:text-foreground hover:bg-hover transition cursor-pointer disabled:opacity-30 z-10"
          title={t('close_title', language) || "Kapat"}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Form Area */}
        <div className="flex-1 p-8 pt-10 flex flex-col gap-5 min-h-0 overflow-y-auto relative">

          {/* Failed upload warning banner */}
          {isFailedUpload && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-3 text-red-400 select-none animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold">
                  {language === 'tr' ? 'Gönderim Başarısız Oldu' : 'Publishing Failed'}
                </span>
                <span className="text-[11px] font-mono text-red-400/80 break-all leading-relaxed">
                  {failedErrorMessage || (language === 'tr' ? 'Bilinmeyen bir hata oluştu.' : 'An unknown error occurred.')}
                </span>
              </div>
            </div>
          )}

          {/* Description input - Matched style with main page notes editor (no label) */}
          <div className="flex-1 flex flex-col gap-2 min-h-[260px]">
            <textarea
              value={caption}
              onChange={(e) => !isPastVideo && setCaption(e.target.value)}
              readOnly={isPastVideo}
              disabled={publishStatus !== 'idle'}
              className={`flex-1 w-full bg-transparent border-0 focus:ring-0 focus:outline-none resize-none transition-all text-sm pl-0 pr-2 py-1 overflow-y-auto relative z-30
                ${isPastVideo
                  ? 'text-foreground/50 cursor-default select-text placeholder-foreground/15'
                  : 'placeholder-foreground/20 text-foreground'}`}
              placeholder={language === 'tr' ? 'Videonuz için bir açıklama girin...' : 'Enter a description for your video...'}
              style={{
                caretColor: isPastVideo ? 'transparent' : 'var(--theme-foreground)',
              }}
            />
          </div>

          {/* Action Buttons / Progress */}
          <div className="flex flex-col gap-2 pt-5 border-t border-foreground/5 mt-auto shrink-0">

            {/* Active upload progress — replaces buttons while publishing */}
            {isActivelyUploading && activeUpload ? (
              <div className="flex flex-col gap-2.5 select-none animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
                  <span className="text-xs font-bold text-foreground">
                    {language === 'tr' ? 'Paylaşılıyor...' : 'Publishing...'}
                  </span>
                  <span className="ml-auto text-[11px] font-bold text-accent">{activeUpload.progress ?? 0}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${activeUpload.progress ?? 0}%` }}
                  />
                </div>
                {/* Steps */}
                {activeUpload.steps && (
                  <div className="flex flex-col gap-1.5 mt-0.5">
                    {activeUpload.steps.map((step) => {
                      const sRunning = step.status === 'running';
                      const sSuccess = step.status === 'success';
                      const sError = step.status === 'error';
                      return (
                        <div key={step.id} className="flex items-center justify-between text-[11px] gap-2">
                          <span className={`font-medium ${
                            sRunning ? 'text-foreground font-semibold' :
                            sSuccess ? 'text-foreground/50' :
                            sError ? 'text-red-400 font-semibold' :
                            'text-foreground/25'
                          }`}>{step.label}</span>
                          <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                            {sRunning && <Loader2 className="w-3 h-3 text-accent animate-spin" />}
                            {sSuccess && <Check className="w-3.5 h-3.5 text-green-500" />}
                            {sError && <X className="w-3.5 h-3.5 text-red-500" />}
                            {step.status === 'idle' && <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Past schedule time warning (publish flow only) */}
                {!isDetailView && isScheduleInPast && (
                  <div className="flex items-center gap-1.5 select-none justify-end">
                    <AlertTriangle size={10} className="text-amber-400 shrink-0" />
                    <span className="text-[10px] text-amber-400/80 font-medium tracking-wide">
                      {language === 'tr' ? 'Seçilen saat geçmişte kaldı' : 'Selected time is in the past'}
                    </span>
                  </div>
                )}

                {/* CASE 1: Past video in calendar detail view — show date/time only */}
                {isPastVideo && (
                  <div className="flex items-center gap-2 select-none">
                    <Calendar size={13} className="text-foreground/40 shrink-0" />
                    <span className="text-xs text-foreground/55 font-medium">
                      {formatFullDateTime(activeVideo?.publish_time)}
                    </span>
                  </div>
                )}

                {/* CASE 2: Future/upcoming video in detail view — Save / Close */}
                {!isPastVideo && isDetailView && (
                  <div className="flex gap-3 items-center justify-end">
                    <Button
                      variant="secondary"
                      onClick={onClose}
                      disabled={publishStatus !== 'idle'}
                      className="py-1.5 px-5 text-xs font-semibold h-[34px]"
                    >
                      {language === 'tr' ? 'Kapat' : 'Close'}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSaveDetails}
                      disabled={publishStatus !== 'idle'}
                      className="py-1.5 px-5 text-xs font-bold h-[34px] flex items-center gap-1.5"
                    >
                      {language === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes'}
                    </Button>
                  </div>
                )}

                {/* CASE 3: Normal publish flow — Schedule + Publish Now / or Published badge */}
                {!isDetailView && (
                  activeVideo?.shared ? (
                    /* Video already published — show green badge, click opens detail */
                    <button
                      onClick={() => openVideoDetailModal && openVideoDetailModal(activeVideo.path)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                        bg-green-500/10 hover:bg-green-500/18 border border-green-500/25 hover:border-green-500/40
                        text-green-400 transition-all duration-200 cursor-pointer group select-none"
                    >
                      <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0 group-hover:bg-green-500/30 transition-colors">
                        <Check size={15} strokeWidth={3} className="text-green-400" />
                      </div>
                      <div className="flex flex-col items-start gap-0.5 min-w-0">
                        <span className="text-xs font-bold tracking-wide">
                          {language === 'tr' ? 'Paylaşıldı' : 'Published'}
                        </span>
                        {activeVideo.publish_time && (
                          <span className="text-[10px] text-green-400/70 font-medium truncate">
                            {formatFullDateTime(activeVideo.publish_time)}
                          </span>
                        )}
                      </div>
                      <svg className="ml-auto w-4 h-4 text-green-400/50 group-hover:text-green-400/80 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <div className="flex gap-3 items-center justify-end">
                      {/* Date/Time + Schedule capsule */}
                      <div className="flex items-center bg-active rounded-lg overflow-hidden border border-foreground/5 h-[34px] p-0.5 shrink-0 select-none">
                        <input
                          type="date"
                          value={datePart}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            const timeVal = timePart || '12:00';
                            setScheduleTime(`${newDate}T${timeVal}`);
                          }}
                          onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                          disabled={publishStatus !== 'idle'}
                          className="bg-transparent border-0 focus:ring-0 focus:outline-none pl-2.5 pr-1 text-xs text-foreground cursor-pointer h-full w-[88px] outline-none hover:bg-hover hover:rounded-l-md transition-all [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:justify-center [&::-webkit-datetime-edit]:mx-auto"
                          style={{ accentColor: 'var(--theme-accent)', colorScheme: document.documentElement.classList.contains('light') ? 'light' : 'dark' }}
                          title={`${t('suggested_time', language)} ${postInterval} saat sonra`}
                        />
                        <div className="h-3 w-[1px] bg-foreground/10 shrink-0 mx-0.5" />
                        <input
                          type="time"
                          value={timePart}
                          onChange={(e) => {
                            const newTime = e.target.value;
                            const dateVal = datePart || getLocalDateString();
                            setScheduleTime(`${dateVal}T${newTime}`);
                          }}
                          onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                          disabled={publishStatus !== 'idle'}
                          className="bg-transparent border-0 focus:ring-0 focus:outline-none px-1 text-xs text-foreground cursor-pointer h-full w-[50px] outline-none hover:bg-hover hover:rounded-md transition-all [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:justify-center [&::-webkit-datetime-edit]:mx-auto"
                          style={{ accentColor: 'var(--theme-accent)', colorScheme: document.documentElement.classList.contains('light') ? 'light' : 'dark' }}
                          title={`${t('suggested_time', language)} ${postInterval} saat sonra`}
                        />
                        <button
                          onClick={() => handlePublish(true)}
                          disabled={publishStatus !== 'idle' || isScheduleInPast}
                          className={`h-full px-3.5 text-xs font-semibold rounded-r-md transition-all shrink-0 flex items-center justify-center gap-1.5 ml-1.5 border-l border-foreground/5
                            ${publishStatus !== 'idle' || isScheduleInPast ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
                            ${initialScheduleTime ? 'bg-accent text-accent-foreground font-bold hover:opacity-90' : 'text-foreground bg-muted hover:bg-hover'}`}
                        >
                          <Calendar size={13} className={initialScheduleTime ? 'text-accent-foreground' : 'text-foreground/75'} />
                          <span>{t('schedule_btn', language)}</span>
                        </button>
                      </div>

                      {/* Publish Now Button */}
                      {!initialScheduleTime && (
                        <Button
                          variant="primary"
                          onClick={() => handlePublish(false)}
                          disabled={publishStatus !== 'idle'}
                          className="py-1.5 px-5 text-xs font-bold h-[34px] shrink-0 flex items-center gap-1.5"
                        >
                          <Share2 size={13} />
                          <span>{t('upload_now_btn', language)}</span>
                        </Button>
                      )}
                    </div>
                  )
                )}
              </>
            )}

          </div>
        </div>
      </div>

      {/* Loading status overlay - Spans across the entire Modal */}
      {publishStatus !== 'idle' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 z-50 animate-in fade-in duration-200">
          <div className="bg-modal-surface border border-foreground/5 rounded-2xl p-6 shadow-2xl w-full max-w-sm flex flex-col gap-5 select-none">
            <div className="flex items-center gap-3 border-b border-foreground/5 pb-3">
              {publishStatus === 'publishing' && (
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
              )}
              {publishStatus === 'success' && (
                <Check className="w-4 h-4 text-green-500 font-bold" />
              )}
              {publishStatus === 'error' && (
                <X className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-bold text-foreground">
                {publishStatus === 'publishing' && 'Sosyal Medya Gönderimi'}
                {publishStatus === 'success' && 'Gönderim Başarılı'}
                {publishStatus === 'error' && 'Gönderim Başarısız'}
              </span>
            </div>
            
            <div className="flex flex-col gap-3.5">
              {publishSteps.map((step) => {
                const isRunning = step.status === 'running';
                const isSuccess = step.status === 'success';
                const isError = step.status === 'error';
                
                return (
                  <div key={step.id} className="flex items-center justify-between text-xs gap-3">
                    <span className={`font-medium ${isRunning ? 'text-foreground font-semibold' : isSuccess ? 'text-foreground/75' : isError ? 'text-danger font-semibold' : 'text-foreground/35'}`}>
                      {step.label}
                    </span>
                    <div className="shrink-0 flex items-center justify-center w-5 h-5">
                      {isRunning && (
                        <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                      )}
                      {isSuccess && (
                        <Check className="w-4 h-4 text-green-500 font-bold" />
                      )}
                      {isError && (
                        <X className="w-4 h-4 text-red-500 font-bold" />
                      )}
                      {step.status === 'idle' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {publishStatus === 'error' && (
              <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-foreground/5">
                <p className="text-[11px] text-danger/80 break-words font-mono bg-red-500/[0.03] p-2.5 rounded-lg border border-red-500/10 max-h-24 overflow-y-auto">
                  {errorMessage}
                </p>
                {/* Schedule + Publish Now — same as normal publish flow */}
                <div className="flex gap-2 items-center">
                  <div className="flex items-center bg-active rounded-lg overflow-hidden border border-foreground/5 h-[34px] p-0.5 shrink-0 select-none flex-1 min-w-0">
                    <input
                      type="date"
                      value={datePart}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const timeVal = timePart || '12:00';
                        setScheduleTime(`${newDate}T${timeVal}`);
                      }}
                      onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                      className="bg-transparent border-0 focus:ring-0 focus:outline-none pl-2 pr-1 text-xs text-foreground cursor-pointer h-full w-[82px] outline-none hover:bg-hover hover:rounded-l-md transition-all [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                      style={{ accentColor: 'var(--theme-accent)', colorScheme: document.documentElement.classList.contains('light') ? 'light' : 'dark' }}
                    />
                    <div className="h-3 w-[1px] bg-foreground/10 shrink-0 mx-0.5" />
                    <input
                      type="time"
                      value={timePart}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        const dateVal = datePart || getLocalDateString();
                        setScheduleTime(`${dateVal}T${newTime}`);
                      }}
                      onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                      className="bg-transparent border-0 focus:ring-0 focus:outline-none px-1 text-xs text-foreground cursor-pointer h-full w-[48px] outline-none hover:bg-hover hover:rounded-md transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                      style={{ accentColor: 'var(--theme-accent)', colorScheme: document.documentElement.classList.contains('light') ? 'light' : 'dark' }}
                    />
                    <button
                      onClick={() => { setPublishStatus('idle'); handlePublish(true); }}
                      disabled={isScheduleInPast}
                      className={`h-full px-3 text-xs font-semibold rounded-r-md transition-all shrink-0 flex items-center justify-center gap-1.5 ml-1 border-l border-foreground/5
                        ${isScheduleInPast ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}
                        text-foreground bg-muted hover:bg-hover`}
                    >
                      <Calendar size={12} />
                      <span>{t('schedule_btn', language)}</span>
                    </button>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => { setPublishStatus('idle'); handlePublish(false); }}
                    className="py-1.5 px-4 text-xs font-bold h-[34px] shrink-0 flex items-center gap-1.5"
                  >
                    <Share2 size={12} />
                    <span>{t('upload_now_btn', language)}</span>
                  </Button>
                </div>
              </div>
            )}

            {publishStatus === 'success' && (
              <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-foreground/5">
                <Button
                  variant="primary"
                  onClick={() => {
                    setPublishStatus('idle');
                    onClose();
                  }}
                  className="py-2 text-xs font-bold w-full"
                >
                  Tamam
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
