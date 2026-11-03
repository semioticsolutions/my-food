export type Source = 'manual' | 'label' | 'estimate';
export type Component = { id: string; name: string; grams: number | null; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null };
export type Meal = {
  id: string; name: string; consumedAt: string;
  kcal: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null;
  source: Source; rawText: string; components: Component[];
  updatedAt: string; deletedAt: string | null;
};
export type MeasureType = 'weight' | 'glucose' | 'systolic' | 'diastolic';
export type Measure = { id: string; type: MeasureType; at: string; value: number; unit: string; source: string };
export type ParseResult = { name: string; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; source: Source; components: Component[]; consumedAt?: string; note?: string };
export type Page = 'diary' | 'analytics' | 'health' | 'settings';
