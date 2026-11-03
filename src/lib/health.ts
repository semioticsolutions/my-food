import { ZipReader, BlobReader, BlobWriter } from '@zip.js/zip.js';
import type { Measure, MeasureType } from '../types';
const names:Record<string,MeasureType> = {
  HKQuantityTypeIdentifierBodyMass:'weight',
  HKQuantityTypeIdentifierBloodGlucose:'glucose',
  HKQuantityTypeIdentifierBloodPressureSystolic:'systolic',
  HKQuantityTypeIdentifierBloodPressureDiastolic:'diastolic'
};
function appleDate(s:string):string|null {
  // Apple's XML uses `2026-09-08 08:15:21 +0200`.
  const m=s.match(/^(\d{4}-\d\d-\d\d)\s+(\d\d:\d\d:\d\d)\s+([+-]\d\d)(\d\d)$/);
  const d=m ? new Date(`${m[1]}T${m[2]}${m[3]}:${m[4]}`) : new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
function attr(tag:string,key:string):string {
  const m=tag.match(new RegExp(`${key}="([^"]*)"`));return m?.[1] || '';
}
export function parseHealthRecord(tag:string):Measure|null {
  const type=names[attr(tag,'type')]; if(!type) return null;
  const at=appleDate(attr(tag,'startDate')); if(!at) return null;
  const raw=Number(attr(tag,'value')); if(!Number.isFinite(raw) || raw<0) return null;
  let value=raw,unit=attr(tag,'unit');
  if(type==='weight') { if(unit==='lb') value*=0.45359237; else if(unit==='g') value/=1000; else if(unit!=='kg') return null; unit='kg'; }
  if(type==='glucose') { if(unit==='mmol/L') value*=18.0182; else if(unit!=='mg/dL') return null; unit='mg/dL'; }
  if(type==='systolic'||type==='diastolic') { if(unit!=='mmHg') return null; }
  const source=attr(tag,'sourceName')||'Apple Zdrowie';
  const id=`health:${[type,at,raw,attr(tag,'unit'),source].map(encodeURIComponent).join(':')}`;
  return {id,type,at,value:Number(value.toFixed(3)),unit,source};
}
async function getXml(file:File):Promise<{blob:Blob,close:()=>Promise<void>}> {
 if(!/\.zip$/i.test(file.name)) return {blob:file,close:async()=>{}};
 const reader=new ZipReader(new BlobReader(file));
 try {
  const entries=await reader.getEntries();
  const entry=entries.find(e=>/\bexport\.xml$/i.test(e.filename) || /\/export\.xml$/i.test(e.filename));
  if(!entry || !entry.getData) throw new Error('Archiwum nie zawiera export.xml.');
  if(entry.uncompressedSize>300_000_000) throw new Error("ZIP zawiera bardzo duży export.xml (>300 MB). Rozpakuj go na Macu i wskaż plik XML bezpośrednio.");
  const blob=await entry.getData(new BlobWriter());
  return {blob,close:()=>reader.close()};
 } catch(e) {await reader.close();throw e;}
}
export async function parseHealthExport(file:File,progress:(read:number,total:number)=>void):Promise<{measurements:Measure[],truncated:boolean}> {
 const {blob,close}=await getXml(file);
 const reader=blob.stream().getReader();const decoder=new TextDecoder();
 let buffer='',read=0,truncated=false;const results:Measure[]=[];
 const seen=new Set<string>();
 try {
  while(true){
    const {done,value}=await reader.read(); if(done) break;
    read+=value.byteLength;buffer+=decoder.decode(value,{stream:true});
    while(true){
      const start=buffer.indexOf('<Record');
      if(start<0){buffer=buffer.slice(-7);break;}
      if(start>0) buffer=buffer.slice(start);
      const end=buffer.indexOf('>');
      if(end<0) {if(buffer.length>100000)throw new Error('Nieprawidłowy XML: za długi tag.');break;}
      const m=parseHealthRecord(buffer.slice(0,end+1));buffer=buffer.slice(end+1);
      if(m&&!seen.has(m.id)){seen.add(m.id);results.push(m);}
      if(results.length>=100000){truncated=true;await reader.cancel();break;}
    }
    progress(read,blob.size);
    if(truncated)break;
  }
 } finally {reader.releaseLock();await close();}
 return {measurements:results,truncated};
}
