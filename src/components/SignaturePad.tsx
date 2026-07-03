import React, { useRef, useState, useEffect } from 'react';
import '@fontsource/great-vibes';
import { Pen, Type } from 'lucide-react';

const SCRIPT_FONT = '"Great Vibes", cursive';

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  readOnly?: boolean;
  initialValue?: string | null;
}

export function SignaturePad({ onChange, readOnly = false, initialValue }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    if (mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set real size based on CSS
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    } else {
      canvas.width = 400;
      canvas.height = 160;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasSignature(true);
      };
      img.src = initialValue;
    }
  }, [initialValue, mode]);

  // Type mode: render the typed name in the script font onto an offscreen
  // canvas so the stored signature is a normal image, same as a drawn one.
  useEffect(() => {
    if (mode !== 'type' || readOnly) return;
    const name = typedName.trim();
    if (!name) {
      onChange(null);
      return;
    }
    let cancelled = false;
    document.fonts.load(`96px ${SCRIPT_FONT}`).then(() => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let size = 96;
      ctx.font = `${size}px ${SCRIPT_FONT}`;
      while (size > 24 && ctx.measureText(name).width > canvas.width - 40) {
        size -= 4;
        ctx.font = `${size}px ${SCRIPT_FONT}`;
      }
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, canvas.width / 2, canvas.height / 2);
      onChange(canvas.toDataURL('image/png'));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedName, mode, readOnly]);

  const switchMode = (next: 'draw' | 'type') => {
    if (next === mode) return;
    setMode(next);
    setTypedName('');
    setHasSignature(false);
    onChange(null);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factors
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY
    };
  };

  // Scrolling while drawing is prevented via `touch-action: none` on the
  // canvas, not preventDefault — React's touch listeners are passive, so
  // calling preventDefault there is ignored and logs a console warning.
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clear = () => {
    if (readOnly) return;
    if (mode === 'type') {
      setTypedName('');
      onChange(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null);
  };

  if (readOnly && initialValue) {
    return (
      <div className="w-full h-40 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 print-no-border">
        <img src={initialValue} alt="Signature" className="max-h-full max-w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => switchMode('draw')}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
            mode === 'draw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pen className="w-3.5 h-3.5" />
          Draw
        </button>
        <button
          type="button"
          onClick={() => switchMode('type')}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
            mode === 'type' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          Type
        </button>
      </div>

      {mode === 'draw' ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white touch-none w-full h-40 relative group"
          style={{ touchAction: 'none' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none"
            style={{ touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
          />
          {!hasSignature && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400">
              Sign here
            </div>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white w-full h-40 flex flex-col">
          <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
            {typedName.trim() ? (
              <span
                className="text-4xl sm:text-5xl text-slate-900 whitespace-nowrap"
                style={{ fontFamily: SCRIPT_FONT }}
              >
                {typedName}
              </span>
            ) : (
              <span className="text-gray-400">Your signature will appear here</span>
            )}
          </div>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your full name"
            className="border-t border-gray-200 px-4 py-2.5 text-slate-900 outline-none rounded-b-lg placeholder:text-slate-400"
          />
        </div>
      )}

      <div className="flex justify-between items-center no-print">
        <span className="text-xs text-gray-500">
          {mode === 'draw' ? 'Sign within the dashed area' : 'Typing your name creates a signature'}
        </span>
        <button
          type="button"
          onClick={clear}
          className="text-sm text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded transition-colors"
        >
          Clear Signature
        </button>
      </div>
    </div>
  );
}
