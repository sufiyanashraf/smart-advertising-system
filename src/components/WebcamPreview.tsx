import { RefObject, useRef, useEffect, useState, useMemo } from 'react';
import { Camera, CameraOff, AlertCircle, Monitor, FileVideo, ZoomIn, ZoomOut, Maximize2, Check, X, Tag, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DetectionResult } from '@/types/ad';
import { DetectionDebugInfo, TrackedFace } from '@/types/detection';
import { GroundTruthEntry } from '@/types/evaluation';
import { InputSourceMode } from '@/hooks/useWebcam';
import { Button } from '@/components/ui/button';
import { DebugOverlay } from '@/components/DebugOverlay';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface WebcamPreviewProps {
  videoRef: RefObject<HTMLVideoElement>;
  isActive: boolean;
  hasPermission: boolean | null;
  error: string | null;
  isCapturing: boolean;
  detections?: DetectionResult[];
  inputMode?: InputSourceMode;
  videoFileName?: string | null;
  debugMode?: boolean;
  debugInfo?: DetectionDebugInfo | null;
  trackedFaces?: TrackedFace[];
  /** Enable labeling mode for evaluation */
  labelingMode?: boolean;
  /** Callback when user labels a detection */
  onLabelDetection?: (entry: GroundTruthEntry) => void;
}

// Track which faces have been labeled in this session
const labeledFacesInSession = new Set<string>();

export const WebcamPreview = ({
  videoRef,
  isActive,
  hasPermission,
  error,
  isCapturing,
  detections = [],
  inputMode = 'webcam',
  videoFileName,
  debugMode = false,
  debugInfo = null,
  trackedFaces = [],
  labelingMode = false,
  onLabelDetection,
}: WebcamPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomMode, setZoomMode] = useState<'none' | 'auto' | 'manual'>('none');
  const [manualZoom, setManualZoom] = useState(1);
  const [labelingFace, setLabelingFace] = useState<string | null>(null);
  
  // Single-save labeling form state
  const [formGender, setFormGender] = useState<'male' | 'female'>('male');
  const [formAge, setFormAge] = useState<'kid' | 'young' | 'adult'>('adult');
  const [formFalsePositive, setFormFalsePositive] = useState(false);
  
  // Track saved faces for visual feedback
  const [recentlySaved, setRecentlySaved] = useState<Set<string>>(new Set());

  // Calculate zoom transform to focus on detected faces
  const zoomTransform = useMemo(() => {
    if (zoomMode === 'none' || detections.length === 0) {
      return { transform: 'none', origin: 'center center' };
    }

    const video = videoRef.current;
    if (!video) return { transform: 'none', origin: 'center center' };

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // Find bounding box that encompasses all faces
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    detections.forEach(d => {
      if (d.boundingBox) {
        minX = Math.min(minX, d.boundingBox.x);
        minY = Math.min(minY, d.boundingBox.y);
        maxX = Math.max(maxX, d.boundingBox.x + d.boundingBox.width);
        maxY = Math.max(maxY, d.boundingBox.y + d.boundingBox.height);
      }
    });

    if (minX === Infinity) return { transform: 'none', origin: 'center center' };

    // Add padding around faces (20%)
    const padding = 0.2;
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    minX = Math.max(0, minX - faceWidth * padding);
    minY = Math.max(0, minY - faceHeight * padding);
    maxX = Math.min(videoWidth, maxX + faceWidth * padding);
    maxY = Math.min(videoHeight, maxY + faceHeight * padding);

    // Calculate center and zoom level
    const centerX = ((minX + maxX) / 2) / videoWidth * 100;
    const centerY = ((minY + maxY) / 2) / videoHeight * 100;

    let zoom = zoomMode === 'auto' 
      ? Math.min(3, Math.max(1.5, videoWidth / (maxX - minX)))
      : manualZoom;

    return {
      transform: `scale(${zoom})`,
      origin: `${centerX}% ${centerY}%`
    };
  }, [detections, zoomMode, manualZoom, videoRef]);

  const getSourceIcon = () => {
    if (!isActive) return <CameraOff className="h-4 w-4 text-muted-foreground" />;
    switch (inputMode) {
      case 'webcam':
        return <Camera className="h-4 w-4 text-primary" />;
      case 'video':
        return <FileVideo className="h-4 w-4 text-primary" />;
      case 'screen':
        return <Monitor className="h-4 w-4 text-primary" />;
    }
  };

  const getSourceLabel = () => {
    switch (inputMode) {
      case 'webcam':
        return 'Webcam Feed';
      case 'video':
        return videoFileName ? `Video: ${videoFileName.slice(0, 20)}${videoFileName.length > 20 ? '...' : ''}` : 'Video File';
      case 'screen':
        return 'Screen Capture';
    }
  };

  // Initialize form with detection values when opening labeling popup
  const openLabelingForm = (faceId: string, detection: DetectionResult) => {
    setLabelingFace(faceId);
    setFormGender(detection.gender);
    setFormAge(detection.ageGroup);
    setFormFalsePositive(false);
  };

  // Handle save label - includes trackingId for live correction
  const handleSaveLabel = (detection: DetectionResult, idx: number) => {
    if (!onLabelDetection || !detection.boundingBox) return;
    
    const faceId = detection.trackingId || `face_${idx}`;
    
    // Pass trackingId so SmartAdsSystem can correct the live detection
    onLabelDetection({
      id: `${Date.now()}_${idx}`,
      timestamp: Date.now(),
      boundingBox: detection.boundingBox,
      detectedGender: detection.gender,
      detectedAgeGroup: detection.ageGroup,
      detectedConfidence: detection.confidence,
      detectedFaceScore: detection.faceScore,
      actualGender: formFalsePositive ? detection.gender : formGender,
      actualAgeGroup: formFalsePositive ? detection.ageGroup : formAge,
      isFalsePositive: formFalsePositive,
      trackingId: faceId, // Include tracking ID for live correction
    } as GroundTruthEntry & { trackingId: string });
    
    // Track as labeled in session
    labeledFacesInSession.add(faceId);
    
    // Show saved feedback
    setRecentlySaved(prev => new Set([...prev, faceId]));
    setTimeout(() => {
      setRecentlySaved(prev => {
        const next = new Set(prev);
        next.delete(faceId);
        return next;
      });
    }, 2000);
    
    setLabelingFace(null);
  };

  // Draw bounding boxes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas to video dimensions
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isActive || detections.length === 0) return;

    // Get scale factors
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    const scaleX = rect.width / videoWidth;
    const scaleY = rect.height / videoHeight;

    // Draw bounding boxes for each detection
    detections.forEach((detection, idx) => {
      if (!detection.boundingBox) return;

      const faceId = detection.trackingId || `face_${idx}`;
      const isLabeledInSession = labeledFacesInSession.has(faceId);
      const justSaved = recentlySaved.has(faceId);

      const { x, y, width, height } = detection.boundingBox;
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;

      const css = getComputedStyle(document.documentElement);
      const getHsl = (varName: string, fallback: string) => {
        const v = css.getPropertyValue(varName).trim();
        return v ? `hsl(${v})` : fallback;
      };
      const getHslA = (varName: string, alpha: number, fallback: string) => {
        const v = css.getPropertyValue(varName).trim();
        return v ? `hsl(${v} / ${alpha})` : fallback;
      };

      // Determine color based on confidence or labeled status
      let boxColor: string;
      let bgColor: string;
      
      // Use isUserCorrected to show 100% confidence
      const displayConfidence = (detection as any).isUserCorrected ? 1.0 : detection.confidence;
      
      if (justSaved) {
        boxColor = 'hsl(142 71% 45%)'; // green for just saved
        bgColor = 'hsl(142 71% 45% / 0.3)';
      } else if ((detection as any).isUserCorrected) {
        // Labeled faces always show green with 100%
        boxColor = 'hsl(142 71% 45%)'; // green for labeled
        bgColor = 'hsl(142 71% 45% / 0.2)';
      } else if (isLabeledInSession && labelingMode) {
        boxColor = 'hsl(220 90% 60%)'; // blue for already labeled
        bgColor = 'hsl(220 90% 60% / 0.2)';
      } else {
        const isLowConfidence = displayConfidence < 0.75;
        const isMedConfidence = displayConfidence >= 0.75 && displayConfidence < 0.85;

        const highColor = getHsl('--success', 'hsl(142 71% 45%)');
        const midColor = getHsl('--primary', 'hsl(220 90% 60%)');
        const lowColor = getHsl('--destructive', 'hsl(0 84% 60%)');

        boxColor = isLowConfidence ? lowColor : isMedConfidence ? midColor : highColor;
        bgColor = isLowConfidence
          ? getHslA('--destructive', 0.2, 'hsl(0 84% 60% / 0.2)')
          : isMedConfidence
            ? getHslA('--primary', 0.2, 'hsl(220 90% 60% / 0.2)')
            : getHslA('--success', 0.2, 'hsl(142 71% 45% / 0.2)');
      }

      // Draw bounding box
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = justSaved ? 3 : 2;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw semi-transparent fill
      ctx.fillStyle = bgColor;
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Draw label background - show gender text explicitly, use displayConfidence for labeled faces
      const genderText = detection.gender === 'male' ? '♂ Male' : '♀ Female';
      const label = `${genderText} | ${detection.ageGroup} ${(displayConfidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 12px sans-serif';
      const labelWidth = ctx.measureText(label).width + 10;
      const labelHeight = 20;

      ctx.fillStyle = boxColor;
      ctx.fillRect(scaledX, scaledY - labelHeight, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = getHsl('--primary-foreground', 'hsl(0 0% 100%)');
      ctx.textBaseline = 'middle';
      ctx.fillText(label, scaledX + 5, scaledY - labelHeight / 2);

      // Draw status indicator for labeled faces
      if (justSaved) {
        ctx.fillStyle = 'hsl(142 71% 45%)';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('✓ SAVED', scaledX + 5, scaledY + scaledHeight + 15);
      } else if (isLabeledInSession && labelingMode) {
        ctx.fillStyle = 'hsl(220 90% 60%)';
        ctx.font = '10px sans-serif';
        ctx.fillText('labeled', scaledX + 5, scaledY + scaledHeight + 12);
      }
    });
  }, [detections, isActive, videoRef, labelingMode, recentlySaved]);

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          {getSourceIcon()}
          {getSourceLabel()}
          {detections.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
              {detections.length} face{detections.length !== 1 ? 's' : ''}
            </span>
          )}
          {labelingMode && (
            <span className="ml-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-600 text-xs rounded-full">
              Labeling
            </span>
          )}
        </h3>
        
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          {isActive && (
            <div className="flex items-center gap-1">
              <Button
                variant={zoomMode === 'none' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setZoomMode('none')}
                title="No zoom"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant={zoomMode === 'auto' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setZoomMode('auto')}
                title="Auto-zoom to faces"
              >
                <ZoomIn className="h-3 w-3" />
                <span className="ml-1">Auto</span>
              </Button>
              {zoomMode === 'none' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setZoomMode('manual');
                    setManualZoom(2);
                  }}
                  title="Manual zoom"
                >
                  2x
                </Button>
              )}
              {zoomMode === 'manual' && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setManualZoom(m => Math.max(1, m - 0.5))}
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <span className="text-xs w-8 text-center">{manualZoom.toFixed(1)}x</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setManualZoom(m => Math.min(4, m + 0.5))}
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
            isCapturing 
              ? "bg-destructive/20 text-destructive"
              : isActive 
                ? "bg-success/20 text-success"
                : "bg-muted text-muted-foreground"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isCapturing 
                ? "bg-destructive animate-pulse"
                : isActive 
                  ? "bg-success"
                  : "bg-muted-foreground"
            )} />
            {isCapturing ? 'Scanning' : isActive ? 'Ready' : 'Off'}
          </div>
        </div>
      </div>

      {/* Labeling Forms - positioned OUTSIDE the camera container to avoid clipping */}
      {labelingMode && isActive && videoRef.current && detections.map((detection, idx) => {
        if (!detection.boundingBox) return null;
        
        const video = videoRef.current!;
        const rect = video.getBoundingClientRect();
        const videoWidth = video.videoWidth || 640;
        const videoHeight = video.videoHeight || 480;
        const scaleX = rect.width / videoWidth;
        const scaleY = rect.height / videoHeight;
        
        const scaledY = detection.boundingBox.y * scaleY;
        const scaledHeight = detection.boundingBox.height * scaleY;
        const faceId = detection.trackingId || `face_${idx}`;
        
        const isLabeling = labelingFace === faceId;
        
        // Only render expanded form outside container
        if (!isLabeling) return null;
        
        return (
          <div
            key={`form-${faceId}`}
            className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
            style={{
              // Position above the camera container
              top: '-10px',
              transform: 'translateX(-50%) translateY(-100%)',
              width: '280px',
            }}
          >
            <div className="bg-background border-2 border-primary rounded-lg p-4 space-y-3 shadow-2xl">
              <div className="text-sm font-semibold text-center border-b pb-2 flex items-center justify-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Label Ground Truth
              </div>
              
              {/* Gender Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Gender</Label>
                <RadioGroup 
                  value={formGender} 
                  onValueChange={(v) => setFormGender(v as 'male' | 'female')}
                  className="flex gap-3"
                  disabled={formFalsePositive}
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <RadioGroupItem value="male" id={`gender-male-${faceId}`} />
                    <Label htmlFor={`gender-male-${faceId}`} className="text-sm cursor-pointer">
                      ♂ Male
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 flex-1">
                    <RadioGroupItem value="female" id={`gender-female-${faceId}`} />
                    <Label htmlFor={`gender-female-${faceId}`} className="text-sm cursor-pointer">
                      ♀ Female
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Age Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Age Group</Label>
                <RadioGroup 
                  value={formAge} 
                  onValueChange={(v) => setFormAge(v as 'kid' | 'young' | 'adult')}
                  className="flex gap-2"
                  disabled={formFalsePositive}
                >
                  {(['kid', 'young', 'adult'] as const).map(age => (
                    <div key={age} className="flex items-center space-x-1.5 flex-1">
                      <RadioGroupItem value={age} id={`age-${age}-${faceId}`} />
                      <Label htmlFor={`age-${age}-${faceId}`} className="text-xs cursor-pointer capitalize">
                        {age}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              {/* False Positive Checkbox */}
              <div className="flex items-center space-x-2 pt-2 border-t">
                <Checkbox 
                  id={`fp-${faceId}`}
                  checked={formFalsePositive}
                  onCheckedChange={(checked) => setFormFalsePositive(!!checked)}
                />
                <Label 
                  htmlFor={`fp-${faceId}`} 
                  className="text-sm text-destructive font-medium cursor-pointer"
                >
                  Not a real face (false positive)
                </Label>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setLabelingFace(null)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleSaveLabel(detection, idx)}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
              
              {/* Detection info */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                AI detected: {detection.gender}/{detection.ageGroup} ({(detection.confidence * 100).toFixed(0)}%)
              </div>
            </div>
          </div>
        );
      })}

      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        {/* Debug Overlay */}
        <DebugOverlay 
          debug={debugInfo} 
          trackedFaces={trackedFaces} 
          show={debugMode && isActive} 
        />
        
        <div 
          className="w-full h-full transition-transform duration-300 ease-out"
          style={{
            transform: zoomTransform.transform,
            transformOrigin: zoomTransform.origin
          }}
        >
          <video
            ref={videoRef}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isActive ? "opacity-100" : "opacity-0"
            )}
            playsInline
            muted
          />
          
          {/* Canvas overlay for bounding boxes */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          />
          
          {/* Label buttons on faces - inside container */}
          {labelingMode && isActive && detections.map((detection, idx) => {
            if (!detection.boundingBox || !videoRef.current) return null;
            
            const video = videoRef.current;
            const rect = video.getBoundingClientRect();
            const videoWidth = video.videoWidth || 640;
            const videoHeight = video.videoHeight || 480;
            const scaleX = rect.width / videoWidth;
            const scaleY = rect.height / videoHeight;
            
            const scaledX = detection.boundingBox.x * scaleX;
            const scaledY = detection.boundingBox.y * scaleY;
            const scaledWidth = detection.boundingBox.width * scaleX;
            const scaledHeight = detection.boundingBox.height * scaleY;
            const faceId = detection.trackingId || `face_${idx}`;
            
            const isLabeling = labelingFace === faceId;
            const isLabeledInSession = labeledFacesInSession.has(faceId);
            const justSaved = recentlySaved.has(faceId);
            
            // Don't show button if form is open (form is rendered outside)
            if (isLabeling) return null;
            
            return (
              <div
                key={faceId}
                className="absolute pointer-events-auto"
                style={{
                  left: `${scaledX}px`,
                  top: `${scaledY + scaledHeight + 4}px`,
                  width: `${Math.max(scaledWidth, 120)}px`,
                  zIndex: 20,
                }}
              >
                <Button
                  size="sm"
                  variant={justSaved ? 'default' : isLabeledInSession ? 'secondary' : 'outline'}
                  className={cn(
                    "w-full h-7 text-[11px] gap-1.5",
                    justSaved && "bg-green-600 hover:bg-green-700",
                    isLabeledInSession && !justSaved && "opacity-70"
                  )}
                  onClick={() => openLabelingForm(faceId, detection)}
                  disabled={justSaved}
                >
                  {justSaved ? (
                    <>
                      <Check className="h-3 w-3" />
                      Saved!
                    </>
                  ) : isLabeledInSession ? (
                    <>
                      <Tag className="h-3 w-3" />
                      Re-label
                    </>
                  ) : (
                    <>
                      <Tag className="h-3 w-3" />
                      Label This Face
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {error ? (
              <>
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-xs text-destructive text-center px-4">
                  {error}
                </p>
              </>
            ) : hasPermission === false ? (
              <>
                <CameraOff className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Camera access denied
                </p>
              </>
            ) : (
              <>
                <CameraOff className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Camera off (saves resources)
                </p>
              </>
            )}
          </div>
        )}

        {isCapturing && (
          <>
            <div className="absolute inset-0 border-2 border-primary rounded-lg animate-pulse" />
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-destructive px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
              <span className="text-[10px] font-bold text-destructive-foreground">REC</span>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {labelingMode 
          ? 'Click "Label This Face" to add ground truth data for evaluation'
          : isActive && detections.length > 0 
            ? `Detecting ${detections.length} person(s) with bounding boxes`
            : inputMode === 'webcam' 
              ? 'Use dropdown to select webcam, video file, or screen capture'
              : `${inputMode === 'video' ? 'Video file' : 'Screen capture'} mode - select source from dropdown`
        }
      </p>
    </div>
  );
};
