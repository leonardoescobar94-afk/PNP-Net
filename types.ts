
export enum NerveType {
  MOTOR = 'Motor',
  SENSORY = 'Sensitivo'
}

export enum NeuropathySymptom {
  NONE = 'Sin signos de neuropatía',
  FEET_LEGS = 'Signos de polineuropatía en pies o piernas',
  THIGH = 'Signos de afectación en muslo'
}

export interface ReferenceValue {
  nerveName: string;
  type: NerveType;
  maxDistalLatency?: number;
  maxPeakLatency?: number;
  minAmplitude: number;
  minVelocity: number;
}

export interface NerveReading {
  nerveName: string;
  type: NerveType;
  distalLatency: number | string;
  peakLatency?: number | string;
  amplitude: number | string;
  velocity: number | string;
}

export interface PatientData {
  age: number;
  height: number;
  name?: string;
}

export interface ScoreDetail {
  nerve: string;
  value: number | string;
  percentile: number;
  points: number;
}

export interface AnalysisResult {
  score2: { 
    total: number; 
    isAbnormal: boolean; 
    details: ScoreDetail[];
    interpretationBody: string;
  };
  score4: { 
    total: number; 
    isAbnormal: boolean; 
    details: ScoreDetail[];
    severityLabel: string;
  };
  severityClass: string;
  diagnosisClass: string;
}
