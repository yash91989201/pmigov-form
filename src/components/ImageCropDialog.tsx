import React, { useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Check, X, RectangleHorizontal } from 'lucide-react';

// Aadhaar card dimensions: 85.6mm x 54mm
const AADHAAR_RATIO = 85.6 / 54;
const MAX_OUTPUT_PX = 1600;

interface ImageCropDialogProps {
  src: string;
  title: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

function aadhaarCrop(imageWidth: number, imageHeight: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, AADHAAR_RATIO, imageWidth, imageHeight),
    imageWidth,
    imageHeight,
  );
}

export function ImageCropDialog({ src, title, onCancel, onConfirm }: ImageCropDialogProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [lockRatio, setLockRatio] = useState(false);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(aadhaarCrop(width, height));
  };

  const toggleLockRatio = () => {
    const next = !lockRatio;
    setLockRatio(next);
    const image = imgRef.current;
    if (next && image) {
      setCrop(aadhaarCrop(image.width, image.height));
    }
  };

  const handleConfirm = () => {
    const image = imgRef.current;
    if (!image || !completedCrop?.width || !completedCrop?.height) {
      onConfirm(src);
      return;
    }
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const cropW = completedCrop.width * scaleX;
    const cropH = completedCrop.height * scaleY;
    const scale = Math.min(1, MAX_OUTPUT_PX / Math.max(cropW, cropH));

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cropW * scale);
    canvas.height = Math.round(cropH * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onConfirm(src);
      return;
    }
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      cropW,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    onConfirm(canvas.toDataURL('image/jpeg', 0.92));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-auto flex-1 bg-slate-50 flex items-center justify-center">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={lockRatio ? AADHAAR_RATIO : undefined}
            keepSelection
          >
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-h-[55vh] w-auto"
            />
          </ReactCrop>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleLockRatio}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${
              lockRatio
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <RectangleHorizontal className="w-4 h-4" />
            {lockRatio ? 'Aadhaar ratio locked' : 'Lock Aadhaar ratio'}
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
              <Check className="w-4 h-4" />
              Use Photo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
