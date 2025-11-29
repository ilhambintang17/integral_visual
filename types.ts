export type RiemannMethod = 'left' | 'right' | 'midpoint' | 'trapezoidal' | 'simpson';

export interface AppState {
  funcStr: string;
  a: number;
  b: number;
  n: number;
  method: RiemannMethod;
}

export interface CalculationResult {
  approxArea: number;
  exactArea: number;
  error: number;
}
