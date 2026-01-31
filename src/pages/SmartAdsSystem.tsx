import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AdMetadata, DemographicCounts, DetectionResult, FaceBoundingBox } from '@/types/ad';
import { TrackedFace, DEFAULT_CCTV_CONFIG, DEFAULT_WEBCAM_CONFIG, toDetectionResult, CaptureSessionSummary, ViewerAggregate, getStableGender, getStableAgeGroup } from '@/types/detection';
import { GroundTruthEntry, EvaluationSession } from '@/types/evaluation';
import { VideoPlayer } from '@/components/VideoPlayer';
import { DemographicStats } from '@/components/DemographicStats';
import { AdQueue } from '@/components/AdQueue';
import { ManualQueueEditor } from '@/components/ManualQueueEditor';
import { SystemLogs } from '@/components/SystemLogs';
import { WebcamPreview } from '@/components/WebcamPreview';
import { SettingsPanel, CaptureSettings } from '@/components/SettingsPanel';
import { AdManager } from '@/components/AdManager';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InputSourceSelector } from '@/components/InputSourceSelector';
import { CaptureSessionSummary as CaptureSessionSummaryComponent } from '@/components/CaptureSessionSummary';
import { useWebcam } from '@/hooks/useWebcam';
import { useFaceDetection, resetSimulatedPerson } from '@/hooks/useFaceDetection';
import { useAdQueue } from '@/hooks/useAdQueue';
import { sampleAds } from '@/data/sampleAds';
import { Tv, Zap, Activity, AlertCircle, CheckCircle, Eye, EyeOff, Play, Square, Cpu, Home, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Minimum confidence to count a detection vote (reduces noise)
const MIN_VOTE_CONFIDENCE = 0.65;
// Minimum frames a face must be seen to count in session summary
const MIN_FRAMES_FOR_SESSION = 2;

const SmartAdsSystem = () => {
  // Settings state - default to 40% capture window (60%-100%) and medium sensitivity
  const [captureSettings, setCaptureSettings] = useState<CaptureSettings>({
    startPercent: 60,
    endPercent: 100,
    detectionSensitivity: 0.35,
    detectionMode: 'accurate',
    videoQuality: 'lowQuality',
    falsePositiveMinScore: 0.18,
    minDemographicConfidence: 0.75,
    femaleBoostFactor: 0.15,
    enableHairHeuristics: true,
    requireFaceTexture: false, // Disabled by default - can cause real face rejection
    useDualModelForVideo: true,
    enableYoloForVideo: false,
  });

  // Labeling mode for evaluation
  const [labelingMode, setLabelingMode] = useState(false);

  // CCTV mode settings
  const [cctvMode, setCctvMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Custom ads state - persisted to localStorage
  const [customAds, setCustomAds] = useState<AdMetadata[]>(() => {
    const saved = localStorage.getItem('smartads-custom-ads');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [...sampleAds];
      }
    }
    return [...sampleAds];
  });

  // Save ads to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('smartads-custom-ads', JSON.stringify(customAds));
  }, [customAds]);

  // Recalculate ads when settings change
  const adsWithCaptureWindows = useMemo(() => {
    return customAds.map(ad => ({
      ...ad,
      captureStart: Math.floor(ad.duration * captureSettings.startPercent / 100),
      captureEnd: Math.floor(ad.duration * captureSettings.endPercent / 100),
    }));
  }, [customAds, captureSettings]);

  const [currentAd, setCurrentAd] = useState<AdMetadata | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [demographics, setDemographics] = useState<DemographicCounts>({
    male: 0,
    female: 0,
    kid: 0,
    young: 0,
    adult: 0,
  });
  const [currentViewers, setCurrentViewers] = useState<DetectionResult[]>([]);
  const [testMode, setTestMode] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualQueue, setManualQueue] = useState<AdMetadata[]>(() => {
    const saved = localStorage.getItem('smartads-manual-queue');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Session summary state - shown after capture ends
  const [lastSessionSummary, setLastSessionSummary] = useState<CaptureSessionSummary | null>(null);
  const [showSessionSummary, setShowSessionSummary] = useState(false);

  // Save manual queue to localStorage
  useEffect(() => {
    localStorage.setItem('smartads-manual-queue', JSON.stringify(manualQueue));
  }, [manualQueue]);
  
  const captureIntervalRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);
  const initializedRef = useRef(false);
  const lastDemographicsRef = useRef<DemographicCounts>({ male: 0, female: 0, kid: 0, young: 0, adult: 0 });
  const testModeTimeoutRef = useRef<number | null>(null);
  
  // Advanced face tracking with temporal stabilization
  const trackedFacesRef = useRef<Map<string, TrackedFace>>(new Map());
  
  // Capture session aggregation - tracks unique viewers across capture window
  const captureSessionRef = useRef<{
    startedAt: number;
    frameCount: number;
    viewers: Map<string, ViewerAggregate>;
  } | null>(null);
  
  // Tracking config based on mode
  const trackingConfig = useMemo(() => {
    return cctvMode ? DEFAULT_CCTV_CONFIG : DEFAULT_WEBCAM_CONFIG;
  }, [cctvMode]);

  const { 
    videoRef, 
    isActive: webcamActive, 
    hasPermission, 
    error: webcamError, 
    inputMode,
    videoFileName,
    startWebcam, 
    startVideoFile,
    startScreenCapture,
    stopWebcam 
  } = useWebcam();
  
  // Determine effective model selection based on input mode
  const isVideoMode = inputMode === 'video' || inputMode === 'screen';
  const isWebcamMode = inputMode === 'webcam';
  
  // Debug: Log when input mode changes
  useEffect(() => {
    console.log(`[SmartAdsSystem] inputMode changed to: ${inputMode}, isVideoMode=${isVideoMode}, isWebcamMode=${isWebcamMode}`);
  }, [inputMode, isVideoMode, isWebcamMode]);
  
  // STRICT ENFORCEMENT:
  // - Webcam: ALWAYS tiny only (prevents ghost detections)
  // - Video/Screen: ALWAYS dual mode (Tiny + SSD for best coverage)
  // The "Enhanced Detection" toggle only affects Pass 2/3 rescue behavior, NOT detector type
  const effectiveDetector: 'tiny' | 'dual' | 'ssd' = isWebcamMode ? 'tiny' : 'dual';
  const effectiveCctvMode = isVideoMode ? true : cctvMode; // Force CCTV mode for video

  const { 
    isModelLoaded, 
    isLoading: modelsLoading, 
    loadingProgress,
    error: modelError, 
    backend,
    ssdLoaded,
    detectFaces,
    getDebugInfo 
  } = useFaceDetection(
    captureSettings.detectionSensitivity,
    {
      sourceMode: inputMode,
      cctvMode: effectiveCctvMode,
      useDualModel: isVideoMode, // Force dual for video
      useYolo: false, // YOLO not implemented
      config: {
        debugMode,
        hardMinFaceScore: captureSettings.falsePositiveMinScore,
        detector: effectiveDetector, // Strictly enforced per input mode
        detectionMode: captureSettings.detectionMode,
        videoQuality: captureSettings.videoQuality,
        // Pass female boost and heuristics settings
        femaleBoostFactor: captureSettings.femaleBoostFactor,
        enableHairHeuristics: captureSettings.enableHairHeuristics,
        requireFaceTexture: captureSettings.requireFaceTexture,
        // Enable enhanced rescue passes for video when toggle is on
        enableEnhancedRescue: isVideoMode && captureSettings.enableYoloForVideo,
      },
    }
  );
  
  // Get current active detector label for UI
  const activeDetectorLabel = isWebcamMode ? 'Tiny' : (ssdLoaded ? 'Dual' : 'Tiny');
  
  const { queue, logs, getNextAd, reorderQueue, addLog, updateQueue, resetManualQueueIndex } = useAdQueue({
    customAds: adsWithCaptureWindows,
    captureStartPercent: captureSettings.startPercent,
    captureEndPercent: captureSettings.endPercent,
    manualMode,
    manualQueue,
  });

  // Update queue when ads change
  useEffect(() => {
    updateQueue(adsWithCaptureWindows);
  }, [adsWithCaptureWindows, updateQueue]);

  // Initialize with first ad
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const firstAd = adsWithCaptureWindows[0];
    if (firstAd) {
      setCurrentAd(firstAd);
      setIsPlaying(true);
      addLog('ad', `Starting system with: "${firstAd.title}"`);
      addLog('info', `Capture window: ${firstAd.captureStart}s - ${firstAd.captureEnd}s`);
    }
  }, [adsWithCaptureWindows, addLog]);

  // Handle settings change - log all settings for debugging
  const handleSettingsChange = useCallback((newSettings: CaptureSettings) => {
    setCaptureSettings(newSettings);
    addLog('info', `⚙️ Settings: Sensitivity=${newSettings.detectionSensitivity.toFixed(2)}, FPGuard=${newSettings.falsePositiveMinScore.toFixed(2)}, FemaleBoost=${newSettings.femaleBoostFactor.toFixed(2)}`);
    addLog('info', `⚙️ Mode: ${newSettings.detectionMode}, Quality: ${newSettings.videoQuality}, Enhanced: ${newSettings.enableYoloForVideo}`);
  }, [addLog]);

  // Handle ads change
  const handleAdsChange = useCallback((newAds: AdMetadata[]) => {
    setCustomAds(newAds);
    addLog('info', `📁 Ad library updated: ${newAds.length} ads`);
  }, [addLog]);

  // Helper: Calculate IoU (Intersection over Union) for face matching
  const calculateIoU = useCallback((box1?: FaceBoundingBox, box2?: FaceBoundingBox): number => {
    if (!box1 || !box2) return 0;
    
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;
    
    return union > 0 ? intersection / union : 0;
  }, []);

  // Helper: Calculate center distance
  const calculateCenterDistance = useCallback((box1?: FaceBoundingBox, box2?: FaceBoundingBox): number => {
    if (!box1 || !box2) return Infinity;
    
    const cx1 = box1.x + box1.width / 2;
    const cy1 = box1.y + box1.height / 2;
    const cx2 = box2.x + box2.width / 2;
    const cy2 = box2.y + box2.height / 2;
    
    return Math.sqrt(Math.pow(cx2 - cx1, 2) + Math.pow(cy2 - cy1, 2));
  }, []);

  // Start detection loop - detects current viewers in frame
  const startDetectionLoop = useCallback(() => {
    if (captureIntervalRef.current) {
      window.clearInterval(captureIntervalRef.current);
    }

    // Clear tracking cache on new detection session
    trackedFacesRef.current.clear();
    
    // Initialize capture session for aggregation
    captureSessionRef.current = {
      startedAt: Date.now(),
      frameCount: 0,
      viewers: new Map(),
    };
    setShowSessionSummary(false);

    captureIntervalRef.current = window.setInterval(async () => {
      if (!isCapturingRef.current || !videoRef.current) return;

      console.log('[Loop] Running detection...');
      const results = await detectFaces(videoRef.current);
      
      const tracked = trackedFacesRef.current;
      const currentTime = Date.now();
      const config = trackingConfig;
      
      // Increment frame count for session
      if (captureSessionRef.current) {
        captureSessionRef.current.frameCount++;
      }
      
      // Match new detections to tracked faces using IoU + distance
      const matchedIds = new Set<string>();
      const usedDetections = new Set<number>();
      
      // For each tracked face, find best matching new detection
      for (const [id, trackedFace] of tracked.entries()) {
        let bestMatch: number | null = null;
        let bestScore = 0;
        
        for (let i = 0; i < results.length; i++) {
          if (usedDetections.has(i)) continue;
          
          const detection = results[i];
          const iou = calculateIoU(detection.boundingBox, trackedFace.boundingBox);
          const distance = calculateCenterDistance(detection.boundingBox, trackedFace.boundingBox);
          
          // Predict position based on velocity
          const predictedX = trackedFace.boundingBox.x + trackedFace.velocity.vx;
          const predictedY = trackedFace.boundingBox.y + trackedFace.velocity.vy;
          const predictedBox = { ...trackedFace.boundingBox, x: predictedX, y: predictedY };
          const predictedDistance = calculateCenterDistance(detection.boundingBox, predictedBox);
          
          // Use minimum of actual and predicted distance
          const effectiveDistance = Math.min(distance, predictedDistance);
          
          // Reject if moved too far (likely different person)
          if (effectiveDistance > config.maxVelocityPx) continue;
          
          // Score: IoU weighted higher + inverse distance bonus
          const score = iou * 0.6 + Math.max(0, 1 - effectiveDistance / 200) * 0.4;
          
          if (score > bestScore && (iou > 0.2 || effectiveDistance < 80)) {
            bestScore = score;
            bestMatch = i;
          }
        }
        
        if (bestMatch !== null) {
          const detection = results[bestMatch];
          usedDetections.add(bestMatch);
          matchedIds.add(id);
          
          // Update tracked face with smoothing
          const alpha = 0.7; // Smoothing factor
          const newVx = (detection.boundingBox!.x - trackedFace.boundingBox.x);
          const newVy = (detection.boundingBox!.y - trackedFace.boundingBox.y);
          
          // Skip demographic updates if user has manually corrected this face
          const isUserCorrected = trackedFace.isUserCorrected === true;
          
          // Temporal voting: only add votes if confidence is high enough AND not user-corrected
          const newGenderVotes = isUserCorrected 
            ? trackedFace.genderVotes 
            : { ...trackedFace.genderVotes };
          const newAgeVotes = isUserCorrected 
            ? trackedFace.ageVotes 
            : { ...trackedFace.ageVotes };
          
          if (!isUserCorrected && detection.confidence >= MIN_VOTE_CONFIDENCE) {
            const voteWeight = detection.confidence * Math.min(detection.faceScore, 1);
            
            // Apply female boost PROPORTIONALLY based on confidence (not just uncertain)
            // Lower confidence = more boost, higher confidence = less boost
            // At 0.5 confidence: full boost, at 1.0 confidence: no boost
            const confidenceScale = Math.max(0, 1 - (detection.confidence - 0.5) * 2);
            const femaleBoost = captureSettings.femaleBoostFactor * confidenceScale;
            
            if (detection.gender === 'male') {
              newGenderVotes.male += voteWeight;
            } else {
              // Boost female votes proportionally to uncertainty
              newGenderVotes.female += voteWeight * (1 + femaleBoost);
            }
            newAgeVotes[detection.ageGroup] += voteWeight;
          }
          
          // Calculate stable gender/age from votes (avoid default-male bias on weak evidence)
          // For user-corrected faces, keep the user's values
          const stableGender = isUserCorrected 
            ? trackedFace.stableGender 
            : getStableGender(newGenderVotes, trackedFace.stableGender);
          const stableAgeGroup = isUserCorrected 
            ? trackedFace.stableAgeGroup 
            : getStableAgeGroup(newAgeVotes, trackedFace.stableAgeGroup);
          
          tracked.set(id, {
            ...trackedFace,
            boundingBox: {
              x: trackedFace.boundingBox.x * (1 - alpha) + detection.boundingBox!.x * alpha,
              y: trackedFace.boundingBox.y * (1 - alpha) + detection.boundingBox!.y * alpha,
              width: trackedFace.boundingBox.width * (1 - alpha) + detection.boundingBox!.width * alpha,
              height: trackedFace.boundingBox.height * (1 - alpha) + detection.boundingBox!.height * alpha,
            },
            velocity: {
              vx: trackedFace.velocity.vx * 0.5 + newVx * 0.5,
              vy: trackedFace.velocity.vy * 0.5 + newVy * 0.5,
            },
            confidence: isUserCorrected ? 1.0 : detection.confidence, // User corrections get max confidence
            faceScore: detection.faceScore,
            gender: isUserCorrected ? trackedFace.gender : detection.gender,
            ageGroup: isUserCorrected ? trackedFace.ageGroup : detection.ageGroup,
            consecutiveHits: trackedFace.consecutiveHits + 1,
            missedFrames: 0,
            lastSeenAt: currentTime,
            detectorUsed: detection.trackingId?.startsWith('ssd') ? 'ssd' : 'tiny',
            genderVotes: newGenderVotes,
            ageVotes: newAgeVotes,
            stableGender,
            stableAgeGroup,
            isUserCorrected, // Preserve the flag
          });
          
          // Update capture session aggregation
          if (captureSessionRef.current && trackedFace.consecutiveHits >= config.minConsecutiveFrames) {
            const session = captureSessionRef.current;
            const existing = session.viewers.get(id);
            
            if (existing) {
              // Update existing viewer aggregate
              if (detection.confidence >= MIN_VOTE_CONFIDENCE) {
                existing.genderVotes[detection.gender] += detection.confidence;
                existing.ageVotes[detection.ageGroup] += detection.confidence;
              }
              existing.seenFrames++;
              existing.bestFaceScore = Math.max(existing.bestFaceScore, detection.faceScore);
              existing.bestConfidence = Math.max(existing.bestConfidence, detection.confidence);
              existing.finalGender = getStableGender(existing.genderVotes, existing.finalGender);
              existing.finalAgeGroup = getStableAgeGroup(existing.ageVotes, existing.finalAgeGroup);
            } else {
              // New viewer in session
              session.viewers.set(id, {
                trackingId: id,
                genderVotes: { male: detection.gender === 'male' ? detection.confidence : 0, female: detection.gender === 'female' ? detection.confidence : 0 },
                ageVotes: { 
                  kid: detection.ageGroup === 'kid' ? detection.confidence : 0, 
                  young: detection.ageGroup === 'young' ? detection.confidence : 0, 
                  adult: detection.ageGroup === 'adult' ? detection.confidence : 0 
                },
                seenFrames: 1,
                bestFaceScore: detection.faceScore,
                bestConfidence: detection.confidence,
                finalGender: detection.gender,
                finalAgeGroup: detection.ageGroup,
              });
            }
          }
        }
      }
      
      // Add new unmatched detections
      for (let i = 0; i < results.length; i++) {
        if (usedDetections.has(i)) continue;
        
        const detection = results[i];
        const newId = `face_${currentTime}_${Math.random().toString(36).substr(2, 5)}`;
        
        // Initialize with votes from first detection
        const initialGenderVotes = { male: 0, female: 0 };
        const initialAgeVotes = { kid: 0, young: 0, adult: 0 };
        
        if (detection.confidence >= MIN_VOTE_CONFIDENCE) {
          const voteWeight = detection.confidence * Math.min(detection.faceScore, 1);
          
          // Apply female boost PROPORTIONALLY based on confidence
          const confidenceScale = Math.max(0, 1 - (detection.confidence - 0.5) * 2);
          const femaleBoost = captureSettings.femaleBoostFactor * confidenceScale;
          
          if (detection.gender === 'male') {
            initialGenderVotes.male = voteWeight;
          } else {
            initialGenderVotes.female = voteWeight * (1 + femaleBoost);
          }
          initialAgeVotes[detection.ageGroup] = voteWeight;
        }
        
        tracked.set(newId, {
          id: newId,
          boundingBox: detection.boundingBox!,
          velocity: { vx: 0, vy: 0 },
          confidence: detection.confidence,
          faceScore: detection.faceScore,
          gender: detection.gender,
          ageGroup: detection.ageGroup,
          consecutiveHits: 1,
          missedFrames: 0,
          firstSeenAt: currentTime,
          lastSeenAt: currentTime,
          detectorUsed: detection.trackingId?.startsWith('ssd') ? 'ssd' : 'tiny',
          genderVotes: initialGenderVotes,
          ageVotes: initialAgeVotes,
          stableGender: detection.gender,
          stableAgeGroup: detection.ageGroup,
        });
      }
      
      // Update missed frames and remove stale faces
      for (const [id, trackedFace] of tracked.entries()) {
        if (!matchedIds.has(id) && !results.some((_, i) => !usedDetections.has(i))) {
          trackedFace.missedFrames++;
          
          // Apply velocity prediction for smooth tracking during occlusion
          if (trackedFace.missedFrames <= config.holdFrames / 2) {
            trackedFace.boundingBox.x += trackedFace.velocity.vx * 0.5;
            trackedFace.boundingBox.y += trackedFace.velocity.vy * 0.5;
          }
          
          // Remove if missed too many frames
          if (trackedFace.missedFrames > config.holdFrames) {
            tracked.delete(id);
          }
        }
      }
      
      // Get stable detections (consecutive hits >= threshold) - uses temporal voting
      const stableViewers = Array.from(tracked.values())
        .filter(face => face.consecutiveHits >= config.minConsecutiveFrames)
        .map(toDetectionResult);
      
      // ALWAYS update viewers (fixes stuck bounding box)
      setCurrentViewers(stableViewers);
      
      if (stableViewers.length > 0) {
        // Calculate demographics from stable detections, but only COUNT confident demographics
        const confident = stableViewers.filter(d => d.confidence >= captureSettings.minDemographicConfidence);

        const newDemographics: DemographicCounts = {
          male: confident.filter(d => d.gender === 'male').length,
          female: confident.filter(d => d.gender === 'female').length,
          kid: confident.filter(d => d.ageGroup === 'kid').length,
          young: confident.filter(d => d.ageGroup === 'young').length,
          adult: confident.filter(d => d.ageGroup === 'adult').length,
        };
        setDemographics(newDemographics);
        lastDemographicsRef.current = newDemographics;
        
        addLog('detection', `👁️ ${stableViewers.length} viewer(s): ${stableViewers.map(r => `${r.gender}/${r.ageGroup} (${Math.round(r.faceScore * 100)}%)`).join(', ')}`);
      } else {
        // Clear demographics when no viewers
        const zeroDemographics: DemographicCounts = { male: 0, female: 0, kid: 0, young: 0, adult: 0 };
        setDemographics(zeroDemographics);
        lastDemographicsRef.current = zeroDemographics;
      }
    }, 800); // Faster interval for CCTV tracking
  }, [detectFaces, addLog, videoRef, calculateIoU, calculateCenterDistance, trackingConfig]);

  const stopDetectionLoop = useCallback(() => {
    if (captureIntervalRef.current) {
      window.clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  // Start detection with current input source - runs continuously until manually stopped
  const startDetectionWithSource = useCallback(async (
    sourceStarter: () => Promise<boolean>,
    sourceName: string
  ) => {
    // Allow switching sources while already running
    if (testMode || isCapturingRef.current) {
      addLog('info', `🔄 Switching source → ${sourceName}`);
      stopDetectionLoop();
      stopWebcam();
      isCapturingRef.current = false;
      setIsCapturing(false);
      setTestMode(false);
      setCurrentViewers([]);
    }

    setTestMode(true);
    addLog('info', `🧪 TEST MODE: Starting ${sourceName} detection (continuous)...`);

    // Auto-enable CCTV mode for video/screen files (webcam forces it off)
    if (sourceName.includes('Video') || sourceName.includes('Screen')) {
      setCctvMode(true);
      addLog('info', `📹 CCTV Mode auto-enabled for ${sourceName}`);
    } else {
      // Webcam: force CCTV mode off to reduce ghost detections
      setCctvMode(false);
    }

    // Reset demographics
    setDemographics({ male: 0, female: 0, kid: 0, young: 0, adult: 0 });
    setCurrentViewers([]);

    const success = await sourceStarter();
    if (success) {
      addLog('webcam', `✅ ${sourceName} activated - runs until manually stopped`);
      isCapturingRef.current = true;
      setIsCapturing(true);

      setTimeout(() => {
        startDetectionLoop();
      }, 500);
    } else {
      addLog('webcam', `❌ ${sourceName} failed to start`);
      setTestMode(false);
    }
  }, [testMode, startDetectionLoop, stopDetectionLoop, stopWebcam, addLog]);

  // Test mode: manually trigger detection for 30 seconds
  const startTestMode = useCallback(async () => {
    await startDetectionWithSource(startWebcam, 'Camera');
  }, [startDetectionWithSource, startWebcam]);

  // Handle video file selection
  const handleVideoFileSelect = useCallback(async (file: File) => {
    await startDetectionWithSource(
      () => startVideoFile(file),
      `Video (${file.name})`
    );
  }, [startDetectionWithSource, startVideoFile]);

  // Handle screen capture selection  
  const handleScreenCaptureSelect = useCallback(async () => {
    await startDetectionWithSource(startScreenCapture, 'Screen Capture');
  }, [startDetectionWithSource, startScreenCapture]);

  const stopTestMode = useCallback(() => {
    if (testModeTimeoutRef.current) {
      window.clearTimeout(testModeTimeoutRef.current);
      testModeTimeoutRef.current = null;
    }
    
    stopDetectionLoop();
    stopWebcam();
    isCapturingRef.current = false;
    setIsCapturing(false);
    setTestMode(false);
    setCurrentViewers([]);
    addLog('info', '🧪 TEST MODE: Ended');
  }, [stopDetectionLoop, stopWebcam, addLog]);

  // Toggle manual mode
  const handleManualModeToggle = useCallback((enabled: boolean) => {
    setManualMode(enabled);
    if (enabled) {
      // Stop any active detection
      if (testMode) stopTestMode();
      if (isCapturingRef.current) {
        stopDetectionLoop();
        stopWebcam();
        isCapturingRef.current = false;
        setIsCapturing(false);
      }
      setDemographics({ male: 0, female: 0, kid: 0, young: 0, adult: 0 });
      setCurrentViewers([]);
      resetManualQueueIndex();
      addLog('info', '📺 MANUAL MODE: Detection disabled - ads will play from playlist');
    } else {
      addLog('info', '🎯 AUTO MODE: Detection enabled - ads will target demographics');
    }
  }, [testMode, stopTestMode, stopDetectionLoop, stopWebcam, addLog, resetManualQueueIndex]);

  // Handle manual queue change
  const handleManualQueueChange = useCallback((newQueue: AdMetadata[]) => {
    setManualQueue(newQueue);
    resetManualQueueIndex();
    if (newQueue.length > 0) {
      addLog('info', `📋 Playlist updated: ${newQueue.length} ads`);
    }
  }, [resetManualQueueIndex, addLog]);

  // Handle ground truth labeling for evaluation AND correct the live detection
  const handleLabelDetection = useCallback((entry: GroundTruthEntry & { trackingId?: string }) => {
    // Load existing evaluation data
    const storageKey = 'smartads-evaluation-sessions';
    let sessions: EvaluationSession[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) sessions = JSON.parse(saved);
    } catch { /* ignore */ }
    
    // Get or create current session
    const today = new Date().toISOString().split('T')[0];
    let currentSession = sessions.find(s => s.name.includes(today));
    
    if (!currentSession) {
      currentSession = {
        id: `session_${Date.now()}`,
        name: `Session ${today}`,
        createdAt: Date.now(),
        entries: [],
      };
      sessions.push(currentSession);
    }
    
    // Add entry
    currentSession.entries.push(entry);
    
    // Save back
    localStorage.setItem(storageKey, JSON.stringify(sessions));
    
    // Dispatch event so Evaluation page can auto-refresh
    window.dispatchEvent(new CustomEvent('smartads-evaluation-updated'));
    
    // CORRECTION: Apply the label to the live tracked face
    if (entry.trackingId && trackedFacesRef.current.has(entry.trackingId)) {
      const tracked = trackedFacesRef.current.get(entry.trackingId)!;
      
      if (entry.isFalsePositive) {
        // Remove false positive from tracking
        trackedFacesRef.current.delete(entry.trackingId);
        addLog('info', `🏷️ FALSE POSITIVE removed from tracking`);
      } else {
        // Correct the tracked face with user-provided ground truth
        // Set overwhelming vote weights so the correction persists
        const correctionWeight = 100;
        tracked.genderVotes = { 
          male: entry.actualGender === 'male' ? correctionWeight : 0, 
          female: entry.actualGender === 'female' ? correctionWeight : 0 
        };
        tracked.ageVotes = { 
          kid: entry.actualAgeGroup === 'kid' ? correctionWeight : 0, 
          young: entry.actualAgeGroup === 'young' ? correctionWeight : 0, 
          adult: entry.actualAgeGroup === 'adult' ? correctionWeight : 0 
        };
        tracked.stableGender = entry.actualGender;
        tracked.stableAgeGroup = entry.actualAgeGroup;
        tracked.gender = entry.actualGender;
        tracked.ageGroup = entry.actualAgeGroup;
        tracked.isUserCorrected = true;
        // Set confidence to 100% since it's user-labeled
        tracked.confidence = 1.0;
        tracked.faceScore = 1.0;
        
        trackedFacesRef.current.set(entry.trackingId, tracked);
        addLog('info', `🏷️ Corrected: ${entry.actualGender}/${entry.actualAgeGroup} (100% confidence)`);
      }
      
      // Update displayed detections immediately with 100% confidence for labeled
      const updatedDetections = Array.from(trackedFacesRef.current.values())
        .filter(f => f.consecutiveHits >= 2)
        .map(f => ({
          gender: f.stableGender,
          ageGroup: f.stableAgeGroup,
          confidence: f.isUserCorrected ? 1.0 : f.confidence,
          faceScore: f.isUserCorrected ? 1.0 : f.faceScore,
          boundingBox: f.boundingBox,
          trackingId: f.id,
          isUserCorrected: f.isUserCorrected,
        }));
      setCurrentViewers(updatedDetections);
    } else {
      // Log even if no live tracking (e.g., paused video)
      const wasCorrect = entry.detectedGender === entry.actualGender && entry.detectedAgeGroup === entry.actualAgeGroup && !entry.isFalsePositive;
      addLog('info', `🏷️ Labeled: ${entry.isFalsePositive ? 'FALSE POSITIVE' : wasCorrect ? '✓ Correct' : `✗ ${entry.actualGender}/${entry.actualAgeGroup}`}`);
    }
  }, [addLog]);

  // Capture window logic - only runs when not in manual mode
  useEffect(() => {
    if (!currentAd || !isPlaying || manualMode) return;

    const inCaptureWindow = 
      currentTime >= currentAd.captureStart && 
      currentTime <= currentAd.captureEnd;

    if (inCaptureWindow && !isCapturingRef.current) {
      console.log('[Capture] Starting capture window');
      isCapturingRef.current = true;
      setIsCapturing(true);
      
      // Reset for new capture session
      setDemographics({ male: 0, female: 0, kid: 0, young: 0, adult: 0 });
      setCurrentViewers([]);
      resetSimulatedPerson();
      
      addLog('webcam', `📷 CAPTURE STARTED (${currentAd.captureStart}s - ${currentAd.captureEnd}s)`);
      addLog('info', '🔄 Scanning for current viewers...');
      
      startWebcam().then((success) => {
        if (success) {
          addLog('webcam', 'Camera activated');
          setTimeout(() => {
            startDetectionLoop();
          }, 500);
        } else {
          addLog('webcam', 'Camera unavailable, using simulation');
          startDetectionLoop();
        }
      });

    } else if (!inCaptureWindow && isCapturingRef.current) {
      console.log('[Capture] Ending capture window');
      isCapturingRef.current = false;
      setIsCapturing(false);
      
      stopDetectionLoop();
      stopWebcam();
      
      addLog('webcam', `📷 CAPTURE ENDED`);
      
      // Build session summary from aggregated viewers
      if (captureSessionRef.current) {
        const session = captureSessionRef.current;
        
        // Filter viewers who were seen in enough frames (reduces false positives)
        // and only count those with at least one confident demographic classification.
        const stableViewers = Array.from(session.viewers.values())
          .filter(v => v.seenFrames >= MIN_FRAMES_FOR_SESSION)
          .filter(v => v.bestConfidence >= captureSettings.minDemographicConfidence);

        // Calculate demographics from session summary (unique viewers, not per-frame counts)
        const sessionDemographics: DemographicCounts = {
          male: stableViewers.filter(v => v.finalGender === 'male').length,
          female: stableViewers.filter(v => v.finalGender === 'female').length,
          kid: stableViewers.filter(v => v.finalAgeGroup === 'kid').length,
          young: stableViewers.filter(v => v.finalAgeGroup === 'young').length,
          adult: stableViewers.filter(v => v.finalAgeGroup === 'adult').length,
        };
        
        // Create summary for display
        const summary: CaptureSessionSummary = {
          startedAt: session.startedAt,
          endedAt: Date.now(),
          totalFrames: session.frameCount,
          uniqueViewers: stableViewers.length,
          demographics: sessionDemographics,
          viewers: stableViewers,
        };
        
        setLastSessionSummary(summary);
        setShowSessionSummary(true);
        
        // Log session summary
        addLog('info', `📊 Session Summary: ${stableViewers.length} unique viewers over ${session.frameCount} frames`);
        addLog('info', `📊 Demographics: ${sessionDemographics.male}M/${sessionDemographics.female}F, ${sessionDemographics.kid} kid/${sessionDemographics.young} young/${sessionDemographics.adult} adult`);
        
        // Reorder queue based on session summary (not last frame)
        if (sessionDemographics.male + sessionDemographics.female > 0) {
          reorderQueue(sessionDemographics);
        }
        
        // Clear session
        captureSessionRef.current = null;
        
        // Auto-hide summary after 8 seconds
        setTimeout(() => {
          setShowSessionSummary(false);
        }, 8000);
      }
    }
  }, [currentTime, currentAd, isPlaying, manualMode, startWebcam, stopWebcam, startDetectionLoop, stopDetectionLoop, addLog, reorderQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetectionLoop();
      if (testModeTimeoutRef.current) {
        window.clearTimeout(testModeTimeoutRef.current);
      }
    };
  }, [stopDetectionLoop]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleDurationDetected = useCallback((durationSeconds: number) => {
    setCurrentAd(prev => {
      if (!prev) return prev;
      if (Math.round(prev.duration) === durationSeconds) return prev;

      const updated = {
        ...prev,
        duration: durationSeconds,
        captureStart: Math.floor(durationSeconds * captureSettings.startPercent / 100),
        captureEnd: Math.floor(durationSeconds * captureSettings.endPercent / 100),
      };

      // Keep libraries in sync so playlist/queue shows correct time
      setCustomAds(ads => ads.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      setManualQueue(q => q.map(a => a.id === updated.id ? { ...a, ...updated } : a));

      addLog('info', `⏱️ Duration updated from video metadata: ${updated.title} = ${durationSeconds}s`);
      return updated;
    });
  }, [captureSettings, addLog]);

  const handleAdEnded = useCallback(() => {
    isCapturingRef.current = false;
    setIsCapturing(false);
    stopDetectionLoop();
    stopWebcam();

    const nextAd = getNextAd();
    if (nextAd) {
      const adWithWindow = {
        ...nextAd,
        captureStart: Math.floor(nextAd.duration * captureSettings.startPercent / 100),
        captureEnd: Math.floor(nextAd.duration * captureSettings.endPercent / 100),
      };
      setCurrentAd(adWithWindow);
      setCurrentTime(0);
      setIsPlaying(true);
      addLog('info', `Capture window: ${adWithWindow.captureStart}s - ${adWithWindow.captureEnd}s`);
    }
  }, [getNextAd, stopWebcam, stopDetectionLoop, addLog, captureSettings]);

  const handleSkip = useCallback(() => {
    addLog('ad', `⏭️ Skipped: "${currentAd?.title}"`);
    handleAdEnded();
  }, [currentAd, handleAdEnded, addLog]);

  const captureWindow = currentAd ? {
    start: currentAd.captureStart,
    end: currentAd.captureEnd,
  } : null;

  // Get tracked faces for debug overlay
  const trackedFacesArray = useMemo(() => {
    return Array.from(trackedFacesRef.current.values());
  }, [currentViewers]); // Update when viewers change

  // Fullscreen mode - renders only the video player
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Hidden webcam for detection - keeps running in background */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        
        <VideoPlayer
          ad={currentAd}
          isPlaying={isPlaying}
          onTimeUpdate={handleTimeUpdate}
          onDurationDetected={handleDurationDetected}
          onEnded={handleAdEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onSkip={handleSkip}
          isCapturing={isCapturing}
          captureWindow={captureWindow}
          isFullscreen={true}
          onFullscreenToggle={() => setIsFullscreen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link 
            to="/"
            className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 hover:from-primary/30 hover:to-accent/30 transition-colors"
            title="Back to Home"
          >
            <Home className="h-6 w-6 text-primary" />
          </Link>
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
            <Tv className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight">
            Smart<span className="text-primary">Ads</span> System
          </h1>
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            {/* Test Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={testMode ? "destructive" : "default"}
                size="sm"
                onClick={testMode ? stopTestMode : startTestMode}
                disabled={modelsLoading || manualMode}
                className="gap-2"
              >
                {testMode ? (
                  <>
                    <Square className="h-4 w-4" />
                    Stop Test
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Test Mode
                  </>
                )}
              </Button>
            </div>

            {/* CCTV Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <Cpu className={`h-4 w-4 ${cctvMode ? 'text-accent' : 'text-muted-foreground'}`} />
              <Label htmlFor="cctv-mode" className="text-sm font-medium cursor-pointer">
                CCTV
              </Label>
              <Switch
                id="cctv-mode"
                checked={cctvMode}
                onCheckedChange={setCctvMode}
              />
            </div>

            {/* Debug Mode Toggle */}
            {cctvMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                <Label htmlFor="debug-mode" className="text-sm font-medium cursor-pointer text-muted-foreground">
                  Debug
                </Label>
                <Switch
                  id="debug-mode"
                  checked={debugMode}
                  onCheckedChange={setDebugMode}
                />
              </div>
            )}

            {/* Manual Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              {manualMode ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-primary" />
              )}
              <Label htmlFor="manual-mode" className="text-sm font-medium cursor-pointer">
                {manualMode ? 'Manual' : 'Auto'}
              </Label>
              <Switch
                id="manual-mode"
                checked={manualMode}
                onCheckedChange={handleManualModeToggle}
            />
            </div>

            {/* Labeling Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <Tag className={`h-4 w-4 ${labelingMode ? 'text-accent' : 'text-muted-foreground'}`} />
              <Label htmlFor="labeling-mode" className="text-sm font-medium cursor-pointer">
                Label
              </Label>
              <Switch
                id="labeling-mode"
                checked={labelingMode}
                onCheckedChange={setLabelingMode}
              />
            </div>

            {/* Input Source Selector */}
            <InputSourceSelector
              currentMode={inputMode}
              isActive={webcamActive}
              videoFileName={videoFileName}
              onSelectWebcam={startTestMode}
              onSelectVideoFile={handleVideoFileSelect}
              onSelectScreenCapture={handleScreenCaptureSelect}
              onStop={stopTestMode}
              disabled={modelsLoading || manualMode}
            />
            
            <AdManager 
              ads={customAds}
              onAdsChange={handleAdsChange}
              captureStartPercent={captureSettings.startPercent}
              captureEndPercent={captureSettings.endPercent}
            />
            <SettingsPanel 
              settings={captureSettings}
              onSettingsChange={handleSettingsChange}
            />
            <ThemeToggle />
            
            {/* Model Status */}
            <div className="flex items-center gap-2 text-sm pl-3 border-l border-border">
              {modelsLoading ? (
                <>
                  <Activity className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-muted-foreground">Loading AI ({loadingProgress}%)...</span>
                </>
              ) : modelError ? (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive text-xs" title={modelError}>Model Error</span>
                </>
              ) : isModelLoaded ? (
                <>
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-success">
                    AI Ready ({activeDetectorLabel}) • {backend?.toUpperCase()}
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Demo Mode</span>
                </>
              )}
            </div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          {manualMode ? (
            <span className="text-warning">Manual Mode: Playing from custom playlist ({manualQueue.length} ads) in loop</span>
          ) : (
            <>Dynamic ad targeting powered by real-time demographic detection • Camera activates at {captureSettings.startPercent}% of ad duration</>
          )}
          {testMode && <span className="ml-2 text-primary font-medium">• TEST MODE ACTIVE</span>}
          {cctvMode && <span className="ml-2 text-accent font-medium">• CCTV MODE</span>}
        </p>
      </header>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Video Player */}
        <div className="lg:col-span-7 space-y-6">
          <VideoPlayer
            ad={currentAd}
            isPlaying={isPlaying}
            onTimeUpdate={handleTimeUpdate}
            onDurationDetected={handleDurationDetected}
            onEnded={handleAdEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onSkip={handleSkip}
            isCapturing={isCapturing}
            captureWindow={captureWindow}
            isFullscreen={false}
            onFullscreenToggle={() => setIsFullscreen(true)}
          />

          <div className="grid grid-cols-1 gap-6">
            <WebcamPreview
              videoRef={videoRef}
              isActive={webcamActive}
              hasPermission={hasPermission}
              error={webcamError}
              isCapturing={isCapturing}
              detections={currentViewers}
              inputMode={inputMode}
              videoFileName={videoFileName}
              debugMode={debugMode}
              debugInfo={getDebugInfo()}
              trackedFaces={trackedFacesArray}
              labelingMode={labelingMode}
              onLabelDetection={handleLabelDetection}
            />
          </div>
          <SystemLogs logs={logs} />
        </div>

        {/* Right Column - Stats & Queue */}
        <div className="lg:col-span-5 space-y-6">
          {/* Session Summary - shown after capture ends */}
          <CaptureSessionSummaryComponent
            summary={lastSessionSummary}
            isVisible={showSessionSummary}
          />
          
          <DemographicStats
            demographics={demographics}
            recentDetections={currentViewers}
            isCapturing={isCapturing}
          />
          
          {manualMode ? (
            <ManualQueueEditor
              availableAds={customAds}
              manualQueue={manualQueue}
              onQueueChange={handleManualQueueChange}
            />
          ) : (
            <AdQueue
              queue={queue}
              currentAdId={currentAd?.id || null}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary" />
              face-api.js ({ssdLoaded ? 'TinyFace + SSD Mobilenet' : 'TinyFaceDetector'} + AgeGender)
            </span>
            <span>•</span>
            <span>Backend: {backend || 'Loading...'}</span>
            <span>•</span>
            <span>Camera: {captureSettings.startPercent}% - {captureSettings.endPercent}% of ad</span>
            <span>•</span>
            <span>{customAds.length} ads loaded</span>
          </div>
          <div className="flex gap-4">
            <span>Prototype v2.0 (CCTV Enhanced)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SmartAdsSystem;
