import React, { useCallback } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { ProcessedImage } from '../types';

interface ImageUploaderProps {
  onImageSelected: (image: ProcessedImage) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected }) => {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [onImageSelected]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [onImageSelected]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      onImageSelected({
        originalData: result,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      className="w-full relative group"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Animated Gradient Border Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-2xl opacity-30 group-hover:opacity-100 blur transition duration-1000 group-hover:duration-200"></div>
      
      <label 
        htmlFor="file-upload" 
        className="relative flex flex-col items-center justify-center w-full h-72 sm:h-96 rounded-2xl cursor-pointer bg-zinc-950 border border-white/10 hover:bg-zinc-900/80 transition-all duration-300 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-pink-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-zinc-900 p-5 rounded-full ring-1 ring-white/10 group-hover:ring-pink-500/50 transition-all duration-500 group-hover:scale-110">
              <Upload className="w-8 h-8 text-pink-500" />
            </div>
          </div>
          <p className="mb-3 text-lg font-medium text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 font-bold">Upload Image</span> to begin
          </p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Drag and drop or click to select files (JPG, PNG, WEBP)
          </p>
        </div>
        <input 
          id="file-upload" 
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange} 
        />
      </label>
    </div>
  );
};

export default ImageUploader;