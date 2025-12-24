import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Slider } from 'lucide-react'; // Using Lucide icon as generic placeholder if needed, or just standard HTML range
import { Check, X, ZoomIn, RotateCw, Lock, Unlock, Ratio } from 'lucide-react';
import getCroppedImg from '../utils/cropImage';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

const ASPECT_RATIOS = [
  { label: 'Square', value: 1, text: '1:1' },
  { label: 'Landscape', value: 16/9, text: '16:9' },
  { label: 'Portrait', value: 9/16, text: '9:16' },
  { label: 'Standard', value: 4/3, text: '4:3' },
];

const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  // Aspect Ratio State
  const [locked, setLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [mediaSize, setMediaSize] = useState<{ width: number, height: number } | null>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onMediaLoaded = (mediaSize: { naturalWidth: number; naturalHeight: number }) => {
    setMediaSize({ width: mediaSize.naturalWidth, height: mediaSize.naturalHeight });
  };

  const showCroppedImage = useCallback(async () => {
    try {
      const croppedImage = await getCroppedImg(
        image,
        croppedAreaPixels,
        rotation
      );
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  }, [croppedAreaPixels, rotation, image, onCropComplete]);

  const handleAspectRatioClick = (ratio: number) => {
    setAspectRatio(ratio);
    setLocked(true);
  };

  const toggleLock = () => {
    setLocked(!locked);
  };

  const setOriginalAspectRatio = () => {
    if (mediaSize) {
      setAspectRatio(mediaSize.width / mediaSize.height);
      setLocked(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex flex-col p-4 md:p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Crop & Rotate Source</h3>
          <button 
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cropper Container */}
        <div className="relative flex-1 bg-zinc-950 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={locked ? aspectRatio : undefined}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
            onMediaLoaded={onMediaLoaded}
            objectFit="contain"
            minZoom={1}
            maxZoom={3}
            style={{
                containerStyle: { background: '#09090b' },
                cropAreaStyle: { border: '2px solid #ec4899', boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.7)' }
            }}
          />
        </div>

        {/* Controls */}
        <div className="mt-6 bg-zinc-900/80 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-6">
            
            {/* Zoom Control */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-medium text-gray-400 uppercase tracking-wider">
                <span className="flex items-center gap-2"><ZoomIn className="w-4 h-4" /> Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.01}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>

            {/* Rotation Control */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-medium text-gray-400 uppercase tracking-wider">
                <span className="flex items-center gap-2"><RotateCw className="w-4 h-4" /> Rotation</span>
                <span>{rotation}°</span>
              </div>
              <input
                type="range"
                value={rotation}
                min={0}
                max={360}
                step={1}
                aria-labelledby="Rotation"
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Aspect Ratio Control */}
            <div className="space-y-3">
               <div className="flex justify-between text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center gap-2"><Ratio className="w-4 h-4" /> Aspect Ratio</span>
                  <span>{locked ? (
                      aspectRatio === 1 ? 'Square (1:1)' : 
                      mediaSize && Math.abs(aspectRatio - mediaSize.width/mediaSize.height) < 0.01 ? 'Original' :
                      ASPECT_RATIOS.find(r => Math.abs(r.value - aspectRatio) < 0.01)?.text || 'Custom'
                  ) : 'Free'}</span>
               </div>
               <div className="flex items-center gap-2">
                 <button
                   onClick={toggleLock}
                   className={`p-2 rounded-lg border transition-all ${locked ? 'bg-pink-500/20 border-pink-500 text-pink-500' : 'bg-zinc-800 border-white/5 text-gray-400 hover:text-white'}`}
                   title={locked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
                 >
                    {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                 </button>
                 
                 {locked && (
                   <div className="flex-1 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                      <button
                         onClick={setOriginalAspectRatio}
                         className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border transition-all whitespace-nowrap ${mediaSize && Math.abs(aspectRatio - mediaSize.width/mediaSize.height) < 0.01 ? 'bg-white text-black border-white' : 'bg-zinc-800 text-gray-400 border-white/5 hover:bg-zinc-700'}`}
                      >
                        Original
                      </button>
                      {ASPECT_RATIOS.map((ratio) => (
                        <button
                          key={ratio.label}
                          onClick={() => handleAspectRatioClick(ratio.value)}
                          className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border transition-all whitespace-nowrap ${Math.abs(aspectRatio - ratio.value) < 0.01 && !(mediaSize && Math.abs(aspectRatio - mediaSize.width/mediaSize.height) < 0.01) ? 'bg-white text-black border-white' : 'bg-zinc-800 text-gray-400 border-white/5 hover:bg-zinc-700'}`}
                        >
                          {ratio.text}
                        </button>
                      ))}
                   </div>
                 )}
                 {!locked && (
                    <div className="flex-1 text-xs text-gray-500 italic pl-2">
                       Adjust crop handles freely
                    </div>
                 )}
               </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 rounded-xl font-medium text-gray-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={showCroppedImage}
              className="flex items-center gap-2 px-8 py-2.5 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-lg shadow-white/10"
            >
              <Check className="w-4 h-4" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;