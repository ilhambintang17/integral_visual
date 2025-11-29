import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { evaluateFunc, generateAccumulationData, FTCDataPoint } from '../services/mathService';
import MathDisplay from './MathDisplay';

interface Props {
  funcStr: string;
  a: number;
  b: number;
}

const COLORS = {
  f_line: '#9A3412', // Orange 900
  f_fill: 'rgba(217, 119, 6, 0.2)', // Amber fill
  F_line: '#0EA5E9', // Sky 500
  F_fill: 'rgba(14, 165, 233, 0.1)', // Sky fill
  axis: '#A8A29E',
  cursor: '#DC2626', // Red
};

const FTCVisualizer: React.FC<Props> = ({ funcStr, a, b }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [data, setData] = useState<FTCDataPoint[]>([]);
  const requestRef = useRef<number>(0);
  
  // Data Generation
  useEffect(() => {
    const newData = generateAccumulationData(funcStr, a, b);
    setData(newData);
    setProgress(0);
    setIsPlaying(false);
  }, [funcStr, a, b]);

  // Animation Loop
  useEffect(() => {
    if (isPlaying) {
      let lastTime = performance.now();
      const animate = (time: number) => {
        const dt = (time - lastTime) / 1000;
        lastTime = time;
        
        setProgress(prev => {
          const next = prev + dt * 0.2; // Speed: 5 seconds full sweep
          if (next >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return next;
        });
        
        requestRef.current = requestAnimationFrame(animate);
      };
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions
    const width = canvas.width;
    const height = canvas.height;
    // Split screen: Top 50% for f(t), Bottom 50% for F(x)
    const midH = height / 2;
    const chartH = midH - 40; // 20px padding top/bottom
    const paddingX = 50;

    ctx.clearRect(0, 0, width, height);

    // Scaling
    const xMin = a;
    const xMax = b;
    // Calculate Y ranges separately
    let yfMin = 0, yfMax = 0;
    let yFMin = 0, yFMax = 0;
    
    data.forEach(p => {
        if (p.y_f < yfMin) yfMin = p.y_f;
        if (p.y_f > yfMax) yfMax = p.y_f;
        if (p.y_F < yFMin) yFMin = p.y_F;
        if (p.y_F > yFMax) yFMax = p.y_F;
    });

    // Add padding to ranges
    const rangeF = yfMax - yfMin || 1;
    yfMin -= rangeF * 0.1; yfMax += rangeF * 0.1;
    
    const rangeBigF = yFMax - yFMin || 1;
    yFMin -= rangeBigF * 0.1; yFMax += rangeBigF * 0.1;

    // Transforms
    const toX = (val: number) => paddingX + ((val - xMin) / (xMax - xMin)) * (width - 2 * paddingX);
    // Top Graph (0 to midH)
    const toY_Top = (val: number) => (midH - 20) - ((val - yfMin) / (yfMax - yfMin)) * chartH;
    // Bottom Graph (midH to height)
    const toY_Bot = (val: number) => (height - 20) - ((val - yFMin) / (yFMax - yFMin)) * chartH;

    // --- Helper to draw axes ---
    const drawAxis = (yOrigin: number, zeroY: number, label: string) => {
        ctx.strokeStyle = COLORS.axis;
        ctx.lineWidth = 1;
        ctx.beginPath();
        // X Axis
        ctx.moveTo(paddingX, zeroY);
        ctx.lineTo(width - paddingX, zeroY);
        // Y Axis
        ctx.moveTo(paddingX, yOrigin - chartH - 20);
        ctx.lineTo(paddingX, yOrigin + 20);
        ctx.stroke();

        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(label, paddingX - 10, yOrigin - chartH / 2);
    };

    // --- DRAW TOP GRAPH f(t) ---
    // Zero line for Top Graph
    let zeroY_Top = toY_Top(0);
    // Clamp zero line to chart area
    if (zeroY_Top > midH - 20) zeroY_Top = midH - 20;
    if (zeroY_Top < 20) zeroY_Top = 20;
    
    drawAxis(midH - 20, zeroY_Top, "f(t)");

    // Draw f(t) Curve
    ctx.beginPath();
    ctx.strokeStyle = COLORS.f_line;
    ctx.lineWidth = 2;
    data.forEach((p, i) => {
        const px = toX(p.x);
        const py = toY_Top(p.y_f);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Fill Area up to Progress
    const currentXVal = a + progress * (b - a);
    const stopIndex = Math.floor(progress * (data.length - 1));
    
    ctx.fillStyle = COLORS.f_fill;
    ctx.beginPath();
    ctx.moveTo(toX(data[0].x), zeroY_Top);
    for (let i = 0; i <= stopIndex; i++) {
        ctx.lineTo(toX(data[i].x), toY_Top(data[i].y_f));
    }
    // Interpolate last point for smooth animation
    const lastP = data[stopIndex];
    if (lastP && stopIndex < data.length - 1) {
        const nextP = data[stopIndex + 1];
        const subProgress = (progress * (data.length - 1)) - stopIndex;
        const interpY = lastP.y_f + (nextP.y_f - lastP.y_f) * subProgress;
        ctx.lineTo(toX(currentXVal), toY_Top(interpY));
        ctx.lineTo(toX(currentXVal), zeroY_Top);
    } else {
        ctx.lineTo(toX(data[stopIndex].x), zeroY_Top);
    }
    ctx.closePath();
    ctx.fill();


    // --- DRAW BOTTOM GRAPH F(x) ---
    let zeroY_Bot = toY_Bot(0);
    // Clamp
    if (zeroY_Bot > height - 20) zeroY_Bot = height - 20;
    
    drawAxis(height - 20, zeroY_Bot, "F(x)");

    // Draw F(x) Curve (Accumulation)
    ctx.beginPath();
    ctx.strokeStyle = COLORS.F_line;
    ctx.lineWidth = 2;
    // Only draw up to progress
    for (let i = 0; i <= stopIndex; i++) {
        const px = toX(data[i].x);
        const py = toY_Bot(data[i].y_F);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    // Interpolate tip
    if (stopIndex < data.length - 1) {
         const lastP = data[stopIndex];
         const nextP = data[stopIndex + 1];
         const subProgress = (progress * (data.length - 1)) - stopIndex;
         const interpYF = lastP.y_F + (nextP.y_F - lastP.y_F) * subProgress;
         ctx.lineTo(toX(currentXVal), toY_Bot(interpYF));
         
         // Draw a dot at the tip
         ctx.fillStyle = COLORS.F_line;
         ctx.beginPath();
         ctx.arc(toX(currentXVal), toY_Bot(interpYF), 4, 0, Math.PI*2);
         ctx.fill();
    }
    ctx.stroke();

    // Draw Vertical Scanner Line connecting both
    ctx.strokeStyle = COLORS.cursor;
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const scanX = toX(currentXVal);
    ctx.moveTo(scanX, 20);
    ctx.lineTo(scanX, height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [data, progress]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            const dpr = window.devicePixelRatio || 1;
            const rect = containerRef.current.getBoundingClientRect();
            canvasRef.current.width = rect.width * dpr;
            canvasRef.current.height = 400 * dpr; // Fixed height 400
            canvasRef.current.style.width = `${rect.width}px`;
            canvasRef.current.style.height = `400px`;
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-white">
            <h4 className="text-sm font-serif font-bold text-stone-700">Animasi: Fungsi Akumulasi</h4>
            <div className="flex gap-2">
                <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center gap-1 px-3 py-1 bg-amber-600 text-white rounded-md text-xs font-bold hover:bg-amber-700 transition"
                >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    {isPlaying ? "Jeda" : "Mulai"}
                </button>
                <button 
                    onClick={() => { setIsPlaying(false); setProgress(0); }}
                    className="flex items-center gap-1 px-3 py-1 bg-stone-200 text-stone-600 rounded-md text-xs font-bold hover:bg-stone-300 transition"
                >
                    <RotateCcw size={14} /> Reset
                </button>
            </div>
        </div>
        
        <div ref={containerRef} className="relative w-full h-[400px] bg-white">
            <canvas ref={canvasRef} className="block w-full h-full" />
            
            {/* Labels overlay */}
            <div className="absolute top-2 left-4 text-xs font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                <MathDisplay inline latex="y = f(t)" />
            </div>
            <div className="absolute top-[210px] left-4 text-xs font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-100">
                <MathDisplay inline latex="F(x) = \int_a^x f(t) dt" />
            </div>
        </div>

        <div className="p-4 bg-stone-100 text-xs text-stone-600 border-t border-stone-200">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="font-bold text-amber-800">Grafik Atas:</span> Garis merah bergerak menyapu area di bawah kurva <MathDisplay inline latex="f(t)" />.
                </div>
                <div>
                    <span className="font-bold text-sky-700">Grafik Bawah:</span> Kurva biru <MathDisplay inline latex="F(x)" /> naik setinggi jumlah area yang tersapu. Perhatikan: Saat <MathDisplay inline latex="f(t)" /> tinggi, <MathDisplay inline latex="F(x)" /> naik curam!
                </div>
            </div>
        </div>
    </div>
  );
};

export default FTCVisualizer;