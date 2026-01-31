/**
 * Image preprocessing utilities for CCTV footage enhancement
 * Improves face detection accuracy in challenging conditions
 */

export interface PreprocessingOptions {
  gamma: number;        // 0.5-2.0 (1.0 = no change)
  contrast: number;     // 0.5-2.0 (1.0 = no change)
  sharpen: number;      // 0-1.0 (0 = off, 1 = max)
  denoise: boolean;     // Simple blur to reduce noise
}

export interface ROIConfig {
  enabled: boolean;
  x: number;      // 0-1 percentage
  y: number;      // 0-1 percentage
  width: number;  // 0-1 percentage
  height: number; // 0-1 percentage
}

export interface CCTVSettings {
  enabled: boolean;
  preprocessing: PreprocessingOptions;
  roi: ROIConfig;
  detector: 'tiny' | 'ssd' | 'dual';
  minConsecutiveFrames: number;
  holdFrames: number;
  debugMode: boolean;
}

export const CCTV_PRESETS: Record<string, PreprocessingOptions> = {
  none: { gamma: 1.0, contrast: 1.0, sharpen: 0, denoise: false },
  indoor: { gamma: 1.2, contrast: 1.3, sharpen: 0.3, denoise: false },
  outdoor: { gamma: 1.0, contrast: 1.1, sharpen: 0.2, denoise: false },
  nightIR: { gamma: 1.5, contrast: 1.5, sharpen: 0.4, denoise: true },
  lowLight: { gamma: 1.8, contrast: 1.4, sharpen: 0.5, denoise: true },
  // Low quality CCTV preset - aggressive enhancement for maximum face detection
  lowQuality: { gamma: 1.4, contrast: 1.5, sharpen: 0.5, denoise: true },
  // Crowd detection preset - balanced for multiple faces
  crowd: { gamma: 1.3, contrast: 1.4, sharpen: 0.4, denoise: true },
};

export const DEFAULT_CCTV_SETTINGS: CCTVSettings = {
  enabled: false,
  preprocessing: CCTV_PRESETS.indoor,
  roi: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
  detector: 'dual',
  minConsecutiveFrames: 2,
  holdFrames: 3,
  debugMode: false,
};

/**
 * Apply gamma correction to image data
 */
function applyGamma(data: Uint8ClampedArray, gamma: number): void {
  if (gamma === 1.0) return;
  
  const gammaLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    gammaLUT[i] = Math.min(255, Math.max(0, Math.round(255 * Math.pow(i / 255, 1 / gamma))));
  }
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = gammaLUT[data[i]];
    data[i + 1] = gammaLUT[data[i + 1]];
    data[i + 2] = gammaLUT[data[i + 2]];
  }
}

/**
 * Apply contrast adjustment to image data
 */
function applyContrast(data: Uint8ClampedArray, contrast: number): void {
  if (contrast === 1.0) return;
  
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, Math.round(factor * (data[i] - 128) + 128)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(factor * (data[i + 1] - 128) + 128)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(factor * (data[i + 2] - 128) + 128)));
  }
}

/**
 * Apply sharpening using a convolution kernel
 */
function applySharpen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number
): void {
  if (strength === 0) return;
  
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const output = new Uint8ClampedArray(data);
  
  // Sharpen kernel
  const kernel = [
    0, -strength, 0,
    -strength, 1 + 4 * strength, -strength,
    0, -strength, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            val += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        output[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, Math.round(val)));
      }
    }
  }
  
  imageData.data.set(output);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply simple box blur for denoising
 */
function applyDenoise(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const output = new Uint8ClampedArray(data);
  
  // 3x3 box blur
  const kernelSize = 3;
  const half = Math.floor(kernelSize / 2);
  const divisor = kernelSize * kernelSize;
  
  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            sum += data[((y + ky) * width + (x + kx)) * 4 + c];
          }
        }
        output[(y * width + x) * 4 + c] = Math.round(sum / divisor);
      }
    }
  }
  
  imageData.data.set(output);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply all preprocessing to a canvas context
 */
export function applyPreprocessing(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: PreprocessingOptions
): void {
  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  
  // Apply gamma correction
  applyGamma(imageData.data, options.gamma);
  
  // Apply contrast
  applyContrast(imageData.data, options.contrast);
  
  // Put back the modified data
  ctx.putImageData(imageData, 0, 0);
  
  // Apply denoise first (reduces noise before sharpening)
  if (options.denoise) {
    applyDenoise(ctx, width, height);
  }
  
  // Apply sharpening (after denoise to avoid amplifying noise)
  applySharpen(ctx, width, height, options.sharpen);
}

/**
 * Create a preprocessed canvas from video element
 */
export function createPreprocessedCanvas(
  videoElement: HTMLVideoElement,
  options: PreprocessingOptions,
  scale: number = 1,
  roi?: ROIConfig
): HTMLCanvasElement | null {
  const videoWidth = videoElement.videoWidth || 640;
  const videoHeight = videoElement.videoHeight || 480;
  
  // Calculate source region (ROI or full frame)
  let srcX = 0, srcY = 0, srcWidth = videoWidth, srcHeight = videoHeight;
  if (roi?.enabled) {
    srcX = Math.round(roi.x * videoWidth);
    srcY = Math.round(roi.y * videoHeight);
    srcWidth = Math.round(roi.width * videoWidth);
    srcHeight = Math.round(roi.height * videoHeight);
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(srcWidth * scale);
  canvas.height = Math.round(srcHeight * scale);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // Draw video frame (potentially cropped by ROI)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    videoElement,
    srcX, srcY, srcWidth, srcHeight,
    0, 0, canvas.width, canvas.height
  );
  
  // Apply preprocessing
  const hasPreprocessing = options.gamma !== 1 || options.contrast !== 1 || 
                           options.sharpen > 0 || options.denoise;
  if (hasPreprocessing) {
    applyPreprocessing(ctx, canvas.width, canvas.height, options);
  }
  
  return canvas;
}

/**
 * Get preprocessing preset by name
 */
export function getPreset(name: string): PreprocessingOptions {
  return CCTV_PRESETS[name] || CCTV_PRESETS.none;
}
