/**
 * Extended types for CCTV-optimized face detection
 */

import { FaceBoundingBox, DetectionResult } from './ad';
import { PreprocessingOptions, ROIConfig } from '@/utils/imagePreprocessing';

// Temporal voting for stable gender/age classification
export interface DemographicVotes {
  male: number;
  female: number;
  kid: number;
  young: number;
  adult: number;
}

export interface TrackedFace {
  id: string;
  boundingBox: FaceBoundingBox;
  velocity: { vx: number; vy: number };
  confidence: number;
  faceScore: number;
  gender: 'male' | 'female';
  ageGroup: 'kid' | 'young' | 'adult';
  consecutiveHits: number;
  missedFrames: number;
  firstSeenAt: number;
  lastSeenAt: number;
  detectorUsed: 'tiny' | 'ssd';
  // Temporal stabilization votes
  genderVotes: { male: number; female: number };
  ageVotes: { kid: number; young: number; adult: number };
  stableGender: 'male' | 'female';
  stableAgeGroup: 'kid' | 'young' | 'adult';
  // User correction flag - when true, ignore AI updates
  isUserCorrected?: boolean;
}

export interface DetectionDebugInfo {
  fps: number;
  latencyMs: number;
  backend: string;
  detectorUsed: 'tiny' | 'ssd' | 'dual';
  passUsed: 1 | 2;
  rawDetections: number;
  filteredDetections: number;
  trackedFaces: number;
  preprocessing: boolean;
  upscaled: boolean;
  frameSize: { width: number; height: number };
  roiActive: boolean;
  // Hybrid detection additions
  yoloActive?: boolean;
  yoloDetections?: number;
  hybridMode?: 'fast' | 'accurate' | 'max';
}

export interface CCTVDetectionConfig {
  // Detection settings
  detector: 'tiny' | 'ssd' | 'dual';
  sensitivity: number;        // 0.2-0.6 (lower = more sensitive)

  // Preprocessing
  preprocessing: PreprocessingOptions;
  upscale: number;           // 1-2x

  // Filtering
  roi: ROIConfig;
  minFaceScore: number;      // 0.2-0.6
  /** Optional hard floor for the detector score to suppress false positives. */
  hardMinFaceScore?: number;
  minFaceSizePx: number;     // 20-60
  minFaceSizePercent: number; // 0.5-5% of frame
  aspectRatioMin: number;    // 0.5
  aspectRatioMax: number;    // 2.0

  // Tracking
  minConsecutiveFrames: number; // 2-5
  holdFrames: number;           // 2-8
  maxVelocityPx: number;        // Max movement between frames

  // Debug
  debugMode: boolean;
  
  // Additional settings from SettingsPanel (passed through)
  detectionMode?: 'fast' | 'accurate' | 'max';
  videoQuality?: 'hd' | 'lowQuality' | 'nightIR' | 'crowd';
  
  // Bias correction settings
  femaleBoostFactor?: number;
  enableHairHeuristics?: boolean;
  requireFaceTexture?: boolean;
  
  // Enhanced rescue passes (Pass 2/3) for difficult CCTV footage
  enableEnhancedRescue?: boolean;
}

export const DEFAULT_CCTV_CONFIG: CCTVDetectionConfig = {
  detector: 'dual',
  sensitivity: 0.15,  // Very low - catch everything
  preprocessing: { gamma: 1.4, contrast: 1.5, sharpen: 0.4, denoise: true },
  upscale: 2.0,       // Higher upscale for small faces
  roi: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
  minFaceScore: 0.1,  // Very permissive - let more through
  minFaceSizePx: 12,  // Detect tiny faces
  minFaceSizePercent: 0.05,  // Accept very small faces (0.05% of frame)
  aspectRatioMin: 0.25,  // Very wide range for angled/occluded faces
  aspectRatioMax: 4.0,
  minConsecutiveFrames: 2,  // Require 2 frames for stability (was 1)
  holdFrames: 8,
  maxVelocityPx: 250,
  debugMode: false,
};

export const DEFAULT_WEBCAM_CONFIG: CCTVDetectionConfig = {
  detector: 'tiny',
  sensitivity: 0.2,
  preprocessing: { gamma: 1.0, contrast: 1.0, sharpen: 0, denoise: false },
  upscale: 1,
  roi: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
  minFaceScore: 0.15,
  minFaceSizePx: 12,
  minFaceSizePercent: 0.1,
  aspectRatioMin: 0.25,
  aspectRatioMax: 4.0,
  minConsecutiveFrames: 2,  // Require 2 frames for stability (was 1)
  holdFrames: 3,
  maxVelocityPx: 250,
  debugMode: false,
};

// Hybrid detection configuration (YOLO + face-api.js)
export interface HybridDetectionConfig {
  mode: 'fast' | 'accurate' | 'max';
  sensitivity: number;
  preprocessing: PreprocessingOptions;
  debugMode: boolean;
}

export const DEFAULT_HYBRID_CONFIG: HybridDetectionConfig = {
  mode: 'accurate',
  sensitivity: 0.3,
  preprocessing: { gamma: 1.3, contrast: 1.4, sharpen: 0.4, denoise: true },
  debugMode: false,
};

// Capture session aggregation types
export interface ViewerAggregate {
  trackingId: string;
  genderVotes: { male: number; female: number };
  ageVotes: { kid: number; young: number; adult: number };
  seenFrames: number;
  bestFaceScore: number;
  bestConfidence: number;
  finalGender: 'male' | 'female';
  finalAgeGroup: 'kid' | 'young' | 'adult';
}

export interface CaptureSessionSummary {
  startedAt: number;
  endedAt?: number;
  totalFrames: number;
  uniqueViewers: number;
  demographics: {
    male: number;
    female: number;
    kid: number;
    young: number;
    adult: number;
  };
  viewers: ViewerAggregate[];
}

export function toDetectionResult(tracked: TrackedFace): DetectionResult {
  return {
    gender: tracked.stableGender,  // Use stable gender from votes
    ageGroup: tracked.stableAgeGroup,  // Use stable age from votes
    confidence: tracked.confidence,
    faceScore: tracked.faceScore,
    boundingBox: tracked.boundingBox,
    trackingId: tracked.id,
    lastSeen: tracked.lastSeenAt,
  };
}

// Helper to determine stable gender/age from votes
//
// NOTE: We intentionally avoid defaulting to 'male'/'young' when evidence is weak,
// because that biases results in low-quality CCTV.
export function getStableGender(
  votes: { male: number; female: number },
  previous: 'male' | 'female' = 'male',
  opts: { minTotal?: number; minMargin?: number } = {}
): 'male' | 'female' {
  const total = votes.male + votes.female;
  const minTotal = opts.minTotal ?? 0.9;
  const minMargin = opts.minMargin ?? 0.25;

  if (total < minTotal) return previous;

  const diff = Math.abs(votes.female - votes.male);
  if (diff < minMargin) return previous;

  return votes.female > votes.male ? 'female' : 'male';
}

export function getStableAgeGroup(
  votes: { kid: number; young: number; adult: number },
  previous: 'kid' | 'young' | 'adult' = 'young',
  opts: { minTotal?: number; minMargin?: number } = {}
): 'kid' | 'young' | 'adult' {
  const total = votes.kid + votes.young + votes.adult;
  const minTotal = opts.minTotal ?? 0.9;
  const minMargin = opts.minMargin ?? 0.25;

  if (total < minTotal) return previous;

  // winner-take-most with margin; otherwise keep previous
  const entries = [
    { k: 'kid' as const, v: votes.kid },
    { k: 'young' as const, v: votes.young },
    { k: 'adult' as const, v: votes.adult },
  ].sort((a, b) => b.v - a.v);

  if (entries[0].v - entries[1].v < minMargin) return previous;
  return entries[0].k;
}
