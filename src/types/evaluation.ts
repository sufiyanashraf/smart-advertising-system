/**
 * Model Evaluation Types
 * 
 * Types for tracking detection accuracy and model performance.
 */

export interface GroundTruthEntry {
  id: string;
  timestamp: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Detection values
  detectedGender: 'male' | 'female';
  detectedAgeGroup: 'kid' | 'young' | 'adult';
  detectedConfidence: number;
  detectedFaceScore: number;
  // Ground truth (user-corrected)
  actualGender: 'male' | 'female';
  actualAgeGroup: 'kid' | 'young' | 'adult';
  isFalsePositive: boolean; // Not a real face
}

export interface EvaluationSession {
  id: string;
  name: string;
  createdAt: number;
  entries: GroundTruthEntry[];
}

export interface EvaluationMetrics {
  totalSamples: number;
  // Gender metrics
  genderAccuracy: number;
  maleRecall: number;      // % of actual males detected as male
  femaleRecall: number;    // % of actual females detected as female
  malePrecision: number;   // % of male detections that are actually male
  femalePrecision: number; // % of female detections that are actually female
  // Age metrics
  ageAccuracy: number;
  kidAccuracy: number;
  youngAccuracy: number;
  adultAccuracy: number;
  // False positive metrics
  falsePositiveRate: number;
  trueDetectionRate: number;
  // Confidence analysis
  avgConfidenceCorrect: number;
  avgConfidenceIncorrect: number;
}

export interface ConfusionMatrix {
  // Gender: [predicted][actual]
  gender: {
    maleAsMale: number;
    maleAsFemale: number;
    femaleAsMale: number;
    femaleAsFemale: number;
  };
  // Age: [predicted][actual]
  age: {
    kidAsKid: number;
    kidAsYoung: number;
    kidAsAdult: number;
    youngAsKid: number;
    youngAsYoung: number;
    youngAsAdult: number;
    adultAsKid: number;
    adultAsYoung: number;
    adultAsAdult: number;
  };
}

export function calculateMetrics(entries: GroundTruthEntry[]): EvaluationMetrics {
  if (entries.length === 0) {
    return {
      totalSamples: 0,
      genderAccuracy: 0,
      maleRecall: 0,
      femaleRecall: 0,
      malePrecision: 0,
      femalePrecision: 0,
      ageAccuracy: 0,
      kidAccuracy: 0,
      youngAccuracy: 0,
      adultAccuracy: 0,
      falsePositiveRate: 0,
      trueDetectionRate: 0,
      avgConfidenceCorrect: 0,
      avgConfidenceIncorrect: 0,
    };
  }

  const realFaces = entries.filter(e => !e.isFalsePositive);
  const falsePositives = entries.filter(e => e.isFalsePositive);
  
  // Gender accuracy
  const genderCorrect = realFaces.filter(e => e.detectedGender === e.actualGender);
  const genderAccuracy = realFaces.length > 0 ? genderCorrect.length / realFaces.length : 0;
  
  // Male recall/precision
  const actualMales = realFaces.filter(e => e.actualGender === 'male');
  const detectedMales = realFaces.filter(e => e.detectedGender === 'male');
  const truePositiveMales = actualMales.filter(e => e.detectedGender === 'male');
  const maleRecall = actualMales.length > 0 ? truePositiveMales.length / actualMales.length : 0;
  const malePrecision = detectedMales.length > 0 ? truePositiveMales.length / detectedMales.length : 0;
  
  // Female recall/precision
  const actualFemales = realFaces.filter(e => e.actualGender === 'female');
  const detectedFemales = realFaces.filter(e => e.detectedGender === 'female');
  const truePositiveFemales = actualFemales.filter(e => e.detectedGender === 'female');
  const femaleRecall = actualFemales.length > 0 ? truePositiveFemales.length / actualFemales.length : 0;
  const femalePrecision = detectedFemales.length > 0 ? truePositiveFemales.length / detectedFemales.length : 0;
  
  // Age accuracy
  const ageCorrect = realFaces.filter(e => e.detectedAgeGroup === e.actualAgeGroup);
  const ageAccuracy = realFaces.length > 0 ? ageCorrect.length / realFaces.length : 0;
  
  // Per-age-group accuracy
  const kids = realFaces.filter(e => e.actualAgeGroup === 'kid');
  const kidCorrect = kids.filter(e => e.detectedAgeGroup === 'kid');
  const kidAccuracy = kids.length > 0 ? kidCorrect.length / kids.length : 0;
  
  const youngs = realFaces.filter(e => e.actualAgeGroup === 'young');
  const youngCorrect = youngs.filter(e => e.detectedAgeGroup === 'young');
  const youngAccuracy = youngs.length > 0 ? youngCorrect.length / youngs.length : 0;
  
  const adults = realFaces.filter(e => e.actualAgeGroup === 'adult');
  const adultCorrect = adults.filter(e => e.detectedAgeGroup === 'adult');
  const adultAccuracy = adults.length > 0 ? adultCorrect.length / adults.length : 0;
  
  // False positive rate
  const falsePositiveRate = entries.length > 0 ? falsePositives.length / entries.length : 0;
  const trueDetectionRate = 1 - falsePositiveRate;
  
  // Confidence analysis
  const correctEntries = realFaces.filter(e => e.detectedGender === e.actualGender);
  const incorrectEntries = realFaces.filter(e => e.detectedGender !== e.actualGender);
  const avgConfidenceCorrect = correctEntries.length > 0 
    ? correctEntries.reduce((sum, e) => sum + e.detectedConfidence, 0) / correctEntries.length 
    : 0;
  const avgConfidenceIncorrect = incorrectEntries.length > 0 
    ? incorrectEntries.reduce((sum, e) => sum + e.detectedConfidence, 0) / incorrectEntries.length 
    : 0;
  
  return {
    totalSamples: entries.length,
    genderAccuracy,
    maleRecall,
    femaleRecall,
    malePrecision,
    femalePrecision,
    ageAccuracy,
    kidAccuracy,
    youngAccuracy,
    adultAccuracy,
    falsePositiveRate,
    trueDetectionRate,
    avgConfidenceCorrect,
    avgConfidenceIncorrect,
  };
}

export function calculateConfusionMatrix(entries: GroundTruthEntry[]): ConfusionMatrix {
  const realFaces = entries.filter(e => !e.isFalsePositive);
  
  return {
    gender: {
      maleAsMale: realFaces.filter(e => e.detectedGender === 'male' && e.actualGender === 'male').length,
      maleAsFemale: realFaces.filter(e => e.detectedGender === 'male' && e.actualGender === 'female').length,
      femaleAsMale: realFaces.filter(e => e.detectedGender === 'female' && e.actualGender === 'male').length,
      femaleAsFemale: realFaces.filter(e => e.detectedGender === 'female' && e.actualGender === 'female').length,
    },
    age: {
      kidAsKid: realFaces.filter(e => e.detectedAgeGroup === 'kid' && e.actualAgeGroup === 'kid').length,
      kidAsYoung: realFaces.filter(e => e.detectedAgeGroup === 'kid' && e.actualAgeGroup === 'young').length,
      kidAsAdult: realFaces.filter(e => e.detectedAgeGroup === 'kid' && e.actualAgeGroup === 'adult').length,
      youngAsKid: realFaces.filter(e => e.detectedAgeGroup === 'young' && e.actualAgeGroup === 'kid').length,
      youngAsYoung: realFaces.filter(e => e.detectedAgeGroup === 'young' && e.actualAgeGroup === 'young').length,
      youngAsAdult: realFaces.filter(e => e.detectedAgeGroup === 'young' && e.actualAgeGroup === 'adult').length,
      adultAsKid: realFaces.filter(e => e.detectedAgeGroup === 'adult' && e.actualAgeGroup === 'kid').length,
      adultAsYoung: realFaces.filter(e => e.detectedAgeGroup === 'adult' && e.actualAgeGroup === 'young').length,
      adultAsAdult: realFaces.filter(e => e.detectedAgeGroup === 'adult' && e.actualAgeGroup === 'adult').length,
    },
  };
}
