import { NERVE_NAMES, NerveId, NerveType, type NerveReading, type PatientData, type ScoreDetail, type AnalysisResult, type AnalysisIssue } from '../types.ts';
import { TEXTS } from '../constants.ts';

export type MeasurementStatus = ScoreDetail['status'];
export type ScoringRuleId = 'STANDARD' | 'SURAL_LATENCY' | 'SURAL_AMPLITUDE' | 'TIBIAL_AMPLITUDE_60_79' | 'FIBULAR_AMPLITUDE_40_79';
type Threshold = { boundary: number; points: number; inclusive: boolean };
type ScoringRule = { direction: 'LOWER_IS_ABNORMAL'|'HIGHER_IS_ABNORMAL'; thresholds: Threshold[]; nrPoints: number; label: {es:string;en:string} };

export const SCORING_RULES: Record<ScoringRuleId, ScoringRule> = {
  STANDARD: { direction:'LOWER_IS_ABNORMAL', thresholds:[{boundary:.01,points:2,inclusive:false},{boundary:.03,points:1,inclusive:false}], nrPoints:2, label:{es:'Regla estándar',en:'Standard rule'} },
  SURAL_LATENCY: { direction:'HIGHER_IS_ABNORMAL', thresholds:[{boundary:.99,points:2,inclusive:false},{boundary:.97,points:1,inclusive:false}], nrPoints:2, label:{es:'Latencia sural',en:'Sural latency'} },
  SURAL_AMPLITUDE: { direction:'LOWER_IS_ABNORMAL', thresholds:[{boundary:.067,points:2,inclusive:false},{boundary:.097,points:1,inclusive:false}], nrPoints:2, label:{es:'Amplitud sural',en:'Sural amplitude'} },
  TIBIAL_AMPLITUDE_60_79: { direction:'LOWER_IS_ABNORMAL', thresholds:[{boundary:.018,points:2,inclusive:false},{boundary:.03,points:1,inclusive:false}], nrPoints:2, label:{es:'Amplitud tibial (60–79 años)',en:'Tibial amplitude (ages 60–79)'} },
  FIBULAR_AMPLITUDE_40_79: { direction:'LOWER_IS_ABNORMAL', thresholds:[{boundary:.03,points:2,inclusive:false},{boundary:.055,points:1,inclusive:false}], nrPoints:2, label:{es:'Amplitud fibular (40–79 años)',en:'Fibular amplitude (ages 40–79)'} },
};
const pct=(value:number)=>`${Number((value*100).toFixed(3))}`;
export const describeScoringRule = (id: ScoringRuleId, lang:'es'|'en'='es') => {
  const rule=SCORING_RULES[id], [severe,mild]=rule.thresholds;
  const es=lang==='es';
  if(rule.direction==='LOWER_IS_ABNORMAL') {
    const severeOperator=severe.inclusive?'≤':'<', mildOperator=mild.inclusive?'≤':'<';
    const middleLowerOperator=severe.inclusive?'>':'≥', normalOperator=mild.inclusive?'>':'≥';
    return `${rule.label[lang]}: ${severeOperator}P${pct(severe.boundary)} = 2 ${es?'puntos':'points'}; ${middleLowerOperator}P${pct(severe.boundary)}–${mildOperator}P${pct(mild.boundary)} = 1; ${normalOperator}P${pct(mild.boundary)} = 0; NR = ${rule.nrPoints}.`;
  }
  const severeOperator=severe.inclusive?'≥':'>', mildOperator=mild.inclusive?'≥':'>';
  const middleUpperOperator=severe.inclusive?'<':'≤', normalOperator=mild.inclusive?'<':'≤';
  return `${rule.label[lang]}: ${severeOperator}P${pct(severe.boundary)} = 2 ${es?'puntos':'points'}; ${mildOperator}P${pct(mild.boundary)}–${middleUpperOperator}P${pct(severe.boundary)} = 1; ${normalOperator}P${pct(mild.boundary)} = 0; NR = ${rule.nrPoints}.`;
};
export const calculatePoints=(p:number,id:ScoringRuleId)=>{
  const rule=SCORING_RULES[id];
  for(const t of rule.thresholds){ const match=rule.direction==='LOWER_IS_ABNORMAL' ? (t.inclusive?p<=t.boundary:p<t.boundary) : (t.inclusive?p>=t.boundary:p>t.boundary); if(match)return t.points; }
  return 0;
};
export const calculateNrPoints=(id:ScoringRuleId)=>SCORING_RULES[id].nrPoints;

/** Numerical approximation of the standard normal CDF. */
export const normCDF=(x:number)=>{const t=1/(1+.2316419*Math.abs(x));const d=.3989423*Math.exp(-x*x/2);const p=d*t*(.3193815+t*(-.3565638+t*(1.7814779+t*(-1.821256+t*1.3302744))));return x>=0?1-p:p;};
export const getZScore=(value:number,mean:number,sd:number)=>(value-mean)/sd;
const lerp=(start:number,end:number,t:number)=>start*(1-t)+end*t;
const getTransitionFactor=(value:number,threshold:number,windowSize:number)=>{const start=threshold-windowSize/2,end=threshold+windowSize/2;if(value<=start)return 0;if(value>=end)return 1;return(value-start)/windowSize;};
export const getTibialAmpStats=(age:number)=>{const young={mean:15.3,sd:4.5},middle={mean:12.9,sd:4.5},old={mean:9.8,sd:4.2};const t1=getTransitionFactor(age,30,10),t2=getTransitionFactor(age,60,10);if(t1===0)return young;if(t1<1)return{mean:lerp(young.mean,middle.mean,t1),sd:lerp(young.sd,middle.sd,t1)};if(t2===0)return middle;return{mean:lerp(middle.mean,old.mean,t2),sd:lerp(middle.sd,old.sd,t2)};};
export const getFibularAmpStats=(age:number)=>{const t=getTransitionFactor(age,40,10);return{mean:lerp(6.8,5.1,t),sd:2.5};};
export const getTibialVelStats=(age:number,height:number)=>{const ih=(h:number,a:number,b:number,c:number)=>h<=155?a:h>=175?c:h<165?lerp(a,b,(h-155)/10):lerp(b,c,(h-165)/10);const t=getTransitionFactor(age,50,10);return{mean:lerp(ih(height,51,49,47),ih(height,49,45,44),t),sd:lerp(ih(height,4,6,5),5,t)};};
export const getFibularVelStats=(age:number,height:number)=>{const th=getTransitionFactor(height,170,10),ta=getTransitionFactor(age,40,10);return{mean:lerp(lerp(49,46,th),lerp(47,44,th),ta),sd:lerp(4,lerp(5,4,th),ta)};};

export const getApplicableScoringRule=(nerveId:NerveId,parameter:ScoreDetail['parameter'],age:number):ScoringRuleId=>{if(parameter==='peakLatency')return'SURAL_LATENCY';if(parameter==='amplitude'&&nerveId===NerveId.SURAL)return'SURAL_AMPLITUDE';if(parameter==='amplitude'&&nerveId===NerveId.TIBIAL&&age>=60&&age<=79)return'TIBIAL_AMPLITUDE_60_79';if(parameter==='amplitude'&&nerveId===NerveId.FIBULAR&&age>=40&&age<=79)return'FIBULAR_AMPLITUDE_40_79';return'STANDARD';};
const parseMeasurement=(raw:string|number|undefined,amplitude:boolean):{status:MeasurementStatus;value?:number;display:string|number}=>{if(raw===undefined||(typeof raw==='string'&&raw.trim()===''))return{status:'MISSING',display:''};if(typeof raw==='string'&&['NR','N'].includes(raw.trim().toUpperCase()))return{status:'NR',display:'NR'};const normalized=typeof raw==='string'?raw.trim().replace(',','.'):raw;if((typeof normalized==='string'&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized))||!Number.isFinite(Number(normalized)))return{status:'INVALID',display:String(raw)};const value=Number(normalized);if(amplitude&&value===0)return{status:'NR',value:0,display:'NR (0)'};if(value<=0)return{status:'INVALID',value,display:value};return{status:'VALID',value,display:value};};
const makeDetail=(nerveId:NerveId,nerve:string,parameter:ScoreDetail['parameter'],unit:ScoreDetail['unit'],raw:string|number|undefined,stats:{mean:number;sd:number},age:number,lang:'es'|'en'):ScoreDetail=>{const parsed=parseMeasurement(raw,parameter==='amplitude'),ruleId=getApplicableScoringRule(nerveId,parameter,age);const base={nerveId,nerve,parameter,unit,value:parsed.display,status:parsed.status,referenceMean:stats.mean,referenceSD:stats.sd,points:null,scoringRuleId:ruleId,scoringRuleDescription:describeScoringRule(ruleId,lang)};if(parsed.status==='NR')return{...base,points:calculateNrPoints(ruleId)};if(parsed.status!=='VALID'||parsed.value===undefined)return base;const zScore=getZScore(parsed.value,stats.mean,stats.sd),percentile=normCDF(zScore);return{...base,value:parsed.value,zScore,percentile,points:calculatePoints(percentile,ruleId)};};

const EXPECTED:Record<NerveId,NerveType>={[NerveId.TIBIAL]:NerveType.MOTOR,[NerveId.FIBULAR]:NerveType.MOTOR,[NerveId.ULNAR]:NerveType.MOTOR,[NerveId.SURAL]:NerveType.SENSORY};
const validateReadings=(readings:NerveReading[])=>{const known=new Set(Object.values(NerveId));for(const r of readings){if(!known.has(r.nerveId as NerveId))throw new Error(`Unknown nerve identifier: ${String(r.nerveId)}`);if(r.nerveName!==NERVE_NAMES[r.nerveId])throw new Error(`Nerve name does not match identifier ${r.nerveId}: expected ${NERVE_NAMES[r.nerveId]}`);}for(const id of Object.values(NerveId)){const matches=readings.filter(r=>r.nerveId===id);if(matches.length===0)throw new Error(`Required nerve is missing: ${id}`);if(matches.length>1)throw new Error(`Duplicate nerve measurement: ${id}`);if(matches[0].type!==EXPECTED[id])throw new Error(`Incorrect nerve type for ${id}: expected ${EXPECTED[id]}`);}if(readings.length!==4)throw new Error('Exactly four required nerve measurements are allowed.');};
export const getScore4Severity=(total:number,lang:'es'|'en'='es')=>total>=6?TEXTS[lang].severe:total>=3?TEXTS[lang].moderate:total>=1?TEXTS[lang].mild:TEXTS[lang].noAxonalDamage;
export const classifyScore2=(total:number,suralPoints:number,motorPoints:number,lang:'es'|'en'='es')=>total<2?TEXTS[lang].s2NormalBody:suralPoints>0&&motorPoints>0?TEXTS[lang].s2SensorimotorBody:suralPoints>0?TEXTS[lang].s2SensoryBody:TEXTS[lang].s2AbnormalGeneric;
export const runFullAnalysis=(readings:NerveReading[],patient:PatientData,lang:'es'|'en'='es'):AnalysisResult=>{
 if(!Number.isFinite(patient.age)||patient.age<19||patient.age>79)throw new RangeError(TEXTS[lang].ageValidation);
 if(!Number.isFinite(patient.height)||patient.height<=0)throw new RangeError(TEXTS[lang].heightValidation);
 validateReadings(readings);const score2Details:ScoreDetail[]=[],score4Details:ScoreDetail[]=[];
 for(const r of readings){let stats:{amp:{mean:number;sd:number};vel?:{mean:number;sd:number};lat?:{mean:number;sd:number}};switch(r.nerveId){case NerveId.TIBIAL:stats={amp:getTibialAmpStats(patient.age),vel:getTibialVelStats(patient.age,patient.height)};break;case NerveId.FIBULAR:stats={amp:getFibularAmpStats(patient.age),vel:getFibularVelStats(patient.age,patient.height)};break;case NerveId.ULNAR:stats={amp:{mean:11.6,sd:2.1},vel:{mean:61,sd:5}};break;case NerveId.SURAL:stats={amp:{mean:17,sd:10},lat:{mean:3.8,sd:.3}};break;default:throw new Error(`Unknown nerve identifier: ${String(r.nerveId)}`);}
  if(r.nerveId===NerveId.SURAL)score2Details.push(makeDetail(r.nerveId,r.nerveName,'peakLatency','ms',r.peakLatency,stats.lat!,patient.age,lang));else score2Details.push(makeDetail(r.nerveId,r.nerveName,'velocity','m/s',r.velocity,stats.vel!,patient.age,lang));score4Details.push(makeDetail(r.nerveId,r.nerveName,'amplitude',r.nerveId===NerveId.SURAL?'µV':'mV',r.amplitude,stats.amp,patient.age,lang));}
 const issues:AnalysisIssue[]=[...score2Details.map(d=>({...d,score:'SCORE_2' as const})),...score4Details.map(d=>({...d,score:'SCORE_4' as const}))].filter(d=>d.status==='MISSING'||d.status==='INVALID').map(d=>({score:d.score,nerveId:d.nerveId,nerve:d.nerve,parameter:d.parameter,status:d.status as 'MISSING'|'INVALID'}));
 if(issues.length)return{analysisStatus:'INCOMPLETE_ANALYSIS',issues,score2:{total:null,isAbnormal:null,details:score2Details,interpretationBody:null},score4:{total:null,isAbnormal:null,details:score4Details,severityLabel:null},severityClass:null,diagnosisClass:null};
 const s2Total=score2Details.reduce((n,d)=>n+d.points!,0),s4Total=score4Details.reduce((n,d)=>n+d.points!,0),suralPoints=score2Details.find(d=>d.nerveId===NerveId.SURAL)!.points!,motorPoints=s2Total-suralPoints;const interpretationBody=classifyScore2(s2Total,suralPoints,motorPoints,lang),diagnosisClass=s2Total>=2?TEXTS[lang].abnormal:TEXTS[lang].normal,severityLabel=getScore4Severity(s4Total,lang);return{analysisStatus:'VALID_ANALYSIS',issues:[],score2:{total:s2Total,isAbnormal:s2Total>=2,details:score2Details,interpretationBody},score4:{total:s4Total,isAbnormal:s4Total>=1,details:score4Details,severityLabel},severityClass:`${diagnosisClass} / ${severityLabel}`,diagnosisClass};
};
