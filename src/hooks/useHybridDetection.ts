/**
 * Hybrid Detection Pipeline
 * Combines YOLO face detection with face-api.js age/gender classification
 * Optimized for CCTV footage with multiple people
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';
import { DetectionResult, FaceBoundingBox } from '@/types/ad';
import { DetectionDebugInfo, HybridDetectionConfig, DEFAULT_HYBRID_CONFIG, TrackedFace } from '@/types/detection';
import { useYoloFaceDetection, YoloDetection } from './useYoloFaceDetection';
import { createPreprocessedCanvas, PreprocessingOptions } from '@/utils/imagePreprocessing';

const MODEL_URL = '/models';
const DETECTION_TIMEOUT = 15000;

interface DetectionStats {
  lastFps: number;
  lastLatency: number;
  frameCount: number;
  lastFrameTime: number;
  yoloDetections: number;
  faceApiDetections: number;
}

export interface HybridDetectionOptions {
  mode: 'fast' | 'accurate' | 'max';
  preprocessing?: PreprocessingOptions;
  debugMode?: boolean;
}

export const useHybridDetection = (
  sensitivity: number = 0.35,
  options?: HybridDetectionOptions
) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<string>('');
  
  const loadingRef = useRef(false);
  const inFlightRef = useRef(false);
  const statsRef = useRef<DetectionStats>({
    lastFps: 0,
    lastLatency: 0,
    frameCount: 0,
    lastFrameTime: 0,
    yoloDetections: 0,
    faceApiDetections: 0,
  });
  const debugInfoRef = useRef<DetectionDebugInfo | null>(null);
  
  // YOLO face detection
  const {
    isLoaded: yoloLoaded,
    isLoading: yoloLoading,
    error: yoloError,
    detectFaces: yoloDetect,
    detectMultiScale: yoloDetectMultiScale,
  } = useYoloFaceDetection();
  
  // Get effective config
  const config = useMemo((): HybridDetectionConfig => {
    const mode = options?.mode ?? 'accurate';
    return {
      ...DEFAULT_HYBRID_CONFIG,
      mode,
      sensitivity,
      preprocessing: options?.preprocessing ?? DEFAULT_HYBRID_CONFIG.preprocessing,
      debugMode: options?.debugMode ?? false,
    };
  }, [sensitivity, options]);
  
  // Initialize face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      
      try {
        setIsLoading(true);
        setLoadingProgress(10);
        
        // Initialize TensorFlow backend
        console.log('[Hybrid] Initializing TensorFlow...');
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          console.log('[Hybrid] ✅ Using WebGL backend');
        } catch {
          await tf.setBackend('cpu');
          await tf.ready();
          console.log('[Hybrid] ⚠️ Using CPU backend');
        }
        
        setBackend(tf.getBackend() || 'unknown');
        setLoadingProgress(30);
        
        // Load age/gender model (required for classification)
        console.log('[Hybrid] Loading face-api.js models...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        
        setLoadingProgress(70);
        
        // Try to load SSD for fallback
        try {
          await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
          console.log('[Hybrid] ✅ SSD Mobilenet loaded');
        } catch {
          console.log('[Hybrid] ⚠️ SSD not available');
        }
        
        setLoadingProgress(100);
        setIsModelLoaded(true);
        setError(null);
        
        console.log('[Hybrid] ✅ All models loaded');
      } catch (err) {
        console.error('[Hybrid] ❌ Model loading failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadModels();
  }, []);
  
  // Classify a single face crop using face-api.js
  const classifyFace = useCallback(async (
    faceCanvas: HTMLCanvasElement
  ): Promise<{ gender: 'male' | 'female'; ageGroup: 'kid' | 'young' | 'adult'; confidence: number } | null> => {
    try {
      // Run age/gender detection on the face crop
      const detection = await faceapi
        .detectSingleFace(faceCanvas, new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.1, // Very low threshold since we already have a face
        }))
        .withAgeAndGender();
      
      if (detection) {
        const age = Math.round(detection.age);
        let ageGroup: 'kid' | 'young' | 'adult';
        if (age < 13) ageGroup = 'kid';
        else if (age < 35) ageGroup = 'young';
        else ageGroup = 'adult';
        
        return {
          gender: detection.gender as 'male' | 'female',
          ageGroup,
          confidence: detection.genderProbability,
        };
      }
      
      // Fallback: try with SSD if TinyFace failed
      const ssdDetection = await faceapi
        .detectSingleFace(faceCanvas, new faceapi.SsdMobilenetv1Options({
          minConfidence: 0.1,
        }))
        .withAgeAndGender();
      
      if (ssdDetection) {
        const age = Math.round(ssdDetection.age);
        let ageGroup: 'kid' | 'young' | 'adult';
        if (age < 13) ageGroup = 'kid';
        else if (age < 35) ageGroup = 'young';
        else ageGroup = 'adult';
        
        return {
          gender: ssdDetection.gender as 'male' | 'female',
          ageGroup,
          confidence: ssdDetection.genderProbability,
        };
      }
      
      return null;
    } catch (err) {
      console.warn('[Hybrid] Face classification failed:', err);
      return null;
    }
  }, []);
  
  // Create upscaled face crop from detection
  const createFaceCrop = useCallback((
    source: HTMLVideoElement | HTMLCanvasElement,
    detection: YoloDetection,
    upscaleFactor: number = 2
  ): HTMLCanvasElement | null => {
    const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
    
    // Expand bounding box by 20% for better classification
    const padding = 0.2;
    const x = Math.max(0, detection.x - detection.width * padding);
    const y = Math.max(0, detection.y - detection.height * padding);
    const width = Math.min(detection.width * (1 + padding * 2), sourceWidth - x);
    const height = Math.min(detection.height * (1 + padding * 2), sourceHeight - y);
    
    // Create upscaled canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * upscaleFactor);
    canvas.height = Math.round(height * upscaleFactor);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, x, y, width, height, 0, 0, canvas.width, canvas.height);
    
    return canvas;
  }, []);
  
  // Run face-api.js detection as fallback
  const runFaceApiDetection = useCallback(async (
    source: HTMLVideoElement | HTMLCanvasElement,
    threshold: number
  ): Promise<DetectionResult[]> => {
    try {
      const detections = await faceapi
        .detectAllFaces(source, new faceapi.TinyFaceDetectorOptions({
          inputSize: 512,
          scoreThreshold: threshold,
        }))
        .withAgeAndGender();
      
      return detections.map(det => {
        const box = det.detection.box;
        const age = Math.round(det.age);
        let ageGroup: 'kid' | 'young' | 'adult';
        if (age < 13) ageGroup = 'kid';
        else if (age < 35) ageGroup = 'young';
        else ageGroup = 'adult';
        
        return {
          gender: det.gender as 'male' | 'female',
          ageGroup,
          confidence: det.genderProbability,
          faceScore: det.detection.score,
          boundingBox: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          },
          trackingId: `faceapi_${Math.round(box.x)}_${Math.round(box.y)}`,
          lastSeen: Date.now(),
        };
      });
    } catch {
      return [];
    }
  }, []);
  
  // Main hybrid detection function
  const detectFaces = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<DetectionResult[]> => {
    if (inFlightRef.current) return [];
    if (!videoElement || videoElement.readyState < 2 || !isModelLoaded) return [];
    
    inFlightRef.current = true;
    const startTime = performance.now();
    
    const timeoutPromise = new Promise<DetectionResult[]>((_, reject) => {
      setTimeout(() => reject(new Error('Detection timeout')), DETECTION_TIMEOUT);
    });
    
    const detectionPromise = (async (): Promise<DetectionResult[]> => {
      const videoWidth = videoElement.videoWidth || 640;
      const videoHeight = videoElement.videoHeight || 480;
      
      let yoloDetections: YoloDetection[] = [];
      let faceApiResults: DetectionResult[] = [];
      let detectorUsed = 'faceapi' as 'yolo' | 'faceapi' | 'hybrid';
      
      // Apply preprocessing if configured
      let processedSource: HTMLVideoElement | HTMLCanvasElement = videoElement;
      const hasPreprocessing = config.preprocessing.gamma !== 1 || 
                               config.preprocessing.contrast !== 1 || 
                               config.preprocessing.sharpen > 0;
      
      if (hasPreprocessing) {
        const preprocessed = createPreprocessedCanvas(
          videoElement,
          config.preprocessing,
          1.0
        );
        if (preprocessed) {
          processedSource = preprocessed;
        }
      }
      
      // Stage 1: YOLO face detection (if available)
      if (yoloLoaded && config.mode !== 'fast') {
        try {
          const yoloThreshold = Math.max(config.sensitivity - 0.1, 0.15);
          
          if (config.mode === 'max') {
            // Multi-scale detection for maximum accuracy
            yoloDetections = await yoloDetectMultiScale(processedSource, {
              confidenceThreshold: yoloThreshold,
              iouThreshold: 0.45,
            });
          } else {
            // Single-scale detection
            yoloDetections = await yoloDetect(processedSource, {
              inputSize: 416,
              confidenceThreshold: yoloThreshold,
              iouThreshold: 0.5,
            });
          }
          
          if (config.debugMode) {
            console.log(`[Hybrid] YOLO detected ${yoloDetections.length} faces`);
          }
        } catch (err) {
          console.warn('[Hybrid] YOLO detection failed:', err);
        }
      }
      
      // Stage 2: Classify each YOLO detection with face-api.js
      const hybridResults: DetectionResult[] = [];
      
      if (yoloDetections.length > 0) {
        detectorUsed = 'hybrid';
        
        // Process faces in parallel (limit to 10 for performance)
        const facesToProcess = yoloDetections.slice(0, 10);
        
        await Promise.all(facesToProcess.map(async (detection) => {
          const faceCrop = createFaceCrop(processedSource, detection, 2);
          if (!faceCrop) {
            // Use YOLO detection without classification
            hybridResults.push({
              gender: 'male', // Default - will be updated by tracking
              ageGroup: 'adult',
              confidence: 0.5,
              faceScore: detection.confidence,
              boundingBox: {
                x: detection.x,
                y: detection.y,
                width: detection.width,
                height: detection.height,
              },
              trackingId: `yolo_${Math.round(detection.x)}_${Math.round(detection.y)}`,
              lastSeen: Date.now(),
            });
            return;
          }
          
          const classification = await classifyFace(faceCrop);
          
          hybridResults.push({
            gender: classification?.gender ?? 'male',
            ageGroup: classification?.ageGroup ?? 'adult',
            confidence: classification?.confidence ?? 0.5,
            faceScore: detection.confidence,
            boundingBox: {
              x: detection.x,
              y: detection.y,
              width: detection.width,
              height: detection.height,
            },
            trackingId: `hybrid_${Math.round(detection.x)}_${Math.round(detection.y)}`,
            lastSeen: Date.now(),
          });
        }));
      }
      
      // Stage 3: Fallback to face-api.js if YOLO found nothing
      if (hybridResults.length === 0) {
        const threshold = Math.max(config.sensitivity - 0.05, 0.2);
        faceApiResults = await runFaceApiDetection(processedSource, threshold);
        
        if (config.debugMode) {
          console.log(`[Hybrid] face-api.js detected ${faceApiResults.length} faces`);
        }
      }
      
      // Merge results
      const allResults = hybridResults.length > 0 ? hybridResults : faceApiResults;
      
      // Update stats
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      const stats = statsRef.current;
      stats.frameCount++;
      stats.yoloDetections = yoloDetections.length;
      stats.faceApiDetections = faceApiResults.length;
      
      const now = performance.now();
      if (now - stats.lastFrameTime >= 1000) {
        stats.lastFps = stats.frameCount * 1000 / (now - stats.lastFrameTime);
        stats.frameCount = 0;
        stats.lastFrameTime = now;
      }
      stats.lastLatency = latency;
      
      // Update debug info
      const detectorType = detectorUsed === 'hybrid' ? 'dual' : (detectorUsed === 'yolo' ? 'ssd' : 'tiny');
      debugInfoRef.current = {
        fps: stats.lastFps,
        latencyMs: latency,
        backend: backend || tf.getBackend() || 'unknown',
        detectorUsed: detectorType as 'tiny' | 'ssd' | 'dual',
        passUsed: 1,
        rawDetections: yoloDetections.length + faceApiResults.length,
        filteredDetections: allResults.length,
        trackedFaces: allResults.length,
        preprocessing: hasPreprocessing,
        upscaled: false,
        frameSize: { width: videoWidth, height: videoHeight },
        roiActive: false,
        yoloActive: yoloLoaded,
        yoloDetections: yoloDetections.length,
        hybridMode: config.mode,
      };
      
      return allResults;
    })();
    
    try {
      return await Promise.race([detectionPromise, timeoutPromise]);
    } catch (err) {
      console.error('[Hybrid] Detection error:', err);
      return [];
    } finally {
      inFlightRef.current = false;
    }
  }, [
    isModelLoaded,
    yoloLoaded,
    yoloDetect,
    yoloDetectMultiScale,
    classifyFace,
    createFaceCrop,
    runFaceApiDetection,
    config,
    backend,
  ]);
  
  // Get current debug info
  const getDebugInfo = useCallback((): DetectionDebugInfo | null => {
    return debugInfoRef.current;
  }, []);
  
  return {
    isModelLoaded: isModelLoaded && !yoloLoading,
    isLoading: isLoading || yoloLoading,
    loadingProgress: yoloLoading ? 80 : loadingProgress,
    error: error || yoloError,
    backend,
    yoloLoaded,
    detectFaces,
    getDebugInfo,
  };
};
