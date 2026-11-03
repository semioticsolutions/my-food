import { openDB, type DBSchema } from 'idb';
import type { Meal,Measure } from '../types';
interface AppDB extends DBSchema {
  meals: { key: string; value: Meal };
  measurements: { key: string; value: Measure };
}
const dbp = openDB<AppDB>('posilki-local-v1', 1, {
  upgrade(db) { db.createObjectStore('meals',{keyPath:'id'}); db.createObjectStore('measurements',{keyPath:'id'}); }
});
export const getMeals = async () => (await dbp).getAll('meals');
export const putMeal = async (m:Meal) => (await dbp).put('meals',m);
export const getMeasures = async () => (await dbp).getAll('measurements');
export async function putMeasures(list:Measure[]) {
  const db=await dbp; const tx=db.transaction('measurements','readwrite');
  for(const m of list) tx.store.put(m); await tx.done;
}
export async function clearDemo() {
  const db=await dbp; const tx=db.transaction('meals','readwrite');
  for(const m of await tx.store.getAll()) if (m.rawText === '__demo__') await tx.store.delete(m.id);
  await tx.done;
}
