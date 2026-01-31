/**
 * YOLOv8-Face TensorFlow.js Detection Hook
 * Optimized for detecting small and distant faces in CCTV footage
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

export interface YoloDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface YoloModelState {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  model: tf.GraphModel | null;
}

// NMS (Non-Maximum Suppression) implementation
function nonMaxSuppression(
  boxes: YoloDetection[],
  iouThreshold: number = 0.5
): YoloDetection[] {
  if (boxes.length === 0) return [];
  
  // Sort by confidence (descending)
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const selected: YoloDetection[] = [];
  const active = new Array(sorted.length).fill(true);
  
  for (let i = 0; i < sorted.length; i++) {
    if (!active[i]) continue;
    
    selected.push(sorted[i]);
    
    for (let j = i + 1; j < sorted.length; j++) {
      if (!active[j]) continue;
      
      const iou = calculateIoU(sorted[i], sorted[j]);
      if (iou > iouThreshold) {
        active[j] = false;
      }
    }
  }
  
  return selected;
}

function calculateIoU(a: YoloDetection, b: YoloDetection): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;
  
  return union > 0 ? intersection / union : 0;
}

// Preprocess image for YOLO input
async function preprocessImage(
  source: HTMLVideoElement | HTMLCanvasElement,
  targetSize: number
): Promise<{ tensor: tf.Tensor4D; scale: { x: number; y: number } }> {
  const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  
  // Create canvas at target size
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d')!;
  
  // Calculate scaling to maintain aspect ratio (letterboxing)
  const scale = Math.min(targetSize / sourceWidth, targetSize / sourceHeight);
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const offsetX = (targetSize - scaledWidth) / 2;
  const offsetY = (targetSize - scaledHeight) / 2;
  
  // Fill with gray (letterbox color)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, targetSize, targetSize);
  
  // Draw image centered
  ctx.drawImage(source, offsetX, offsetY, scaledWidth, scaledHeight);
  
  // Convert to tensor and normalize to 0-1
  const tensor = tf.browser.fromPixels(canvas)
    .toFloat()
    .div(255.0)
    .expandDims(0) as tf.Tensor4D;
  
  return {
    tensor,
    scale: {
      x: sourceWidth / scaledWidth,
      y: sourceHeight / scaledHeight,
    },
  };
}

// Parse YOLO output format
function parseYoloOutput(
  output: tf.Tensor,
  inputSize: number,
  scale: { x: number; y: number },
  confidenceThreshold: number,
  originalWidth: number,
  originalHeight: number
): YoloDetection[] {
  const data = output.dataSync();
  const detections: YoloDetection[] = [];
  
  // YOLOv8 output format: [1, 5, 8400] or [1, 8400, 5]
  // 5 values: x_center, y_center, width, height, confidence
  const numDetections = output.shape[2] || output.shape[1];
  const hasConfidenceFirst = output.shape[1] === 5;
  
  const offsetX = (inputSize - originalWidth * (inputSize / Math.max(originalWidth, originalHeight))) / 2;
  const offsetY = (inputSize - originalHeight * (inputSize / Math.max(originalWidth, originalHeight))) / 2;
  
  for (let i = 0; i < (numDetections || 8400); i++) {
    let x_center: number, y_center: number, w: number, h: number, conf: number;
    
    if (hasConfidenceFirst) {
      // Shape [1, 5, N]
      x_center = data[i];
      y_center = data[numDetections + i];
      w = data[2 * numDetections + i];
      h = data[3 * numDetections + i];
      conf = data[4 * numDetections + i];
    } else {
      // Shape [1, N, 5]
      const offset = i * 5;
      x_center = data[offset];
      y_center = data[offset + 1];
      w = data[offset + 2];
      h = data[offset + 3];
      conf = data[offset + 4];
    }
    
    if (conf >= confidenceThreshold) {
      // Convert from letterbox coordinates back to original
      const x = ((x_center - offsetX) * scale.x) - (w * scale.x / 2);
      const y = ((y_center - offsetY) * scale.y) - (h * scale.y / 2);
      
      const detection: YoloDetection = {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: w * scale.x,
        height: h * scale.y,
        confidence: conf,
      };
      
      // Filter out invalid detections
      if (detection.width > 10 && detection.height > 10) {
        detections.push(detection);
      }
    }
  }
  
  return detections;
}

export const useYoloFaceDetection = () => {
  const [state, setState] = useState<YoloModelState>({
    isLoaded: false,
    isLoading: false,
    error: null,
    model: null,
  });
  
  const modelRef = useRef<tf.GraphModel | null>(null);
  const loadingRef = useRef(false);
  
  // Load YOLO model
  const loadModel = useCallback(async () => {
    if (loadingRef.current || modelRef.current) return;
    loadingRef.current = true;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('[YOLO] Loading YOLOv8-face model...');
      
      // Try to load from public/models/yolov8-face
      const model = await tf.loadGraphModel('/models/yolov8-face/model.json');
      
      modelRef.current = model;
      setState({
        isLoaded: true,
        isLoading: false,
        error: null,
        model,
      });
      
      console.log('[YOLO] ✅ Model loaded successfully');
    } catch (err) {
      console.warn('[YOLO] ⚠️ Model not available:', err);
      setState({
        isLoaded: false,
        isLoading: false,
        error: 'YOLO model not available - using face-api.js only',
        model: null,
      });
    } finally {
      loadingRef.current = false;
    }
  }, []);
  
  // Auto-load on mount
  useEffect(() => {
    loadModel();
  }, [loadModel]);
  
  // Detect faces using YOLO
  const detectFaces = useCallback(async (
    source: HTMLVideoElement | HTMLCanvasElement,
    options: {
      inputSize?: 320 | 416 | 640;
      confidenceThreshold?: number;
      iouThreshold?: number;
    } = {}
  ): Promise<YoloDetection[]> => {
    const model = modelRef.current;
    if (!model) return [];
    
    const {
      inputSize = 416,
      confidenceThreshold = 0.25,
      iouThreshold = 0.5,
    } = options;
    
    const sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
    
    if (sourceWidth === 0 || sourceHeight === 0) return [];
    
    try {
      // Preprocess image
      const { tensor, scale } = await preprocessImage(source, inputSize);
      
      // Run inference
      const output = await model.predict(tensor) as tf.Tensor;
      
      // Parse output
      const detections = parseYoloOutput(
        output,
        inputSize,
        scale,
        confidenceThreshold,
        sourceWidth,
        sourceHeight
      );
      
      // Cleanup tensors
      tensor.dispose();
      output.dispose();
      
      // Apply NMS
      const filtered = nonMaxSuppression(detections, iouThreshold);
      
      return filtered;
    } catch (err) {
      console.error('[YOLO] Detection error:', err);
      return [];
    }
  }, []);
  
  // Multi-scale detection for better small face coverage
  const detectMultiScale = useCallback(async (
    source: HTMLVideoElement | HTMLCanvasElement,
    options: {
      confidenceThreshold?: number;
      iouThreshold?: number;
    } = {}
  ): Promise<YoloDetection[]> => {
    const {
      confidenceThreshold = 0.25,
      iouThreshold = 0.45,
    } = options;
    
    // Run detection at multiple scales
    const [small, medium, large] = await Promise.all([
      detectFaces(source, { inputSize: 320, confidenceThreshold, iouThreshold }),
      detectFaces(source, { inputSize: 416, confidenceThreshold, iouThreshold }),
      detectFaces(source, { inputSize: 640, confidenceThreshold, iouThreshold }),
    ]);
    
    // Merge all detections
    const all = [...small, ...medium, ...large];
    
    // Apply final NMS across all scales
    return nonMaxSuppression(all, iouThreshold);
  }, [detectFaces]);
  
  return {
    isLoaded: state.isLoaded,
    isLoading: state.isLoading,
    error: state.error,
    detectFaces,
    detectMultiScale,
  };
};
