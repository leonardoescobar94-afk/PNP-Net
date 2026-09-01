
export const NerveId = { TIBIAL: 'TIBIAL', FIBULAR: 'FIBULAR', ULNAR: 'ULNAR', SURAL: 'SURAL' } as const;
export type NerveId = typeof NerveId[keyof typeof NerveId];
export const NERVE_NAMES: Record<NerveId, string> = { TIBIAL: 'Tibial (Motor)', FIBULAR: 'Fibular (Motor)', ULNAR: 'Ulnar (Motor)', SURAL: 'Sural (Sensitivo)' };

export const NerveType = { MOTOR: 'Motor', SENSORY: 'Sensitivo' } as const;
export type NerveType = typeof NerveType[keyof typeof NerveType];

export const NeuropathySymptom = {
  NONE: 'Sin signos de neuropatía', FEET_LEGS: 'Signos de polineuropatía en pies o piernas', THIGH: 'Signos de afectación en muslo'
} as const;
export type NeuropathySymptom = typeof NeuropathySymptom[keyof typeof NeuropathySymptom];

export interface ReferenceValue {
  nerveId: NerveId;
  nerveName: string;
  type: NerveType;
}

export interface NerveReading {
  nerveId: NerveId;
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
  nerveId: NerveId;
  nerve: string;
  parameter: 'velocity' | 'peakLatency' | 'amplitude';
  value: number | string;
  unit: 'm/s' | 'ms' | 'mV' | 'µV';
  status: 'VALID' | 'NR' | 'MISSING' | 'INVALID';
  referenceMean?: number;
  referenceSD?: number;
  zScore?: number;
  descriptiveCDFPercentile?: number;
  empiricalReferencePercentile: 'P3' | 'P97';
  empiricalCutoff: number;
  cutoffDirection: 'LOWER_LIMIT' | 'UPPER_LIMIT';
  points: number | null;
  empiricalRuleId: string;
  empiricalRuleDescription: string;
}

export interface AnalysisIssue {
  score: 'SCORE_2' | 'SCORE_4';
  nerveId: NerveId;
  nerve: string;
  parameter: ScoreDetail['parameter'];
  status: 'MISSING' | 'INVALID' | 'INCONSISTENT';
  message?: string;
}

export interface AnalysisResult {
  analysisStatus: 'VALID_ANALYSIS' | 'INCOMPLETE_ANALYSIS';
  issues: AnalysisIssue[];
  score2: { total: number | null; isAbnormal: boolean | null; status: 'NO_ABNORMALITY' | 'ISOLATED_ABNORMALITY' | 'COMPOSITE_POSITIVE' | null; abnormalNerveCount: number | null; meetsCompositeCriterion: boolean | null; details: ScoreDetail[]; interpretationBody: string | null; };
  score4: { total: number | null; isAbnormal: boolean | null; details: ScoreDetail[]; severityLabel: string | null; };
  severityClass: string | null;
  diagnosisClass: string | null;
}
