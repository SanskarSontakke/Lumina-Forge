import React, { useState, useRef } from 'react';
import { Sparkles, ArrowRight, Eraser, Palette, Zap, Undo2, Redo2, Scaling, Square, RectangleHorizontal, RectangleVertical } from 'lucide-react';

interface PromptEditorProps {
  onGenerate: (prompt: string) => void;
  isProcessing: boolean;
  prompt: string;
  setPrompt: (prompt: string) => void;
  width: number;
  setWidth: (width: number) => void;
  height: number;
  setHeight: (height: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const QUICK_ACTIONS = [
  { label: "Remove background", icon: Eraser, prompt: "Remove the background completely, placing the subject on a pure white background." },
  { label: "Studio lighting", icon: Zap, prompt: "Improve the lighting to look like a professional studio product shot with soft shadows." },
  { label: "Clean up", icon: Sparkles, prompt: "Clean up imperfections and enhance the clarity of the object." },
  { label: "Monochrome", icon: Palette, prompt: "Convert the image to a high-contrast artistic black and white style." },
];

const ASPECT_RATIOS = [
  { label: "1:1", ratio: 1, icon: Square },
  { label: "16:9", ratio: 16/9, icon: RectangleHorizontal },
  { label: "9:16", ratio: 9/16, icon: RectangleVertical },
  { label: "4:3", ratio: 4/3, icon: RectangleHorizontal },
  { label: "3:4", ratio: 3/4, icon: RectangleVertical },
];

const PromptEditor: React.FC<PromptEditorProps> = ({ 
  onGenerate, 
  isProcessing,
  prompt,
  setPrompt,
  width,
  setWidth,
  height,
  setHeight,
  // Note: We are using local history for the editor buttons, ignoring global undo/redo props for these specific controls
}) => {
  // Local History State for Prompt and Dimensions
  const [history, setHistory] = useState<{
    past: Array<{ prompt: string; width: number; height: number }>;
    future: Array<{ prompt: string; width: number; height: number }>;
  }>({ past: [], future: [] });

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to save current state to history
  const saveToHistory = () => {
    setHistory(prev => ({
      past: [...prev.past, { prompt, width, height }],
      future: []
    }));
  };

  const handleLocalUndo = () => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    
    // Save current state to future before restoring
    setHistory({
      past: newPast,
      future: [{ prompt, width, height }, ...history.future]
    });
    
    setPrompt(previous.prompt);
    setWidth(previous.width);
    setHeight(previous.height);
  };

  const handleLocalRedo = () => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    
    // Save current state to past before restoring
    setHistory({
      past: [...history.past, { prompt, width, height }],
      future: newFuture
    });
    
    setPrompt(next.prompt);
    setWidth(next.width);
    setHeight(next.height);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Save history only if starting a new typing sequence (debounced)
    if (!typingTimeoutRef.current) {
      saveToHistory();
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1000);

    setPrompt(newValue);
  };

  const handleDimensionInput = (newWidth: number, newHeight: number) => {
    // For number inputs, we can also use a simple debounce or just save on every change
    // Using the same debounce logic for consistency and to prevent history spam on spinner use
    if (!typingTimeoutRef.current) {
      saveToHistory();
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1000);

    setWidth(newWidth);
    setHeight(newHeight);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  const handleQuickAction = (actionPrompt: string) => {
    saveToHistory();
    setPrompt(actionPrompt);
  };

  const handleAspectRatioClick = (ratio: number) => {
    saveToHistory();
    const longSide = Math.max(width, height);
    if (ratio === 1) {
      setWidth(longSide);
      setHeight(longSide);
    } else if (ratio > 1) {
      setWidth(longSide);
      setHeight(Math.round(longSide / ratio));
    } else {
      setHeight(longSide);
      setWidth(Math.round(longSide * ratio));
    }
  };

  const canLocalUndo = history.past.length > 0;
  const canLocalRedo = history.future.length > 0;

  return (
    <div className="bg-zinc-900/50 p-6 rounded-3xl shadow-2xl border border-white/10 h-full flex flex-col backdrop-blur-md relative overflow-hidden">
      {/* Decorative background blob */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex justify-between items-center mb-6 relative z-10">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-500" />
          Edit Instructions
        </h2>
        <div className="flex items-center gap-1 bg-zinc-950/50 rounded-lg p-1 border border-white/5">
          <button 
            type="button"
            onClick={handleLocalUndo}
            disabled={!canLocalUndo || isProcessing}
            className={`p-2 rounded-md transition-all ${
              canLocalUndo && !isProcessing
                ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                : 'text-gray-700 cursor-not-allowed'
            }`}
            title="Undo Edit"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/10"></div>
          <button 
            type="button"
            onClick={handleLocalRedo}
            disabled={!canLocalRedo || isProcessing}
            className={`p-2 rounded-md transition-all ${
              canLocalRedo && !isProcessing
                ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                : 'text-gray-700 cursor-not-allowed'
            }`}
            title="Redo Edit"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-8 relative z-10">
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleQuickAction(action.prompt)}
              disabled={isProcessing}
              className="group flex flex-col gap-2 p-3 text-sm text-gray-300 bg-zinc-800/50 border border-white/5 rounded-xl hover:bg-zinc-800 hover:border-pink-500/30 transition-all text-left relative overflow-hidden"
            >
               <div className="absolute inset-0 bg-gradient-to-r from-pink-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <action.icon className="w-5 h-5 text-gray-500 group-hover:text-pink-400 transition-colors" />
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col relative z-10">
        
        {/* Output Dimensions */}
        <div className="mb-6">
           <div className="flex justify-between items-end mb-2">
             <label className="text-xs uppercase tracking-wider font-semibold text-gray-500 flex items-center gap-2">
               <Scaling className="w-3.5 h-3.5" /> Output Dimensions
             </label>
           </div>
           
           {/* Aspect Ratio Presets */}
           <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {ASPECT_RATIOS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAspectRatioClick(preset.ratio)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/50 border border-white/5 hover:bg-zinc-800 hover:border-white/20 text-xs text-gray-400 hover:text-white transition-all whitespace-nowrap"
                  title={`Set to ${preset.label}`}
                >
                  <preset.icon className="w-3 h-3" />
                  {preset.label}
                </button>
              ))}
           </div>

           <div className="flex items-center gap-2">
              <div className="relative group flex-1">
                <input 
                  type="number" 
                  value={width} 
                  onChange={(e) => handleDimensionInput(Math.max(1, parseInt(e.target.value) || 0), height)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50 transition-colors"
                  placeholder="Width"
                />
                <span className="absolute right-3 top-3.5 text-xs text-gray-500">W</span>
              </div>
              <span className="text-gray-500">×</span>
              <div className="relative group flex-1">
                <input 
                  type="number" 
                  value={height} 
                  onChange={(e) => handleDimensionInput(width, Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50 transition-colors"
                  placeholder="Height"
                />
                <span className="absolute right-3 top-3.5 text-xs text-gray-500">H</span>
              </div>
           </div>
        </div>

        <label htmlFor="prompt" className="block text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
          Custom Prompt
        </label>
        <div className="relative group mb-4">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-indigo-600 rounded-xl opacity-20 group-focus-within:opacity-100 blur transition duration-500"></div>
          <textarea
            id="prompt"
            rows={5}
            className="relative w-full resize-none rounded-xl border border-white/10 shadow-inner sm:text-sm p-4 bg-zinc-950 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-0 focus:border-transparent transition-colors"
            placeholder="Describe your vision... (e.g., 'Place product on a dark wooden table with cinematic lighting')"
            value={prompt}
            onChange={handlePromptChange}
            disabled={isProcessing}
          />
        </div>
        
        <div className="mt-auto pt-4">
          <button
            type="submit"
            disabled={!prompt.trim() || isProcessing}
            className={`w-full relative group overflow-hidden rounded-xl p-[1px] transition-all
              ${!prompt.trim() || isProcessing 
                ? 'bg-zinc-800 cursor-not-allowed' 
                : 'bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 shadow-lg shadow-purple-900/20 active:scale-[0.98]'
              }`}
          >
            <div className={`relative h-full w-full rounded-xl flex items-center justify-center gap-2 py-3.5 px-4 font-bold text-sm text-white transition-all
               ${!prompt.trim() || isProcessing ? 'bg-zinc-900 text-gray-500' : 'bg-transparent'}
            `}>
               {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Forging Image...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-white/20" />
                  Forge Reality
                </>
              )}
            </div>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromptEditor;