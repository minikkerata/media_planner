import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { t } from '../utils/translations';

export function usePublishTask({ videos, setVideos, language, showToast, triggerCompletedFeedback, setProcessToast, setShowUploadModal, setActivePath, setFixedText }) {
  const [activeUploads, setActiveUploads] = useState({});
  const [customScheduleTime, setCustomScheduleTime] = useState(null);
  const [uploadingPath, setUploadingPath] = useState(null);
  const [isDetailView, setIsDetailView] = useState(false);

  const openPublishModalWithTime = useCallback((path, timeStr) => {
    setIsDetailView(false);
    setCustomScheduleTime(timeStr);
    setActivePath(path);
    const targetVideo = (videos || []).find(v => v.path === path);
    const globalDefault = localStorage.getItem('fixed_text') || '';
    if (setFixedText) {
      setFixedText(targetVideo?.fixed_text || globalDefault);
    }
    setShowUploadModal(true);
  }, [videos, setActivePath, setFixedText, setShowUploadModal]);

  const openVideoDetailModal = useCallback((videoPath) => {
    setIsDetailView(true);
    setActivePath(videoPath);
    setShowUploadModal(true);
  }, [setActivePath, setShowUploadModal]);

  const openPublishModal = useCallback(() => {
    setIsDetailView(false);
    setShowUploadModal(true);
  }, [setShowUploadModal]);

  const startPublishTask = useCallback((video, caption, formattedScheduleTime, isScheduled) => {
    const videoPath = video.path;
    setShowUploadModal(false);

    setActiveUploads(prev => ({
      ...prev,
      [videoPath]: {
        video,
        caption,
        publish_time: formattedScheduleTime || new Date().toISOString(),
        isScheduled,
        status: 'running',
        progress: 5,
        steps: [
          { id: 'file', label: language === 'tr' ? 'Dosya doğrulama' : 'File verification', status: 'running' },
          { id: 'cloudinary', label: language === 'tr' ? 'Cloudinary bulut sunucusuna yükleme' : 'Uploading to Cloudinary', status: 'idle' },
          { id: 'buffer', label: language === 'tr' ? 'Buffer sosyal medya entegrasyonu' : 'Buffer publishing', status: 'idle' },
          { id: 'db', label: language === 'tr' ? 'Yerel veritabanı (SQLite) güncellemesi' : 'Local database (SQLite) update', status: 'idle' }
        ],
        error: null
      }
    }));

    if (setProcessToast) {
      setProcessToast({
        type: 'publish',
        name: video.name,
        image: video.path,
        status: 'running',
        progress: 5,
        error: null
      });
    }

    const runTask = async () => {
      const updateTaskStep = (stepId, stepStatus) => {
        setActiveUploads(prev => {
          const task = prev[videoPath];
          if (!task) return prev;
          return {
            ...prev,
            [videoPath]: {
              ...task,
              steps: task.steps.map(s => s.id === stepId ? { ...s, status: stepStatus } : s)
            }
          };
        });
      };

      const updateTaskProgress = (progress) => {
        setActiveUploads(prev => {
          const task = prev[videoPath];
          if (!task) return prev;
          return {
            ...prev,
            [videoPath]: { ...task, progress }
          };
        });
      };

      try {
        await new Promise(resolve => setTimeout(resolve, 600));
        updateTaskStep('file', 'success');
        updateTaskStep('cloudinary', 'running');
        updateTaskProgress(25);
        if (setProcessToast) setProcessToast(prev => prev ? { ...prev, progress: 25 } : null);

        const uploadRes = await api.uploadCloudinary(videoPath);
        if (!uploadRes.success || !uploadRes.video_url) {
          updateTaskStep('cloudinary', 'error');
          throw new Error(language === 'tr' ? 'Cloudinary yüklemesi başarısız oldu.' : 'Cloudinary upload failed.');
        }
        const videoUrl = uploadRes.video_url;
        updateTaskStep('cloudinary', 'success');
        updateTaskStep('buffer', 'running');
        updateTaskProgress(60);
        if (setProcessToast) setProcessToast(prev => prev ? { ...prev, progress: 60 } : null);

        const bufferRes = await api.publishBuffer(caption, videoUrl, formattedScheduleTime);
        if (!bufferRes.success) {
          updateTaskStep('buffer', 'error');
          throw new Error(bufferRes.message || (language === 'tr' ? 'Buffer paylaşımı başarısız oldu.' : 'Buffer publishing failed.'));
        }
        updateTaskStep('buffer', 'success');
        updateTaskStep('db', 'running');
        updateTaskProgress(85);
        if (setProcessToast) setProcessToast(prev => prev ? { ...prev, progress: 85 } : null);

        let videoFolder = '';
        const lastSlash = Math.max(videoPath.lastIndexOf('\\'), videoPath.lastIndexOf('/'));
        if (lastSlash !== -1) videoFolder = videoPath.substring(0, lastSlash);

        const finalPublishTime = formattedScheduleTime || new Date().toISOString();
        await api.updateMetadata(videoFolder, [{
          name: video.name,
          shared: true,
          description: caption,
          publish_time: finalPublishTime
        }]);

        setVideos(p => p.map(v => v.path === videoPath ? {
          ...v,
          shared: true,
          description: caption,
          publish_time: finalPublishTime,
          updated_at: Date.now()
        } : v));

        updateTaskStep('db', 'success');
        updateTaskProgress(100);

        setActiveUploads(prev => {
          const task = prev[videoPath];
          if (!task) return prev;
          return {
            ...prev,
            [videoPath]: { ...task, status: 'success' }
          };
        });

        if (showToast) showToast(t('publish_success_msg', language), 'success');
        if (setProcessToast) {
          setProcessToast({
            type: 'publish',
            name: video.name,
            image: video.path,
            status: 'completed',
            progress: 100,
            error: null
          });
        }

        if (triggerCompletedFeedback) triggerCompletedFeedback();
        setCustomScheduleTime(null);

        setTimeout(() => {
          setActiveUploads(prev => {
            const copy = { ...prev };
            delete copy[videoPath];
            return copy;
          });
        }, 5000);

      } catch (err) {
        console.error(err);
        setActiveUploads(prev => {
          const task = prev[videoPath];
          if (!task) return prev;
          return {
            ...prev,
            [videoPath]: {
              ...task,
              status: 'error',
              error: err.message || 'Paylaşım başarısız.',
              steps: task.steps.map(s => s.status === 'running' ? { ...s, status: 'error' } : s)
            }
          };
        });
        if (showToast) showToast(err.message || 'Paylaşım başarısız.', 'error');
        if (setProcessToast) {
          setProcessToast({
            type: 'publish',
            name: video.name,
            image: video.path,
            status: 'failed',
            progress: 100,
            error: err.message || 'Paylaşım başarısız.',
            retryPayload: { video, caption, formattedScheduleTime, isScheduled }
          });
        }
      }
    };

    runTask();
  }, [language, setShowUploadModal, setProcessToast, setVideos, showToast, triggerCompletedFeedback]);

  return {
    activeUploads,
    setActiveUploads,
    customScheduleTime,
    setCustomScheduleTime,
    uploadingPath,
    setUploadingPath,
    isDetailView,
    setIsDetailView,
    openPublishModalWithTime,
    openVideoDetailModal,
    openPublishModal,
    startPublishTask
  };
}
