
import React, { useState, useEffect } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  PatientData, 
  NerveReading, 
  NerveType, 
  NerveId,
  AnalysisResult
} from './types';
import { DEFAULT_REFERENCES, TEXTS } from './constants';
import { runFullAnalysis } from './utils/analysis';
import { buildClinicalReportText, formatDetailValue, formatEmpiricalReference, formatParameterLabel, formatPercentile, getAppliedRuleDescriptions, translateParameter } from './utils/report';
import { getClinicalSummary } from './services/geminiService';
import { displayMeasurementInput, updatePairedMeasurement } from './utils/input';
import { DevelopmentContent } from './components/DevelopmentContent';
import { ScientificReferences } from './components/ScientificReferences';

// --- CONFIGURACIÓN ---
// Cambiar a 'true' para reactivar el Asistente IA y el uso de API Keys.
// Cambiar a 'false' para modo estático sin backend.
const ENABLE_AI = false; 

const App: React.FC = () => {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const t = TEXTS[lang]; // Shortcut for translations

  const [patient, setPatient] = useState<PatientData>({ 
    age: 45, 
    height: 170
  });
  const [readings, setReadings] = useState<NerveReading[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const initialReadings: NerveReading[] = DEFAULT_REFERENCES.map(ref => ({
      nerveId: ref.nerveId,
      nerveName: ref.nerveName,
      type: ref.type,
      distalLatency: '',
      peakLatency: '',
      amplitude: '',
      velocity: ''
    }));
    setReadings(initialReadings);
  }, []);

  useEffect(() => {
    if (result) {
      setResult(null);
      setAiSummary('');
    }
  }, [patient, readings, lang]); // Reset if lang changes to update text in result

  const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPatient(prev => ({ 
      ...prev, 
      [name]: Number(value) 
    }));
  };

  const handleReadingChange = (index: number, field: keyof NerveReading, value: string) => {
    const newReadings = [...readings];
    const upperValue = value.trim().toUpperCase();
    
    if (upperValue === 'NR' || upperValue === 'N') {
      newReadings[index] = updatePairedMeasurement(newReadings[index], field as 'velocity'|'peakLatency'|'amplitude', 'NR');
    } else if (value === '') {
      newReadings[index] = { ...newReadings[index], [field]: '' };
    } else {
      const sanitized = value.replace(',', '.');
      if (/^-?\d*\.?\d*$/.test(sanitized)) {
        newReadings[index] = updatePairedMeasurement(newReadings[index], field as 'velocity'|'peakLatency'|'amplitude', sanitized);
      }
    }
    setReadings(newReadings);
  };

  const handleCalculate = () => {
    if (!Number.isFinite(patient.age) || patient.age < 19 || patient.age > 79) {
      setValidationError(t.ageValidation);
      setResult(null);
      return;
    }
    setValidationError('');
    setIsLoading(true);
    setAiSummary('');
    setTimeout(() => {
      try {
        const analysis = runFullAnalysis(readings, patient, lang);
        if (analysis.analysisStatus === 'INCOMPLETE_ANALYSIS') {
          const issueList = analysis.issues.map(issue => `${issue.nerve} – ${translateParameter(issue.parameter, lang)} (${issue.status})${issue.message ? `: ${issue.message}` : ''}`).join('; ');
          setValidationError(`${t.incompleteAnalysis} ${issueList}`);
          setResult(null);
        } else setResult(analysis);
      } catch (error) { setValidationError(error instanceof Error ? error.message : t.ageValidation); }
      finally { setIsLoading(false); }
    }, 500);
  };

  const handleGenerateAiSummary = async () => {
    if (!result || !ENABLE_AI) return;
    setIsAiLoading(true);
    const summary = await getClinicalSummary(patient, readings, result, lang);
    setAiSummary(summary);
    setIsAiLoading(false);
  };

  const handleCopySummary = async () => {
    if (!result || result.analysisStatus !== 'VALID_ANALYSIS') return;
    const text = buildClinicalReportText(patient, readings, result, lang);
    let success = false;
    try {
      await navigator.clipboard.writeText(text);
      success = true;
    } catch {
      try {
        const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
        document.body.appendChild(area); area.select(); success = document.execCommand('copy'); document.body.removeChild(area);
      } catch { success = false; }
    }
    if (success) { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
  };

  const handleGeneratePDF = () => {
    if (!result || result.analysisStatus !== 'VALID_ANALYSIS') return;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 16;
    const ensureSpace = (required: number, currentY: number) => { if (currentY + required > pageHeight - bottomMargin) { doc.addPage(); return 16; } return currentY; };
    const title = (text: string, y: number) => { doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(text,14,y); };
    doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.text('Polineuropathy-Assistant PMR',14,16);
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.text(`${t.age}: ${patient.age} | ${t.height}: ${patient.height} cm`,14,23);
    title(`${t.score2Title}: ${result.score2.total}/8`,31);
    autoTable(doc,{startY:34,margin:{bottom:bottomMargin},head:[[t.nerveHeader,t.paramHeader,lang==='es'?'Valor':'Value',lang==='es'?'Percentil CDF descriptivo':'Descriptive CDF','Pts']],body:result.score2.details.map(d=>[d.nerve,translateParameter(d.parameter,lang),formatDetailValue(d),formatPercentile(d),d.points]),styles:{fontSize:8}});
    // @ts-ignore
    let y=doc.lastAutoTable.finalY+8;
    const conclusion=doc.splitTextToSize(`${t.finalClass}: ${result.score2.interpretationBody}`,180); y=ensureSpace(conclusion.length*4+8,y); doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.text(conclusion,14,y); y+=conclusion.length*4+7;
    y=ensureSpace(18,y); title(`${t.score4Title}: ${result.score4.total}/8 — ${t.severity}: ${result.score4.severityLabel}`,y);
    autoTable(doc,{startY:y+3,margin:{bottom:bottomMargin},head:[[t.nerveHeader,lang==='es'?'Valor':'Value',lang==='es'?'Percentil CDF descriptivo':'Descriptive CDF','Pts']],body:result.score4.details.map(d=>[d.nerve,formatDetailValue(d),formatPercentile(d),d.points]),styles:{fontSize:8}});
    // @ts-ignore
    y=doc.lastAutoTable.finalY+9; y=ensureSpace(16,y); title(lang==='es'?'Puntos de corte y reglas de puntuación':'Cutoffs and scoring rules',y); y+=5;
    doc.setFont('helvetica','normal'); doc.setFontSize(8);
    for(const rule of getAppliedRuleDescriptions(result)){const lines=doc.splitTextToSize(`• ${rule}`,180);y=ensureSpace(lines.length*4+3,y);doc.text(lines,14,y);y+=lines.length*4+2;}
    const pages=doc.getNumberOfPages(); for(let page=1;page<=pages;page++){doc.setPage(page);doc.setFontSize(7);doc.text(`${page}/${pages}`,196,pageHeight-7,{align:'right'});doc.text('Polineuropathy-Assistant PMR',14,pageHeight-7);}
    doc.save(`Report_PM&R_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const toggleAccordion = (id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 print:p-0">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-6 gap-4 print:mb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Polineuropathy-Assistant <span className="text-blue-600">PMR</span></h1>
          <p className="text-slate-600 font-medium text-sm mt-1">{t.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <button 
             onClick={() => setLang(prev => prev === 'es' ? 'en' : 'es')}
             className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700 transition print:hidden"
           >
             {lang === 'es' ? '🇺🇸 English' : '🇪🇸 Español'}
           </button>
           <div className="text-right hidden md:block print:block">
            <p className="text-xs font-bold text-slate-400">{t.professionalTool}</p>
            <p className="text-xs text-slate-500">{t.basedOn}</p>
            <p className="text-[9px] text-slate-300 mt-1 hidden print:block italic">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6 print:hidden">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 uppercase mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
              {t.patientInfo}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.age}</label>
                  <input type="number" inputMode="decimal" name="age" value={patient.age} onChange={handlePatientChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t.height}</label>
                  <input type="number" inputMode="decimal" name="height" value={patient.height} onChange={handlePatientChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
          </section>

          {validationError && <p role="alert" className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{validationError}</p>}

          <button onClick={handleCalculate} disabled={isLoading} className="w-full bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-blue-800 transition transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
            {isLoading ? t.processing : t.calculateBtn}
          </button>
        </div>

        <div className="lg:col-span-8 space-y-6 print:col-span-12">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
            <h2 className="hidden print:block text-xs font-bold text-slate-500 uppercase px-6 pt-4 mb-2">{t.readingsTitle}</h2>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.nerveHeader}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">{t.paramHeader}</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">{t.ampHeader}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readings.map((r, idx) => {
                  const isSural = r.nerveId === NerveId.SURAL;
                  const mainValue = isSural ? r.peakLatency : r.velocity;
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{r.nerveName}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase">{r.type}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                          <label className="text-[9px] text-slate-400 font-bold mb-1 print:hidden">{isSural ? t.latency : t.velocity}</label>
                          <input 
                            type="text" 
                            inputMode="decimal"
                            value={displayMeasurementInput(mainValue)} 
                            onChange={(e) => handleReadingChange(idx, isSural ? 'peakLatency' : 'velocity', e.target.value)} 
                            placeholder="0.0 o NR"
                            className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none uppercase print:bg-white print:border-none" 
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center">
                          <label className="text-[9px] text-slate-400 font-bold mb-1 print:hidden">
                            {isSural ? t.ampHeaderSural.toUpperCase() : t.ampHeader.toUpperCase()} ({isSural ? t.ampUnitSural : t.ampUnitMotor})
                          </label>
                          <input 
                            type="text" 
                            inputMode="decimal"
                            value={displayMeasurementInput(r.amplitude)} 
                            onChange={(e) => handleReadingChange(idx, 'amplitude', e.target.value)} 
                            placeholder="0.0 o NR"
                            className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none uppercase print:bg-white print:border-none" 
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-blue-900 text-white p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden print:bg-slate-50 print:text-slate-900 print:shadow-none print:border print:border-slate-200 print:p-6">
                <div className="relative z-20 flex justify-between items-start mb-4">
                  <h2 className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] print:text-slate-500 pt-1">
                    {t.finalClass}
                  </h2>
                  <div className="flex gap-2 print:hidden">
                      <button 
                        onClick={handleCopySummary}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-2"
                        title={t.copySummary}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        <span className="text-xs font-bold">{copied ? t.copied : t.copySummary}</span>
                      </button>

                      <button 
                        onClick={handleGeneratePDF}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-2"
                        title="Generar PDF"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        <span className="text-xs font-bold">PDF</span>
                      </button>

                      <button 
                        onClick={() => window.print()}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition cursor-pointer"
                        title={t.printReport}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                      </button>
                  </div>
                </div>
                
                <div className="relative z-10 space-y-4">
                   <div>
                      <p className="text-xs font-black tracking-widest mb-2">{result.diagnosisClass}</p>
                      <p className={`text-xl md:text-2xl font-black leading-tight ${result.score2.status==='COMPOSITE_POSITIVE'?'text-red-300 print:text-red-700':result.score2.status==='ISOLATED_ABNORMALITY'?'text-amber-300 print:text-amber-700':'text-green-300 print:text-green-700'}`}>
                        {result.score2.interpretationBody}
                      </p>
                   </div>
                   {result.score2.isAbnormal && (
                      <div className="mt-2">
                        <p className="text-lg md:text-xl font-bold text-white print:text-slate-900 uppercase tracking-wide">
                          {t.severity}: <span className={
                            result.score4.total >= 6 ? 'text-red-400 print:text-red-700' : 
                            result.score4.total >= 3 ? 'text-orange-300 print:text-orange-700' : 
                            result.score4.total >= 1 ? 'text-yellow-300 print:text-yellow-700' : 
                            'text-slate-300 print:text-slate-500'
                          }>{result.score4.severityLabel}</span>
                        </p>
                      </div>
                   )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:p-4 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${result.score2.status==='COMPOSITE_POSITIVE'?'bg-red-500':result.score2.status==='ISOLATED_ABNORMALITY'?'bg-amber-500':'bg-green-500'}`}></div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Detalle {t.score2Title}</h3>
                    <div className={`px-2 py-1 rounded-md text-sm font-black ${result.score2.status==='COMPOSITE_POSITIVE'?'bg-red-50 text-red-600':result.score2.status==='ISOLATED_ABNORMALITY'?'bg-amber-50 text-amber-700':'bg-green-50 text-green-600'}`}>
                      {result.score2.total} / 8 {t.points}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {result.score2.details.map((d, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-600">{d.nerve} — {formatParameterLabel(d,lang)}<br/><span className="text-slate-400">{formatDetailValue(d)}{d.status==='VALID'&&<> · {lang==='es'?'Percentil CDF descriptivo':'Descriptive CDF percentile'}: {formatPercentile(d)}</>}<br/>{lang==='es'?'Referencia empírica':'Empirical reference'}: {formatEmpiricalReference(d,lang)}</span></span>
                        <div className="flex items-center gap-3">
                          <span className={`font-black ${d.points > 0 ? 'text-red-500' : 'text-slate-400'}`}>{d.points} pt</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 font-bold text-sm">{lang==='es'?'Nervios anormales':'Abnormal nerves'}: {result.score2.abnormalNerveCount}/4<br/>{lang==='es'?'Criterio electrodiagnóstico compuesto':'Composite electrodiagnostic criterion'}: {result.score2.meetsCompositeCriterion?(lang==='es'?'CUMPLE':'MET'):(lang==='es'?'NO CUMPLE':'NOT MET')}</div>
                  <p className="mt-3 text-[11px] text-slate-500">{lang==='es'?'Score electrodiagnóstico adaptado desarrollado para esta herramienta a partir del enfoque compuesto descrito por Davies et al., con límites empíricos Buschbacher/AANEM. Cada respuesta recibe 0 puntos dentro de P3/P97, 1 fuera del límite y 2 si es NR; el criterio requiere ≥2 de 4 nervios anormales.':'Adapted electrodiagnostic score developed for this tool from the composite approach described by Davies et al., using Buschbacher/AANEM empirical limits. Responses score 0 within P3/P97, 1 outside the limit, and 2 if NR; the criterion requires ≥2 of 4 abnormal nerves.'}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:p-4 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${result.score4.isAbnormal ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Detalle {t.score4Title}</h3>
                    <div className={`px-2 py-1 rounded-md text-sm font-black ${result.score4.isAbnormal ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {result.score4.total} / 8 {t.points}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {result.score4.details.map((d, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-600">{d.nerve} — {formatParameterLabel(d,lang)}<br/><span className="text-slate-400">{formatDetailValue(d)}{d.status==='VALID'&&<> · {lang==='es'?'Percentil CDF descriptivo':'Descriptive CDF percentile'}: {formatPercentile(d)}</>}<br/>{lang==='es'?'Referencia empírica':'Empirical reference'}: {formatEmpiricalReference(d,lang)}</span></span>
                        <div className="flex items-center gap-3">
                          <span className={`font-black ${d.points > 0 ? 'text-red-500' : 'text-slate-400'}`}>{d.points} pt</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">{lang==='es'?'Score de severidad por amplitudes CMAP/SNAP con límites empíricos P3 Buschbacher/AANEM: 0 dentro del límite, 1 por debajo y 2 si NR. Clasificación provisional: 0 sin daño axonal, 1–2 leve, 3–5 moderada, 6–8 severa.':'CMAP/SNAP amplitude severity score using Buschbacher/AANEM empirical P3 limits: 0 within the limit, 1 below it, and 2 if NR. Provisional classification: 0 no axonal damage, 1–2 mild, 3–5 moderate, 6–8 severe.'}</p>
                </div>
              </div>

              {ENABLE_AI && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm print:bg-white print:border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        {t.aiAssistant}
                      </h3>
                  </div>
                  
                  {aiSummary ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiSummary}</div>
                      <button 
                          onClick={() => setAiSummary('')}
                          className="mt-4 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase print:hidden"
                      >
                          {t.aiRegen}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 print:hidden">
                      <p className="text-xs text-slate-500 mb-4">{t.aiPrompt}</p>
                      <button 
                        onClick={handleGenerateAiSummary}
                        disabled={isAiLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                      >
                        {isAiLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            {t.processing}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                            {t.aiBtn}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <section className="max-w-6xl mx-auto mt-12 space-y-4 print:hidden">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <button onClick={() => toggleAccordion('references')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left">
            <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              {t.references}
            </span>
            <svg className={`w-5 h-5 transition-transform ${activeAccordion === 'references' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          {activeAccordion === 'references' && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-600 leading-relaxed space-y-3">
              <ScientificReferences />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <button onClick={() => toggleAccordion('development')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left">
            <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.618.309a6 6 0 01-3.411.454l-2.387-.477a2 2 0 00-1.022.547l-1.157 1.157a2 2 0 00-.547 1.022l-.477 2.387a2 2 0 00.547 1.022l1.157 1.157a2 2 0 001.022.547l2.387.477a6 6 0 003.411-.454l.618-.309a6 6 0 013.86-.517l2.387.477a2 2 0 001.022-.547l1.157-1.157a2 2 0 00.547-1.022l.477-2.387a2 2 0 00-.547-1.022l-1.157-1.157zM12 13V4M7 8.5L12 3l5 5.5"/></svg>
              {t.development}
            </span>
            <svg className={`w-5 h-5 transition-transform ${activeAccordion === 'development' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          {activeAccordion === 'development' && (
            <DevelopmentContent lang={lang} />
          )}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto mt-12 py-8 px-4 border-t border-slate-200 text-center print:hidden">
        <p className="text-sm text-slate-600 mb-4">{t.footerPurpose}</p>
        <p className="text-sm font-semibold text-slate-700">{t.footerDeveloper}</p>
        <p className="text-xs text-slate-400 mt-1">{t.footerSpecialty}</p>
        <p className="text-xs text-slate-400 mt-1">{t.footerCopyright}</p>
      </footer>
    </div>
  );
};

export default App;
