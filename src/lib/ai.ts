import { supabase } from './supabase';
import type { ParseResult } from '../types';
export async function analyzeMeal(text:string,image?:string):Promise<ParseResult>{
 if(!supabase) throw new Error('Najpierw skonfiguruj Supabase, a następnie zaloguj się.');
 const {data,error}=await supabase.functions.invoke('meal-ai',{body:{action:'parse',text,image}});
 if(error) throw new Error(`Analiza AI: ${error.message}`);
 if(data?.error) throw new Error(data.error);
 return data as ParseResult;
}
export async function transcribeAudio(blob:Blob):Promise<string>{
 if(!supabase)throw new Error('Najpierw skonfiguruj Supabase.');
 const form=new FormData();
 const ext=blob.type.includes('mp4')?'m4a':'webm';
 form.append('file',blob,`nagranie.${ext}`);
 form.append('action','transcribe');
 const {data,error}=await supabase.functions.invoke('meal-ai',{body:form});
 if(error)throw new Error(`Transkrypcja: ${error.message}`);
 if(data?.error)throw new Error(data.error);
 return data.text;
}
export async function resizePhoto(file:File):Promise<string>{
 if(!file.type.startsWith('image/'))throw new Error('Wybierz plik obrazu.');
 if(file.size>20*1024*1024)throw new Error('Zdjęcie jest za duże (maks. 20 MB).');
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 return canvas.toDataURL('image/jpeg',0.77);
}
