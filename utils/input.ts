import { NerveId, type NerveReading } from '../types.ts';

/** Preserve numeric zero so absent amplitudes and invalid conduction values remain visible for correction. */
export const displayMeasurementInput = (value: string | number | undefined): string | number => value ?? '';
const blank=(value:string|number|undefined)=>value===undefined||(typeof value==='string'&&value.trim()==='');
const absent=(value:string|number)=>Number(value)===0||(typeof value==='string'&&['NR','N'].includes(value.trim().toUpperCase()));
/** Apply rapid-workflow NR pairing only when the paired field is still blank; never overwrite entered data. */
export const updatePairedMeasurement=(reading:NerveReading,field:'velocity'|'peakLatency'|'amplitude',value:string|number):NerveReading=>{
 const mainField=reading.nerveId===NerveId.SURAL?'peakLatency':'velocity';
 const updated={...reading,[field]:value};
 if(field==='amplitude'&&absent(value)&&blank(reading[mainField]))return{...updated,[mainField]:'NR'};
 if(field===mainField&&absent(value)&&blank(reading.amplitude))return{...updated,amplitude:'NR'};
 return updated;
};
