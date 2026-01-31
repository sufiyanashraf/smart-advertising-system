import { DetectionDebugInfo, TrackedFace } from '@/types/detection';
import { cn } from '@/lib/utils';

interface DebugOverlayProps {
  debug: DetectionDebugInfo | null;
  trackedFaces: TrackedFace[];
  show: boolean;
}

export const DebugOverlay = ({ debug, trackedFaces, show }: DebugOverlayProps) => {
  if (!show || !debug) return null;

  const getFpsColor = (fps: number) => {
    if (fps >= 10) return 'text-green-500';
    if (fps >= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 100) return 'text-green-500';
    if (ms < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getFilterStatus = () => {
    if (debug.rawDetections === 0) return { text: 'No faces detected', color: 'text-muted-foreground' };
    if (debug.filteredDetections === 0) return { text: '⚠️ All filtered out!', color: 'text-red-500' };
    if (debug.filteredDetections < debug.rawDetections) return { text: 'Some filtered', color: 'text-yellow-500' };
    return { text: 'All passed', color: 'text-green-500' };
  };

  const filterStatus = getFilterStatus();

  return (
    <div className="absolute top-0 left-0 right-0 p-2 pointer-events-none z-20">
      {/* Main debug panel */}
      <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border p-3 text-xs font-mono space-y-2 max-w-sm shadow-lg">
        {/* Performance row */}
        <div className="flex items-center justify-between gap-4">
          <span className={cn('font-bold text-base', getFpsColor(debug.fps))}>
            {debug.fps.toFixed(1)} FPS
          </span>
          <span className={cn('font-medium', getLatencyColor(debug.latencyMs))}>
            {debug.latencyMs.toFixed(0)}ms
          </span>
          <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
            {debug.backend.toUpperCase()}
          </span>
        </div>

        {/* Detection counts - PROMINENT */}
        <div className="bg-muted/50 rounded-md p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Raw detections:</span>
            <span className={cn('font-bold text-sm', debug.rawDetections > 0 ? 'text-green-500' : 'text-muted-foreground')}>
              {debug.rawDetections}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">After filtering:</span>
            <span className={cn('font-bold text-sm', debug.filteredDetections > 0 ? 'text-green-500' : 'text-red-500')}>
              {debug.filteredDetections}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tracked:</span>
            <span className="font-bold text-sm text-primary">
              {debug.trackedFaces}
            </span>
          </div>
          <div className={cn('text-center pt-1 border-t border-border mt-1', filterStatus.color)}>
            {filterStatus.text}
          </div>
        </div>

        {/* Detection info badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-1 bg-primary/20 rounded text-primary font-medium">
            {debug.detectorUsed.toUpperCase()}
          </span>
          <span className="px-2 py-1 bg-muted rounded">
            Pass {debug.passUsed}
          </span>
          {debug.yoloActive && (
            <span className="px-2 py-1 bg-green-500/20 rounded text-green-400 font-medium">
              YOLO ✓
            </span>
          )}
          {debug.yoloDetections !== undefined && debug.yoloDetections > 0 && (
            <span className="px-2 py-1 bg-green-500/20 rounded text-green-400">
              YOLO: {debug.yoloDetections}
            </span>
          )}
          {debug.hybridMode && (
            <span className="px-2 py-1 bg-accent/20 rounded text-accent font-medium">
              {debug.hybridMode.toUpperCase()}
            </span>
          )}
          {debug.preprocessing && (
            <span className="px-2 py-1 bg-blue-500/20 rounded text-blue-400">
              PREPROC
            </span>
          )}
          {debug.upscaled && (
            <span className="px-2 py-1 bg-yellow-500/20 rounded text-yellow-400">
              UPSCALE
            </span>
          )}
          {debug.roiActive && (
            <span className="px-2 py-1 bg-purple-500/20 rounded text-purple-400">
              ROI
            </span>
          )}
        </div>

        {/* Frame size */}
        <div className="text-muted-foreground text-[11px]">
          Frame: {debug.frameSize.width}×{debug.frameSize.height}px
        </div>

        {/* Per-face details */}
        {trackedFaces.length > 0 && (
          <div className="pt-2 border-t border-border space-y-1">
            <span className="text-muted-foreground font-medium">Tracked Faces:</span>
            {trackedFaces.slice(0, 5).map((face, i) => (
              <div 
                key={face.id} 
                className="flex items-center gap-2 text-[11px] bg-muted/50 rounded px-2 py-1"
              >
                <span className="text-primary font-bold">#{i + 1}</span>
                <span>{face.gender === 'male' ? '♂' : '♀'}</span>
                <span className="capitalize">{face.ageGroup}</span>
                <span className={cn(
                  'font-medium',
                  face.faceScore >= 0.4 ? 'text-green-500' : 
                  face.faceScore >= 0.25 ? 'text-yellow-500' : 'text-red-500'
                )}>
                  {(face.faceScore * 100).toFixed(0)}%
                </span>
                <span className="text-muted-foreground">
                  {face.boundingBox.width.toFixed(0)}×{face.boundingBox.height.toFixed(0)}
                </span>
                <span className={cn(
                  'ml-auto text-[10px] px-1 rounded',
                  face.detectorUsed === 'ssd' ? 'bg-blue-500/20 text-blue-400' : 'bg-primary/20 text-primary'
                )}>
                  {face.detectorUsed}
                </span>
              </div>
            ))}
            {trackedFaces.length > 5 && (
              <div className="text-muted-foreground text-[10px] text-center">
                +{trackedFaces.length - 5} more...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
