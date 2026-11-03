export function localDay(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function today() { return localDay(new Date().toISOString()); }
export function dayDate(day: string) { return new Date(`${day}T12:00:00`); }
export function addDays(day: string, count: number) { const d=dayDate(day); d.setDate(d.getDate()+count); return localDay(d.toISOString()); }
export const shortDate = (day: string) => dayDate(day).toLocaleDateString('pl-PL',{day:'numeric',month:'short'});
export const fullDate = (day: string) => dayDate(day).toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'});
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'});
export function forDateInput(iso: string) {
 const d = new Date(iso); const n = (x: number) => String(x).padStart(2,'0');
 return `${d.getFullYear()}-${n(d.getMonth()+1)}-${n(d.getDate())}T${n(d.getHours())}:${n(d.getMinutes())}`;
}
export function num(v: number | null | undefined) { return v == null ? '—' : new Intl.NumberFormat('pl-PL',{maximumFractionDigits:1}).format(v); }
