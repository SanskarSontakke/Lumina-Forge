import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Download, RefreshCw, AlertCircle, X, Check, Undo2, Redo2, SlidersHorizontal, 
  Sun, Contrast, Droplet, Palette, Crop, Eye, RotateCcw, ChevronDown,
  Moon, Thermometer, RotateCw, Wand2, Sparkles, SplitSquareHorizontal, MoveHorizontal
} from 'lucide-react';

interface ResultViewerProps {
  originalImage: string;
  generatedImage: string | null;
  isLoading: boolean;
  error: string | null;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCropOriginal: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onApplyFilters: (newImage: string) => void;
  onDenoise: () => void;
  onAutoEnhance: () => void;
}

const ResultViewer: React.FC<ResultViewerProps> = ({ 
  originalImage, 
  generatedImage, 
  isLoading, 
  error,
  onReset,
  onUndo,
  onRedo,
  onCropOriginal,
  canUndo,
  canRedo,
  onApplyFilters,
  onDenoise,
  onAutoEnhance
}) => {
  const [showFilters, setShowFilters] = useState(false);
  
  // Slider State
  const [isSliderMode, setIsSliderMode] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    sepia: 0,
    saturation: 100,
    temperature: 0
  });
  const [rotation, setRotation] = useState(0);
  
  // Export Settings
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [exportQuality, setExportQuality] = useState<number>(92);

  // Reset filters when a new image is generated or history changes
  useEffect(() => {
    setFilters({ brightness: 100, contrast: 100, grayscale: 0, sepia: 0, saturation: 100, temperature: 0 });
    setRotation(0);
    setShowFilters(false);
    setIsSliderMode(false);
    setSliderPosition(50);
  }, [generatedImage]);

  // Handle Slider Dragging
  const handleMove = useCallback((clientX: number) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
        e.preventDefault();
        handleMove(e.clientX);
    }
  }, [isDragging, handleMove]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging) {
        e.preventDefault(); // Prevent scrolling while dragging slider
        handleMove(e.touches[0].clientX);
    }
  }, [isDragging, handleMove]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchend', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging, onMouseMove, onTouchMove, onMouseUp]);

  const startDragging = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    handleMove(clientX);
  };

  const handleFilterChange = (key: keyof typeof filters, value: number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRotate = (direction: 'cw' | 'ccw') => {
    setRotation(prev => {
        if (direction === 'cw') return (prev + 90) % 360;
        return (prev - 90 + 360) % 360;
    });
  };

  const handleResetFilters = () => {
    setFilters({ brightness: 100, contrast: 100, grayscale: 0, sepia: 0, saturation: 100, temperature: 0 });
    setRotation(0);
  };

  const applyCanvasTransformations = (
      ctx: CanvasRenderingContext2D, 
      img: HTMLImageElement, 
      canvasWidth: number, 
      canvasHeight: number
  ) => {
      // 1. Filters
      ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) saturate(${filters.saturation}%)`;

      // 2. Rotation
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      // Reset transform for overlay
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = 'none'; 

      // 3. Temperature Overlay
      if (filters.temperature !== 0) {
          ctx.globalCompositeOperation = 'soft-light';
          if (filters.temperature > 0) {
              // Warm (Orange)
              ctx.fillStyle = `rgba(255, 147, 41, ${filters.temperature / 100 * 0.5})`;
          } else {
              // Cool (Blue)
              ctx.fillStyle = `rgba(0, 160, 255, ${Math.abs(filters.temperature) / 100 * 0.5})`;
          }
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          ctx.globalCompositeOperation = 'source-over';
      }
  };

  const handleApplyFilters = () => {
    if (!generatedImage) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = generatedImage;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        // Swap dimensions if rotated 90 or 270 degrees
        if (rotation % 180 !== 0) {
            canvas.width = img.height;
            canvas.height = img.width;
        } else {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
            applyCanvasTransformations(ctx, img, canvas.width, canvas.height);
            const newData = canvas.toDataURL('image/png');
            onApplyFilters(newData);
        }
    };
  };

  const handleDownload = () => {
    if (generatedImage) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = generatedImage;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Swap dimensions if rotated 90 or 270 degrees
        if (rotation % 180 !== 0) {
            canvas.width = img.height;
            canvas.height = img.width;
        } else {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // If exporting as JPEG, we should fill the background with white
          if (exportFormat === 'jpeg') {
             ctx.fillStyle = '#FFFFFF';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          applyCanvasTransformations(ctx, img, canvas.width, canvas.height);
          
          const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
          const quality = exportFormat === 'png' ? 1.0 : exportQuality / 100;

          const link = document.createElement('a');
          link.href = canvas.toDataURL(mimeType, quality);
          link.download = `lumina-forge-edit-${Date.now()}.${exportFormat}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      };
    }
  };

  const hasActiveFilters = filters.brightness !== 100 || filters.contrast !== 100 || filters.grayscale !== 0 || filters.sepia !== 0 || filters.saturation !== 100 || filters.temperature !== 0 || rotation !== 0;

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Preview</h2>
          <div className="flex items-center gap-1 bg-zinc-950/50 rounded-lg p-1 border border-white/5">
            <button 
              onClick={onUndo}
              disabled={!canUndo || isLoading}
              className={`p-1.5 rounded-md transition-all ${
                canUndo && !isLoading
                  ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                  : 'text-gray-700 cursor-not-allowed'
              }`}
              title="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3 bg-white/10"></div>
            <button 
              onClick={onRedo}
              disabled={!canRedo || isLoading}
              className={`p-1.5 rounded-md transition-all ${
                canRedo && !isLoading
                  ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                  : 'text-gray-700 cursor-not-allowed'
              }`}
              title="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <button 
          onClick={onReset}
          className="text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors px-3 py-1 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5"
        >
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Original */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className="flex justify-between items-center">
             <p className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Original Source</p>
             {!isLoading && (
               <button 
                 onClick={onCropOriginal}
                 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all"
               >
                 <Crop className="w-3 h-3" /> Crop
               </button>
             )}
          </div>
          <div className="relative flex-1 min-h-[300px] rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 shadow-inner group">
            <img 
              src={originalImage} 
              alt="Original" 
              className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-2xl"></div>
          </div>
        </div>

        {/* Result */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className="flex justify-between items-center">
             <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 uppercase tracking-wider ml-1">Forged Result</p>
             <div className="flex items-center gap-2">
               {generatedImage && !isLoading && (
                 <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${showFilters ? 'bg-white text-black border-white' : 'bg-zinc-900 text-gray-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                 >
                   <SlidersHorizontal className="w-3 h-3" /> Adjust
                 </button>
               )}
               {generatedImage && !isLoading && (
                 <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                   <Check className="w-3 h-3" /> Ready
                 </span>
               )}
             </div>
          </div>
          <div className={`relative flex-1 min-h-[300px] rounded-2xl overflow-hidden bg-zinc-950 border border-white/10 shadow-inner flex items-center justify-center transition-all duration-500 ${isLoading ? 'ring-1 ring-pink-500 shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)]' : ''}`}>
            
            {/* Background Mesh for Empty State */}
            {!generatedImage && !isLoading && !error && (
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 opacity-50"></div>
            )}

            {isLoading ? (
               <div className="text-center p-6 relative z-10">
                 <div className="relative w-20 h-20 mx-auto mb-6">
                   <div className="absolute inset-0 border-2 border-zinc-800 rounded-full"></div>
                   <div className="absolute inset-0 border-2 border-pink-500 rounded-full border-t-transparent animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-pink-500/20 rounded-full blur-md animate-pulse"></div>
                   </div>
                 </div>
                 <p className="text-white font-bold tracking-wide">Refining Reality</p>
                 <p className="text-gray-500 text-xs mt-2 uppercase tracking-wider">Processing with Gemini</p>
               </div>
            ) : error ? (
              <div className="text-center p-6 max-w-xs relative z-10">
                <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <p className="text-white font-bold mb-1">Forging Failed</p>
                <p className="text-gray-500 text-xs">{error}</p>
              </div>
            ) : generatedImage ? (
              <div 
                  ref={imageContainerRef}
                  className="relative w-full h-full group select-none touch-none"
                  onMouseDown={isSliderMode ? startDragging : undefined}
                  onTouchStart={isSliderMode ? startDragging : undefined}
              >
                {/* Comparison Mode */}
                {isSliderMode ? (
                  <>
                     {/* Bottom Layer: Generated Image (After) */}
                     <img 
                      src={generatedImage} 
                      alt="Generated" 
                      style={{
                        filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) saturate(${filters.saturation}%)`,
                        transform: `rotate(${rotation}deg)`
                      }}
                      className="absolute inset-0 w-full h-full object-contain p-4"
                    />
                    {/* Temperature Overlay (Bottom Layer) */}
                    {filters.temperature !== 0 && (
                      <div 
                        className="absolute inset-0 pointer-events-none z-10"
                        style={{
                            backgroundColor: filters.temperature > 0 ? 'rgb(255, 147, 41)' : 'rgb(0, 160, 255)',
                            opacity: Math.abs(filters.temperature) / 100 * 0.5,
                            mixBlendMode: 'soft-light',
                            transform: `rotate(${rotation}deg)`
                        }}
                      />
                    )}

                    {/* Top Layer: Original Image (Before) - Clipped */}
                    <div 
                      className="absolute inset-0 w-full h-full"
                      style={{
                        clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
                      }}
                    >
                      <img 
                        src={originalImage} 
                        alt="Original" 
                        className="w-full h-full object-contain p-4 bg-zinc-950"
                        style={{
                           // Match rotation for better comparison alignment if user rotated result
                           transform: `rotate(${rotation}deg)`
                        }}
                      />
                      {/* Label for Original side */}
                      <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-wider">
                         Original
                      </div>
                    </div>
                    
                    {/* Label for Result side (visible when slider moves) */}
                    <div className="absolute top-6 right-6 bg-pink-500/20 backdrop-blur-md text-pink-200 text-[10px] font-bold px-2 py-1 rounded border border-pink-500/20 uppercase tracking-wider pointer-events-none">
                        Result
                    </div>

                    {/* Slider Handle */}
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                      style={{ left: `${sliderPosition}%` }}
                    >
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-black">
                          <MoveHorizontal className="w-4 h-4" />
                       </div>
                    </div>
                  </>
                ) : (
                  /* Standard Mode */
                  <>
                    <img 
                      src={generatedImage} 
                      alt="Generated" 
                      style={{
                        filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) saturate(${filters.saturation}%)`,
                        transform: `rotate(${rotation}deg)`
                      }}
                      className="w-full h-full object-contain p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat invert-[.05] transition-all duration-300"
                    />
                    {/* Temperature Overlay Preview */}
                    {filters.temperature !== 0 && (
                      <div 
                        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
                        style={{
                            backgroundColor: filters.temperature > 0 ? 'rgb(255, 147, 41)' : 'rgb(0, 160, 255)',
                            opacity: Math.abs(filters.temperature) / 100 * 0.5,
                            mixBlendMode: 'soft-light',
                            transform: `rotate(${rotation}deg)`
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center p-6 relative z-10 opacity-50">
                <div className="w-16 h-16 bg-zinc-900 text-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5 rotate-3">
                  <RefreshCw className="w-8 h-8" />
                </div>
                <p className="text-zinc-500 text-sm font-medium">Waiting for input...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Controls Panel */}
      {showFilters && generatedImage && !isLoading && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 animate-in fade-in slide-in-from-top-4 space-y-4 shadow-2xl ring-1 ring-white/5">
           
           {/* Tools: Rotation & AI */}
           <div className="flex flex-col gap-3 pb-4 border-b border-white/5">
              <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                 <span>Tools</span>
                 <span className="text-[10px] font-normal text-gray-600">Transform & Enhance</span>
              </div>
              <div className="flex flex-wrap gap-3">
                  <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-1 border border-white/5">
                      <button 
                        onClick={() => handleRotate('ccw')}
                        className="p-2 rounded-md hover:bg-zinc-800 text-gray-400 hover:text-white transition-colors"
                        title="Rotate Left"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <div className="w-px h-auto bg-white/5 my-1"></div>
                      <button 
                        onClick={() => handleRotate('cw')}
                        className="p-2 rounded-md hover:bg-zinc-800 text-gray-400 hover:text-white transition-colors"
                        title="Rotate Right"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-2 gap-2 min-w-[240px]">
                      <button 
                        onClick={onDenoise}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white border border-white/5 transition-all text-[10px] font-bold uppercase tracking-wider group"
                        title="Reduce Noise"
                      >
                        <Wand2 className="w-3.5 h-3.5 group-hover:text-pink-400 transition-colors" /> Denoise
                      </button>

                      <button 
                        onClick={onAutoEnhance}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 text-pink-300 hover:text-pink-200 border border-pink-500/20 hover:border-pink-500/40 transition-all text-[10px] font-bold uppercase tracking-wider group"
                        title="Auto Enhance Quality"
                      >
                        <Sparkles className="w-3.5 h-3.5 group-hover:text-pink-100 transition-colors" /> Auto Enhance
                      </button>
                  </div>
              </div>
           </div>

           {/* Sliders */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              <div className="space-y-2">
                 <div className="flex justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> Brightness</span>
                    <span>{filters.brightness}%</span>
                 </div>
                 <input 
                   type="range" 
                   min="0" 
                   max="200" 
                   value={filters.brightness} 
                   onChange={(e) => handleFilterChange('brightness', parseInt(e.target.value))}
                   className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                 />
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Contrast className="w-3 h-3" /> Contrast</span>
                    <span>{filters.contrast}%</span>
                 </div>
                 <input 
                   type="range" 
                   min="0" 
                   max="200" 
                   value={filters.contrast} 
                   onChange={(e) => handleFilterChange('contrast', parseInt(e.target.value))}
                   className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                 />
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Moon className="w-3 h-3" /> Grayscale</span>
                    <span>{filters.grayscale}%</span>
                 </div>
                 <input 
                   type="range" 
                   min="0" 
                   max="100" 
                   value={filters.grayscale} 
                   onChange={(e) => handleFilterChange('grayscale', parseInt(e.target.value))}
                   className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-gray-400"
                 />
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Palette className="w-3 h-3" /> Sepia</span>
                    <span>{filters.sepia}%</span>
                 </div>
                 <input 
                   type="range" 
                   min="0" 
                   max="100" 
                   value={filters.sepia} 
                   onChange={(e) => handleFilterChange('sepia', parseInt(e.target.value))}
                   className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-400"
                 />
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Droplet className="w-3 h-3" /> Vibrance</span>
                    <span>{filters.saturation}%</span>
                 </div>
                 <input 
                   type="range" 
                   min="0" 
                   max="200" 
                   value={filters.saturation} 
                   onChange={(e) => handleFilterChange('saturation', parseInt(e.target.value))}
                   className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                 />
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temperature</span>
                    <span>{filters.temperature}</span>
                 </div>
                 <input 
                   type="range" 
                   min="-100" 
                   max="100" 
                   value={filters.temperature} 
                   onChange={(e) => handleFilterChange('temperature', parseInt(e.target.value))}
                   className={`w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${filters.temperature > 0 ? 'accent-orange-500' : filters.temperature < 0 ? 'accent-blue-500' : 'accent-gray-400'}`}
                 />
              </div>
           </div>

           {/* Filter Actions */}
           <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <button 
                 onClick={handleResetFilters}
                 disabled={!hasActiveFilters}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${hasActiveFilters ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-gray-600 cursor-not-allowed'}`}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
              </button>

              <div className="flex items-center gap-2">
                 <button
                   onClick={() => setIsSliderMode(!isSliderMode)}
                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all select-none ${isSliderMode ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30' : 'text-indigo-300 hover:text-indigo-200 border-transparent hover:bg-indigo-500/10'}`}
                   title="Toggle Comparison Slider"
                 >
                   <SplitSquareHorizontal className="w-3.5 h-3.5" /> {isSliderMode ? 'Exit Compare' : 'Compare'}
                 </button>

                 <button
                   onClick={handleApplyFilters}
                   disabled={!hasActiveFilters}
                   className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${hasActiveFilters ? 'bg-white text-black hover:bg-gray-200' : 'bg-zinc-800 text-gray-500 cursor-not-allowed'}`}
                 >
                   <Check className="w-3.5 h-3.5" /> Apply
                 </button>
              </div>
           </div>
        </div>
      )}

      {generatedImage && !isLoading && (
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4 border-t border-white/10">
          
          <div className="flex items-center gap-4 bg-zinc-900/50 p-2 pr-4 rounded-xl border border-white/10 w-full sm:w-auto">
            {/* Format Selector */}
            <div className="relative group flex-1 sm:flex-none">
               <select
                   value={exportFormat}
                   onChange={(e) => setExportFormat(e.target.value as 'png' | 'jpeg')}
                   className="w-full sm:w-auto appearance-none bg-zinc-800 border border-white/10 text-gray-300 text-xs font-medium rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-white/20 hover:bg-zinc-700 transition-colors cursor-pointer"
               >
                   <option value="png">PNG (Lossless)</option>
                   <option value="jpeg">JPEG (Lossy)</option>
               </select>
               <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Quality Slider (Conditional) */}
            {exportFormat === 'jpeg' && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 flex-1 sm:flex-none">
                    <div className="hidden sm:block w-px h-6 bg-white/10"></div>
                    <div className="flex flex-col justify-center w-full sm:w-32">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Quality</span>
                            <span className="text-[10px] text-gray-300 font-mono">{exportQuality}%</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={exportQuality}
                            onChange={(e) => setExportQuality(parseInt(e.target.value))}
                            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                    </div>
                </div>
            )}
          </div>

          <button
            onClick={handleDownload}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-xl hover:bg-gray-200 font-bold shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download Asset
          </button>
        </div>
      )}
    </div>
  );
};

export default ResultViewer;