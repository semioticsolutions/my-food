import type { ParseResult } from '../types';
function find(text:string, patterns:RegExp[]):number|null {
  for (const r of patterns){ const m=text.match(r);if(m) return Number(m[1].replace(',','.')); } return null;
}
export function parseLocal(text:string):ParseResult {
  const kcal=find(text,[/(\d+(?:[.,]\d+)?)\s*(?:kcal|kalori(?:e|i|a)?)/i,/(?:kalorie|kcal|energia)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i]);
  const protein=find(text,[/(?:białko|bialko|protein|b)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i,/(\d+(?:[.,]\d+)?)\s*g?\s*(?:białka|bialka)/i]);
  const carbs=find(text,[/(?:węglowodany|weglowodany|węgle|wegle|carbs|w)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i,/(\d+(?:[.,]\d+)?)\s*g?\s*(?:węglowodanów|weglowodanow|węgli|wegli)/i]);
  const fat=find(text,[/(?:tłuszcze|tluszcze|tłuszcz|tluszcz|fat|t)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*g?\b/i,/(\d+(?:[.,]\d+)?)\s*g?\s*(?:tłuszczu|tluszczu)/i]);
  const fiber=find(text,[/(?:błonnik|blonnik|fiber)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i,/(\d+(?:[.,]\d+)?)\s*g\s*(?:błonnika|blonnika)/i]);
  const time=text.match(/(?:\bo\s+|godzin(?:ie|a)\s+)([0-2]?\d)[:.]([0-5]\d)\b/i);
  const d=new Date();if(time){d.setHours(Number(time[1]),Number(time[2]),0,0);}
  if (/\bwczoraj\b/i.test(text)) d.setDate(d.getDate()-1);
  let name=text.replace(/(?:o\s+|godzin(?:ie|a)\s+)[0-2]?\d[:.][0-5]\d/gi,'').replace(/\bwczoraj\b/gi,'')
    .replace(/\d+(?:[.,]\d+)?\s*(?:kcal|kalorii|kalorie)/gi,'')
    .replace(/(?:kcal|kalorie|energia|białko|bialko|b|węglowodany|weglowodany|węgle|wegle|w|tłuszcze|tluszcze|tłuszcz|tluszcz|t|błonnik|blonnik)\s*[:=]?\s*\d+(?:[.,]\d+)?\s*g?/gi,'')
    .replace(/\d+(?:[.,]\d+)?\s*g\s*(?:białka|bialka|węglowodanów|weglowodanow|węgli|wegli|tłuszczu|tluszczu)/gi,'')
    .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g,'').replace(/\s{2,}/g,' ');
  if(!name) name='Nowy posiłek';
  return {name:name.slice(0,140),kcal,protein,carbs,fat,fiber,source:[kcal,protein,carbs,fat].some(v=>v!==null)?'label':'estimate',consumedAt:d.toISOString(),components:[]};
}
