import {useCallback,useEffect,useMemo,useState} from 'react';
import {LayoutDashboard,ChartColumnIncreasing,HeartPulse,Settings,Plus,CalendarDays,ChevronLeft,ChevronRight,ArrowUpRight,Utensils,Trash2,Pencil,Cloud,CloudOff,RefreshCw,Download,LogIn,LogOut,CheckCircle2,Info,ShieldCheck,Leaf,BookOpen} from 'lucide-react';
import {ResponsiveContainer,BarChart,Bar,CartesianGrid,XAxis,YAxis,Tooltip,Cell} from 'recharts';
import type {Session} from '@supabase/supabase-js';
import type {Meal,Measure,Page} from './types';
import {addDays,fullDate,localDay,num,shortDate,timeOf,today} from './lib/date';
import {getMeals,getMeasures,putMeal,clearDemo} from './lib/db';
import {supabase} from './lib/supabase';
import {syncMeals,syncHealth} from './lib/sync';
import MealEditor from './components/MealEditor';
import HealthView from './components/HealthView';
import './styles.css';
const nav:[Page,string,typeof LayoutDashboard][]=[['diary','Dziennik',LayoutDashboard],['analytics','Analizy',ChartColumnIncreasing],['health','Zdrowie',HeartPulse],['settings','Ustawienia',Settings]];
const live=(items:Meal[])=>items.filter(m=>!m.deletedAt);
function toDay(items:Meal[],day:string){return items.filter(m=>localDay(m.consumedAt)===day);}
function total(items:Meal[],key:'kcal'|'protein'|'carbs'|'fat'|'fiber'){return +items.reduce((sum,m)=>sum+(m[key]??0),0).toFixed(1);}
function seedMeals():Meal[]{const now=new Date();const data:[number,number,string,number,number,number,number,string][]=[
 [0,8,'Owsianka z bananem',412,14,66,11,'estimate'],[0,13,'Kurczak curry z ryżem',625,38,68,22,'label'],[0,19,'Sałatka z pomidorów i oliwy',270,5,19,20,'estimate'],
 [-1,8,'Jajka z pieczywem',460,27,31,23,'estimate'],[-1,14,'Łosoś i ziemniaki',690,43,61,30,'label'],[-1,20,'Jogurt naturalny i owoce',215,13,34,4,'manual'],
 [-2,9,'Kanapki z twarożkiem',480,31,52,16,'estimate'],[-2,14,'Pasta z indykiem',710,46,78,23,'label'],[-3,9,'Tosty i awokado',510,17,45,29,'estimate'],[-3,18,'Ryż z warzywami',625,16,98,18,'estimate'],
 [-4,8,'Omlet z pomidorami',398,29,12,25,'estimate'],[-4,15,'Catering: ryba z kaszą',650,37,72,24,'label'],[-5,12,'Makaron z pesto',760,23,92,32,'estimate'],[-6,17,'Zupa krem i pieczywo',420,12,49,18,'estimate']
 ];return data.map(([days,hour,name,kcal,protein,carbs,fat,source])=>{const d=new Date(now);d.setDate(d.getDate()+days);d.setHours(hour,days===0?25:15,0,0);return {id:crypto.randomUUID(),consumedAt:d.toISOString(),name,kcal,protein,carbs,fat,fiber:null,source:source as Meal['source'],rawText:'__demo__',components:[],updatedAt:new Date().toISOString(),deletedAt:null};});}
function downloadFile(name:string,data:string,type:string){const b=new Blob([data],{type});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
export default function App(){
 const [page,setPage]=useState<Page>('diary');const [allMeals,setAllMeals]=useState<Meal[]>([]);
 const [measurements,setMeasurements]=useState<Measure[]>([]);
 const [day,setDay]=useState(today());const [editor,setEditor]=useState<{open:boolean,meal?:Meal}>({open:false});
 const [loaded,setLoaded]=useState(false);const [session,setSession]=useState<Session|null>(null);
 const [email,setEmail]=useState('');const [accountMessage,setAccountMessage]=useState('');
 const [syncing,setSyncing]=useState(false);const [syncMessage,setSyncMessage]=useState('');
 const [healthCloud,setHealthCloud]=useState(false);const [showDemo,setShowDemo]=useState(false);
 const [toast,setToast]=useState('');
 const refresh=useCallback(async()=>{setAllMeals(await getMeals());setMeasurements(await getMeasures());},[]);
 useEffect(()=>{void refresh().then(()=>setLoaded(true));if(!supabase)return;
  supabase.auth.getSession().then(({data})=>setSession(data.session));
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
  return ()=>subscription.unsubscribe();
 },[refresh]);
 const synchronize=useCallback(async(shareHealth=false)=>{
  if(!supabase||!session)return;
  setSyncing(true);setSyncMessage('');
  try {const mealsCount=await syncMeals(supabase,session.user.id);
   if(shareHealth||healthCloud)await syncHealth(supabase,session.user.id,true);
   await refresh();setSyncMessage(`Zsynchronizowano ${mealsCount} posiłków${shareHealth||healthCloud?' i pomiary':''}.`);
  }catch(e){setSyncMessage(`Błąd: ${e instanceof Error?e.message:String(e)}`);}
  finally{setSyncing(false);}
 },[session,refresh,healthCloud]);
 useEffect(()=>{if(session){void synchronize(false);}},[session?.user.id]); // intentional: run on sign-in only
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(id);},[toast]);
 async function save(m:Meal){await putMeal(m);await refresh();setDay(localDay(m.consumedAt));setToast('Posiłek zapisany.');if(session)void synchronize(false);}
 async function remove(m:Meal){if(!confirm(`Usunąć posiłek „${m.name}”?`))return;await putMeal({...m,deletedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});await refresh();setToast('Posiłek usunięty.');if(session)void synchronize(false);}
 async function demo(){await clearDemo();for(const m of seedMeals())await putMeal(m);await refresh();setShowDemo(true);setToast('Dodano przykładowe posiłki.');}
 async function clearSamples(){await clearDemo();await refresh();setShowDemo(false);setToast('Usunięto przykładowe posiłki.');}
 async function login(e:React.FormEvent){e.preventDefault();if(!supabase)return;setAccountMessage('');
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.href}});
  setAccountMessage(error?`Błąd: ${error.message}`:'Wysłano link logowania. Sprawdź e-mail.');
 }
 const meals=useMemo(()=>live(allMeals).sort((a,b)=>b.consumedAt.localeCompare(a.consumedAt)),[allMeals]);
 const daily=useMemo(()=>toDay(meals,day),[meals,day]);
 const days14=useMemo(()=>Array.from({length:14},(_,i)=>{const d=addDays(today(),i-13);const list=toDay(meals,d);return {day:d,label:shortDate(d),kcal:total(list,'kcal'),protein:total(list,'protein'),carbs:total(list,'carbs'),fat:total(list,'fat'),count:list.length};}),[meals]);
 const maxKcalDay=useMemo(()=>days14.reduce((a,b)=>a.kcal>b.kcal?a:b),[days14]);
 const known=meals.filter(m=>m.rawText==='__demo__').length;
 const needDemo=!meals.length;
 const showDates=days14.some(d=>d.count>0);
 return <div className="app-shell">
  <aside className="sidebar"><div className="brand"><div className="brand-icon"><Leaf size={24}/></div><div><strong>posiłki<span className="brand-dot">.</span></strong><span className="brand-sub">Twoje dane, Twój rytm</span></div></div>
   <div className="nav-caption">PRZESTRZEŃ</div><nav className="nav-list" aria-label="Główna nawigacja">{nav.map(([id,label,Icon])=><button key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>setPage(id)}><Icon size={19}/><span>{label}</span>{page===id&&<span className="nav-active-dot"/>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="aside-tip"><div className="tip-top"><BookOpen size={17}/> Twoja historia</div><p>Wartości z etykiety pozostają takie, jak je podasz. AI może pomagać, nie decyduje za Ciebie.</p></div><div className="aside-user"><span className="user-avatar">{session?.user.email?.[0]?.toUpperCase()||'P'}</span><div><strong>{session?'Konto połączone':'Tryb lokalny'}</strong><small>{session?'Synchronizacja Supabase':'Dane w tej przeglądarce'}</small></div>{session?<Cloud size={17} color="#83c7ac"/>:<CloudOff size={17}/>}</div></div>
  </aside>
  <main className="main-panel"><header className="topbar"><div className="breadcrumb">Twój dziennik <span>/</span> {nav.find(x=>x[0]===page)?.[1]}</div><div className="top-actions"><span className={`sync-status ${session?'on':''}`}><i/>{session?'Chmura aktywna':'Lokalnie'}</span><button className="button button-primary add-top" onClick={()=>setEditor({open:true})}><Plus size={18}/> Dodaj posiłek</button></div></header>
  {!loaded?<div className="loading">Wczytywanie dziennika…</div>:<div className="content">
   {page==='diary'&&<div className="view-stack">
     <div className="page-heading heading-flex"><div><div className="eyebrow">DZISIAJ W TWOIM RYTMIE</div><h1>Dziennik posiłków <span className="heading-leaf">✳</span></h1><p>Prosty sposób na obserwowanie tego, co jesz.</p></div><button className="button button-secondary add-main" onClick={()=>setEditor({open:true})}><Plus size={18}/> Nowy wpis</button></div>
     <div className="date-bar"><div className="date-label"><CalendarDays size={18}/><strong>{fullDate(day)}</strong>{day===today()&&<span className="tag">Dziś</span>}</div><div className="date-controls"><button className="icon-button" onClick={()=>setDay(addDays(day,-1))} aria-label="Poprzedni dzień"><ChevronLeft size={19}/></button><button className="button button-light tiny-button" onClick={()=>setDay(today())}>Dzisiaj</button><button className="icon-button" onClick={()=>setDay(addDays(day,1))} aria-label="Następny dzień"><ChevronRight size={19}/></button></div></div>
     <div className="summary-grid">{([{key:'kcal',label:'Kalorie',unit:'kcal',icon:'✦',color:'teal'},{key:'protein',label:'Białko',unit:'g',icon:'◉',color:'orange'},{key:'carbs',label:'Węglowodany',unit:'g',icon:'◈',color:'blue'},{key:'fat',label:'Tłuszcze',unit:'g',icon:'◐',color:'purple'}] as const).map(x=><div key={x.key} className="summary-card"><span className={`summary-symbol ${x.color}`}>{x.icon}</span><span className="stat-caption">{x.label}</span><div className="big-stat">{num(total(daily,x.key))}<span>{x.unit}</span></div><div className="summary-foot">{daily.length?`${daily.filter(m=>m[x.key]!=null).length} / ${daily.length} wpisów z daną wartością`:'Brak danych'}</div></div>)}</div>
     <div className="main-grid"><div className="card meals-card"><div className="card-title-row"><div><h3>Twoje posiłki</h3><p className="small-muted">{daily.length} {daily.length===1?'wpis':'wpisów'} tego dnia</p></div><span className="tag soft">Według godziny</span></div>
      {daily.length?<div className="meal-list">{daily.slice().reverse().map(m=><div className="meal-item" key={m.id}><div className="meal-clock">{timeOf(m.consumedAt)}</div><div className="timeline"><span/></div><div className="meal-body"><div className="meal-line"><div><strong>{m.name}</strong><div className="meal-macros"><b>{num(m.kcal)}</b> kcal · B {num(m.protein)} g · W {num(m.carbs)} g · T {num(m.fat)} g</div></div><div className="meal-actions"><button className="icon-button" aria-label="Edytuj posiłek" onClick={()=>setEditor({open:true,meal:m})}><Pencil size={16}/></button><button className="icon-button danger" aria-label="Usuń posiłek" onClick={()=>remove(m)}><Trash2 size={16}/></button></div></div><span className={`origin ${m.source}`}>{m.source==='label'?'Dane z etykiety':m.source==='estimate'?'Szacunek':'Ręcznie'}</span></div></div>)}</div>:<div className="empty-meals"><div className="empty-drawing"><Utensils size={29}/></div><strong>Tu zaczyna się Twój dzień</strong><p>Dodaj pierwszy posiłek i zobacz jego kalorie oraz makroskładniki.</p><button className="button button-primary" onClick={()=>setEditor({open:true})}><Plus size={17}/> Dodaj posiłek</button>{needDemo&&<button className="text-button" onClick={demo}>Zobacz przykładowe dane</button>}</div>}
     </div><div className="card insight-card"><div className="card-title-row"><div><h3>Ostatnie 14 dni</h3><p className="small-muted">Kalorie na przestrzeni czasu</p></div><ArrowUpRight size={19} color="#73867d"/></div>
       {showDates?<div className="small-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={days14} margin={{top:10,right:0,left:-27,bottom:0}}><CartesianGrid vertical={false} stroke="#e7ebe6" strokeDasharray="3 4"/><XAxis dataKey="label" tick={{fontSize:10,fill:'#849187'}} interval={2} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:'#849187'}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>[`${num(Number(v))} kcal`,'Kalorie']}/><Bar dataKey="kcal" barSize={15} radius={[5,5,0,0]}>{days14.map(d=><Cell key={d.day} fill={d.day===day?'#2d816e':'#b4d4c1'}/>)}</Bar></BarChart></ResponsiveContainer></div>:<div className="blank-chart compact"><ChartColumnIncreasing size={28}/><p>Wykres pojawi się po dodaniu posiłków.</p></div>}
       <div className="insight-footer"><div><span className="stat-caption">Najwyższy dzień</span><strong>{showDates?`${num(maxKcalDay.kcal)} kcal`:'—'}</strong></div><button className="text-button" onClick={()=>setPage('analytics')}>Więcej analiz <ArrowUpRight size={15}/></button></div>
     </div></div>
     {known>0&&<div className="demo-hint"><Info size={17}/> Widzisz {known} przykładowych wpisów. <button onClick={clearSamples}>Usuń dane demonstracyjne</button></div>}
   </div>}
   {page==='analytics'&&<div className="view-stack"><div className="page-heading"><div className="eyebrow">TRENDY I NAWYKI</div><h1>Twoje analizy</h1><p>Wykresy na podstawie zapisanych posiłków.</p></div>
      <div className="card analytics-chart"><div className="card-title-row"><div><h3>Kalorie dziennie</h3><p className="small-muted">Ostatnie 14 dni</p></div><span className="tag soft">kcal</span></div><div className="big-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={days14} margin={{top:12,right:10,left:-15,bottom:2}}><CartesianGrid vertical={false} stroke="#e6ebe6" strokeDasharray="3 4"/><XAxis dataKey="label" tick={{fontSize:12,fill:'#829188'}}/><YAxis tick={{fontSize:12,fill:'#829188'}}/><Tooltip formatter={v=>[`${num(Number(v))} kcal`,'Kalorie']}/><Bar dataKey="kcal" radius={[6,6,0,0]} maxBarSize={42}>{days14.map(d=><Cell key={d.day} fill={d.day===today()?'#2b806d':'#a8cdbb'}/>)}</Bar></BarChart></ResponsiveContainer></div></div>
      <div className="analytics-numbers">{([{k:'kcal',label:'Średnie kalorie',unit:'kcal'},{k:'protein',label:'Średnie białko',unit:'g'},{k:'carbs',label:'Średnie węglowodany',unit:'g'},{k:'fat',label:'Średnie tłuszcze',unit:'g'}] as const).map(f=>{const days=days14.filter(d=>d.count>0);return <div className="card" key={f.k}><span className="stat-caption">{f.label} / dzień z wpisami</span><div className="big-stat">{days.length?num(days.reduce((s,d)=>s+d[f.k],0)/days.length):'—'} <span>{f.unit}</span></div></div>;})}</div>
      <div className="info-blank"><Info size={20}/> Suma dnia może być zaniżona, jeśli część wpisów ma brakujące wartości. Szacunki AI nie są pomiarami laboratoryjnymi.</div>
   </div>}
   {page==='health'&&<HealthView measurements={measurements} meals={meals} onRefresh={refresh}/>}
   {page==='settings'&&<div className="view-stack"><div className="page-heading"><div className="eyebrow">PRYWATNOŚĆ I SYNCHRONIZACJA</div><h1>Ustawienia</h1><p>Kontroluj, gdzie trafiają Twoje dane.</p></div>
     <div className="settings-grid"><section className="card settings-card"><div className="settings-icon"><Cloud size={22}/></div><h3>Supabase</h3><p className="small-muted">Dziennik działa lokalnie bez konfiguracji. Po zalogowaniu możesz przenosić posiłki między urządzeniami.</p>
       {!supabase?<div className="config-notice"><Info size={17}/> Brak konfiguracji VITE_SUPABASE_URL i klucza publishable. Instrukcja w README.md.</div>:session?<><div className="account-box"><CheckCircle2 size={19}/> Zalogowano: <strong>{session.user.email}</strong></div><button className="button button-secondary" disabled={syncing} onClick={()=>synchronize(false)}>{syncing?<RefreshCw size={17} className="spin"/>:<RefreshCw size={17}/>} Synchronizuj posiłki</button><button className="text-button" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Wyloguj</button></>:<form className="login-form" onSubmit={login}><label>Adres e-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="twoj@email.pl"/></label><button className="button button-primary" type="submit"><LogIn size={17}/> Wyślij link logowania</button></form>}
       {accountMessage&&<p className="small-muted">{accountMessage}</p>}{syncMessage&&<div className="small-muted">{syncMessage}</div>}
     </section><section className="card settings-card"><div className="settings-icon"><ShieldCheck size={22}/></div><h3>Dane zdrowotne</h3><p className="small-muted">Import ZIP/XML działa lokalnie. Domyślnie nie wysyłamy pomiarów do chmury.</p>
      <label className="toggle-row"><input type="checkbox" checked={healthCloud} onChange={e=>setHealthCloud(e.target.checked)}/><div><strong>Synchronizuj wybrane pomiary do Supabase</strong><p>Wymaga konta. Dzięki temu pojawią się na obu urządzeniach.</p></div></label>
      <button className="button button-secondary" onClick={()=>synchronize(true)} disabled={!session||syncing||!healthCloud}><Cloud size={17}/> Wyślij i pobierz pomiary</button>
      <p className="hint">Po włączeniu, kolejne synchronizacje konta również obejmą pomiary. Nie wysyłamy ich do AI automatycznie.</p>
     </section></div>
     <div className="card settings-card"><h3>Twoje dane i kopie zapasowe</h3><p className="small-muted">Eksport JSON zapisuje posiłki i pomiary z tej przeglądarki. Pozwala przechowywać własną kopię danych.</p><div className="action-row"><button className="button button-secondary" onClick={()=>downloadFile(`posilki-backup-${today()}.json`,JSON.stringify({exportedAt:new Date().toISOString(),meals:allMeals,health:measurements},null,2),'application/json')}><Download size={17}/> Pobierz kopię JSON</button><button className="button button-light" onClick={()=>{const header='data,godzina,nazwa,kcal,bialko_g,weglowodany_g,tluszcze_g';const rows=meals.map(m=>[localDay(m.consumedAt),timeOf(m.consumedAt),m.name,m.kcal??'',m.protein??'',m.carbs??'',m.fat??''].map(x=>`"${String(x).replaceAll('"','""')}"`).join(','));downloadFile(`posilki-${today()}.csv`,'\ufeff'+[header,...rows].join('\n'),'text/csv;charset=utf-8');}}><Download size={17}/> Eksport CSV</button></div>
      <div className="divider"/>{showDemo||known>0?<button className="text-button" onClick={clearSamples}>Usuń przykładowe posiłki</button>:<button className="text-button" onClick={demo}>Wstaw przykładowe posiłki do prezentacji</button>}
     </div>
     <div className="info-blank"><Info size={20}/> To prototyp, nie wyrób medyczny. Analiza zależności między posiłkami i glukozą jest obserwacyjna. Szczegóły instalacji opisano w README.md.</div>
   </div>}
  </div>}
  </main>
  <nav className="mobile-nav" aria-label="Nawigacja mobilna">{nav.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={21}/><span>{label}</span></button>)}<button className="mobile-add" onClick={()=>setEditor({open:true})}><Plus size={23}/><span>Dodaj</span></button></nav>
  {editor.open&&<MealEditor initial={editor.meal} onClose={()=>setEditor({open:false})} onSave={save}/>}
  {toast&&<div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
 </div>;
}
