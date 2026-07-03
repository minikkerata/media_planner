import { useState, useRef } from 'react';
import { api } from '../services/api';

export function useUploadQueue(videos, setVideos, showToast, triggerCompletedFeedback, setProcessToast) {
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadCurrentIndex, setUploadCurrentIndex] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');
  const [uploadCompletedPaths, setUploadCompletedPaths] = useState(new Set());
  const [uploadFailedPaths, setUploadFailedPaths] = useState(new Map());
  const [uploadCurrentStep, setUploadCurrentStep] = useState('');
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [uploadingPath, setUploadingPath] = useState(null);
  const isPublishCancelledRef = useRef(false);

  const startPublishQueue = async (selectedVideos, intervalHours = 1) => {
    if (!selectedVideos || selectedVideos.length === 0) return;

    if (setProcessToast) {
      setProcessToast({
        type: 'bulk_publish',
        name: `Toplu paylaşım başlatılıyor...`,
        image: null,
        status: 'running',
        progress: 0,
        error: null
      });
    }

    let sharedToday = false;
    try {
      const checkRes = await api.checkSharedToday();
      if (checkRes && checkRes.success) {
        sharedToday = checkRes.shared_today;
      }
    } catch (err) {
      console.error("Failed to check if shared today:", err);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      sharedToday = videos.some(v => v.shared && v.updated_at >= startOfToday);
    }

    const queueWithSchedules = selectedVideos.map((video, idx) => {
      let scheduleTimeStr = null;
      if (sharedToday) {
        const dt = new Date();
        dt.setHours(dt.getHours() + (idx + 1) * intervalHours);
        scheduleTimeStr = dt.toISOString();
      } else {
        if (idx === 0) {
          scheduleTimeStr = null;
        } else {
          const dt = new Date();
          dt.setHours(dt.getHours() + idx * intervalHours);
          scheduleTimeStr = dt.toISOString();
        }
      }
      return { ...video, scheduleTime: scheduleTimeStr };
    });

    setUploadQueue(queueWithSchedules);
    setUploadCurrentIndex(0);
    setUploadStatus('publishing');
    setUploadErrorMsg('');
    setUploadCompletedPaths(new Set());
    setUploadFailedPaths(new Map());
    isPublishCancelledRef.current = false;
    publishQueueWorker(queueWithSchedules, 0);
  };

  const cancelPublishQueue = () => {
    isPublishCancelledRef.current = true;
    setUploadStatus('idle');
    setUploadQueue([]);
    setUploadingPath(null);
    setUploadCurrentStep('');
    if (setProcessToast) {
      setProcessToast(null);
    }
  };

  const resumePublishQueue = async () => {
    if (uploadStatus !== 'error') return;
    setUploadStatus('publishing');
    setUploadErrorMsg('');
    isPublishCancelledRef.current = false;
    publishQueueWorker(uploadQueue, uploadCurrentIndex);
  };

  const skipAndResumePublishQueue = async () => {
    if (uploadStatus !== 'error') return;
    const nextIndex = uploadCurrentIndex + 1;
    if (nextIndex >= uploadQueue.length) {
      setUploadStatus('success');
      showToast('Toplu paylaşım tamamlandı! ✓', 'success');
      setUploadingPath(null);
      if (setProcessToast) {
        setProcessToast({
          type: 'bulk_publish',
          name: 'Toplu paylaşım tamamlandı! ✓',
          image: null,
          status: 'completed',
          progress: 100,
          error: null
        });
      }
      return;
    }
    setUploadStatus('publishing');
    setUploadErrorMsg('');
    setUploadCurrentIndex(nextIndex);
    isPublishCancelledRef.current = false;
    publishQueueWorker(uploadQueue, nextIndex);
  };

  const publishQueueWorker = async (queue, startIndex) => {
    for (let i = startIndex; i < queue.length; i++) {
      if (isPublishCancelledRef.current) break;
      setUploadCurrentIndex(i);
      const video = queue[i];
      const videoPath = video.path;
      const captionToUse = video.description || '';
      setUploadingPath(videoPath);

      const overallProgress = Math.round((i / queue.length) * 100);
      if (setProcessToast) {
        setProcessToast({
          type: 'bulk_publish',
          name: `[${i + 1}/${queue.length}] ${video.name}`,
          image: video.path,
          status: 'running',
          progress: overallProgress || 5,
          error: null
        });
      }

      try {
        if (!videoPath) throw new Error('Dosya yolu bulunamadı.');

        setUploadCurrentStep('cloudinary');
        if (setProcessToast) {
          const stepProgress = Math.round(((i + 0.15) / queue.length) * 100);
          setProcessToast(prev => prev ? { ...prev, progress: stepProgress } : null);
        }
        const uploadRes = await api.uploadCloudinary(videoPath);
        if (!uploadRes.success || !uploadRes.video_url) {
          throw new Error('Cloudinary yüklemesi başarısız oldu.');
        }
        const videoUrl = uploadRes.video_url;

        setUploadCurrentStep('buffer');
        if (setProcessToast) {
          const stepProgress = Math.round(((i + 0.6) / queue.length) * 100);
          setProcessToast(prev => prev ? { ...prev, progress: stepProgress } : null);
        }
        const bufferRes = await api.publishBuffer(captionToUse, videoUrl, video.scheduleTime || null);
        if (!bufferRes.success) {
          throw new Error(bufferRes.message || 'Buffer paylaşımı başarısız oldu.');
        }

        setUploadCurrentStep('db');
        if (setProcessToast) {
          const stepProgress = Math.round(((i + 0.85) / queue.length) * 100);
          setProcessToast(prev => prev ? { ...prev, progress: stepProgress } : null);
        }
        let videoFolder = '';
        const lastSlash = Math.max(videoPath.lastIndexOf('\\'), videoPath.lastIndexOf('/'));
        if (lastSlash !== -1) {
          videoFolder = videoPath.substring(0, lastSlash);
        }
        const finalPublishTime = video.scheduleTime || new Date().toISOString();
        await api.updateMetadata(videoFolder, [{ 
          name: video.name, 
          shared: true, 
          description: captionToUse,
          publish_time: finalPublishTime
        }]);
        setVideos(p => p.map(v => v.path === videoPath ? { 
          ...v, 
          shared: true, 
          description: captionToUse, 
          publish_time: finalPublishTime,
          updated_at: Date.now() 
        } : v));

        if (triggerCompletedFeedback) {
          triggerCompletedFeedback();
        }

        setUploadCompletedPaths(prev => {
          const next = new Set(prev);
          next.add(videoPath);
          return next;
        });
        setUploadCurrentStep('');
      } catch (err) {
        console.error(`Bulk upload failed for ${video.name}:`, err);
        setUploadFailedPaths(prev => {
          const next = new Map(prev);
          next.set(videoPath, err.message || 'Paylaşım işlemi başarısız.');
          return next;
        });
        setUploadErrorMsg(err.message || `Paylaşım hatası: ${video.name}`);
        setUploadStatus('error');
        setUploadingPath(null);
        setUploadCurrentStep('');
        if (setProcessToast) {
          setProcessToast({
            type: 'bulk_publish',
            name: `Hata: ${video.name}`,
            image: video.path,
            status: 'failed',
            progress: Math.round((i / queue.length) * 100),
            error: err.message || 'Paylaşım başarısız.'
          });
        }
        return;
      }
    }

    if (!isPublishCancelledRef.current) {
      setUploadStatus('success');
      showToast('Toplu paylaşım başarıyla tamamlandı! ✓', 'success');
      setUploadingPath(null);
      if (setProcessToast) {
        setProcessToast({
          type: 'bulk_publish',
          name: 'Toplu paylaşım tamamlandı! ✓',
          image: null,
          status: 'completed',
          progress: 100,
          error: null
        });
      }
    }
  };

  return {
    uploadQueue,
    setUploadQueue,
    uploadCurrentIndex,
    setUploadCurrentIndex,
    uploadStatus,
    setUploadStatus,
    uploadErrorMsg,
    uploadCompletedPaths,
    uploadFailedPaths,
    uploadCurrentStep,
    showBulkUploadModal,
    setShowBulkUploadModal,
    uploadingPath,
    setUploadingPath,
    startPublishQueue,
    cancelPublishQueue,
    resumePublishQueue,
    skipAndResumePublishQueue,
  };
}
