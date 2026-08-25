import test from 'node:test';
import assert from 'node:assert/strict';
import { describeScoringRule, calculatePoints, calculateNrPoints, classifyScore2, getApplicableScoringRule, getFibularAmpStats, getScore4Severity, getTibialAmpStats, runFullAnalysis } from '../utils/analysis.ts';
import { buildClinicalReportText, formatPercentile, getAppliedRuleDescriptions } from '../utils/report.ts';
import { NerveId, NerveType, type NerveReading } from '../types.ts';
import { displayMeasurementInput } from '../utils/input.ts';

const eps=1e-10;
const validReadings=():NerveReading[]=>[
 {nerveId:NerveId.TIBIAL,nerveName:'Tibial (Motor)',type:NerveType.MOTOR,distalLatency:'',peakLatency:'',amplitude:15.3,velocity:51},
 {nerveId:NerveId.FIBULAR,nerveName:'Fibular (Motor)',type:NerveType.MOTOR,distalLatency:'',peakLatency:'',amplitude:6.8,velocity:49},
 {nerveId:NerveId.ULNAR,nerveName:'Ulnar (Motor)',type:NerveType.MOTOR,distalLatency:'',peakLatency:'',amplitude:11.6,velocity:61},
 {nerveId:NerveId.SURAL,nerveName:'Sural (Sensitivo)',type:NerveType.SENSORY,distalLatency:'',peakLatency:3.8,amplitude:17,velocity:''},
];
const analyze=(readings=validReadings())=>runFullAnalysis(readings,{age:20,height:155});

test('límites percentilares y NR permanecen exactamente aprobados',()=>{
 assert.deepEqual([.01-eps,.01,.02,.03,.03+eps].map(p=>calculatePoints(p,'STANDARD')),[2,1,1,0,0]);
 assert.deepEqual([.97,.97+eps,.99,.99+eps].map(p=>calculatePoints(p,'SURAL_LATENCY')),[0,1,1,2]);
 assert.deepEqual([.067,.067-eps,.097,.097-eps].map(p=>calculatePoints(p,'SURAL_AMPLITUDE')),[1,2,0,1]);
 assert.deepEqual([.018,.03].map(p=>calculatePoints(p,'TIBIAL_AMPLITUDE_60_79')),[1,0]);
 assert.deepEqual([.03,.055].map(p=>calculatePoints(p,'FIBULAR_AMPLITUDE_40_79')),[1,0]);
 for(const id of ['STANDARD','SURAL_LATENCY','SURAL_AMPLITUDE','TIBIAL_AMPLITUDE_60_79','FIBULAR_AMPLITUDE_40_79'] as const)assert.equal(calculateNrPoints(id),2);
});
test('reglas etarias fijas permanecen independientes del LERP',()=>{
 for(const age of [59,60,61,64,65,79])assert.equal(getApplicableScoringRule(NerveId.TIBIAL,'amplitude',age),age<60?'STANDARD':'TIBIAL_AMPLITUDE_60_79');
 for(const age of [39,40,41,44,45,79])assert.equal(getApplicableScoringRule(NerveId.FIBULAR,'amplitude',age),age<40?'STANDARD':'FIBULAR_AMPLITUDE_40_79');
 assert.deepEqual([59,60,61,64,65,79].map(a=>Number(getTibialAmpStats(a).mean.toFixed(2))),[11.66,11.35,11.04,10.11,9.8,9.8]);
 assert.deepEqual([39,40,41,44,45,79].map(a=>Number(getFibularAmpStats(a).mean.toFixed(2))),[6.12,5.95,5.78,5.27,5.1,5.1]);
});
test('todos vacíos, una velocidad, una amplitud o una entrada inválida producen análisis incompleto',()=>{
 const empty=validReadings().map(r=>({...r,velocity:'',peakLatency:'',amplitude:''}));
 for(const readings of [empty,validReadings().map(r=>r.nerveId===NerveId.TIBIAL?{...r,velocity:''}:r),validReadings().map(r=>r.nerveId===NerveId.ULNAR?{...r,amplitude:''}:r),validReadings().map(r=>r.nerveId===NerveId.SURAL?{...r,peakLatency:'abc'}:r)]){
  const result=analyze(readings);assert.equal(result.analysisStatus,'INCOMPLETE_ANALYSIS');assert.equal(result.score2.total,null);assert.equal(result.score4.total,null);assert.equal(result.diagnosisClass,null);assert.equal(result.score4.severityLabel,null);
 }
});
test('amplitud cero y NR puntúan 2; cero de velocidad es inválido e incompleto',()=>{
 for(const raw of [0,'NR','nr','N']){const result=analyze(validReadings().map(r=>({...r,amplitude:raw})));assert.equal(result.analysisStatus,'VALID_ANALYSIS');assert.ok(result.score4.details.every(d=>d.status==='NR'&&d.points===2));}
 const invalid=analyze(validReadings().map(r=>r.nerveId===NerveId.TIBIAL?{...r,velocity:0}:r));assert.equal(invalid.analysisStatus,'INCOMPLETE_ANALYSIS');
});
test('edad y talla inválidas se rechazan',()=>{
 for(const age of [18,80,NaN])assert.throws(()=>runFullAnalysis(validReadings(),{age,height:155}),RangeError);
 for(const height of [0,-1,NaN,Infinity])assert.throws(()=>runFullAnalysis(validReadings(),{age:20,height}),RangeError);
});
test('estructura exige cuatro IDs canónicos únicos con tipo correcto',()=>{
 const unknown=validReadings();unknown[0]={...unknown[0],nerveId:'UNKNOWN' as NerveId};assert.throws(()=>analyze(unknown),/Unknown nerve/);
 assert.throws(()=>analyze([...validReadings(),validReadings()[0]]),/Duplicate nerve/);
 assert.throws(()=>analyze(validReadings().filter(r=>r.nerveId!==NerveId.ULNAR)),/missing: ULNAR/);
 const wrong=validReadings();wrong[3]={...wrong[3],type:NerveType.MOTOR};assert.throws(()=>analyze(wrong),/Incorrect nerve type/);
});
test('golden: valores iguales a medias producen z=0 y aproximadamente P50 en los cuatro nervios',()=>{
 const result=analyze();assert.equal(result.analysisStatus,'VALID_ANALYSIS');
 for(const detail of [...result.score2.details,...result.score4.details]){assert.equal(detail.zScore,0,`${detail.nerve} ${detail.parameter}`);assert.ok(Math.abs(detail.percentile!-.5)<1e-6,`${detail.nerve} ${detail.parameter}`);}
});
test('Score #2 y Score #4 conservan sus clasificaciones',()=>{
 assert.deepEqual([0,1,2,3,5,6,8].map(n=>getScore4Severity(n)),['SIN EVIDENCIA DE DAÑO AXONAL','LEVE','LEVE','MODERADA','MODERADA','SEVERA','SEVERA']);
 assert.match(classifyScore2(2,1,1),/SENSITIVO MOTORA/);assert.match(classifyScore2(2,2,0),/SENSITIVA$/);assert.match(classifyScore2(4,0,4),/No Específico/);assert.match(classifyScore2(0,0,0),/NORMALES/);assert.match(classifyScore2(1,1,0),/NORMALES/);
});
test('reporte definitivo contiene 8 parámetros, scores, conclusión, severidad, percentiles, puntos y sólo reglas usadas',()=>{
 const result=analyze(),report=buildClinicalReportText({age:20,height:155},validReadings(),result,'es');
 assert.equal((report.match(/ \| P/g)||[]).length,8);assert.equal((report.match(/puntos?/g)||[]).length>=8,true);assert.match(report,/Total Score #2: \d\/8/);assert.match(report,/Total Score #4: \d\/8/);assert.match(report,/Conclusión:/);assert.match(report,/Severidad:/);assert.match(report,/Velocidad|Latencia pico|Amplitud/);
 assert.deepEqual(getAppliedRuleDescriptions(result,'es').length,3);
 const nr=analyze(validReadings().map(r=>({...r,amplitude:'NR'})));const nrReport=buildClinicalReportText({age:20,height:155},validReadings(),nr,'es');assert.match(nrReport,/NR \| NR/);assert.doesNotMatch(nrReport,/NR \| P/);
 const incomplete=analyze(validReadings().map(r=>({...r,amplitude:''})));assert.throws(()=>buildClinicalReportText({age:20,height:155},validReadings(),incomplete,'es'),/incompleto/);
});
test('percentiles visuales extremos no se ocultan como P0.0',()=>{const detail=analyze().score2.details[0];assert.equal(formatPercentile({...detail,percentile:.0008}),'P0.08');});

test('descripciones derivan las desigualdades inclusivas aprobadas para reglas inferior y superior',()=>{
 const standard=describeScoringRule('STANDARD','es');
 const suralLatency=describeScoringRule('SURAL_LATENCY','es');
 assert.equal(standard,'Regla estándar: <P1 = 2 puntos; ≥P1–<P3 = 1; ≥P3 = 0; NR = 2.');
 assert.equal(suralLatency,'Latencia sural: >P99 = 2 puntos; >P97–≤P99 = 1; ≤P97 = 0; NR = 2.');
});
test('rechaza inconsistencia entre NerveId y nombre visible',()=>{
 const mismatched=validReadings();mismatched[0]={...mismatched[0],nerveName:'Sural (Sensitivo)'};
 assert.throws(()=>analyze(mismatched),/does not match identifier TIBIAL/);
});
test('representación de inputs conserva cero numérico visible',()=>{
 assert.equal(displayMeasurementInput(0),0);assert.equal(displayMeasurementInput('0'),'0');assert.equal(displayMeasurementInput(undefined),'');
});
