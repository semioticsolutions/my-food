// Supabase Edge Function — klucz OpenAI pozostaje WYŁĄCZNIE po stronie serwera.
// Supabase 2026: zintegrowane CORS + zweryfikowany JWT użytkownika.
import { withSupabase } from 'npm:@supabase/server@^1';

const schema = {
  type: 'object', additionalProperties: false,
  required: ['name','kcal','protein','carbs','fat','fiber','source','components','note'],
  properties: {
    name:{type:'string'},
    kcal:{type:['number','null']},protein:{type:['number','null']},
    carbs:{type:['number','null']},fat:{type:['number','null']},fiber:{type:['number','null']},
    source:{type:'string',enum:['label','estimate']},
    note:{type:'string'},
    components:{type:'array',items:{
      type:'object',additionalProperties:false,
      required:['name','grams','kcal','protein','carbs','fat'],
      properties:{name:{type:'string'},grams:{type:['number','null']},kcal:{type:['number','null']},protein:{type:['number','null']},carbs:{type:['number','null']},fat:{type:['number','null']}}
    }}
  }
};
const instructions = `Jesteś polskim parserem dziennika żywieniowego. 
Interpretujesz opisy posiłków i zdjęcia etykiet lub dań. Zwróć wyłącznie dane zgodne ze schematem.
Reguły bezwzględne:
1. Wartości żywieniowe jawnie podane przez użytkownika LUB widoczne na etykiecie przepisz DOKŁADNIE. Nigdy nie zastępuj ich oszacowaniem z nazwy dania. Nie zaokrąglaj znanych wartości.
2. Zwróć null przy brakującej liczbie, NIE zero. Zero tylko jeśli rzeczywiście jest podane zero.
3. Zwróć source=label jeśli co najmniej jedna wartość jest jawna, inaczej estimate.
4. Jeśli nie ma wartości, a użytkownik opisuje skład i porcję, możesz dać orientacyjne oszacowanie. Wyjaśnij w note niepewność porcji (szczególnie oleju/oliwy).
5. Dla etykiety określ, czy dane są na 100 g czy na porcję. Jeśli porcja jest nieznana i etykieta podaje tylko na 100 g, pozostaw sumaryczne pola null i zapisz tę informację w note — nie zakładaj wagi.
6. W components umieść edytowalne składniki, jeśli potrafisz je rozpoznać. Nie twórz fikcyjnego dokładnego składu dania cateringowego.
7. Wartości kcal i makr mogą różnić się od prostego przeliczenia 4/4/9. Nie koryguj etykiety.`;

async function openai(url:string, init:RequestInit) {
  const key=Deno.env.get('OPENAI_API_KEY');
  if(!key) throw new Error('Brak sekretu OPENAI_API_KEY w Supabase.');
  const r=await fetch(`https://api.openai.com/v1/${url}`,{
    ...init, headers:{Authorization:`Bearer ${key}`,...(init.headers||{})}
  });
  const payload=await r.json();
  if(!r.ok)throw new Error(payload?.error?.message||`OpenAI HTTP ${r.status}`);
  return payload;
}

export default {
  fetch: withSupabase({auth:'user'}, async (req,ctx) => {
    if(req.method!=='POST') return Response.json({error:'Wymagany POST.'},{status:405});
    const allowed=Deno.env.get('AI_ALLOWED_USER_ID');
    if(!allowed || String(ctx.userClaims?.sub)!==allowed) return Response.json({error:'Brak uprawnień do AI.'},{status:403});
    try {
      const contentType=req.headers.get('content-type')||'';
      if(contentType.includes('multipart/form-data')) {
        const form=await req.formData();
        if(form.get('action')!=='transcribe')return Response.json({error:'Nieznana akcja.'},{status:400});
        const file=form.get('file');
        if(!(file instanceof File)||file.size>12_000_000||file.size===0) return Response.json({error:'Nieprawidłowe nagranie (maks. 12 MB).'},{status:400});
        const body=new FormData();body.set('model','gpt-transcribe');body.set('file',file,file.name);
        body.set('prompt','Transkrypcja po polsku: nazwy potraw, kalorie, białko, węglowodany, tłuszcze, gramatury i godziny.');
        const result=await openai('audio/transcriptions',{method:'POST',body});
        return Response.json({text:result.text||''});
      }
      const body=await req.json();
      if(body?.action!=='parse')return Response.json({error:'Nieznana akcja.'},{status:400});
      const text=String(body?.text||'').slice(0,4000);
      const image=body?.image;
      if(!text&&!image)return Response.json({error:'Podaj opis lub zdjęcie.'},{status:400});
      if(image && (typeof image!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(image)||image.length>5_000_000))
        return Response.json({error:'Niedozwolony format lub zbyt duże zdjęcie.'},{status:400});
      const content:any[]=[{type:'input_text',text:text||'Odczytaj danie lub etykietę ze zdjęcia.'}];
      if(image)content.push({type:'input_image',image_url:image});
      // The public frontend never supplies an API key. Restrict model selection on the server.
      const allowedModels=['gpt-6-luna','gpt-6.1-terra'] as const;
      const requestedModel=String(body.model||'');
      const fallbackModel=Deno.env.get('OPENAI_MODEL')||'gpt-6-luna';
      const model=allowedModels.includes(requestedModel as typeof allowedModels[number])?requestedModel:
        allowedModels.includes(fallbackModel as typeof allowedModels[number])?fallbackModel:'gpt-6-luna';
      const result=await openai('responses',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model,reasoning:{effort:'none'},instructions,
          input:[{role:'user',content}],store:false,max_output_tokens:1600,
          text:{format:{type:'json_schema',name:'meal_data',strict:true,schema}}})
      });
      const output=result.output?.flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('');
      if(!output)throw new Error('Model nie zwrócił danych posiłku.');
      const meal=JSON.parse(output);
      for(const field of ['kcal','protein','carbs','fat','fiber']) {
        if(meal[field]!==null && (!Number.isFinite(meal[field])||meal[field]<0))meal[field]=null;
      }
      return Response.json(meal);
    } catch(e) {
      return Response.json({error: e instanceof Error?e.message:'Błąd analizy.'},{status:502});
    }
  })
};
