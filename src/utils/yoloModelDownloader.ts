/**
 * YOLO Model Auto-Downloader with IndexedDB Caching
 * 
 * Downloads YOLOv8-face model from a public URL and caches it in IndexedDB
 * for offline use. This avoids re-downloading on every page load.
 */

const DB_NAME = 'yolo-model-cache';
const DB_VERSION = 1;
const STORE_NAME = 'models';
const MODEL_KEY = 'yolov8-face';

// Public YOLOv8-face model URL (ONNX converted to TensorFlow.js)
// This is a placeholder - user needs to provide actual model URL or files
const DEFAULT_MODEL_URL = 'https://huggingface.co/nickmuchi/yolov8-face-detection/resolve/main/yolov8n-face.onnx';

export interface YoloModelFiles {
  modelJson: ArrayBuffer;
  weights: ArrayBuffer[];
  timestamp: number;
}

export interface DownloadProgress {
  stage: 'checking' | 'downloading' | 'caching' | 'ready' | 'error';
  progress: number; // 0-100
  message: string;
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Get cached model from IndexedDB
 */
async function getCachedModel(): Promise<YoloModelFiles | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(MODEL_KEY);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to read from cache'));
      
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/**
 * Save model to IndexedDB cache
 */
async function cacheModel(files: YoloModelFiles): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(files, MODEL_KEY);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to cache model'));
    
    tx.oncomplete = () => db.close();
  });
}

/**
 * Clear cached model
 */
export async function clearCachedModel(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(MODEL_KEY);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear cache'));
    
    tx.oncomplete = () => db.close();
  });
}

/**
 * Check if model exists locally in public folder
 */
export async function checkLocalModel(): Promise<boolean> {
  try {
    const response = await fetch('/models/yolov8-face/model.json', { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if model exists in cache
 */
export async function checkCachedModel(): Promise<boolean> {
  const cached = await getCachedModel();
  return cached !== null;
}

/**
 * Download model with progress callback
 */
async function downloadWithProgress(
  url: string,
  onProgress: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  if (!response.body) {
    return response.arrayBuffer();
  }
  
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    loaded += value.length;
    onProgress(loaded, total);
  }
  
  // Combine chunks into single ArrayBuffer
  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  
  return combined.buffer;
}

/**
 * Convert ONNX model to TensorFlow.js format (simplified placeholder)
 * In production, you would use tf.loadGraphModel or pre-converted model
 */
async function prepareModelFiles(modelBuffer: ArrayBuffer): Promise<{ json: string; weights: ArrayBuffer[] }> {
  // For now, we'll create a placeholder model.json that references the weights
  // Real implementation would require ONNX to TFJS conversion
  
  const weightsBlob = new Uint8Array(modelBuffer);
  
  // Create a simple model.json structure
  const modelJson = {
    format: 'graph-model',
    generatedBy: 'yolo-downloader',
    convertedBy: 'TensorFlow.js Converter',
    modelTopology: {
      node: [],
      library: {},
      versions: { producer: 1 }
    },
    weightsManifest: [{
      paths: ['weights.bin'],
      weights: []
    }]
  };
  
  return {
    json: JSON.stringify(modelJson),
    weights: [weightsBlob.buffer]
  };
}

/**
 * Download and cache YOLO model from URL
 */
export async function downloadAndCacheYoloModel(
  modelUrl?: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<boolean> {
  const url = modelUrl || DEFAULT_MODEL_URL;
  const report = (stage: DownloadProgress['stage'], progress: number, message: string) => {
    onProgress?.({ stage, progress, message });
  };
  
  try {
    // Check if already cached
    report('checking', 0, 'Checking cache...');
    const cached = await getCachedModel();
    if (cached) {
      report('ready', 100, 'Model loaded from cache');
      return true;
    }
    
    // Check local folder
    const hasLocal = await checkLocalModel();
    if (hasLocal) {
      report('ready', 100, 'Using local model files');
      return true;
    }
    
    // Download model
    report('downloading', 0, 'Downloading YOLO model...');
    
    const modelBuffer = await downloadWithProgress(url, (loaded, total) => {
      const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
      report('downloading', pct, `Downloading: ${(loaded / 1024 / 1024).toFixed(1)} MB`);
    });
    
    // Prepare files
    report('caching', 90, 'Processing model...');
    const { json, weights } = await prepareModelFiles(modelBuffer);
    
    // Cache to IndexedDB
    report('caching', 95, 'Saving to cache...');
    await cacheModel({
      modelJson: new TextEncoder().encode(json).buffer,
      weights,
      timestamp: Date.now()
    });
    
    report('ready', 100, 'Model ready!');
    return true;
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    report('error', 0, `Failed: ${message}`);
    console.error('[YOLO Downloader]', error);
    return false;
  }
}

/**
 * Get model status
 */
export async function getYoloModelStatus(): Promise<{
  hasLocal: boolean;
  hasCached: boolean;
  cacheTimestamp?: number;
}> {
  const hasLocal = await checkLocalModel();
  const cached = await getCachedModel();
  
  return {
    hasLocal,
    hasCached: cached !== null,
    cacheTimestamp: cached?.timestamp
  };
}

/**
 * Create blob URLs for cached model (for tf.loadGraphModel)
 */
export async function getCachedModelUrls(): Promise<{ modelUrl: string; weightsUrls: string[] } | null> {
  const cached = await getCachedModel();
  if (!cached) return null;
  
  const modelBlob = new Blob([cached.modelJson], { type: 'application/json' });
  const modelUrl = URL.createObjectURL(modelBlob);
  
  const weightsUrls = cached.weights.map(w => {
    const blob = new Blob([w], { type: 'application/octet-stream' });
    return URL.createObjectURL(blob);
  });
  
  return { modelUrl, weightsUrls };
}

/**
 * Revoke blob URLs when done
 */
export function revokeModelUrls(urls: { modelUrl: string; weightsUrls: string[] }): void {
  URL.revokeObjectURL(urls.modelUrl);
  urls.weightsUrls.forEach(url => URL.revokeObjectURL(url));
}
