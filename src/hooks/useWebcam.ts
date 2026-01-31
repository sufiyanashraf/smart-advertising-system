import { useState, useRef, useCallback, useEffect } from 'react';

export type InputSourceMode = 'webcam' | 'video' | 'screen';

export const useWebcam = () => {
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputSourceMode>('webcam');
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoFileUrlRef = useRef<string | null>(null);

  const stopCurrentSource = useCallback(() => {
    // Stop any active stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Revoke video file URL
    if (videoFileUrlRef.current) {
      URL.revokeObjectURL(videoFileUrlRef.current);
      videoFileUrlRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
    
    setIsActive(false);
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      stopCurrentSource();
      setError(null);
      setInputMode('webcam');
      setVideoFileName(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.loop = false;
        await videoRef.current.play();
      }
      
      setIsActive(true);
      setHasPermission(true);
      return true;
    } catch (err) {
      console.error('Webcam error:', err);
      setError('Failed to access webcam. Please check permissions.');
      setHasPermission(false);
      return false;
    }
  }, [stopCurrentSource]);

  const startVideoFile = useCallback(async (file: File) => {
    try {
      stopCurrentSource();
      setError(null);
      setInputMode('video');
      setVideoFileName(file.name);
      console.log('[VideoFile] InputMode set to: video');
      
      // Create object URL for the video file
      const url = URL.createObjectURL(file);
      videoFileUrlRef.current = url;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.loop = true; // Loop for continuous detection
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      
      setIsActive(true);
      setHasPermission(true);
      console.log('[VideoFile] Started playing:', file.name);
      return true;
    } catch (err) {
      console.error('Video file error:', err);
      setError('Failed to load video file. Please try a different format.');
      return false;
    }
  }, [stopCurrentSource]);

  const startScreenCapture = useCallback(async () => {
    try {
      stopCurrentSource();
      setError(null);
      setInputMode('screen');
      setVideoFileName(null);
      
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        console.log('[ScreenCapture] User stopped sharing');
        stopCurrentSource();
        setError('Screen sharing stopped');
      };
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.loop = false;
        await videoRef.current.play();
      }
      
      setIsActive(true);
      setHasPermission(true);
      console.log('[ScreenCapture] Started');
      return true;
    } catch (err) {
      console.error('Screen capture error:', err);
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Screen capture permission denied.');
      } else {
        setError('Failed to start screen capture.');
      }
      return false;
    }
  }, [stopCurrentSource]);

  const stopWebcam = useCallback(() => {
    stopCurrentSource();
    setVideoFileName(null);
  }, [stopCurrentSource]);

  const captureFrame = useCallback((): ImageData | null => {
    if (!videoRef.current || !isActive) return null;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [isActive]);

  useEffect(() => {
    return () => {
      stopCurrentSource();
    };
  }, [stopCurrentSource]);

  return {
    videoRef,
    isActive,
    hasPermission,
    error,
    inputMode,
    videoFileName,
    startWebcam,
    startVideoFile,
    startScreenCapture,
    stopWebcam,
    captureFrame,
  };
};
