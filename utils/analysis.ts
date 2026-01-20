
import { NerveReading, PatientData, ScoreDetail, AnalysisResult, NerveType } from '../types';
import { TEXTS } from '../constants';

/**
 * Función de Distribución Acumulada (CDF) para la distribución normal estándar.
 */
const normCDF = (x: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.3302744))));
  return x >= 0 ? 1 - p : p;
};

const getZScore = (value: number, mean: number, sd: number) => (value - mean) / sd;

const calculatePoints = (
  percentile: number, 
  nerveName: string, 
  paramType: 'vel' | 'lat' | 'amp', 
  age: number
): number => {
  // Latency (Sural) - Score 2
  if (paramType === 'lat') {
    if (percentile > 0.99) return 2;
    if (percentile > 0.95) return 1;
    return 0;
  }

  // Amplitude - Score 4 Exceptions
  if (paramType === 'amp') {
    // Sural Amplitude Exception
    if (nerveName.includes('Sural')) {
      if (percentile < 0.0446) return 2; // < 4.46th percentile
      if (percentile < 0.0968) return 1; // < 9.68th percentile
      return 0;
    }

    // Tibial Amplitude Exception (Age 60-79)
    if (nerveName.includes('Tibial') && age >= 60 && age <= 79) {
      if (percentile < 0.02) return 2; // < 2nd percentile
      if (percentile < 0.05) return 1; // 2nd to 5th percentile
      return 0;
    }

    // Fibular (Peroneal) Amplitude Exception (Age 40-79)
    if (nerveName.includes('Fibular') && age >= 40 && age <= 79) {
      if (percentile < 0.021) return 2; // < 2.1th percentile
      if (percentile < 0.05) return 1; // 2.1th to 5th percentile
      return 0;
    }
  }

  // Standard Rule for Velocity and other Amplitudes
  // < 1st percentile -> 2 points
  // < 5th percentile -> 1 point
  // 5th to 95th -> 0 points
  if (percentile < 0.01) return 2;
  if (percentile < 0.05) return 1;
  return 0;
};

const parseInputValue = (val: string | number): number | 'NR' => {
  if (typeof val === 'string' && val.trim().toUpperCase() === 'NR') return 'NR';
  const parsed = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  return isNaN(parsed) ? 0 : parsed;
};

const getTibialStats = (patient: PatientData) => {
  const { age, height } = patient;
  let amp = { mean: 12.9, sd: 4.8 };
  let vel = { mean: 47, sd: 6 };

  if (age >= 19 && age <= 29) amp = { mean: 15.3, sd: 4.5 };
  else if (age >= 30 && age <= 59) amp = { mean: 12.9, sd: 4.5 };
  else if (age >= 60 && age <= 79) amp = { mean: 9.8, sd: 4.8 };

  if (age >= 19 && age <= 49) {
    if (height < 160) vel = { mean: 51, sd: 4 };
    else if (height >= 160 && height <= 169) vel = { mean: 49, sd: 6 };
    else if (height >= 170) vel = { mean: 47, sd: 5 };
  } else if (age >= 50 && age <= 79) {
    if (height < 160) vel = { mean: 49, sd: 5 };
    else if (height >= 160 && height <= 169) vel = { mean: 45, sd: 5 };
    else if (height >= 170) vel = { mean: 47, sd: 6 };
  }
  return { amp, vel };
};

const getFibularStats = (patient: PatientData) => {
  const { age, height } = patient;
  let amp = { mean: 5.9, sd: 2.6 };
  let vel = { mean: 57, sd: 9 };

  if (age >= 19 && age <= 39) amp = { mean: 6.8, sd: 2.5 };
  else if (age >= 40 && age <= 79) amp = { mean: 5.1, sd: 2.5 };

  if (height < 170) {
    if (age >= 19 && age <= 39) vel = { mean: 49, sd: 4 };
    else if (age >= 40 && age <= 79) vel = { mean: 47, sd: 5 };
  } else {
    if (age >= 19 && age <= 39) vel = { mean: 46, sd: 4 };
    else if (age >= 40 && age <= 79) vel = { mean: 44, sd: 4 };
  }
  return { amp, vel };
};

export const runFullAnalysis = (readings: NerveReading[], patient: PatientData, lang: 'es' | 'en' = 'es'): AnalysisResult => {
  const score2Details: ScoreDetail[] = [];
  const score4Details: ScoreDetail[] = [];

  const tibialStats = getTibialStats(patient);
  const fibularStats = getFibularStats(patient);
  const ulnarStats = { amp: { mean: 11.6, sd: 2.1 }, vel: { mean: 61, sd: 5 } };
  const suralStats = { lat: { mean: 3.8, sd: 0.3 }, amp: { mean: 17, sd: 10 } };

  readings.forEach(r => {
    let stats: any;
    if (r.nerveName.includes('Tibial')) stats = tibialStats;
    else if (r.nerveName.includes('Fibular')) stats = fibularStats;
    else if (r.nerveName.includes('Ulnar')) stats = ulnarStats;
    else if (r.nerveName.includes('Sural')) stats = suralStats;

    if (!stats) return;

    const vVal = parseInputValue(r.velocity);
    const aVal = parseInputValue(r.amplitude);
    const pVal = r.peakLatency ? parseInputValue(r.peakLatency) : 0;

    // Score #2 (Diagnosis) - Velocities + Sural Latency
    if (r.type === NerveType.MOTOR) {
      if (vVal === 'NR') {
        score2Details.push({ nerve: r.nerveName, value: 'NR', percentile: 0.001, points: 2 });
      } else if (vVal > 0) {
        const z = getZScore(vVal, stats.vel.mean, stats.vel.sd);
        const p = normCDF(z);
        const points = calculatePoints(p, r.nerveName, 'vel', patient.age);
        score2Details.push({ nerve: r.nerveName, value: vVal, percentile: p, points });
      }
    } else if (r.nerveName.includes('Sural')) {
      if (pVal === 'NR') {
        score2Details.push({ nerve: 'Sural (Latencia)', value: 'NR', percentile: 0.999, points: 2 });
      } else if (pVal > 0) {
        const z = getZScore(pVal, stats.lat.mean, stats.lat.sd);
        const p = normCDF(z);
        const points = calculatePoints(p, r.nerveName, 'lat', patient.age);
        score2Details.push({ nerve: 'Sural (Latencia)', value: pVal, percentile: p, points });
      }
    }

    // Score #4 (Severity) - Amplitudes
    if (aVal === 'NR') {
      score4Details.push({ nerve: r.nerveName, value: 'NR', percentile: 0.001, points: 2 });
    } else if (aVal > 0) {
      const z = getZScore(aVal, stats.amp.mean, stats.amp.sd);
      const p = normCDF(z);
      const points = calculatePoints(p, r.nerveName, 'amp', patient.age);
      score4Details.push({ nerve: r.nerveName, value: aVal, percentile: p, points });
    }
  });

  const s2Total = score2Details.reduce((acc, curr) => acc + curr.points, 0);
  const s4Total = score4Details.reduce((acc, curr) => acc + curr.points, 0);
  
  // --- LÓGICA SCORE #2 (DIAGNÓSTICO) ---
  // Condición: Total >= 2
  // Sub-condición A: Sural alterado + Motor (Ulnar, Tibial o Fibular) alterado -> Sensitivo Motora
  // Sub-condición B: Sural alterado + Motor NO alterado -> Sensitiva
  
  const s2Abnormal = s2Total >= 2;
  
  // Calcular puntos específicos por tipo de nervio en Score 2
  const suralPointsScore2 = score2Details
    .filter(d => d.nerve.includes('Sural'))
    .reduce((acc, curr) => acc + curr.points, 0);

  // Consideramos motores a Tibial, Fibular y Ulnar
  const motorPointsScore2 = score2Details
    .filter(d => !d.nerve.includes('Sural'))
    .reduce((acc, curr) => acc + curr.points, 0);

  let diagnosisClass = TEXTS[lang].normal;
  let interpretationBody = TEXTS[lang].s2NormalBody;

  if (s2Abnormal) {
    diagnosisClass = TEXTS[lang].abnormal;
    
    // Regla: Score >= 2 y al menos un motor y el sural afectados
    if (suralPointsScore2 > 0 && motorPointsScore2 > 0) {
      interpretationBody = TEXTS[lang].s2SensorimotorBody;
    } 
    // Regla: Score >= 2 y solo sural afectado (motores en 0)
    else if (suralPointsScore2 > 0 && motorPointsScore2 === 0) {
      interpretationBody = TEXTS[lang].s2SensoryBody;
    } 
    // Caso borde: Si solo motores suman >= 2 (Poco probable en DSPN clásica pero posible matemáticamente)
    else {
      interpretationBody = TEXTS[lang].s2AbnormalGeneric;
    }
  }
  
  // --- LÓGICA SCORE #4 (SEVERIDAD / DAÑO AXONAL) ---
  // Condición Anormal: Total >= 1
  // 0 pts: Sin evidencia de daño axonal
  // 1-2 pts: Leve
  // 3-5 pts: Moderada
  // 6-8 pts: Severa
  
  const s4Abnormal = s4Total >= 1;
  
  let severityLabel = TEXTS[lang].noAxonalDamage; // Default para 0 pts

  if (s4Total >= 6) {
    severityLabel = TEXTS[lang].severe;
  } else if (s4Total >= 3) {
    severityLabel = TEXTS[lang].moderate;
  } else if (s4Total >= 1) {
    severityLabel = TEXTS[lang].mild;
  }
  
  // Composite string for display
  const finalSeverityClass = `${diagnosisClass} / ${severityLabel}`;

  return {
    score2: { total: s2Total, isAbnormal: s2Abnormal, details: score2Details, interpretationBody },
    score4: { total: s4Total, isAbnormal: s4Abnormal, details: score4Details, severityLabel },
    severityClass: finalSeverityClass,
    diagnosisClass: diagnosisClass
  };
};
