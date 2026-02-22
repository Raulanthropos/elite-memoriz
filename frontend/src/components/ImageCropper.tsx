import { useState, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { getCroppedImg } from '../utils/cropImage';
import { Loader2, Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio?: number;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const ImageCropper = ({ imageSrc, aspectRatio = 16 / 9, onCropComplete, onCancel }: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Auto-center the crop when image loads
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const size = Math.min(width, height) * 0.8;
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    setCrop({ unit: 'px', x, y, width: size, height: size });
  };

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) return;
    setLoading(true);
    try {
      // Scale the pixel crop back up to the original uncompressed image coordinates
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      const absolutePixelCrop = {
        x: Math.round(completedCrop.x * scaleX),
        y: Math.round(completedCrop.y * scaleY),
        width: Math.round(completedCrop.width * scaleX),
        height: Math.round(completedCrop.height * scaleY),
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
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspectRatio}
          className="max-h-full max-w-full"
        >
          <img 
             ref={imgRef} 
             src={imageSrc} 
             alt="Crop preview" 
             onLoad={onImageLoad}
             className="max-h-[65vh] object-contain"
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