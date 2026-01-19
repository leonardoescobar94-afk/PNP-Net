
import { ReferenceValue, NerveType } from './types';

// Valores base. Los límites reales se calculan dinámicamente en analysis.ts
export const DEFAULT_REFERENCES: ReferenceValue[] = [
  {
    nerveName: 'Tibial (Motor)',
    type: NerveType.MOTOR,
    minAmplitude: 0, // Dinámico
    minVelocity: 0   // Dinámico
  },
  {
    nerveName: 'Fibular (Motor)',
    type: NerveType.MOTOR,
    minAmplitude: 0, // Dinámico
    minVelocity: 0   // Dinámico
  },
  {
    nerveName: 'Ulnar (Motor)',
    type: NerveType.MOTOR,
    minAmplitude: 7.4, // 11.6 - (2 * 2.1)
    minVelocity: 51    // 61 - (2 * 5)
  },
  {
    nerveName: 'Sural (Sensitivo)',
    type: NerveType.SENSORY,
    maxPeakLatency: 4.4, // 3.8 + (2 * 0.3)
    minAmplitude: 0,      // 17 - (2 * 10) -> se tratará con cuidado por ser SD alta
    minVelocity: 0
  }
];

export const TEXTS = {
  es: {
    title: "Polineuropathy-Assistant",
    subtitle: "Clasificación electrofisiológica de la severidad de la polineuropatía diabética.",
    professionalTool: "HERRAMIENTA PROFESIONAL",
    basedOn: "Basado en Percentiles Normalizados (Davies et al.)",
    patientInfo: "Información del Paciente",
    age: "Edad",
    height: "Altura (cm)",
    weight: "Peso (kg)",
    symptoms: "Signos de Polineuropatía",
    symptomsOptions: {
      NONE: 'Sin signos de neuropatía',
      FEET_LEGS: 'Signos de polineuropatía en pies o piernas',
      THIGH: 'Signos de afectación en muslo'
    },
    calculateBtn: "CALCULAR SCORES #2 Y #4",
    processing: "PROCESANDO...",
    readingsTitle: "Lecturas de Neuroconducción",
    nerveHeader: "Nervio",
    paramHeader: "Parámetro 1",
    ampHeader: "Amplitud",
    ampHeaderSural: "Amp. Inicio a Pico",
    velocity: "VELOCIDAD (m/s)",
    latency: "LAT. PICO (ms)",
    ampUnitSural: "uV",
    ampUnitMotor: "mV",
    finalClass: "Clasificación Electrofisiológica",
    diagnosis: "Diagnóstico",
    severity: "SEVERIDAD",
    score2Title: "Score #2 (Conducción)",
    score4Title: "Score #4 (Amplitud)",
    downloadTxt: "Descargar TXT",
    printReport: "Imprimir Informe",
    aiAssistant: "Asistente Inteligente PM&R",
    aiPrompt: "Genere un resumen clínico basado en los hallazgos electrofisiológicos usando IA.",
    aiBtn: "Generar Concepto Clínico",
    aiRegen: "Regenerar o Limpiar",
    whenToUse: "Cuando usar",
    whenToUseText: "Aplicar en adultos de 19 a 79 años con sospecha clínica de polineuropatía diabética sensitivo motora o con antecedente de diabetes mellitus con valores de hemoglobina glicada mayores a 6.5%.",
    references: "Referencias",
    development: "Desarrollo",
    developmentText1: "Esta herramienta se desarrolló como parte del contenido académico motivado y promovido durante la rotación de profundización en electrodiagnóstico y neurofisiología con el Dr. Fernando Ortiz.",
    developmentText2: "Desarrollada por Leonardo Jurado - Residente Medicina Física y Rehabilitación. Universidad Nacional de Colombia.",
    developmentText3: "Esta herramienta se desarrollo usando inteligencia artificial para su programacion.",
    developmentText4: "Aplicación sin ánimo de lucro. Ideada exclusivamente con fines académicos y de apoyo a la práctica de los médicos especialistas en medicina física y rehabilitación y neurología que realizan estudios de electrodiagnóstico.",
    footer: "© 2024 Polineuropathy-Assistant PM&R Specialist Platform",
    normal: "NORMAL",
    abnormal: "ANORMAL",
    mild: "LEVE",
    moderate: "MODERADA",
    severe: "SEVERA",
    points: "PTS",
    // Interpretation strings updated to specific phrases
    s2NormalTitle: "NORMAL",
    s2NormalBody: "NEUROCONDUCCIONES NORMALES, NEGATIVO PARA POLINEUROPATIA",
    s2AbnormalTitle: "ANORMAL",
    s2AbnormalBody: "NEUROCONDUCCIONES ANORMALES COMPATIBLES CON POLINEUROPATIA SENSITIVO MOTORA",
    nStageLabel: "Estadiaje N",
    n0Desc: "Sin anomalías en las neuroconducciones",
    n1Desc: "Neuroconducciones anormales sin signos de neuropatía",
    n2Desc: "Neuroconducciones anormales y signos de polineuropatía en pies o piernas",
    n3Desc: "Neuroconducciones anormales y signos de afectación del muslo"
  },
  en: {
    title: "Polineuropathy-Assistant",
    subtitle: "Electrophysiological classification of diabetic polyneuropathy severity.",
    professionalTool: "PROFESSIONAL TOOL",
    basedOn: "Based on Normalized Percentiles (Davies et al.)",
    patientInfo: "Patient Information",
    age: "Age",
    height: "Height (cm)",
    weight: "Weight (kg)",
    symptoms: "Polyneuropathy Signs",
    symptomsOptions: {
      NONE: 'No signs of neuropathy',
      FEET_LEGS: 'Signs of polyneuropathy in feet or legs',
      THIGH: 'Signs of involvement in thigh'
    },
    calculateBtn: "CALCULATE SCORES #2 & #4",
    processing: "PROCESSING...",
    readingsTitle: "Nerve Conduction Readings",
    nerveHeader: "Nerve",
    paramHeader: "Parameter 1",
    ampHeader: "Amplitude",
    ampHeaderSural: "Onset to Peak Amp.",
    velocity: "VELOCITY (m/s)",
    latency: "PEAK LAT. (ms)",
    ampUnitSural: "uV",
    ampUnitMotor: "mV",
    finalClass: "Electrophysiological Classification",
    diagnosis: "Diagnosis",
    severity: "SEVERITY",
    score2Title: "Score #2 (Conduction)",
    score4Title: "Score #4 (Amplitude)",
    downloadTxt: "Download TXT",
    printReport: "Print Report",
    aiAssistant: "PM&R Smart Assistant",
    aiPrompt: "Generate a clinical summary based on electrophysiological findings using AI.",
    aiBtn: "Generate Clinical Concept",
    aiRegen: "Regenerate or Clear",
    whenToUse: "When to use",
    whenToUseText: "Apply in adults aged 19 to 79 with clinical suspicion of sensory-motor diabetic polyneuropathy or with a history of diabetes mellitus with glycated hemoglobin values greater than 6.5%.",
    references: "References",
    development: "Development",
    developmentText1: "This tool was developed as part of the academic content motivated and promoted during the deepening rotation in electrodiagnosis and neurophysiology with Dr. Fernando Ortiz.",
    developmentText2: "Developed by Leonardo Jurado - Physical Medicine and Rehabilitation Resident. National University of Colombia.",
    developmentText3: "This tool was developed using artificial intelligence for its programming.",
    developmentText4: "Non-profit application. Designed exclusively for academic purposes and to support the practice of physical medicine and rehabilitation specialists and neurologists performing electrodiagnostic studies.",
    footer: "© 2024 Polineuropathy-Assistant PM&R Specialist Platform",
    normal: "NORMAL",
    abnormal: "ABNORMAL",
    mild: "MILD",
    moderate: "MODERATE",
    severe: "SEVERE",
    points: "PTS",
    // Interpretation strings
    s2NormalTitle: "NORMAL",
    s2NormalBody: "NORMAL NERVE CONDUCTIONS, NEGATIVE FOR POLYNEUROPATHY",
    s2AbnormalTitle: "ABNORMAL",
    s2AbnormalBody: "ABNORMAL NERVE CONDUCTIONS COMPATIBLE WITH SENSORIMOTOR POLYNEUROPATHY",
    nStageLabel: "N Staging",
    n0Desc: "No anomalies in nerve conductions",
    n1Desc: "Abnormal nerve conductions without signs of neuropathy",
    n2Desc: "Abnormal nerve conductions and signs of polyneuropathy in feet or legs",
    n3Desc: "Abnormal nerve conductions and signs of thigh involvement"
  }
};
