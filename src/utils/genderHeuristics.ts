/**
 * Gender Heuristics Utilities
 * 
 * Secondary gender signals to reduce male bias in face-api.js
 * Uses face geometry analysis and hair region detection.
 */

import { FaceBoundingBox } from '@/types/ad';

export interface GenderHeuristicResult {
  suggestedGender: 'male' | 'female' | 'uncertain';
  hairScore: number;        // 0-1: 0 = short/no hair, 1 = long hair
  jawScore: number;         // 0-1: 0 = angular (male), 1 = rounded (female)
  overallFemaleScore: number; // Combined female probability adjustment
  confidence: number;       // How confident the heuristic is
}

/**
 * Analyze hair region above the face bounding box
 * Long hair extending below face or to sides increases female probability
 */
export function analyzeHairRegion(
  canvas: HTMLCanvasElement,
  boundingBox: FaceBoundingBox,
  debugMode: boolean = false
): number {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0.5;

    // Define hair region: above face and slightly to sides
    const hairRegionHeight = boundingBox.height * 0.4;
    const hairRegionWidth = boundingBox.width * 1.4;
    const hairX = Math.max(0, boundingBox.x - boundingBox.width * 0.2);
    const hairY = Math.max(0, boundingBox.y - hairRegionHeight);
    
    // Also check sides of face for long hair
    const leftSideX = Math.max(0, boundingBox.x - boundingBox.width * 0.5);
    const rightSideX = Math.min(canvas.width - 10, boundingBox.x + boundingBox.width);
    const sideHeight = boundingBox.height * 0.8;
    const sideWidth = boundingBox.width * 0.4;
    
    // Sample pixels in hair regions
    let darkPixelsAbove = 0;
    let darkPixelsLeft = 0;
    let darkPixelsRight = 0;
    let totalSampled = 0;
    
    // Sample region above head
    const aboveData = ctx.getImageData(
      Math.round(hairX), 
      Math.round(hairY), 
      Math.round(Math.min(hairRegionWidth, canvas.width - hairX)),
      Math.round(Math.min(hairRegionHeight, canvas.height - hairY))
    ).data;
    
    for (let i = 0; i < aboveData.length; i += 16) { // Sample every 4th pixel
      const r = aboveData[i];
      const g = aboveData[i + 1];
      const b = aboveData[i + 2];
      const brightness = (r + g + b) / 3;
      
      // Hair is typically darker than background
      if (brightness < 120) darkPixelsAbove++;
      totalSampled++;
    }
    
    // Sample left side (for long hair)
    if (leftSideX >= 0 && sideWidth > 5) {
      const leftData = ctx.getImageData(
        Math.round(leftSideX),
        Math.round(boundingBox.y),
        Math.round(Math.min(sideWidth, boundingBox.x)),
        Math.round(Math.min(sideHeight, canvas.height - boundingBox.y))
      ).data;
      
      for (let i = 0; i < leftData.length; i += 16) {
        const brightness = (leftData[i] + leftData[i + 1] + leftData[i + 2]) / 3;
        if (brightness < 120) darkPixelsLeft++;
      }
    }
    
    // Sample right side
    if (rightSideX < canvas.width && sideWidth > 5) {
      const rightData = ctx.getImageData(
        Math.round(rightSideX),
        Math.round(boundingBox.y),
        Math.round(Math.min(sideWidth, canvas.width - rightSideX)),
        Math.round(Math.min(sideHeight, canvas.height - boundingBox.y))
      ).data;
      
      for (let i = 0; i < rightData.length; i += 16) {
        const brightness = (rightData[i] + rightData[i + 1] + rightData[i + 2]) / 3;
        if (brightness < 120) darkPixelsRight++;
      }
    }
    
    // Calculate hair score
    const aboveRatio = totalSampled > 0 ? darkPixelsAbove / totalSampled : 0;
    const sideRatio = (darkPixelsLeft + darkPixelsRight) / Math.max(1, totalSampled * 0.5);
    
    // Long hair = high side ratio, moderate/high above ratio
    const hairScore = Math.min(1, aboveRatio * 0.4 + sideRatio * 0.6 + 0.1);
    
    if (debugMode) {
      console.log(`[HairAnalysis] Above: ${(aboveRatio * 100).toFixed(1)}%, Side: ${(sideRatio * 100).toFixed(1)}%, Score: ${hairScore.toFixed(2)}`);
    }
    
    return hairScore;
  } catch (e) {
    console.warn('[HairAnalysis] Failed:', e);
    return 0.5; // Neutral if analysis fails
  }
}

/**
 * Analyze face aspect ratio for gender hints
 * Males typically have wider jaws (lower height/width ratio)
 */
export function analyzeFaceShape(boundingBox: FaceBoundingBox): number {
  const aspectRatio = boundingBox.height / boundingBox.width;
  
  // Males: ~1.0-1.2 (more square), Females: ~1.2-1.4 (more oval)
  // Return 0-1 where 1 = more female-like shape
  if (aspectRatio < 1.0) return 0.2;
  if (aspectRatio < 1.15) return 0.35;
  if (aspectRatio < 1.25) return 0.5;
  if (aspectRatio < 1.35) return 0.65;
  return 0.8;
}

/**
 * Check for skin-like colors in face region
 * Helps filter out false positives (walls, objects)
 */
export function hasSkinTones(
  canvas: HTMLCanvasElement,
  boundingBox: FaceBoundingBox
): boolean {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true; // Assume valid if can't check
    
    // Sample center of face
    const centerX = boundingBox.x + boundingBox.width * 0.5;
    const centerY = boundingBox.y + boundingBox.height * 0.4;
    const sampleSize = Math.min(boundingBox.width * 0.3, 30);
    
    const imageData = ctx.getImageData(
      Math.round(Math.max(0, centerX - sampleSize / 2)),
      Math.round(Math.max(0, centerY - sampleSize / 2)),
      Math.round(Math.min(sampleSize, canvas.width - centerX)),
      Math.round(Math.min(sampleSize, canvas.height - centerY))
    ).data;
    
    let skinPixels = 0;
    let totalPixels = 0;
    
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      
      // Broad skin tone detection (works for diverse skin colors)
      const isSkin = (
        r > 60 && r < 250 &&
        g > 40 && g < 220 &&
        b > 20 && b < 200 &&
        Math.abs(r - g) < 80 &&
        r >= g && g >= b * 0.8 &&
        (r + g + b) > 100 && (r + g + b) < 600
      );
      
      if (isSkin) skinPixels++;
      totalPixels++;
    }
    
    const skinRatio = totalPixels > 0 ? skinPixels / totalPixels : 0;
    return skinRatio > 0.15; // At least 15% skin-like pixels
  } catch {
    return true;
  }
}

/**
 * Check edge density to filter out uniform surfaces (walls)
 */
export function hasTextureVariation(
  canvas: HTMLCanvasElement,
  boundingBox: FaceBoundingBox
): boolean {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    
    const imageData = ctx.getImageData(
      Math.round(boundingBox.x),
      Math.round(boundingBox.y),
      Math.round(Math.min(boundingBox.width, canvas.width - boundingBox.x)),
      Math.round(Math.min(boundingBox.height, canvas.height - boundingBox.y))
    ).data;
    
    const width = Math.round(boundingBox.width);
    let edgeCount = 0;
    let totalChecked = 0;
    
    // Check horizontal edges
    for (let y = 0; y < boundingBox.height - 2; y += 3) {
      for (let x = 0; x < width - 2; x += 3) {
        const idx1 = (y * width + x) * 4;
        const idx2 = (y * width + (x + 2)) * 4;
        
        if (idx1 < imageData.length && idx2 < imageData.length) {
          const diff = Math.abs(imageData[idx1] - imageData[idx2]) +
                       Math.abs(imageData[idx1 + 1] - imageData[idx2 + 1]) +
                       Math.abs(imageData[idx1 + 2] - imageData[idx2 + 2]);
          
          if (diff > 50) edgeCount++;
          totalChecked++;
        }
      }
    }
    
    const edgeRatio = totalChecked > 0 ? edgeCount / totalChecked : 0;
    // Lowered threshold to 3% - faces have some texture but may not have many sharp edges
    return edgeRatio > 0.03;
  } catch {
    return true;
  }
}

/**
 * Apply female boost factor to uncertain classifications
 * Addresses known male bias in face-api.js model
 */
export function applyFemaleBoost(
  rawGender: 'male' | 'female',
  rawConfidence: number,
  femaleBoostFactor: number,
  hairScore: number = 0.5
): { gender: 'male' | 'female'; confidence: number } {
  // Only apply boost in uncertain range (0.45 - 0.70)
  if (rawConfidence < 0.45 || rawConfidence > 0.70) {
    return { gender: rawGender, confidence: rawConfidence };
  }
  
  // Calculate adjusted female probability
  let femaleProb = rawGender === 'female' ? rawConfidence : (1 - rawConfidence);
  
  // Apply boost based on hair score and boost factor
  const boost = femaleBoostFactor * (0.3 + hairScore * 0.7);
  femaleProb = Math.min(0.95, femaleProb + boost);
  
  // Determine final classification
  if (femaleProb > 0.5) {
    return { gender: 'female', confidence: femaleProb };
  } else {
    return { gender: 'male', confidence: 1 - femaleProb };
  }
}

/**
 * Combined gender heuristic analysis
 */
export function analyzeGenderHeuristics(
  canvas: HTMLCanvasElement | null,
  boundingBox: FaceBoundingBox,
  rawGender: 'male' | 'female',
  rawConfidence: number,
  femaleBoostFactor: number = 0.15,
  debugMode: boolean = false
): GenderHeuristicResult {
  // Default to raw values if no canvas
  if (!canvas) {
    return {
      suggestedGender: rawConfidence > 0.6 ? rawGender : 'uncertain',
      hairScore: 0.5,
      jawScore: 0.5,
      overallFemaleScore: rawGender === 'female' ? rawConfidence : (1 - rawConfidence),
      confidence: rawConfidence,
    };
  }
  
  // Analyze secondary signals
  const hairScore = analyzeHairRegion(canvas, boundingBox, debugMode);
  const jawScore = analyzeFaceShape(boundingBox);
  
  // Calculate overall female probability
  const rawFemaleProb = rawGender === 'female' ? rawConfidence : (1 - rawConfidence);
  
  // Weighted combination: model weight decreases when uncertain
  const modelWeight = rawConfidence > 0.65 ? 0.75 : 0.55;
  const heuristicWeight = 1 - modelWeight;
  
  const heuristicFemaleScore = hairScore * 0.6 + jawScore * 0.4;
  let overallFemaleScore = rawFemaleProb * modelWeight + heuristicFemaleScore * heuristicWeight;
  
  // Apply female boost for uncertain cases
  if (rawConfidence < 0.65 && femaleBoostFactor > 0) {
    overallFemaleScore = Math.min(0.95, overallFemaleScore + femaleBoostFactor * 0.5);
  }
  
  // Determine suggested gender
  let suggestedGender: 'male' | 'female' | 'uncertain';
  if (overallFemaleScore > 0.55) {
    suggestedGender = 'female';
  } else if (overallFemaleScore < 0.45) {
    suggestedGender = 'male';
  } else {
    suggestedGender = 'uncertain';
  }
  
  const finalConfidence = Math.abs(overallFemaleScore - 0.5) * 2; // 0 at 0.5, 1 at 0 or 1
  
  if (debugMode) {
    console.log(`[GenderHeuristics] Raw: ${rawGender} (${(rawConfidence * 100).toFixed(0)}%), Hair: ${(hairScore * 100).toFixed(0)}%, Jaw: ${(jawScore * 100).toFixed(0)}%, Final: ${suggestedGender} (${(overallFemaleScore * 100).toFixed(0)}% female)`);
  }
  
  return {
    suggestedGender,
    hairScore,
    jawScore,
    overallFemaleScore,
    confidence: finalConfidence,
  };
}
