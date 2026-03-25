import { useState, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { getCroppedImg } from '../utils/cropImage';
import { Loader2, Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Auto-center the crop when image loads
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialWidth = width * 0.8;
    const initialHeight = height * 0.8;
    const x = (width - initialWidth) / 2;
    const y = (height - initialHeight) / 2;

    setCrop({ unit: 'px', x, y, width: initialWidth, height: initialHeight });
  };

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) return;
    setLoading(true);
    try {
      const renderedWidth = imgRef.current.width;
      const renderedHeight = imgRef.current.height;
      const naturalWidth = imgRef.current.naturalWidth;
      const naturalHeight = imgRef.current.naturalHeight;

      if (!renderedWidth || !renderedHeight || !naturalWidth || !naturalHeight) {
        return;
      }

      const scaleX = naturalWidth / renderedWidth;
      const scaleY = naturalHeight / renderedHeight;

      const absolutePixelCrop = {
        x: Math.round(completedCrop.x * scaleX),
        y: Math.round(completedCrop.y * scaleY),
        width: Math.max(1, Math.round(completedCrop.width * scaleX)),
        height: Math.max(1, Math.round(completedCrop.height * scaleY)),
      };

      const croppedBlob = await getCroppedImg(imgRef.current, absolutePixelCrop);
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
          onChange={(nextCrop) => setCrop(nextCrop)}
          onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
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
