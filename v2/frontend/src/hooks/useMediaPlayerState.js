import { useState, useEffect, useRef, useCallback } from 'react';

export function useMediaPlayerState({ activePath, videoRef }) {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('volume');
    return saved !== null ? parseFloat(saved) : 1.0;
  });
  const [muted, setMuted] = useState(() => {
    const saved = localStorage.getItem('muted');
    return saved !== null ? saved === 'true' : false;
  });
  const [muteFeedback, setMuteFeedback] = useState(null);
  const isFirstMuteRender = useRef(true);

  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  useEffect(() => {
    localStorage.setItem('volume', volume.toString());
    localStorage.setItem('muted', muted.toString());
  }, [volume, muted]);

  useEffect(() => {
    if (isFirstMuteRender.current) {
      isFirstMuteRender.current = false;
      return;
    }
    setMuteFeedback(muted ? 'muted' : 'unmuted');
    const timer = setTimeout(() => setMuteFeedback(null), 800);
    return () => clearTimeout(timer);
  }, [muted]);

  useEffect(() => {
    if (videoRef?.current) {
      videoRef.current.volume = muted ? 0 : volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted, activePath, videoRef]);

  useEffect(() => {
    setVideoTime(0);
    setVideoDuration(0);
  }, [activePath]);

  const toggleMute = useCallback(() => setMuted(prev => !prev), []);

  const handleSeek = useCallback((time) => {
    if (videoRef?.current) {
      videoRef.current.currentTime = time;
      setVideoTime(time);
    }
  }, [videoRef]);

  const handleVolumeChange = useCallback((e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMuted(val === 0);
  }, []);

  return {
    volume,
    setVolume,
    muted,
    setMuted,
    muteFeedback,
    videoTime,
    setVideoTime,
    videoDuration,
    setVideoDuration,
    toggleMute,
    handleSeek,
    handleVolumeChange
  };
}
