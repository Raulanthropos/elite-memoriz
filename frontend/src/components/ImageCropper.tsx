import { useState, useRef } from 'react';
import ReactCrop, { type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { getCroppedImg } from '../utils/cropImage';
import { Loader2, Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) => {
  const [crop, setCrop] = useState<PercentCrop>();
  const [completedCrop, setCompletedCrop] = useState<PercentCrop | null>(null);
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Auto-center the crop when image loads
  const onImageLoad = () => {
    setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
  };

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) return;
    setLoading(true);
    try {
      const naturalWidth = imgRef.current.naturalWidth;
      const naturalHeight = imgRef.current.naturalHeight;

      const absolutePixelCrop = {
        x: Math.round((completedCrop.x / 100) * naturalWidth),
        y: Math.round((completedCrop.y / 100) * naturalHeight),
        width: Math.max(1, Math.round((completedCrop.width / 100) * naturalWidth)),
        height: Math.max(1, Math.round((completedCrop.height / 100) * naturalHeight)),
      };

      const croppedBlob = await getCroppedImg(imageSrc, absolutePixelCrop);
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } catch (e) {
      console.error("Crop failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      {/* Scrollable Container so the image can fit and be cropped correctly */}
      <div className="relative w-full max-w-4xl h-[70vh] flex items-center justify-center bg-gray-900 rounded-2xl overflow-auto shadow-2xl border border-gray-800 ring-1 ring-white/10 p-4">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
          className="max-h-full max-w-full"
        >
          <img 
             ref={imgRef} 
             src={imageSrc} 
             alt="Crop preview" 
             onLoad={onImageLoad}
             className="max-h-[65vh] w-auto block mx-auto"
          />
        </ReactCrop>
      </div>
      
      {/* Controls Area */}
      <div className="mt-8 w-full max-w-md bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <X size={18} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !completedCrop}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Check size={18} />}
              Apply Crop
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
