import { AppState, CalculationResult } from '../types';

// We access the globally loaded mathjs library
declare global {
  interface Window {
    math: any;
  }
}

export const evaluateFunc = (funcStr: string, x: number): number => {
  try {
    const scope = { x: x, e: Math.E, pi: Math.PI };
    return window.math.evaluate(funcStr, scope);
  } catch (e) {
    return 0;
  }
};

const formatSubstitution = (funcStr: string, x: number): string => {
    // Create a display-friendly number (remove trailing zeros, max 3 decimals)
    const xStr = parseFloat(x.toFixed(3)).toString();
    // Regex to replace whole word 'x' with '(val)'
    // This handles x^2 -> (2)^2, 2*x -> 2*(2), sin(x) -> sin((2))
    // We surround in parens to ensure operator precedence looks correct visually
    return funcStr.replace(/\bx\b/g, `(${xStr})`);
};

export const calculateRiemannSum = (state: AppState): number => {
  const { funcStr, a, b, n, method } = state;
  const dx = (b - a) / n;
  let sum = 0;

  try {
    for (let i = 0; i < n; i++) {
      if (method === 'left') {
        sum += evaluateFunc(funcStr, a + i * dx) * dx;
      } else if (method === 'right') {
        sum += evaluateFunc(funcStr, a + (i + 1) * dx) * dx;
      } else if (method === 'midpoint') {
        sum += evaluateFunc(funcStr, a + (i + 0.5) * dx) * dx;
      } else if (method === 'trapezoidal') {
        const x1 = a + i * dx;
        const x2 = a + (i + 1) * dx;
        sum += 0.5 * (evaluateFunc(funcStr, x1) + evaluateFunc(funcStr, x2)) * dx;
      } else if (method === 'simpson') {
         // handled below
      }
    }

    if (method === 'simpson') {
        const simpsonN = n % 2 === 0 ? n : n + 1;
        const simpsonDx = (b - a) / simpsonN;
        let s = evaluateFunc(funcStr, a) + evaluateFunc(funcStr, b);
        
        for (let i = 1; i < simpsonN; i++) {
            const x = a + i * simpsonDx;
            const factor = i % 2 === 0 ? 2 : 4;
            s += factor * evaluateFunc(funcStr, x);
        }
        sum = (s * simpsonDx) / 3;
    }
  } catch (e) {
    console.error("Math evaluation error", e);
    return 0;
  }

  return sum;
};

export const calculateExactIntegral = (funcStr: string, a: number, b: number): number => {
  const n = 2000; 
  const dx = (b - a) / n;
  try {
    let sum = evaluateFunc(funcStr, a) + evaluateFunc(funcStr, b);
    for (let i = 1; i < n; i++) {
        const x = a + i * dx;
        sum += (i % 2 === 0 ? 2 : 4) * evaluateFunc(funcStr, x);
    }
    return (sum * dx) / 3;
  } catch (e) {
    return 0;
  }
};

export const getResults = (state: AppState): CalculationResult => {
  const approx = calculateRiemannSum(state);
  const exact = calculateExactIntegral(state.funcStr, state.a, state.b);
  return {
    approxArea: approx,
    exactArea: exact,
    error: Math.abs(exact - approx)
  };
};

export const getLatexFormula = (method: string): string => {
    // Menambahkan bentuk Limit Sigma dan Integral untuk menunjukkan definisi formal
    const integralPart = '\\int_{a}^{b} f(x) \\, dx = \\lim_{n \\to \\infty} ';
    
    switch(method) {
        case 'left': return `$$ ${integralPart} \\sum_{i=0}^{n-1} f(x_i) \\Delta x $$`;
        case 'right': return `$$ ${integralPart} \\sum_{i=1}^{n} f(x_i) \\Delta x $$`;
        case 'midpoint': return `$$ ${integralPart} \\sum_{i=0}^{n-1} f\\left(\\bar{x}_i\\right) \\Delta x $$`;
        case 'trapezoidal': return `$$ A \\approx \\frac{\\Delta x}{2} \\left[ f(x_0) + 2\\sum_{i=1}^{n-1} f(x_i) + f(x_n) \\right] $$`;
        case 'simpson': return `$$ A \\approx \\frac{\\Delta x}{3} \\left[ f(x_0) + 4\\sum_{ganjil} f(x_i) + 2\\sum_{genap} f(x_i) + f(x_n) \\right] $$`;
        default: return '';
    }
};

// Generate detailed step-by-step Latex strings
export const getDetailedSteps = (state: AppState): { step1: string, step2: string, step3: string, step4: string } => {
    const { a, b, n, funcStr, method } = state;
    const dx = (b - a) / n;
    
    // Step 1: Delta X
    const step1 = `$$ \\Delta x = \\frac{b - a}{n} = \\frac{${b} - ${a}}{${n}} = ${dx.toFixed(4)} $$`;

    // Step 2, 3, 4: Expansion, Substitution, Values
    let expansion = "";
    let substitution = "";
    let values = "";
    const maxShow = 3;

    if (method === 'left' || method === 'right' || method === 'midpoint') {
        let terms: string[] = [];
        let substTerms: string[] = [];
        let numValues: string[] = [];
        
        for(let i=0; i < n; i++) {
             // Logic to pick index based on method
             let xVal = 0;
             let label = "";

             if(method === 'left') { xVal = a + i * dx; label = `f(x_{${i}})`; }
             else if (method === 'right') { xVal = a + (i+1) * dx; label = `f(x_{${i+1}})`; }
             else { xVal = a + (i+0.5) * dx; label = `f(\\bar{x}_{${i+1}})`; }

             if (i < maxShow || i === n - 1) {
                 if (i === maxShow && n > maxShow + 1) {
                     terms.push("...");
                     substTerms.push("...");
                     numValues.push("...");
                 } else {
                     terms.push(label);
                     // Create substitution string e.g. (0)^2 + 4
                     substTerms.push(formatSubstitution(funcStr, xVal));
                     // Calculate value
                     const fVal = evaluateFunc(funcStr, xVal);
                     numValues.push(fVal.toFixed(2));
                 }
             }
        }
        
        expansion = `$$ A \\approx \\Delta x [ ${terms.join(" + ")} ] $$`;
        substitution = `$$ A \\approx ${dx.toFixed(4)} [ ${substTerms.join(" + ")} ] $$`;
        values = `$$ A \\approx ${dx.toFixed(4)} [ ${numValues.join(" + ")} ] $$`;

    } else if (method === 'trapezoidal') {
         expansion = `$$ A \\approx \\frac{\\Delta x}{2} [ f(x_0) + 2f(x_1) + ... + 2f(x_{n-1}) + f(x_n) ] $$`;
         
         // Build substitution terms
         const sub0 = formatSubstitution(funcStr, a);
         const sub1 = formatSubstitution(funcStr, a+dx);
         const subn = formatSubstitution(funcStr, b);
         substitution = `$$ A \\approx \\frac{${dx.toFixed(4)}}{2} [ ${sub0} + 2(${sub1}) + ... + ${subn} ] $$`;

         // Simplified values for display
         const f0 = evaluateFunc(funcStr, a).toFixed(2);
         const f1 = evaluateFunc(funcStr, a+dx).toFixed(2);
         const fn = evaluateFunc(funcStr, b).toFixed(2);
         values = `$$ A \\approx \\frac{${dx.toFixed(4)}}{2} [ ${f0} + 2(${f1}) + ... + ${fn} ] $$`;

    } else {
        expansion = `$$ A \\approx \\text{Menggunakan Aturan Simpson (Parabola)} $$`;
        substitution = `$$ \\text{Substitusi } x_i \\text{ ke dalam } ${funcStr} \\text{ dengan bobot 1, 4, 2...} $$`;
        values = `$$ A \\approx \\frac{\\Delta x}{3} [ (1)\\cdot f(x_0) + (4)\\cdot f(x_1) + ... ] $$`;
    }

    return {
        step1,
        step2: expansion,
        step3: substitution,
        step4: values
    };
};

export interface FTCDataPoint {
  x: number;
  y_f: number;
  y_F: number;
}

export const generateAccumulationData = (funcStr: string, a: number, b: number): FTCDataPoint[] => {
    // If range is invalid, return empty or single point
    if (a >= b) {
        return [{ x: a, y_f: evaluateFunc(funcStr, a), y_F: 0 }];
    }

    const steps = 150; // Resolution for the animation graph
    const dx = (b - a) / steps;
    const data: FTCDataPoint[] = [];
    let currentF = 0;

    // We start from a
    const y0 = evaluateFunc(funcStr, a);
    data.push({ x: a, y_f: y0, y_F: 0 });

    for (let i = 1; i <= steps; i++) {
        const xPrev = a + (i - 1) * dx;
        const xCurr = a + i * dx;
        
        const yPrev = evaluateFunc(funcStr, xPrev);
        const yCurr = evaluateFunc(funcStr, xCurr);

        // Trapezoidal integration for F(x)
        const areaChunk = 0.5 * (yPrev + yCurr) * dx;
        currentF += areaChunk;

        data.push({
            x: xCurr,
            y_f: yCurr,
            y_F: currentF
        });
    }

    return data;
};
