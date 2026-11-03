import type { SupabaseClient } from '@supabase/supabase-js';
import type { Meal, Measure } from '../types';
import {getMeals,putMeal,getMeasures,putMeasures} from './db';
export async function syncMeals(client:SupabaseClient,userId:string):Promise<number>{
 const local=await getMeals();const remote:Meal[]=[];
 for(let from=0;;from+=500){
   const {data,error}=await client.from('meals').select('payload').order('updated_at',{ascending:false}).range(from,from+499);
   if(error) throw error;
   remote.push(...(data||[]).map(row=>row.payload as Meal));
   if(!data || data.length<500)break;
 }
 const map=new Map<string,Meal>(local.map(m=>[m.id,m]));
 for(const r of remote){const old=map.get(r.id);if(!old||r.updatedAt>old.updatedAt){await putMeal(r);map.set(r.id,r);}}
 const byRemote=new Map(remote.map(m=>[m.id,m]));
 const upload=[...map.values()].filter(m=>m.rawText!=="__demo__").filter(m=>!byRemote.has(m.id)||m.updatedAt>byRemote.get(m.id)!.updatedAt);
 for(let i=0;i<upload.length;i+=100){
   const rows=upload.slice(i,i+100).map(m=>({id:m.id,user_id:userId,payload:m,updated_at:m.updatedAt,deleted_at:m.deletedAt}));
   const {error}=await client.from('meals').upsert(rows,{onConflict:'id'});if(error)throw error;
 }
 return map.size;
}
export async function syncHealth(client:SupabaseClient,userId:string,uploadLocal:boolean):Promise<number>{
 const remote:Measure[]=[];
 for(let from=0;;from+=500){
   const {data,error}=await client.from('health_measurements').select('id,type,at,value,unit,source').order('at',{ascending:false}).range(from,from+499);
   if(error)throw error;
   remote.push(...(data||[]) as Measure[]);
   if(!data||data.length<500)break;
 }
 await putMeasures(remote);
 if(uploadLocal){
   const existing=new Set(remote.map(m=>m.id));const list=(await getMeasures()).filter(m=>!existing.has(m.id));
   for(let i=0;i<list.length;i+=250){
     const rows=list.slice(i,i+250).map(m=>({...m,user_id:userId}));
     const {error}=await client.from('health_measurements').upsert(rows,{onConflict:'user_id,id',ignoreDuplicates:true});if(error)throw error;
   }
 }
 return (await getMeasures()).length;
}
