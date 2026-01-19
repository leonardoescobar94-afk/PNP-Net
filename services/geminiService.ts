
import { GoogleGenAI } from "@google/genai";
import { PatientData, NerveReading, AnalysisResult } from "../types";

export const getClinicalSummary = async (
  patient: PatientData,
  readings: NerveReading[],
  analysis: AnalysisResult
): Promise<string> => {
  // Always use a named parameter with process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Derive abnormalities from analysis details since AnalysisResult doesn't have an abnormalities property
  const abnormalities = [
    ...analysis.score2.details,
    ...analysis.score4.details
  ].filter(d => d.points > 0).map(d => d.nerve);

  const prompt = `
    Como experto en medicina física y rehabilitación, analiza los siguientes resultados de neuroconducción:
    Paciente: Edad ${patient.age}, Altura ${patient.height}cm.
    Resultados del Estudio:
    ${readings.map(r => `- ${r.nerveName} (${r.type}): Latencia ${r.distalLatency}ms, Amplitud ${r.amplitude}, Velocidad ${r.velocity}m/s`).join('\n')}
    
    Clasificación: ${analysis.severityClass}.
    Hallazgos anormales detectados: ${abnormalities.length > 0 ? abnormalities.join(', ') : 'Ninguno'}.

    Por favor, proporciona un breve resumen clínico (máximo 2 párrafos) interpretando el patrón (axonal, desmielinizante o mixto) y sugerencias para el seguimiento clínico. Habla en tono profesional médico.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Use the .text property directly (do not call it as a method)
    return response.text || "No se pudo generar el resumen clínico.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Error al conectar con el servicio de análisis inteligente.";
  }
};
