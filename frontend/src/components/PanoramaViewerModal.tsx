import { useEffect, useRef } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';
import { X, AlertTriangle } from 'lucide-react';

interface PanoramaViewerModalProps {
  imageUrl: string;
  title: string;
  createdAt: string;
  originalText?: string;
  aiStory?: string;
  onClose: () => void;
}

export const PANORAMA_WARNING_TEXT =
  'Use 360 view only with equirectangular 2:1 panorama images. Other photos will appear distorted.';

export const PanoramaViewerModal = ({
  imageUrl,
  title,
  createdAt,
  originalText,
  aiStory,
  onClose,
}: PanoramaViewerModalProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: imageUrl,
      navbar: ['zoom', 'move', 'fullscreen'],
      mousewheel: true,
      mousemove: true,
      touchmoveTwoFingers: false,
      defaultZoomLvl: 0,
      zoomSpeed: 1,
      moveSpeed: 1.1,
      loadingTxt: 'Loading 360 panorama...',
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [imageUrl]);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-6xl bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-black/40">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-400 font-bold">360 View</p>
            <h3 className="text-lg font-semibold text-white mt-1">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 text-white hover:bg-white/10 transition-colors"
            aria-label="Close 360 viewer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_360px]">
          <div className="bg-black">
            <div ref={containerRef} className="w-full h-[55vh] min-h-[420px]" />
          </div>

          <div className="p-5 bg-gray-950 text-white border-t border-gray-800 lg:border-t-0 lg:border-l space-y-5">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-300 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-amber-200 font-bold">Panorama Guard</p>
                  <p className="text-sm text-amber-100/90 mt-2 leading-relaxed">
                    {PANORAMA_WARNING_TEXT}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              Captured on {new Date(createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </div>

            {originalText && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500 font-bold">Guest Caption</p>
                <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 text-sm text-gray-200">
                  {originalText}
                </div>
              </div>
            )}

            {aiStory && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-400 font-bold">AI Story</p>
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-gray-100 whitespace-pre-wrap">
                  {aiStory}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
