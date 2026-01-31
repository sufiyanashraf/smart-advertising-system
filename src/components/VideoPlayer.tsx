import { useRef, useEffect, useState, useCallback } from 'react';
import { AdMetadata } from '@/types/ad';
import { Play, Pause, SkipForward, Volume2, VolumeX, Camera, CameraOff, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  ad: AdMetadata | null;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  isCapturing: boolean;
  captureWindow: { start: number; end: number } | null;
  onDurationDetected?: (durationSeconds: number) => void;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

export const VideoPlayer = ({
  ad,
  isPlaying,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
  onSkip,
  isCapturing,
  captureWindow,
  onDurationDetected,
  isFullscreen = false,
  onFullscreenToggle,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (videoRef.current && ad) {
      videoRef.current.load();
      setIsLoaded(false);
      setCurrentTime(0);
    }
  }, [ad?.id]);

  useEffect(() => {
    if (videoRef.current && isLoaded) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isLoaded]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate(time);
    }
  }, [onTimeUpdate]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const detected = Math.round(videoRef.current.duration || 0);
      setDuration(videoRef.current.duration);
      setIsLoaded(true);
      if (detected > 0) onDurationDetected?.(detected);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  const captureProgress = captureWindow ? {
    start: (captureWindow.start / duration) * 100,
    end: (captureWindow.end / duration) * 100,
  } : null;

  if (!ad) {
    return (
      <div className="video-container aspect-video bg-muted flex items-center justify-center">
        <div className="text-muted-foreground font-display text-lg">
          No ad selected
        </div>
      </div>
    );
  }

  return (
    <div className="video-container relative group">
      <video
        ref={videoRef}
        src={ad.videoUrl}
        className="w-full aspect-video object-cover bg-background"
        muted={isMuted}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onEnded}
      />

      {/* Capture indicator overlay */}
      {isCapturing && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-destructive/90 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
            <span className="text-destructive-foreground text-sm font-display font-medium">
              SCANNING
            </span>
          </div>
          <div className="absolute inset-0 border-4 border-primary/50 rounded-xl animate-pulse" />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent scanning-line" />
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {/* Progress bar */}
        <div className="relative h-1.5 bg-muted rounded-full mb-4 overflow-visible">
          {/* Capture window indicator */}
          {captureProgress && (
            <div 
              className="absolute h-full bg-primary/30 rounded-full"
              style={{
                left: `${captureProgress.start}%`,
                width: `${captureProgress.end - captureProgress.start}%`,
              }}
            />
          )}
          {/* Progress fill */}
          <div 
            className="absolute h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          {/* Progress handle */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-foreground rounded-full shadow-lg transition-all duration-100"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-foreground/10"
              onClick={isPlaying ? onPause : onPlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-foreground/10"
              onClick={onSkip}
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-foreground/10"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

            <span className="text-sm font-display text-foreground/80 ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isFullscreen && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                isCapturing 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {isCapturing ? (
                  <Camera className="h-4 w-4" />
                ) : (
                  <CameraOff className="h-4 w-4" />
                )}
                <span className="font-display">
                  {isCapturing ? 'Detecting' : 'Standby'}
                </span>
              </div>
            )}
            
            {onFullscreenToggle && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-foreground/10"
                onClick={onFullscreenToggle}
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Ad info overlay - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <p className="text-sm font-display font-semibold text-foreground">
            {ad.title}
          </p>
          <p className="text-xs text-muted-foreground">
            Target: {ad.gender === 'all' ? 'Everyone' : ad.gender} • {ad.ageGroup === 'all' ? 'All ages' : ad.ageGroup}
          </p>
        </div>
      )}
    </div>
  );
};
