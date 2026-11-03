import {useRef,useState} from 'react';
import {Camera,Mic,Square,LoaderCircle,Sparkles,Plus,Trash2,X,ShieldCheck,AlertCircle} from 'lucide-react';
import {analyzeMeal,resizePhoto,transcribeAudio} from '../lib/ai';
import {parseLocal} from '../lib/parser';
import {forDateInput} from '../lib/date';
import type {Meal,Component,Source,ParseResult} from '../types';
const numberOrNull=(v:string):number|null=>v.trim()===''?null:Number(v.replace(',','.'));
const blank=():Meal=>({id:crypto.randomUUID(),name:'',consumedAt:new Date().toISOString(),kcal:null,protein:null,carbs:null,fat:null,fiber:null,source:'manual',rawText:'',components:[],updatedAt:new Date().toISOString(),deletedAt:null});
export default function MealEditor({initial,onClose,onSave}:{initial?:Meal,onClose:()=>void,onSave:(m:Meal)=>Promise<void>}){
 const [meal,setMeal]=useState<Meal>(initial||blank());
 const [description,setDescription]=useState(initial?.rawText||'');
 const [image,setImage]=useState<string|null>(null);
 const [imageName,setImageName]=useState('');
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const [recording,setRecording]=useState(false);
 const recorder=useRef<MediaRecorder|null>(null);const stream=useRef<MediaStream|null>(null);
 function update<K extends keyof Meal>(k:K,v:Meal[K]){setMeal(m=>({...m,[k]:v}));}
 function apply(p:ParseResult,raw:string){
   const explicit=parseLocal(raw);
   const val=(field:'kcal'|'protein'|'carbs'|'fat'|'fiber')=>explicit[field]??p[field];
   setMeal(m=>({...m,name:p.name||m.name,kcal:val('kcal'),protein:val('protein'),carbs:val('carbs'),fat:val('fat'),fiber:val('fiber'),source:[explicit.kcal,explicit.protein,explicit.carbs,explicit.fat].some(v=>v!==null)?'label':p.source,
     consumedAt:raw.match(/(?:o\s+|godzin(?:ie|a)\s+)[0-2]?\d[:.][0-5]\d|\bwczoraj\b/i)?explicit.consumedAt:m.consumedAt,
     components:p.components?.map(c=>({...c,id:crypto.randomUUID()}))||[],rawText:raw}));
 }
 async function parse(withAI:boolean){
  if(!description.trim()&&!image){setError('Najpierw wpisz opis lub dodaj zdjęcie.');return;}
  setBusy(true);setError('');
  try {
   if(withAI){const p=await analyzeMeal(description,image||undefined);apply(p,description);}
   else apply(parseLocal(description),description);
  } catch(e){setError(e instanceof Error?e.message:'Błąd analizy.');}
  finally{setBusy(false);}
 }
 async function onPhoto(file:File|undefined){if(!file)return;setError('');try{const data=await resizePhoto(file);setImage(data);setImageName(file.name);}catch(e){setError(String(e));}}
 async function startStopRecording(){
  if(recording){recorder.current?.stop();setRecording(false);return;}
  setError('');
  try {
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Ta przeglądarka nie obsługuje nagrywania dźwięku.');
   const media=await navigator.mediaDevices.getUserMedia({audio:true});stream.current=media;
   const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));
   const rec=new MediaRecorder(media,mime?{mimeType:mime}:undefined);const chunks:Blob[]=[];
   rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   rec.onstop=async()=>{
     media.getTracks().forEach(t=>t.stop());setBusy(true);
     try {const text=await transcribeAudio(new Blob(chunks,{type:rec.mimeType||'audio/webm'}));setDescription(s=>s?`${s}\n${text}`:text);}
     catch(e){setError(e instanceof Error?e.message:'Nie udało się przetworzyć nagrania.');}
     finally{setBusy(false);}
   };
   rec.start();recorder.current=rec;setRecording(true);
  }catch(e){setError(e instanceof Error?e.message:'Błąd mikrofonu.');}
 }
 function addComponent(){update('components',[...meal.components,{id:crypto.randomUUID(),name:'',grams:null,kcal:null,protein:null,carbs:null,fat:null}]);}
 function componentChange(id:string,field:keyof Component,value:string){
  update('components',meal.components.map(c=>c.id===id?{...c,[field]:field==='name'?value:numberOrNull(value)}:c));
 }
 function calculateFromComponents(){
  const components=meal.components;
  if(!components.length)return;
  const sum=(field:'kcal'|'protein'|'carbs'|'fat')=>components.some(c=>c[field]!=null)?Math.round(components.reduce((a,c)=>a+(c[field]||0),0)*10)/10:null;
  setMeal(m=>({...m,kcal:sum('kcal'),protein:sum('protein'),carbs:sum('carbs'),fat:sum('fat'),source:'estimate'}));
 }
 async function save(e:React.FormEvent){
  e.preventDefault();setError('');
  if(!meal.name.trim()){setError('Podaj nazwę posiłku.');return;}
  if([meal.kcal,meal.protein,meal.carbs,meal.fat].every(x=>x===null)){setError('Uzupełnij co najmniej jedną wartość odżywczą.');return;}
  if([meal.kcal,meal.protein,meal.carbs,meal.fat,meal.fiber].some(x=>x!=null && (!Number.isFinite(x)||x<0))){setError('Wartości nie mogą być ujemne.');return;}
  setBusy(true);try{await onSave({...meal,updatedAt:new Date().toISOString(),rawText:description||meal.rawText});onClose();}catch(e){setError(e instanceof Error?e.message:'Nie udało się zapisać.');}finally{setBusy(false);}
 }
 return <div className="modal-backdrop" onClick={onClose} role="presentation"><div role="dialog" aria-modal="true" aria-label="Edytuj posiłek" className="modal" onClick={e=>e.stopPropagation()}>
  <div className="modal-head"><div><div className="eyebrow">DZIENNIK ŻYWIENIOWY</div><h2>{initial?'Edytuj posiłek':'Nowy posiłek'}</h2></div><button type="button" className="icon-button" aria-label="Zamknij" onClick={onClose}><X size={21}/></button></div>
  <form onSubmit={save} className="editor-content">
   {!initial&&<section className="editor-smart"><div className="section-inline"><Sparkles size={18}/><strong>Dodaj inteligentnie</strong><span className="small-muted">opis, etykieta lub głos</span></div>
    <textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Np. Kurczak curry, 625 kcal, B 38 g, W 68 g, T 22 g, zjedzony o 13:40" />
    <div className="editor-tools">
      <label className="tool-chip"><Camera size={17}/> {imageName?'Zmień zdjęcie':'Dodaj zdjęcie'}<input className="sr-only" type="file" accept="image/*" onChange={e=>onPhoto(e.target.files?.[0])}/></label>
      <button className={`tool-chip ${recording?'recording':''}`} type="button" onClick={startStopRecording} disabled={busy}>{recording?<><Square size={15}/> Zakończ</>:<><Mic size={17}/> Nagraj głos</>}</button>
      {image&&<span className="small-muted">Zdjęcie gotowe ✓</span>}
    </div>
    {image&&<img src={image} className="uploaded-photo" alt="Wybrane zdjęcie posiłku"/>}
    <div className="parse-actions"><button type="button" className="button button-light" onClick={()=>parse(false)} disabled={busy||!description.trim()}>Odczytaj liczby lokalnie</button><button type="button" className="button button-primary" onClick={()=>parse(true)} disabled={busy}>{busy?<LoaderCircle size={17} className="spin"/>:<Sparkles size={17}/>} Rozpoznaj AI</button></div>
    <p className="hint">AI nie nadpisuje liczb wykrytych w Twoim opisie. Zdjęcie lub głos jest przesyłane do OpenAI dopiero po wybraniu odpowiedniej akcji.</p>
   </section>}
   <div className="form-section"><div className="section-title">Szczegóły posiłku</div>
      <label>Nazwa posiłku<input required value={meal.name} onChange={e=>update('name',e.target.value)} placeholder="Nazwa dania"/></label>
      <div className="fields-two"><label>Data i godzina<input type="datetime-local" required value={forDateInput(meal.consumedAt)} onChange={e=>{if(e.target.value) update('consumedAt',new Date(e.target.value).toISOString());}}/></label><label>Źródło danych<select value={meal.source} onChange={e=>update('source',e.target.value as Source)}><option value="label">Etykieta / dane podane</option><option value="manual">Ręcznie</option><option value="estimate">Szacunek AI</option></select></label></div>
      <div className="macro-grid editor-macros">
        {([{k:'kcal',label:'Kalorie',unit:'kcal'},{k:'protein',label:'Białko',unit:'g'},{k:'carbs',label:'Węglowodany',unit:'g'},{k:'fat',label:'Tłuszcze',unit:'g'},{k:'fiber',label:'Błonnik',unit:'g'}] as const).map(f=><label key={f.k} className="macro-field">{f.label}<div className="input-unit"><input type="number" min="0" step="any" inputMode="decimal" placeholder="—" value={meal[f.k]??''} onChange={e=>update(f.k,numberOrNull(e.target.value))}/><span>{f.unit}</span></div></label>)}
      </div>
      <div className={`source-note ${meal.source==='estimate'?'estimated':''}`}>{meal.source==='estimate'?<AlertCircle size={17}/>:<ShieldCheck size={17}/>} {meal.source==='estimate'?'Wartości są szacunkowe. Możesz je dowolnie poprawić.':'Te wartości zostaną zapisane dokładnie tak, jak je wpiszesz.'}</div>
   </div>
   <div className="form-section"><div className="section-inline spaced"><div className="section-title">Składniki <span className="small-muted">(opcjonalnie)</span></div><button className="text-button" type="button" onClick={addComponent}><Plus size={16}/> Dodaj</button></div>
    {meal.components.length?meal.components.map(c=><div className="component-row" key={c.id}>
     <input aria-label="Składnik" placeholder="Składnik" value={c.name} onChange={e=>componentChange(c.id,'name',e.target.value)}/>
     <input aria-label="Gramy" placeholder="g" inputMode="decimal" type="number" min="0" step="any" value={c.grams??''} onChange={e=>componentChange(c.id,'grams',e.target.value)}/>
     <input aria-label="Kcal składnika" placeholder="kcal" inputMode="decimal" type="number" min="0" step="any" value={c.kcal??''} onChange={e=>componentChange(c.id,'kcal',e.target.value)}/>
     <button type="button" className="icon-button" aria-label="Usuń składnik" onClick={()=>update('components',meal.components.filter(x=>x.id!==c.id))}><Trash2 size={17}/></button>
    </div>):<p className="small-muted">Możesz zapisać samo makro z cateringu albo rozpisać składniki osobno.</p>}
    {meal.components.length>0&&<button type="button" className="text-button" onClick={calculateFromComponents}>Przelicz sumę z wartości składników</button>}
    {meal.components.length>0&&<p className="hint">Przeliczenie uruchamia się tylko po kliknięciu — nie zmienia automatycznie liczb z etykiety.</p>}
   </div>
   {error&&<div className="inline-error" role="alert">{error}</div>}
   <div className="editor-footer"><button className="button button-light" type="button" onClick={onClose}>Anuluj</button><button className="button button-primary" type="submit" disabled={busy}>{busy?<LoaderCircle className="spin" size={18}/>:null} Zapisz posiłek</button></div>
  </form>
 </div></div>;
}
