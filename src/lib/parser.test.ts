import {describe,it,expect} from 'vitest';
import {parseLocal} from './parser';
import {parseHealthRecord} from './health';
describe('parser etykiet',()=>{
 it('zachowuje dokładne kcal oraz makroskładniki',()=>{
  const m=parseLocal('Kurczak curry, 625 kcal, B: 38 g, W: 68 g, T: 22 g');
  expect([m.kcal,m.protein,m.carbs,m.fat]).toEqual([625,38,68,22]);
  expect(m.source).toBe('label');
 });
 it('rozróżnia brakujące wartości od zera',()=>{
  const m=parseLocal('Sałatka pomidorowa z cebulą i oliwą 300 g');
  expect(m.kcal).toBe(null);expect(m.source).toBe('estimate');
 });
});
describe('import Apple Zdrowie',()=>{
 it('konwertuje glukozę z mmol/L na mg/dL',()=>{
  const x=parseHealthRecord('<Record type="HKQuantityTypeIdentifierBloodGlucose" sourceName="Glukometr" unit="mmol/L" startDate="2026-01-02 13:15:00 +0100" value="5.5"/>');
  expect(x?.value).toBeCloseTo(99.1,1);
 });
 it('pomija nieobsługiwane rekordy',()=>{
  expect(parseHealthRecord('<Record type="HKQuantityTypeIdentifierStepCount" unit="count" value="1" startDate="2026-01-02 13:15:00 +0100"/>')).toBe(null);
 });
});
