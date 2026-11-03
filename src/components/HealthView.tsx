import {useMemo,useState} from 'react';
import {UploadCloud,FileArchive,HeartPulse,Shield,Info,LoaderCircle,Activity} from 'lucide-react';
import {ResponsiveContainer,LineChart,Line,CartesianGrid,XAxis,YAxis,Tooltip} from 'recharts';
import type {Measure,MeasureType,Meal} from '../types';
import {parseHealthExport} from '../lib/health';
import {getMeasures,putMeasures} from '../lib/db';
import {num,timeOf} from '../lib/date';
const options:{type:MeasureType,label:string,unit:string,color:string}[]=[
 {type:'glucose',label:'Glukoza',unit:'mg/dL',color:'#6d8ea0'},
 {type:'weight',label:'Masa ciała',unit:'kg',color:'#368f78'},
 {type:'systolic',label:'Ciśnienie skurczowe',unit:'mmHg',color:'#c5816c'},
 {type:'diastolic',label:'Ciśnienie rozkurczowe',unit:'mmHg',color:'#bd9a55'}
];
export default function HealthView({measurements,meals,onRefresh}:{measurements:Measure[],meals:Meal[],onRefresh:()=>Promise<void>}){
 const [selected,setSelected]=useState<MeasureType>('glucose');const [progress,setProgress]=useState(-1);
 const [notice,setNotice]=useState('');const [error,setError]=useState('');
 const [mealId,setMealId]=useState('');
 const active=options.find(o=>o.type===selected)!;
 const list=useMemo(()=>measurements.filter(m=>m.type===selected).sort((a,b)=>a.at.localeCompare(b.at)),[measurements,selected]);
 const plot=useMemo(()=>list.slice(-200).map(m=>({time:new Date(m.at).getTime(),value:+m.value.toFixed(1)})),[list]);
 const selectedMeal=meals.find(m=>m.id===mealId);
 const aroundMeal=useMemo(()=>{
  if(!selectedMeal)return [];
  const t=new Date(selectedMeal.consumedAt).getTime();
  return measurements.filter(m=>m.type==='glucose'&&new Date(m.at).getTime()>=t-30*60000&&new Date(m.at).getTime()<=t+180*60000)
    .sort((a,b)=>a.at.localeCompare(b.at)).map(m=>({minute:Math.round((new Date(m.at).getTime()-t)/60000),value:+m.value.toFixed(1)}));
 },[selectedMeal,measurements]);
 async function importFile(file:File|undefined){if(!file)return;setProgress(0);setNotice('');setError('');
  try{
   const result=await parseHealthExport(file,(read,total)=>setProgress(Math.min(99,Math.round(read/Math.max(total,1)*100))));
   const previous=new Set((await getMeasures()).map(m=>m.id));
   await putMeasures(result.measurements);await onRefresh();
   setNotice(`Znaleziono ${result.measurements.length.toLocaleString('pl-PL')} pomiarów. Nowych: ${result.measurements.filter(m=>!previous.has(m.id)).length.toLocaleString('pl-PL')}.${result.truncated?' Osiągnięto limit 100 000 wpisów — import niepełny.':''}`);
  }catch(e){setError(e instanceof Error?e.message:'Błąd odczytu pliku.');}finally{setProgress(-1);}
 }
 const latest=(type:MeasureType)=>measurements.filter(m=>m.type===type).sort((a,b)=>b.at.localeCompare(a.at))[0];
 return <div className="view-stack">
  <div className="page-heading"><div><div className="eyebrow">DANE I POMIARY</div><h1>Apple Zdrowie</h1><p>Przeglądaj pomiary i porównuj je z posiłkami.</p></div><HeartPulse className="heading-icon" size={34}/></div>
  <div className="health-stats">
   {options.map(o=>{const last=latest(o.type);return <button key={o.type} className={`health-mini-card ${selected===o.type?'active':''}`} onClick={()=>setSelected(o.type)}><span className="health-color" style={{background:o.color}}/><span className="stat-caption">{o.label}</span><strong>{last?num(last.value):'—'} <small>{last?o.unit:''}</small></strong><span className="tiny-muted">{last?new Date(last.at).toLocaleDateString('pl-PL'):'Brak pomiarów'}</span></button>;})}
  </div>
  <div className="health-layout">
   <div className="card health-chart"><div className="card-title-row"><div><h3>Historia: {active.label.toLowerCase()}</h3><span className="small-muted">{list.length.toLocaleString('pl-PL')} pomiarów · ostatnie 200 na wykresie</span></div><span className="chart-key"><i style={{background:active.color}}/> {active.unit}</span></div>
   {plot.length?<div className="line-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={plot} margin={{top:12,right:8,left:-18,bottom:0}}><CartesianGrid vertical={false} stroke="#e7ebe5" strokeDasharray="3 4"/><XAxis dataKey="time" type="number" domain={['dataMin','dataMax']} tickFormatter={v=>new Date(v).toLocaleDateString('pl-PL',{day:'numeric',month:'short'})} tick={{fontSize:11,fill:'#8a968e'}} minTickGap={32}/><YAxis domain={['auto','auto']} tick={{fontSize:11,fill:'#8a968e'}}/><Tooltip labelFormatter={v=>new Date(Number(v)).toLocaleString('pl-PL')} formatter={v=>[`${num(Number(v))} ${active.unit}`,active.label]}/><Line type="monotone" dataKey="value" stroke={active.color} strokeWidth={2.5} dot={false} activeDot={{r:5}}/></LineChart></ResponsiveContainer></div>:<div className="blank-chart"><Activity size={32}/><strong>Brak danych do wykresu</strong><p>Zaimportuj eksport ze Zdrowia, aby zobaczyć pomiary.</p></div>}
   </div>
   <div className="card import-card"><div className="import-icon"><FileArchive size={26}/></div><h3>Import z Apple Zdrowie</h3><p>W aplikacji Zdrowie na iPhonie: profil → Eksportuj wszystkie dane zdrowotne. Następnie wybierz plik ZIP lub XML.</p>
     <label className={`button button-primary upload-button ${progress>=0?'disabled':''}`}><UploadCloud size={18}/>{progress>=0?'Wczytywanie…':'Wybierz ZIP / XML'}<input type="file" className="sr-only" accept=".zip,.xml,application/zip,text/xml" disabled={progress>=0} onChange={e=>{void importFile(e.target.files?.[0]);e.target.value='';}}/></label>
     {progress>=0&&<div className="progress-track"><div style={{width:`${progress}%`}}/></div>}
     {progress>=0&&<span className="small-muted"><LoaderCircle size={13} className="spin"/> {progress}%</span>}
     {notice&&<div className="success-message">{notice}</div>}{error&&<div className="inline-error">{error}</div>}
     <div className="privacy-line"><Shield size={16}/><span>Odczyt lokalny. Cały plik nie trafia do OpenAI ani Supabase.</span></div>
     <p className="tiny-muted">Prototyp odczytuje glukozę, masę ciała oraz ciśnienie. Import do 100 tys. pomiarów, bez usuwania duplikatów z innych źródeł pomiarowych. Bardzo duże ZIP-y mogą obciążać pamięć iPhone'a.</p>
   </div>
  </div>
  <div className="card"><div className="card-title-row"><div><h3>Glukoza po posiłku</h3><p className="small-muted">Okno od 30 min przed posiłkiem do 3 godz. po nim</p></div><span className="tag soft">Analiza obserwacyjna</span></div>
   <div className="meal-select-wrap"><label>Wybierz posiłek<select value={mealId} onChange={e=>setMealId(e.target.value)}><option value="">Wybierz z dziennika…</option>{meals.slice().sort((a,b)=>b.consumedAt.localeCompare(a.consumedAt)).slice(0,100).map(m=><option key={m.id} value={m.id}>{new Date(m.consumedAt).toLocaleDateString('pl-PL')} {timeOf(m.consumedAt)} — {m.name}</option>)}</select></label></div>
   {aroundMeal.length>=2?<div className="line-wrap glucose-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={aroundMeal} margin={{top:12,right:12,bottom:0,left:-18}}><CartesianGrid stroke="#e7ebe5" vertical={false}/><XAxis type="number" dataKey="minute" domain={[-30,180]} tickFormatter={v=>`${v} min`} tick={{fontSize:11,fill:'#8a968e'}}/><YAxis tick={{fontSize:11,fill:'#8a968e'}}/><Tooltip formatter={v=>[`${num(Number(v))} mg/dL`,'Glukoza']} labelFormatter={v=>`${v} minut względem posiłku`}/><Line dataKey="value" stroke="#7093a5" strokeWidth={2.8} dot={{r:3}}/></LineChart></ResponsiveContainer></div>:<div className="info-blank"><Info size={19}/>{selectedMeal?'Za mało pomiarów glukozy wokół tego posiłku (potrzeba co najmniej 2).':'Wybierz posiłek, aby porównać go z pomiarami glukozy.'}</div>}
   <p className="hint">Zależność czasowa nie dowodzi, że posiłek spowodował zmianę glukozy. Wynik zależy też od aktywności, leków, snu i innych czynników. Wykres nie jest poradą medyczną.</p>
  </div>
 </div>;
}
