import React, { useState, useMemo, useEffect } from 'react';
import { Sigma, Calculator, Info, BookOpen, ChevronDown, ChevronUp, Activity, ListOrdered } from 'lucide-react';
import CanvasGraph from './components/CanvasGraph';
import MathDisplay from './components/MathDisplay';
import { AppState, RiemannMethod } from './types';
import { getResults, getLatexFormula, getDetailedSteps } from './services/mathService';

const EXAMPLES = [
  { label: 'Parabola', val: 'x^2', a: 0, b: 2 },
  { label: 'Kubik', val: 'x^3 - 2x + 1', a: 0, b: 2 },
  { label: 'Sinus', val: 'sin(x)', a: 0, b: 3.14 },
  { label: 'Eksponensial', val: 'e^x', a: 0, b: 2 },
  { label: 'Resiprokal', val: '1/x', a: 1, b: 4 },
];

// Helper component for Numeric Input that allows "-" typing
const NumericInput = ({ 
  value, 
  onChange, 
  className 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  className?: string 
}) => {
  const [strVal, setStrVal] = useState(value.toString());

  useEffect(() => {
    // Sync external changes (e.g. Example selection) back to local state
    // But only if they are significantly different to avoid cursor jumping
    if (parseFloat(strVal) !== value && strVal !== '-' && strVal !== '') {
        setStrVal(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setStrVal(newVal);

    // Only update parent if it's a valid number
    // Allow "-" or "-." or "." to exist in local state without updating parent yet
    const parsed = parseFloat(newVal);
    if (!isNaN(parsed) && !newVal.endsWith('.') && newVal !== '-') {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    // On blur, force strict number formatting
    let parsed = parseFloat(strVal);
    if (isNaN(parsed)) parsed = 0;
    setStrVal(parsed.toString());
    onChange(parsed);
  };

  return (
    <input
      type="text"
      value={strVal}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      inputMode="decimal"
    />
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    funcStr: 'x^2',
    a: 0,
    b: 2,
    n: 10,
    method: 'left'
  });

  const [showFTC, setShowFTC] = useState(true);
  const [showSteps, setShowSteps] = useState(true);

  const results = useMemo(() => getResults(state), [state]);
  const formula = useMemo(() => getLatexFormula(state.method), [state.method]);
  const steps = useMemo(() => getDetailedSteps(state), [state]);
  
  const dx = (state.b - state.a) / state.n;

  const handleInputChange = (field: keyof AppState, value: string | number) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const loadExample = (ex: any) => {
    setState(prev => ({
      ...prev,
      funcStr: ex.val,
      a: ex.a,
      b: ex.b
    }));
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 pb-12 selection:bg-amber-200">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-700 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <Sigma size={24} />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold font-serif text-amber-900 leading-tight">Visualisasi Integral</h1>
                    <p className="text-xs text-stone-500 hidden sm:block">Jumlah Riemann & Teorema Dasar Kalkulus</p>
                </div>
            </div>
            <div className="text-xs font-semibold bg-stone-100 px-3 py-1 rounded-full text-stone-600 border border-stone-200">
                Kalkulus I
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex items-center gap-2 mb-4 text-amber-800">
                    <Calculator size={20} />
                    <h2 className="font-semibold font-serif">Konfigurasi</h2>
                </div>

                <div className="space-y-5">
                    {/* Examples */}
                    <div className="flex flex-wrap gap-2">
                        {EXAMPLES.map((ex, i) => (
                            <button 
                                key={i}
                                onClick={() => loadExample(ex)}
                                className="text-xs px-3 py-1.5 rounded-full bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-800 transition-colors border border-stone-200"
                            >
                                {ex.label}
                            </button>
                        ))}
                    </div>

                    {/* Function Input */}
                    <div>
                        <label className="block text-sm font-medium text-stone-500 mb-1">Fungsi <MathDisplay inline latex="f(x)" /></label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={state.funcStr}
                                onChange={(e) => handleInputChange('funcStr', e.target.value)}
                                className="w-full pl-4 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono text-lg text-stone-800 transition-all"
                                placeholder="cth: x^2"
                            />
                        </div>
                    </div>

                    {/* Bounds */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-500 mb-1">Batas Bawah (<MathDisplay inline latex="a" />)</label>
                            <NumericInput 
                                value={state.a}
                                onChange={(val) => handleInputChange('a', val)}
                                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-500 mb-1">Batas Atas (<MathDisplay inline latex="b" />)</label>
                            <NumericInput 
                                value={state.b}
                                onChange={(val) => handleInputChange('b', val)}
                                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                            />
                        </div>
                    </div>

                    {/* Partitions Slider */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-sm font-medium text-stone-500">Jumlah Partisi (<MathDisplay inline latex="n" />)</label>
                            <span className="text-sm font-bold text-amber-700 font-mono">{state.n}</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="1000" 
                            step="1"
                            value={state.n}
                            onChange={(e) => handleInputChange('n', parseInt(e.target.value))}
                            className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-700"
                        />
                        <div className="text-xs text-right text-stone-400 mt-1 flex justify-end items-center gap-1">
                            <span>Lebar</span>
                            <MathDisplay inline latex={`\\Delta x = ${dx.toFixed(4)}`} />
                        </div>
                    </div>

                    {/* Method Select */}
                    <div>
                        <label className="block text-sm font-medium text-stone-500 mb-1">Metode Riemann</label>
                        <select 
                            value={state.method}
                            onChange={(e) => handleInputChange('method', e.target.value as RiemannMethod)}
                            className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="left">Titik Ujung Kiri (Left Endpoint)</option>
                            <option value="right">Titik Ujung Kanan (Right Endpoint)</option>
                            <option value="midpoint">Titik Tengah (Midpoint Rule)</option>
                            <option value="trapezoidal">Aturan Trapesium</option>
                            <option value="simpson">Aturan Simpson</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Results Card */}
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
                <h3 className="text-amber-900 font-serif font-semibold mb-4 flex items-center gap-2">
                    <Activity size={18} /> Hasil Perhitungan
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-amber-200/50 pb-2">
                        <span className="text-sm text-amber-800">Luas Taksiran (Area)</span>
                        <span className="font-mono font-bold text-lg text-amber-900">{results.approxArea.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-amber-200/50 pb-2">
                        <span className="text-sm text-amber-800">Integral Eksak (Sebenarnya)</span>
                        <span className="font-mono font-bold text-stone-600">{results.exactArea.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-amber-800">Galat (Error)</span>
                        <span className="font-mono text-red-600">{results.error.toFixed(5)}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Visualization & Theory */}
        <div className="lg:col-span-8 space-y-6">
            
            {/* Canvas Container */}
            <div className="relative">
                <CanvasGraph state={state} />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-md text-xs font-mono text-stone-500 border border-stone-200 shadow-sm">
                   f(x) = {state.funcStr}
                </div>
            </div>

            {/* Formula Block */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 overflow-x-auto">
                 <h3 className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Formula & Definisi Limit</h3>
                 <div className="flex justify-center py-2">
                    <MathDisplay latex={formula} className="text-lg text-stone-700" />
                 </div>
                 <p className="text-center text-xs text-stone-500 mt-2 flex items-center justify-center gap-1">
                    Luas daerah didefinisikan sebagai limit ketika <MathDisplay inline latex="n \to \infty" />
                 </p>
            </div>

            {/* Step-by-Step Calculation */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <button 
                    onClick={() => setShowSteps(!showSteps)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-stone-50 hover:bg-stone-100 transition-colors"
                >
                    <div className="flex items-center gap-2 text-stone-800 font-serif font-semibold">
                        <ListOrdered size={20} className="text-amber-700" />
                        Langkah-Langkah Perhitungan Detil
                    </div>
                    {showSteps ? <ChevronUp size={20} className="text-stone-400" /> : <ChevronDown size={20} className="text-stone-400" />}
                </button>
                
                {showSteps && (
                    <div className="p-6 border-t border-stone-200 space-y-6">
                         <div className="space-y-2">
                            <h4 className="text-sm font-bold text-stone-700 flex items-center gap-1">
                                Langkah 1: Menentukan <MathDisplay inline latex="\Delta x" />
                            </h4>
                            <p className="text-sm text-stone-600 flex flex-wrap items-center gap-1">
                                Lebar setiap batang dihitung membagi interval <MathDisplay inline latex="[a, b]" /> dengan <MathDisplay inline latex="n" />.
                            </p>
                            <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                                <MathDisplay latex={steps.step1} />
                            </div>
                         </div>

                         <div className="space-y-2">
                            <h4 className="text-sm font-bold text-stone-700">Langkah 2: Ekspansi Penjumlahan Riemann</h4>
                            <p className="text-sm text-stone-600 flex flex-wrap items-center gap-1">
                                Menjumlahkan luas setiap persegipanjang: tinggi <MathDisplay inline latex="f(x_i)" /> dikali lebar <MathDisplay inline latex="\Delta x" />.
                            </p>
                            <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 overflow-x-auto">
                                <MathDisplay latex={steps.step2} />
                            </div>
                         </div>

                         <div className="space-y-2">
                            <h4 className="text-sm font-bold text-stone-700">Langkah 3: Substitusi ke dalam Fungsi</h4>
                            <p className="text-sm text-stone-600">Mengganti variabel <MathDisplay inline latex="x" /> pada fungsi <MathDisplay inline latex={`f(x) = ${state.funcStr}`} /> dengan nilai titik sampel.</p>
                            <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 overflow-x-auto">
                                <MathDisplay latex={steps.step3} />
                            </div>
                         </div>

                         <div className="space-y-2">
                            <h4 className="text-sm font-bold text-stone-700">Langkah 4: Hasil Aritmatika</h4>
                            <p className="text-sm text-stone-600">Menghitung nilai numerik setiap suku dan menjumlahkannya.</p>
                            <div className="bg-stone-50 p-3 rounded-lg border border-stone-100 overflow-x-auto">
                                <MathDisplay latex={steps.step4} />
                            </div>
                            <div className="mt-2 text-sm font-semibold text-amber-800 flex items-center gap-1">
                                Total Luas <MathDisplay inline latex={`\\approx ${results.approxArea.toFixed(5)}`} />
                            </div>
                         </div>
                    </div>
                )}
            </div>

            {/* Static Educational Content: FTC (No Animation) */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <button 
                    onClick={() => setShowFTC(!showFTC)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-stone-50 hover:bg-stone-100 transition-colors"
                >
                    <div className="flex items-center gap-2 text-stone-800 font-serif font-semibold">
                        <BookOpen size={20} className="text-amber-700" />
                        Teorema Dasar Kalkulus (Fundamental Theorem of Calculus)
                    </div>
                    {showFTC ? <ChevronUp size={20} className="text-stone-400" /> : <ChevronDown size={20} className="text-stone-400" />}
                </button>
                
                {showFTC && (
                    <div className="p-6 border-t border-stone-200 space-y-4">
                        <p className="text-stone-600 leading-relaxed text-sm">
                            Teorema Dasar Kalkulus menghubungkan konsep Integral Tentu (luas daerah) dengan Antiturunan.
                        </p>
                        
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col items-center justify-center gap-4">
                             <MathDisplay 
                                latex={`\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)`} 
                                className="text-amber-900 font-semibold text-lg" 
                            />
                             <div className="text-xs text-stone-500">
                                Dimana <MathDisplay inline latex="F'(x) = f(x)" />
                             </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 mt-4">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-stone-700 text-sm">1. Interpretasi Geometris</h4>
                                <p className="text-xs text-stone-500 leading-relaxed">
                                    Jumlah luas persegipanjang (Jumlah Riemann) hanyalah taksiran. Semakin banyak partisi (<MathDisplay inline latex="n \to \infty" />), taksiran ini akan sama persis dengan luas area sebenarnya di bawah kurva.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-stone-700 text-sm">2. Perhitungan Analitik</h4>
                                <p className="text-xs text-stone-500 leading-relaxed flex flex-wrap gap-1">
                                    Kita mencari antiturunan <MathDisplay inline latex="F(x)" /> dari fungsi <MathDisplay inline latex="f(x)" />. Dengan menghitung selisih <MathDisplay inline latex="F(b) - F(a)" />, kita mendapatkan nilai <strong>eksak</strong> tanpa perlu menjumlahkan persegipanjang yang tak terhingga banyaknya.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
      </main>
    </div>
  );
};

export default App;