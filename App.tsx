import React, { useState } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import PromptEditor from './components/PromptEditor';
import ResultViewer from './components/ResultViewer';
import ImageCropper from './components/ImageCropper';
import { ProcessedImage, AppState, HistoryItem } from './types';
import { editImageWithGemini } from './services/geminiService';
import { Layers, Wand2, Image as ImageIcon, AlertTriangle } from 'lucide-react';

const getClosestAspectRatio = (width: number, height: number): string => {
  const targetRatio = width / height;
  const ratios = [
    { id: "1:1", value: 1 },
    { id: "3:4", value: 0.75 },
    { id: "4:3", value: 1.333 },
    { id: "9:16", value: 0.5625 },
    { id: "16:9", value: 1.777 }
  ];

  const closest = ratios.reduce((prev, curr) => {
    return (Math.abs(curr.value - targetRatio) < Math.abs(prev.value - targetRatio) ? curr : prev);
  });

  return closest.id;
};

const resizeImage = (base64Str: string, targetWidth: number, targetHeight: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Use high quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(base64Str); // Fallback
      }
    };
  });
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [originalImage, setOriginalImage] = useState<ProcessedImage | null>(null);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [prompt, setPrompt] = useState('');
  
  // Dimension State
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  
  // Crop State
  const [showCropper, setShowCropper] = useState(false);
  
  // Dialog State
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const generatedImage = historyIndex >= 0 ? history[historyIndex].image : null;
  const canUndo = historyIndex >= 0; 
  const canRedo = historyIndex < history.length - 1;

  const handleImageSelected = (image: ProcessedImage) => {
    setOriginalImage(image);
    setHistory([]);
    setHistoryIndex(-1);
    setPrompt('');
    setError(null);
    setAppState(AppState.READY_TO_EDIT);

    // Detect original dimensions to set as defaults
    const img = new Image();
    img.onload = () => {
      setWidth(img.width);
      setHeight(img.height);
    };
    img.src = image.originalData;
  };

  const handleCroppedImageSelected = (croppedBase64: string) => {
    setOriginalImage({ originalData: croppedBase64, mimeType: 'image/png' });
    setHistory([]);
    setHistoryIndex(-1);
    // Keep the current prompt
    setError(null);
    setAppState(AppState.READY_TO_EDIT);

    // Detect new dimensions
    const img = new Image();
    img.onload = () => {
      setWidth(img.width);
      setHeight(img.height);
    };
    img.src = croppedBase64;
    setShowCropper(false);
  };

  const handleResetRequest = () => {
    setShowResetConfirmation(true);
  };

  const handleConfirmReset = () => {
    setOriginalImage(null);
    setHistory([]);
    setHistoryIndex(-1);
    setPrompt('');
    setWidth(1024);
    setHeight(1024);
    setError(null);
    setAppState(AppState.IDLE);
    setShowResetConfirmation(false);
  };

  const handleGenerate = async (currentPrompt: string) => {
    if (!originalImage) return;

    setAppState(AppState.PROCESSING);
    setError(null);

    try {
      const base64Data = originalImage.originalData.split(',')[1];
      
      const aspectRatio = getClosestAspectRatio(width, height);
      
      const resultBase64 = await editImageWithGemini(
        base64Data,
        originalImage.mimeType,
        currentPrompt,
        aspectRatio
      );

      const rawImage = `data:image/png;base64,${resultBase64}`;
      const resizedImage = await resizeImage(rawImage, width, height);
      
      const newHistoryItem: HistoryItem = { 
        image: resizedImage, 
        prompt: currentPrompt,
        width,
        height
      };
      
      // If we are in the middle of history and generate new, discard forward history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newHistoryItem);
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setAppState(AppState.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong during generation.");
      setAppState(AppState.ERROR);
    }
  };

  const handleDenoise = async () => {
    // Use generated image if available, otherwise original
    const sourceImage = generatedImage || originalImage?.originalData;
    if (!sourceImage) return;

    setAppState(AppState.PROCESSING);
    setError(null);

    try {
      // Parse base64 and mime type from data URI
      const match = sourceImage.match(/^data:(.*?);base64,(.*)$/);
      if (!match) throw new Error("Invalid image source data.");
      
      const mimeType = match[1];
      const base64Data = match[2];
      
      const aspectRatio = getClosestAspectRatio(width, height);
      
      // Prompt optimized for noise reduction
      const denoisePrompt = "Remove all noise and grain from this image. Make it look clean, sharp and professional. Preserve all details and textures.";

      const resultBase64 = await editImageWithGemini(
        base64Data,
        mimeType,
        denoisePrompt,
        aspectRatio
      );

      const rawImage = `data:image/png;base64,${resultBase64}`;
      const resizedImage = await resizeImage(rawImage, width, height);
      
      const newHistoryItem: HistoryItem = { 
        image: resizedImage, 
        prompt: "Remove Noise (AI)",
        width,
        height
      };
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newHistoryItem);
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setPrompt("Remove Noise (AI)");
      setAppState(AppState.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Denoising failed.");
      setAppState(AppState.ERROR);
    }
  };

  const handleAutoEnhance = async () => {
    // Use generated image if available, otherwise original
    const sourceImage = generatedImage || originalImage?.originalData;
    if (!sourceImage) return;

    setAppState(AppState.PROCESSING);
    setError(null);

    try {
      // Parse base64 and mime type from data URI
      const match = sourceImage.match(/^data:(.*?);base64,(.*)$/);
      if (!match) throw new Error("Invalid image source data.");
      
      const mimeType = match[1];
      const base64Data = match[2];
      
      const aspectRatio = getClosestAspectRatio(width, height);
      
      // Prompt optimized for auto enhancement
      const enhancePrompt = "Automatically enhance this image. Improve color balance, contrast, sharpness, and lighting to make it look professional, vibrant, and high-quality. Preserve the main subject details.";

      const resultBase64 = await editImageWithGemini(
        base64Data,
        mimeType,
        enhancePrompt,
        aspectRatio
      );

      const rawImage = `data:image/png;base64,${resultBase64}`;
      const resizedImage = await resizeImage(rawImage, width, height);
      
      const newHistoryItem: HistoryItem = { 
        image: resizedImage, 
        prompt: "Auto Enhance (AI)",
        width,
        height
      };
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newHistoryItem);
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setPrompt("Auto Enhance (AI)");
      setAppState(AppState.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Auto enhancement failed.");
      setAppState(AppState.ERROR);
    }
  };

  const handleApplyFilters = (newImage: string) => {
    if (historyIndex < 0) return;
    
    const currentItem = history[historyIndex];
    const newHistoryItem: HistoryItem = { 
        image: newImage, 
        prompt: currentItem.prompt,
        width: currentItem.width,
        height: currentItem.height
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newHistoryItem);
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    
    if (newIndex >= 0) {
      const item = history[newIndex];
      setPrompt(item.prompt);
      setWidth(item.width);
      setHeight(item.height);
      setAppState(AppState.COMPLETE);
    } else {
      // Reached the beginning
      setAppState(AppState.READY_TO_EDIT);
    }
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    const item = history[newIndex];
    setHistoryIndex(newIndex);
    setPrompt(item.prompt);
    setWidth(item.width);
    setHeight(item.height);
    setAppState(AppState.COMPLETE);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-black text-gray-100 selection:bg-pink-500/30 selection:text-pink-100 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 bg-black"></div>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black opacity-80 pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[20%] w-[600px] h-[600px] bg-pink-900/10 rounded-full blur-[120px] z-0 pointer-events-none"></div>

      <Header />

      <main className="flex-1 min-h-0 relative flex flex-col w-full max-w-7xl mx-auto z-10">
        
        {/* Intro / Empty State */}
        {appState === AppState.IDLE ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-8 pt-8 pb-12">
            <div className="max-w-4xl mx-auto text-center space-y-12 mt-8 md:mt-16 pb-20">
               <div className="space-y-6 animate-fade-in-up">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">AI-Powered Image Studio</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight">
                    Forge the <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">Perfect Image</span>
                  </h2>
                  <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Upload your product photos and let Gemini AI handle the rest. 
                    Remove backgrounds, relight scenes, and transform aesthetics with simple text prompts.
                  </p>
               </div>
               
               <div className="relative max-w-2xl mx-auto">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-3xl blur opacity-30"></div>
                  <div className="relative bg-black/40 p-8 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl">
                      <ImageUploader onImageSelected={handleImageSelected} />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto pt-10">
                  {[
                    { title: "Smart Isolation", desc: "Remove backgrounds with pixel-perfect precision.", icon: Layers, color: "text-blue-400" },
                    { title: "Scene Synthesis", desc: "Place products in any environment imaginable.", icon: ImageIcon, color: "text-purple-400" },
                    { title: "Instant Remaster", desc: "Fix lighting and cleanup artifacts in seconds.", icon: Wand2, color: "text-pink-400" }
                  ].map((feature, idx) => (
                    <div key={idx} className="group bg-zinc-900/30 p-6 rounded-2xl border border-white/5 hover:bg-zinc-900/60 hover:border-white/10 transition-all duration-300">
                      <div className={`w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center mb-4 ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                         <feature.icon className={`w-6 h-6 ${feature.color}`} />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        ) : (
          /* Editor Interface */
          <div className="flex-1 h-full overflow-y-auto lg:overflow-hidden p-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 h-auto lg:h-full min-h-[600px] lg:min-h-0">
              
              {/* Left Column: Controls */}
              <div className="lg:col-span-4 flex flex-col gap-6 lg:h-full lg:overflow-y-auto custom-scrollbar pb-8 lg:pb-0">
                <PromptEditor 
                  onGenerate={handleGenerate} 
                  isProcessing={appState === AppState.PROCESSING}
                  prompt={prompt}
                  setPrompt={setPrompt}
                  width={width}
                  setWidth={setWidth}
                  height={height}
                  setHeight={setHeight}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                />
              </div>

              {/* Right Column: Preview */}
              <div className="lg:col-span-8 lg:h-full flex flex-col pb-8 lg:pb-0">
                <div className="bg-black/40 rounded-3xl shadow-2xl border border-white/10 p-6 lg:p-8 flex-1 backdrop-blur-md relative overflow-hidden">
                  <ResultViewer 
                    originalImage={originalImage!.originalData}
                    generatedImage={generatedImage}
                    isLoading={appState === AppState.PROCESSING}
                    error={error}
                    onReset={handleResetRequest}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onCropOriginal={() => setShowCropper(true)}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onApplyFilters={handleApplyFilters}
                    onDenoise={handleDenoise}
                    onAutoEnhance={handleAutoEnhance}
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Cropper Modal */}
        {showCropper && originalImage && (
          <ImageCropper 
            image={originalImage.originalData}
            onCancel={() => setShowCropper(false)}
            onCropComplete={handleCroppedImageSelected}
          />
        )}

        {/* Reset Confirmation Dialog */}
        {showResetConfirmation && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 transform transition-all scale-100">
                    <div className="flex items-center gap-3 text-red-500 mb-4">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                           <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Reset Project?</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        Are you sure you want to start over? This will discard your current image and all edit history. This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setShowResetConfirmation(false)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirmReset}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20 transition-all"
                        >
                            Yes, Reset All
                        </button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;