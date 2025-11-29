import React, { useRef, useEffect, useState } from 'react';
import { AppState } from '../types';
import { evaluateFunc } from '../services/mathService';

interface Props {
  state: AppState;
}

const PADDING = 40;
// Theme Colors (Brown/White/Earth)
const COLORS = {
  axis: '#78716C', // Stone 500
  grid: '#E7E5E4', // Stone 200
  func: '#9A3412', // Orange 900 / Burnt Orange
  rectFill: 'rgba(217, 119, 6, 0.3)', // Amber 600 (slightly higher opacity)
  rectStroke: '#D97706', // Amber 600
  text: '#44403C', // Stone 700
};

// Helper for "Nice Numbers" algorithm on axes
const calculateNiceStep = (range: number) => {
    const roughStep = range / 8; // aim for ~8 ticks
    const exponent = Math.floor(Math.log10(roughStep));
    const fraction = roughStep / Math.pow(10, exponent);
    
    let niceFraction;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
    
    return niceFraction * Math.pow(10, exponent);
};

const CanvasGraph: React.FC<Props> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: Math.min(500, containerRef.current.clientWidth * 0.75) // Aspect ratio
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    const { width, height } = dimensions;
    const { funcStr, a, b, n, method } = state;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Calculate Viewport
    let xMin = a - 1;
    let xMax = b + 1;
    if (a < b) {
      const range = b - a;
      xMin = a - range * 0.2;
      xMax = b + range * 0.2;
    }
    
    // Ensure reasonable default if a=b
    if (xMin === xMax) { xMin -= 1; xMax += 1; }

    // Sample Y values to determine Y Axis range
    let yMin = 0;
    let yMax = 0;
    // Optimize sampling for performance
    const step = (xMax - xMin) / 100;
    try {
        for (let x = xMin; x <= xMax; x += step) {
            const y = evaluateFunc(funcStr, x);
            if (!isNaN(y)) {
                if (y < yMin) yMin = y;
                if (y > yMax) yMax = y;
            }
        }
    } catch(e) { /* ignore */ }
    
    const yRangeVal = yMax - yMin;
    const yPadding = (yRangeVal === 0 ? 2 : yRangeVal) * 0.2;
    yMin -= yPadding;
    yMax += yPadding;

    // Coordinate Transforms
    const toCanvasX = (x: number) => ((x - xMin) / (xMax - xMin)) * (width - 2 * PADDING) + PADDING;
    const toCanvasY = (y: number) => height - (((y - yMin) / (yMax - yMin)) * (height - 2 * PADDING) + PADDING);

    // --- GRID & AXIS TICKS ---
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // X Ticks
    const xStepNice = calculateNiceStep(xMax - xMin);
    const xStart = Math.ceil(xMin / xStepNice) * xStepNice;
    
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let x = xStart; x <= xMax; x += xStepNice) {
        const px = toCanvasX(x);
        // Grid Line
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        
        // Text Label
        if (px > 10 && px < width - 10) {
            let labelY = height - PADDING + 5;
            if (yMin < 0 && yMax > 0) {
                 const axisY = toCanvasY(0);
                 if (axisY < height - 20) labelY = axisY + 5;
            }
            const label = Math.abs(x) < 0.0001 ? "0" : parseFloat(x.toPrecision(4)).toString();
            ctx.fillText(label, px, labelY);
        }
    }

    // Y Ticks
    const yStepNice = calculateNiceStep(yMax - yMin);
    const yStart = Math.ceil(yMin / yStepNice) * yStepNice;
    
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let y = yStart; y <= yMax; y += yStepNice) {
        const py = toCanvasY(y);
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);

        if (py > 10 && py < height - 10) {
             let labelX = PADDING - 5;
             if (xMin < 0 && xMax > 0) {
                 const axisX = toCanvasX(0);
                 if (axisX > 25) labelX = axisX - 5;
             }
             if (Math.abs(y) > 1e-10) { 
                 const label = parseFloat(y.toPrecision(4)).toString();
                 ctx.fillText(label, labelX, py);
             }
        }
    }
    ctx.stroke();

    // Draw Main Axes
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const xAxisY = toCanvasY(0);
    const yAxisX = toCanvasX(0);

    if (yMin <= 0 && yMax >= 0) {
        ctx.moveTo(0, xAxisY);
        ctx.lineTo(width, xAxisY);
    }
    if (xMin <= 0 && xMax >= 0) {
        ctx.moveTo(yAxisX, 0);
        ctx.lineTo(yAxisX, height);
    }
    ctx.stroke();

    // --- DRAW RECTANGLES (BATCH RENDERING) ---
    // Batch path creation to avoid 1000s of draw calls
    ctx.fillStyle = COLORS.rectFill;
    ctx.strokeStyle = COLORS.rectStroke;
    ctx.lineWidth = 1;

    const dx = (b - a) / n;
    
    // Performance optimization: 
    // If N is very large, drawing stroke for every rect is messy and slow.
    // For N > 200, we might want to skip stroke or just fill.
    // Let's try to batch everything first.
    
    ctx.beginPath(); // Start Batch
    
    // For Simpson's, if N is huge, quadratic curves are expensive.
    // Fallback to simpler visual for N > 50
    const simplifiedSimpson = method === 'simpson' && n > 50;
    
    for (let i = 0; i < n; i++) {
        const xLeft = a + i * dx;
        const xRight = a + (i + 1) * dx;
        
        // Basic coordinates
        const pxLeft = toCanvasX(xLeft);
        const pxRight = toCanvasX(xRight);
        const pZero = toCanvasY(0);
        
        if (method === 'simpson' && !simplifiedSimpson) {
            // Complex Simpson Drawing (Parabolas) - must be drawn individually or carefully batched
            // We'll close the path for each segment to allow batch filling
            const yLeft = evaluateFunc(funcStr, xLeft);
            const yRight = evaluateFunc(funcStr, xRight);
            const xMid = xLeft + dx/2;
            const yMid = evaluateFunc(funcStr, xMid);
            
            const pyLeft = toCanvasY(yLeft);
            const pyRight = toCanvasY(yRight);
            const pxMid = toCanvasX(xMid);
            const pyMid = toCanvasY(yMid);
            
            ctx.moveTo(pxLeft, pZero);
            ctx.lineTo(pxLeft, pyLeft);
            // Quadratic approx for visual
            ctx.quadraticCurveTo(pxMid, (2*pyMid + pyLeft + pyRight)/4 /* rough control point approx */, pxRight, pyRight);
            // Actually accurate quadratic bezier through 3 points is hard without solving control point.
            // Visually for Simpson, just connecting them is often enough, or using the Quadratic logic.
            // Let's use simple curve for visual flair.
            ctx.lineTo(pxRight, pZero);
            ctx.lineTo(pxLeft, pZero); // Close shape
            
        } else {
            // Standard Rectangular/Trapezoidal Methods
            let yHeight = 0;
            let y2 = 0;
            
            if (method === 'left') {
                yHeight = evaluateFunc(funcStr, xLeft);
                const py = toCanvasY(yHeight);
                ctx.rect(pxLeft, py, Math.max(0.5, pxRight - pxLeft), pZero - py);
            } else if (method === 'right') {
                yHeight = evaluateFunc(funcStr, xRight);
                const py = toCanvasY(yHeight);
                ctx.rect(pxLeft, py, Math.max(0.5, pxRight - pxLeft), pZero - py);
            } else if (method === 'midpoint') {
                yHeight = evaluateFunc(funcStr, xLeft + dx/2);
                const py = toCanvasY(yHeight);
                ctx.rect(pxLeft, py, Math.max(0.5, pxRight - pxLeft), pZero - py);
            } else if (method === 'trapezoidal' || simplifiedSimpson) {
                // Trapezoid (and high-N Simpson fallback)
                const yL = evaluateFunc(funcStr, xLeft);
                const yR = evaluateFunc(funcStr, xRight);
                const pyL = toCanvasY(yL);
                const pyR = toCanvasY(yR);
                
                ctx.moveTo(pxLeft, pZero);
                ctx.lineTo(pxLeft, pyL);
                ctx.lineTo(pxRight, pyR);
                ctx.lineTo(pxRight, pZero);
                ctx.lineTo(pxLeft, pZero); // Close
            }
        }
    }
    
    // Draw all shapes at once
    ctx.fill();
    // Only stroke if N is not too high, otherwise it becomes a solid block of color
    if (n < 300) {
        ctx.stroke();
    }

    // --- DRAW FUNCTION CURVE ---
    // Draw this LAST so it's on top
    ctx.strokeStyle = COLORS.func;
    ctx.lineWidth = 3;
    ctx.beginPath();
    let first = true;
    
    for (let px = 0; px <= width; px+=2) {
        const x = xMin + ((px - PADDING) / (width - 2 * PADDING)) * (xMax - xMin);
        const y = evaluateFunc(funcStr, x);
        const py = toCanvasY(y);
        
        if (py < -height || py > height * 2 || isNaN(y)) {
            first = true; 
            continue;
        }

        if (first) {
            ctx.moveTo(px, py);
            first = false;
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.stroke();
    
  }, [state, dimensions]);

  return (
    <div ref={containerRef} className="w-full bg-white rounded-xl shadow-inner border border-stone-200 overflow-hidden" style={{ minHeight: '300px' }}>
      <canvas ref={canvasRef} className="block mx-auto" />
    </div>
  );
};

export default CanvasGraph;