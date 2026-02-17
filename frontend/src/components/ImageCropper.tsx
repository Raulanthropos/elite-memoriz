import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage'; // Ensure this path matches your file structure
import { Loader2, Check, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio?: number;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const ImageCropper = ({ imageSrc, aspectRatio = 16 / 9, onCropComplete, onCancel }: ImageCropperProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteHandler = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setLoading(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
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
    // FIX: 'fixed inset-0 z-[9999]' forces it to be full screen on top of everything
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      
      {/* Cropper Container */}
      <div className="relative w-full max-w-4xl h-[60vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 ring-1 ring-white/10">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspectRatio}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={onZoomChange}
        />
      </div>
      
      {/* Controls Area */}
      <div className="mt-8 w-full max-w-md bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
            <ZoomOut size={20} className="text-gray-400" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <ZoomIn size={20} className="text-gray-400" />
        </div>

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
              disabled={loading}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
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