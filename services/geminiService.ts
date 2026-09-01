
import { NerveId, type PatientData, type NerveReading, type AnalysisResult } from "../types";

export const getClinicalSummary = async (
  patient: PatientData,
  readings: NerveReading[],
  analysis: AnalysisResult,
  lang: 'es' | 'en' = 'es'
): Promise<string> => {
  
  const abnormalities = [
    ...analysis.score2.details,
    ...analysis.score4.details
  ].filter(d => d.points > 0).map(d => d.nerve);

  const findingsList = readings.map(r => {
    const isSural = r.nerveId === NerveId.SURAL;
    let details = '';
    
    if (isSural) {
      details = `Latencia Pico: ${r.peakLatency || 'NR'} ms, Amplitud: ${r.amplitude} uV`;
    } else {
      details = `Velocidad: ${r.velocity || 'NR'} m/s, Amplitud: ${r.amplitude} mV`;
    }
    
    return `- ${r.nerveName}: ${details}`;
  }).join('\n');

  const systemInstruction = lang === 'es' 
    ? "Actúa como un médico especialista experto en Medicina Física y Rehabilitación y Neurofisiología Clínica. Tu objetivo es proporcionar interpretaciones electrofisiológicas precisas basadas en el score electrodiagnóstico adaptado desarrollado para esta herramienta a partir del enfoque de puntuación compuesta descrito por Davies et al. para polineuropatía diabética."
    : "Act as an expert physician specializing in Physical Medicine and Rehabilitation (PM&R) and Clinical Neurophysiology. Your goal is to provide precise electrophysiological interpretations based on the percentile-based electrodiagnostic score adapted from the compound scoring approach described by Davies et al. for diabetic polyneuropathy.";

  const prompt = lang === 'es'
    ? `
    Analiza los siguientes resultados de neuroconducción para un paciente con sospecha de polineuropatía diabética (DSPN).

    DATOS DEL PACIENTE:
    Edad: ${patient.age} años | Altura: ${patient.height} cm

    HALLAZGOS:
    ${findingsList}
    
    RESULTADO AUTOMÁTICO (Score electrodiagnóstico percentilar adaptado del enfoque de puntuación compuesta descrito por Davies et al.):
    Clasificación: ${analysis.severityClass}
    Resultado determinista autoritativo: límites empíricos P3/P97; el percentil CDF es exclusivamente descriptivo y nunca empírico. Nervios anormales: ${analysis.score2.abnormalNerveCount}/4; criterio compuesto: ${analysis.score2.meetsCompositeCriterion ? 'CUMPLE' : 'NO CUMPLE'}. Parámetros con puntuación >0: ${abnormalities.length > 0 ? abnormalities.join(', ') : 'Ninguno'}.

    REQUERIMIENTO:
    Genera un concepto clínico breve (máximo 120 palabras). 
    1. Describe los hallazgos sin diagnosticar un patrón desmielinizante únicamente por reducción de velocidad.
    2. Correlaciona con el Score #2 (Diagnóstico) y Score #4 (Severidad Axonal).
    3. Sugiere brevemente si requiere seguimiento o estudios complementarios (ej. EMG de aguja si hay duda de cronicidad).
    
    IMPORTANTE: El resultado determinista es autoritativo. No diagnostiques DSPN por un solo nervio aislado. No cambies scores ni percentiles, no inventes parámetros no medidos y explicita las limitaciones cuando falten criterios electrodiagnósticos suficientes. Usa terminología médica de nivel especialista. Responde en ESPAÑOL.
    `
    : `
    Analyze the following nerve conduction results for a patient with suspected diabetic sensorimotor polyneuropathy (DSPN).

    PATIENT DATA:
    Age: ${patient.age} years | Height: ${patient.height} cm

    FINDINGS:
    ${findingsList}
    
    AUTOMATIC RESULT (Adapted electrodiagnostic score developed for this tool from the compound scoring approach described by Davies et al.):
    Classification: ${analysis.severityClass}
    Authoritative deterministic result: empirical P3/P97 cutoffs; the CDF percentile is descriptive only and never empirical. Abnormal nerves: ${analysis.score2.abnormalNerveCount}/4; composite criterion met: ${analysis.score2.meetsCompositeCriterion}. Parameters scoring >0: ${abnormalities.length > 0 ? abnormalities.join(', ') : 'None'}.

    REQUIREMENT:
    Generate a brief clinical concept (max 120 words).
    1. Describe the findings without diagnosing a demyelinating pattern solely from reduced velocity.
    2. Correlate with Score #2 (Diagnosis) and Score #4 (Axonal Severity).
    3. Briefly suggest follow-up or complementary studies (e.g., needle EMG if chronicity is in question).
    
    IMPORTANT: The deterministic result is authoritative. Do not diagnose DSPN from one isolated abnormal nerve. Do not change scores or percentiles, do not invent unmeasured parameters, and state limitations when electrodiagnostic criteria are insufficient. Use specialist-level medical terminology. Respond in ENGLISH.
    `;

  try {
    // UNIFIED ROUTE: Works for Vercel (native) and Netlify (via redirect)
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        config: {
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Function not found (404). Check API configuration.");
      }
      
      const errorData = await response.json().catch(() => ({}));
      const serverDetails = errorData.details || errorData.error || response.statusText;
      throw new Error(serverDetails);
    }

    const data = await response.json();
    return data.text || (lang === 'es' ? "No se pudo generar el resumen." : "Summary could not be generated.");

  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `Error AI: ${error.message}`;
  }
};
