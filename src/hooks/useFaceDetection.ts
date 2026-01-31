import { useState, useEffect, useCallback, useRef } from 'react';
import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';

// Detection timeout to prevent hanging
const DETECTION_TIMEOUT = 10000;
import { DetectionResult, FaceBoundingBox } from '@/types/ad';
import { DetectionDebugInfo, CCTVDetectionConfig, DEFAULT_CCTV_CONFIG, DEFAULT_WEBCAM_CONFIG } from '@/types/detection';
import { createPreprocessedCanvas, PreprocessingOptions, ROIConfig } from '@/utils/imagePreprocessing';
import { hasTextureVariation, applyFemaleBoost, analyzeHairRegion } from '@/utils/genderHeuristics';

// Use local models from public folder - no CORS issues
const MODEL_URL = '/models';

type SourceMode = 'webcam' | 'video' | 'screen';

type FaceDetectionOptions = {
  sourceMode?: SourceMode;
  cctvMode?: boolean;
  config?: Partial<CCTVDetectionConfig>;
  /** Force use of SSD Mobilenet for dual-model mode */
  useDualModel?: boolean;
  /** Enable YOLO detection if available */
  useYolo?: boolean;
};

interface DetectionStats {
  lastFps: number;
  lastLatency: number;
  frameCount: number;
  lastFrameTime: number;
}

export const useFaceDetection = (
  sensitivity: number = 0.4,
  options?: FaceDetectionOptions
) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<string>('');
  const [ssdLoaded, setSsdLoaded] = useState(false);
  
  const loadingRef = useRef(false);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inFlightRef = useRef(false);
  const statsRef = useRef<DetectionStats>({
    lastFps: 0,
    lastLatency: 0,
    frameCount: 0,
    lastFrameTime: 0,
  });
  const debugInfoRef = useRef<DetectionDebugInfo | null>(null);

  // Initialize backend and load models
  useEffect(() => {
    const loadModels = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        setIsLoading(true);
        setLoadingProgress(10);

        // Use WebGL (stable with face-api.js) - WebGPU has kernel compatibility issues
        console.log('[TensorFlow] Initializing backend...');
        let selectedBackend = 'webgl';
        
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          console.log('[TensorFlow] ✅ Using WebGL backend');
        } catch (e) {
          console.log('[TensorFlow] WebGL failed, trying CPU...');
          try {
            await tf.setBackend('cpu');
            await tf.ready();
            selectedBackend = 'cpu';
            console.log('[TensorFlow] ⚠️ Using CPU backend (slower)');
          } catch (e2) {
            throw new Error('No TensorFlow backend available');
          }
        }
        
        setBackend(tf.getBackend() || selectedBackend);
        setLoadingProgress(30);

        console.log('[FaceAPI] Loading models from:', MODEL_URL);

        // Load TinyFaceDetector and AgeGender first (essential)
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        
        console.log('[FaceAPI] ✅ TinyFaceDetector + AgeGender loaded');
        setLoadingProgress(70);
        setIsModelLoaded(true);

        // Try to load SSD Mobilenet for CCTV mode (optional, don't fail if missing)
        try {
          await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
          console.log('[FaceAPI] ✅ SSD Mobilenet V1 loaded');
          setSsdLoaded(true);
        } catch (e) {
          console.log('[FaceAPI] ⚠️ SSD Mobilenet not available, using TinyFace only');
        }
        
        setLoadingProgress(100);
        setError(null);
      } catch (err) {
        console.error('[FaceAPI] ❌ Failed to load models:', err);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(`Model load failed: ${errorMsg}`);
        setIsModelLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Get effective config based on mode - now reactive to options and detection mode
  const getConfig = useCallback((): CCTVDetectionConfig => {
    const sourceMode = options?.sourceMode ?? 'webcam';
    const cctvMode = options?.cctvMode ?? sourceMode === 'video';
    const baseConfig = cctvMode ? DEFAULT_CCTV_CONFIG : DEFAULT_WEBCAM_CONFIG;
    
    // Override detector based on dual model setting
    let detector = baseConfig.detector;
    if (options?.useDualModel && ssdLoaded) {
      detector = 'dual';
    }
    // Allow explicit override from config
    if (options?.config?.detector) {
      detector = options.config.detector;
    }
    
    // Apply detection mode adjustments
    let modeAdjustments: Partial<CCTVDetectionConfig> = {};
    const detectionMode = (options?.config as any)?.detectionMode;
    const videoQuality = (options?.config as any)?.videoQuality;
    
    switch (detectionMode) {
      case 'fast':
        modeAdjustments = { 
          upscale: 1.0, 
          minConsecutiveFrames: 1,
          minFaceSizePx: 30,
        };
        break;
      case 'max':
        modeAdjustments = { 
          upscale: 2.5, 
          minConsecutiveFrames: 1,
          minFaceSizePx: 8,
          minFaceScore: Math.max(sensitivity - 0.1, 0.08),
        };
        break;
      // 'accurate' uses defaults
    }
    
    // Apply video quality adjustments
    switch (videoQuality) {
      case 'lowQuality':
        modeAdjustments = {
          ...modeAdjustments,
          upscale: Math.max(modeAdjustments.upscale ?? baseConfig.upscale, 2.0),
          preprocessing: { gamma: 1.3, contrast: 1.4, sharpen: 0.4, denoise: true },
        };
        break;
      case 'nightIR':
        modeAdjustments = {
          ...modeAdjustments,
          upscale: Math.max(modeAdjustments.upscale ?? baseConfig.upscale, 2.0),
          preprocessing: { gamma: 1.6, contrast: 1.5, sharpen: 0.5, denoise: true },
        };
        break;
      case 'crowd':
        modeAdjustments = {
          ...modeAdjustments,
          minFaceSizePx: 12,
          minFaceSizePercent: 0.02,
        };
        break;
      // 'hd' uses defaults
    }
    
    return {
      ...baseConfig,
      sensitivity,
      detector,
      ...modeAdjustments,
      ...options?.config,
    };
  }, [sensitivity, options, ssdLoaded]);

  // Merge detections and deduplicate by position using IoU + containment
  const mergeDetections = useCallback((
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detections: any[],
    _videoWidth: number,
    _videoHeight: number,
    iouThreshold: number = 0.55,
    containmentThreshold: number = 0.85
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any[] => {
    if (detections.length === 0) return [];

    const getScore = (d: any) => (d.detection?.score ?? d.score ?? 0) as number;
    const getBox = (d: any) => d.detection?.box ?? d.box;

    // Sort by score descending so we keep the best box
    const sorted = [...detections].sort((a, b) => getScore(b) - getScore(a));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged: any[] = [];

    for (const cand of sorted) {
      const boxB = getBox(cand);
      if (!boxB) continue;

      let isDuplicate = false;

      for (const kept of merged) {
        const boxA = getBox(kept);
        if (!boxA) continue;

        // IoU
        const x1 = Math.max(boxA.x, boxB.x);
        const y1 = Math.max(boxA.y, boxB.y);
        const x2 = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
        const y2 = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

        const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const areaA = boxA.width * boxA.height;
        const areaB = boxB.width * boxB.height;
        const union = areaA + areaB - intersection;
        const iou = union > 0 ? intersection / union : 0;

        // Containment (common in multi-scale: small box inside big box)
        const containment = areaB > 0 ? intersection / areaB : 0; // how much of B is inside A

        if (iou >= iouThreshold || containment >= containmentThreshold) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) merged.push(cand);
    }

    return merged;
  }, []);

  // Dedupe final results to avoid multiple boxes on the same face
  const dedupeResultsByIoU = useCallback((results: DetectionResult[]): DetectionResult[] => {
    if (results.length <= 1) return results;

    const sorted = [...results].sort((a, b) => (b.faceScore ?? 0) - (a.faceScore ?? 0));
    const kept: DetectionResult[] = [];

    for (const r of sorted) {
      const b = r.boundingBox;
      let dup = false;

      for (const k of kept) {
        const a = k.boundingBox;

        const x1 = Math.max(a.x, b.x);
        const y1 = Math.max(a.y, b.y);
        const x2 = Math.min(a.x + a.width, b.x + b.width);
        const y2 = Math.min(a.y + a.height, b.y + b.height);

        const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;
        const union = areaA + areaB - inter;
        const iou = union > 0 ? inter / union : 0;
        const containment = areaB > 0 ? inter / areaB : 0;

        if (iou >= 0.6 || containment >= 0.9) {
          dup = true;
          break;
        }
      }

      if (!dup) kept.push(r);
    }

    return kept;
  }, []);

  // Run TinyFaceDetector
  const runTinyDetection = useCallback(async (
    input: HTMLVideoElement | HTMLCanvasElement,
    inputSize: number,
    scoreThreshold: number
  ) => {
    return faceapi
      .detectAllFaces(
        input,
        new faceapi.TinyFaceDetectorOptions({
          inputSize,
          scoreThreshold,
        })
      )
      .withAgeAndGender();
  }, []);

  // Run SSD Mobilenet
  const runSsdDetection = useCallback(async (
    input: HTMLVideoElement | HTMLCanvasElement,
    minConfidence: number
  ) => {
    if (!ssdLoaded) return [];
    
    return faceapi
      .detectAllFaces(
        input,
        new faceapi.SsdMobilenetv1Options({
          minConfidence,
        })
      )
      .withAgeAndGender();
  }, [ssdLoaded]);

  // Create upscaled/preprocessed canvas
  const createProcessedCanvas = useCallback((
    videoElement: HTMLVideoElement,
    preprocessing: PreprocessingOptions,
    scale: number,
    roi?: ROIConfig
  ): HTMLCanvasElement | null => {
    return createPreprocessedCanvas(videoElement, preprocessing, scale, roi);
  }, []);

  // Filter and process raw detections with bias correction
  const processDetections = useCallback((
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detections: any[],
    videoWidth: number,
    videoHeight: number,
    scaleBack: number,
    config: CCTVDetectionConfig,
    detectorUsed: 'tiny' | 'ssd',
    roiOffset?: { x: number; y: number },
    debugMode: boolean = false,
    textureCheckCanvas?: HTMLCanvasElement | null
  ): { results: DetectionResult[]; rawCount: number; filteredCount: number } => {
    const rawCount = detections.length;
    
    // Threshold calculation - balance between ghost rejection and real face acceptance
    // hardMinFaceScore acts as an absolute floor
    const hardMinScore = config.hardMinFaceScore ?? 0.15;
    // Use sensitivity as a soft lower bound, not a hard multiplier
    // This allows faces with scores above sensitivity to pass through
    const requiredMinScore = Math.max(hardMinScore, config.minFaceScore);

    if (debugMode && rawCount > 0) {
      console.log(
        `[Filter] Raw: ${rawCount}, requiredMinScore: ${requiredMinScore.toFixed(2)} (hard=${hardMinScore.toFixed(2)} sens=${config.sensitivity.toFixed(2)}), minPx: ${config.minFaceSizePx}`
      );
    }

    const femaleBoostFactor = config.femaleBoostFactor ?? 0;
    const enableHairHeuristics = config.enableHairHeuristics ?? false;
    const requireFaceTexture = config.requireFaceTexture ?? false;

    const results = detections
      .filter(detection => {
        const det = detection.detection ?? detection;
        const box = det.box;
        const faceScore = det.score;

        // Scale back bounding box
        const faceWidth = box.width / scaleBack;
        const faceHeight = box.height / scaleBack;
        const faceX = box.x / scaleBack + (roiOffset?.x ?? 0);
        const faceY = box.y / scaleBack + (roiOffset?.y ?? 0);

        // Filter by face detection score (STRICT)
        if (faceScore < requiredMinScore) {
          if (debugMode) console.log(`[Filter] ❌ Low score: ${faceScore.toFixed(2)} < ${requiredMinScore.toFixed(2)}`);
          return false;
        }
        
        // Filter by minimum pixel size
        if (faceWidth < config.minFaceSizePx || faceHeight < config.minFaceSizePx) {
          if (debugMode) console.log(`[Filter] ❌ Too small: ${faceWidth.toFixed(0)}x${faceHeight.toFixed(0)}px < ${config.minFaceSizePx}px`);
          return false;
        }
        
        // Filter by percentage of frame
        const facePercent = (faceWidth * faceHeight) / (videoWidth * videoHeight) * 100;
        if (facePercent < config.minFaceSizePercent) {
          if (debugMode) console.log(`[Filter] ❌ Too small: ${facePercent.toFixed(2)}% < ${config.minFaceSizePercent}%`);
          return false;
        }
        
        // Reject overly large detections (walls/sky) - max 35% of frame
        if (facePercent > 35) {
          if (debugMode) console.log(`[Filter] ❌ Too large: ${facePercent.toFixed(2)}% > 35% (likely wall/background)`);
          return false;
        }
        
        // Filter by aspect ratio (faces should be roughly square)
        const aspectRatio = faceWidth / faceHeight;
        if (aspectRatio < config.aspectRatioMin || aspectRatio > config.aspectRatioMax) {
          if (debugMode) console.log(`[Filter] ❌ Bad aspect: ${aspectRatio.toFixed(2)} not in [${config.aspectRatioMin}, ${config.aspectRatioMax}]`);
          return false;
        }
        
        // Check if face is within video bounds
        if (faceX < 0 || faceY < 0 || faceX + faceWidth > videoWidth || faceY + faceHeight > videoHeight) {
          if (debugMode) console.log('[Filter] ❌ Out of bounds');
          return false;
        }
        
        // Texture check to filter out uniform surfaces (walls)
        if (requireFaceTexture && textureCheckCanvas) {
          const bbox: FaceBoundingBox = { x: faceX, y: faceY, width: faceWidth, height: faceHeight };
          if (!hasTextureVariation(textureCheckCanvas, bbox)) {
            if (debugMode) console.log('[Filter] ❌ No texture variation (uniform surface)');
            return false;
          }
        }
        
        if (debugMode) console.log(`[Filter] ✅ PASSED: score=${faceScore.toFixed(2)}, size=${faceWidth.toFixed(0)}x${faceHeight.toFixed(0)}px`);
        return true;
      })
      .map(detection => {
        const det = detection.detection ?? detection;
        const box = det.box;
        const faceScore = det.score;

        const boundingBox: FaceBoundingBox = {
          x: Math.max(0, box.x / scaleBack + (roiOffset?.x ?? 0)),
          y: Math.max(0, box.y / scaleBack + (roiOffset?.y ?? 0)),
          width: Math.min(box.width / scaleBack, videoWidth - box.x / scaleBack),
          height: Math.min(box.height / scaleBack, videoHeight - box.y / scaleBack),
        };

        // Classify age: kid (<13), young (13-34), adult (35+)
        const age = Math.round(detection.age);
        let ageGroup: 'kid' | 'young' | 'adult';
        if (age < 13) {
          ageGroup = 'kid';
        } else if (age < 35) {
          ageGroup = 'young';
        } else {
          ageGroup = 'adult';
        }

        // Get raw gender prediction
        let gender = detection.gender as 'male' | 'female';
        let confidence = detection.genderProbability as number;
        
        // Apply female boost at classification time to counter male bias
        // This can flip uncertain male predictions to female
        if (femaleBoostFactor > 0) {
          // Calculate hair score if heuristics enabled and canvas available
          let hairScore = 0.5; // neutral default
          if (enableHairHeuristics && textureCheckCanvas) {
            try {
              hairScore = analyzeHairRegion(textureCheckCanvas, boundingBox, debugMode);
            } catch {
              // ignore errors
            }
          }
          
          const adjusted = applyFemaleBoost(gender, confidence, femaleBoostFactor, hairScore);
          gender = adjusted.gender;
          confidence = adjusted.confidence;
          
          if (debugMode && adjusted.gender !== detection.gender) {
            console.log(`[Bias] Flipped ${detection.gender} → ${adjusted.gender} (boost=${femaleBoostFactor}, hair=${hairScore.toFixed(2)})`);
          }
        }

        return {
          gender,
          ageGroup,
          confidence,
          faceScore,
          boundingBox,
          trackingId: `${detectorUsed}_${Math.round(boundingBox.x)}_${Math.round(boundingBox.y)}`,
          lastSeen: Date.now(),
        } as DetectionResult;
      });

    if (debugMode) {
      console.log(`[Filter] Result: ${results.length}/${rawCount} passed`);
    }

    return { results, rawCount, filteredCount: results.length };
  }, []);

  // Main detection function
  const detectFaces = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<DetectionResult[]> => {
    // Prevent overlapping detection calls
    if (inFlightRef.current) {
      return [];
    }

    if (!videoElement || videoElement.readyState < 2 || !isModelLoaded) {
      return [];
    }

    inFlightRef.current = true;
    const startTime = performance.now();

    // Timeout protection to prevent infinite hangs
    const timeoutPromise = new Promise<DetectionResult[]>((_, reject) => {
      setTimeout(() => reject(new Error('Detection timeout')), DETECTION_TIMEOUT);
    });

    const detectionPromise = (async (): Promise<DetectionResult[]> => {
      const config = getConfig();
      // Read sourceMode directly from options - ensure we use latest value
      const sourceMode = options?.sourceMode ?? 'webcam';
      const isCCTV = options?.cctvMode ?? sourceMode === 'video';
      
      // Debug: log actual options values to verify they're updating
      if (config.debugMode) {
        console.log(`[Detection] Options check: sourceMode=${sourceMode}, cctvMode=${options?.cctvMode}, useDualModel=${options?.useDualModel}`);
      }
      
      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;

      let detectorUsed: 'tiny' | 'ssd' = 'tiny';
      let passUsed: 1 | 2 = 1;
      let upscaled = false;
      let preprocessingApplied = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let detections: any[] = [];
      let scaleBack = 1;
      let roiOffset: { x: number; y: number } | undefined;

      // Calculate ROI offset if enabled
      if (config.roi.enabled) {
        roiOffset = {
          x: config.roi.x * videoWidth,
          y: config.roi.y * videoHeight,
        };
      }

      // Use lower threshold for detection to get more raw faces
      const detectionThreshold = Math.max(config.sensitivity - 0.05, 0.15);
      
      // Always log detector config for debugging
      console.log(`[Detection] Config: detector=${config.detector}, ssdLoaded=${ssdLoaded}, sourceMode=${sourceMode}, isCCTV=${isCCTV}`);
      
      if (config.debugMode) {
        console.log(`[Detection] Full config: sensitivity=${config.sensitivity}, threshold=${detectionThreshold.toFixed(2)}, minScore=${config.minFaceScore}`);
      }

      // ========== PASS 1: Multi-scale detection for maximum coverage ==========
      const pass1Scales = isCCTV ? [320, 416, 512, 608] : [416, 512];
      const pass1Threshold = Math.max(detectionThreshold - 0.05, 0.1);
      
      // Determine if we're in dual mode (use both TinyFace AND SSD)
      const isDualMode = config.detector === 'dual' && ssdLoaded;
      const useSsdOnly = config.detector === 'ssd' && ssdLoaded;
      
      // Log the actual mode being used
      const modeLabel = isDualMode ? 'DUAL (Tiny+SSD)' : useSsdOnly ? 'SSD' : 'Tiny';
      console.log(`[Detection] Pass 1: ${modeLabel} mode, scales [${pass1Scales.join(', ')}] @ threshold ${pass1Threshold.toFixed(2)}`);
      
      // Try all scales in parallel for maximum detection
      const allPass1Detections = await Promise.all(
        pass1Scales.map(async (inputSize) => {
          try {
            if (useSsdOnly) {
              // SSD-only mode
              return await runSsdDetection(videoElement, pass1Threshold);
            } else {
              // TinyFace (default) - also used in dual mode
              return await runTinyDetection(videoElement, inputSize, pass1Threshold);
            }
          } catch {
            return [];
          }
        })
      );
      
      // In dual mode OR when SSD is available and not in tiny-only mode, also run SSD
      if (ssdLoaded && (isDualMode || config.detector !== 'tiny')) {
        try {
          const ssdResults = await runSsdDetection(videoElement, pass1Threshold);
          if (ssdResults.length > 0) {
            allPass1Detections.push(ssdResults);
            // Mark as dual or ssd based on mode
            detectorUsed = isDualMode ? 'ssd' : 'ssd'; // Will show 'dual' in debug via config.detector
          }
        } catch {
          // Ignore SSD errors
        }
      }
      
      // Update detectorUsed for dual mode display
      if (isDualMode) {
        detectorUsed = 'ssd'; // Internally track that SSD was used (for tracking IDs)
      }
      
      // Merge all detections and deduplicate by position
      const mergedPass1 = mergeDetections(allPass1Detections.flat(), videoWidth, videoHeight);
      detections = mergedPass1;
      
      // Log using the configured mode (not detectorUsed which only tracks individual detector calls)
      console.log(`[Detection] Pass 1 (${modeLabel}) found`, detections.length, 'faces from', allPass1Detections.flat().length, 'raw');

      // ========== PASS 2: CCTV rescue with aggressive preprocessing + upscale ==========
      // Only run if: CCTV mode, not tiny-only, and either few detections OR enhanced rescue enabled
      const enableEnhancedRescue = config.enableEnhancedRescue ?? false;
      const shouldRunPass2 = isCCTV && config.detector !== 'tiny' && (detections.length < 3 || enableEnhancedRescue);
      
      // Create a canvas for texture checking (used in processDetections)
      let textureCheckCanvas: HTMLCanvasElement | null = null;
      if (config.requireFaceTexture) {
        textureCheckCanvas = createProcessedCanvas(videoElement, { gamma: 1, contrast: 1, sharpen: 0, denoise: false }, 1);
      }
      
      if (shouldRunPass2) {
        passUsed = 2;
        console.log('[Detection] Pass 2: CCTV rescue with aggressive preprocessing...');
        
        // Create aggressively preprocessed and upscaled canvas
        const aggressivePreprocessing = {
          gamma: Math.max(config.preprocessing.gamma, 1.5),
          contrast: Math.max(config.preprocessing.contrast, 1.6),
          sharpen: Math.max(config.preprocessing.sharpen, 0.5),
          denoise: true,
        };
        
        const processedCanvas = createProcessedCanvas(
          videoElement,
          aggressivePreprocessing,
          config.upscale,
          config.roi.enabled ? config.roi : undefined
        );

        if (processedCanvas) {
          preprocessingApplied = true;
          upscaled = config.upscale > 1;
          scaleBack = config.upscale;

          // Use stricter threshold for rescue passes to reduce false positives
          const rescueThreshold = Math.max(config.sensitivity - 0.10, 0.12);
          const pass2Scales = [320, 416, 512, 608];
          
          const pass2Detections = await Promise.all(
            pass2Scales.map(async (inputSize) => {
              try {
                return await runTinyDetection(processedCanvas, inputSize, rescueThreshold);
              } catch {
                return [];
              }
            })
          );
          
          // Also try SSD on preprocessed
          if (ssdLoaded) {
            try {
              const ssdResults = await runSsdDetection(processedCanvas, rescueThreshold);
              if (ssdResults.length > 0) {
                pass2Detections.push(ssdResults);
                detectorUsed = 'ssd';
              }
            } catch {
              // Ignore
            }
          }
          
          const mergedPass2 = mergeDetections(pass2Detections.flat(), videoWidth, videoHeight);
          
          // Merge with Pass 1 results
          if (mergedPass2.length > 0) {
            detections = mergeDetections([...detections, ...mergedPass2], videoWidth, videoHeight);
          }
          
          console.log('[Detection] Pass 2 found', mergedPass2.length, 'additional faces, total:', detections.length);
        }
      }
      
      // ========== PASS 3: Ultra-low threshold scan for difficult cases ==========
      // Only run if: CCTV mode, not tiny-only, few detections, and enhanced rescue enabled
      const shouldRunPass3 = isCCTV && config.detector !== 'tiny' && detections.length < 5 && enableEnhancedRescue;
      
      if (shouldRunPass3) {
        console.log('[Detection] Pass 3: Ultra-low threshold scan...');

        const ultraLowThreshold = 0.08; // Slightly higher to reduce wall detections
        // STRICT: Pass 3 must respect the hard floor
        const hardFloor = config.hardMinFaceScore ?? 0.15;
        const pass3MinCandidateScore = Math.max(config.minFaceScore, hardFloor, 0.20);

        try {
          // Create maximally enhanced canvas
          const enhancedCanvas = createProcessedCanvas(
            videoElement,
            { gamma: 1.8, contrast: 2.0, sharpen: 0.6, denoise: true },
            2.5, // Higher upscale
            undefined
          );

          if (enhancedCanvas) {
            const pass3Detections = await Promise.all([
              runTinyDetection(enhancedCanvas, 608, ultraLowThreshold),
              ssdLoaded ? runSsdDetection(enhancedCanvas, ultraLowThreshold) : Promise.resolve([]),
            ]);

            // Keep only stronger candidates with valid size (reduces wall/sky false positives)
            const strongCandidates = pass3Detections
              .flat()
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((d: any) => {
                const det = d.detection ?? d;
                const score = (det.score ?? 0) as number;
                const box = det.box;
                
                // Must have valid score - STRICT
                if (score < pass3MinCandidateScore) return false;
                
                // Must have valid bounding box
                if (!box || !box.width || !box.height) return false;
                
                // Apply size constraints (scaled by 2.5 for enhanced canvas)
                const actualWidth = box.width / 2.5;
                const actualHeight = box.height / 2.5;
                
                // Reject if too small (likely noise) or too large (likely wall/background)
                if (actualWidth < config.minFaceSizePx || actualHeight < config.minFaceSizePx) return false;
                
                // Reject if face is larger than 30% of frame (stricter - likely false positive)
                const frameArea = videoWidth * videoHeight;
                const faceArea = actualWidth * actualHeight;
                if (faceArea > frameArea * 0.30) return false;
                
                // Validate aspect ratio
                const aspectRatio = actualWidth / actualHeight;
                if (aspectRatio < config.aspectRatioMin || aspectRatio > config.aspectRatioMax) return false;
                
                return true;
              });

            const mergedPass3 = mergeDetections(strongCandidates, videoWidth, videoHeight, 0.6, 0.9);

            if (mergedPass3.length > 0) {
              detections = mergeDetections([...detections, ...mergedPass3], videoWidth, videoHeight, 0.6, 0.9);
              scaleBack = 2.5;
              preprocessingApplied = true;
              upscaled = true;
            }

            console.log('[Detection] Pass 3 found', mergedPass3.length, 'additional faces, total:', detections.length);
          }
        } catch (err) {
          console.warn('[Detection] Pass 3 failed:', err);
        }
      }

      // Process and filter detections with texture checking and bias correction
      const { results, rawCount, filteredCount } = processDetections(
        detections,
        videoWidth,
        videoHeight,
        scaleBack,
        config,
        detectorUsed,
        roiOffset,
        config.debugMode,
        textureCheckCanvas
      );

      // Update debug info
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      // Calculate FPS
      const stats = statsRef.current;
      stats.frameCount++;
      const now = performance.now();
      if (now - stats.lastFrameTime >= 1000) {
        stats.lastFps = stats.frameCount * 1000 / (now - stats.lastFrameTime);
        stats.frameCount = 0;
        stats.lastFrameTime = now;
      }
      stats.lastLatency = latency;

      debugInfoRef.current = {
        fps: stats.lastFps,
        latencyMs: latency,
        backend: backend || tf.getBackend() || 'unknown',
        detectorUsed: config.detector,
        passUsed,
        rawDetections: rawCount,
        filteredDetections: filteredCount,
        trackedFaces: results.length,
        preprocessing: preprocessingApplied,
        upscaled,
        frameSize: { width: videoWidth, height: videoHeight },
        roiActive: config.roi.enabled,
      };

      return dedupeResultsByIoU(results);
    })();

    try {
      return await Promise.race([detectionPromise, timeoutPromise]);
    } catch (err) {
      console.error('[Detection] Error:', err);
      return [];
    } finally {
      inFlightRef.current = false;
    }
  }, [
    isModelLoaded,
    ssdLoaded,
    backend,
    options,
    getConfig,
    mergeDetections,
    dedupeResultsByIoU,
    runTinyDetection,
    runSsdDetection,
    createProcessedCanvas,
    processDetections,
  ]);

  // Get current debug info
  const getDebugInfo = useCallback((): DetectionDebugInfo | null => {
    return debugInfoRef.current;
  }, []);

  return {
    isModelLoaded,
    isLoading,
    loadingProgress,
    error,
    backend,
    ssdLoaded,
    detectFaces,
    getDebugInfo,
  };
};

// Reset function (kept for compatibility)
export const resetSimulatedPerson = () => {
  // no-op
};
