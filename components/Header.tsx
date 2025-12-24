import React from 'react';
import { Aperture } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-black/20 border-b border-white/5 shrink-0 z-50 backdrop-blur-xl relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-zinc-900 border border-white/10 p-2.5 rounded-lg">
                <Aperture className="h-6 w-6 text-pink-500" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-pink-200 transition-all duration-300">
                Lumina Forge
              </h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="h-px w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <span className="text-xs font-medium text-gray-400 tracking-wide uppercase">
              Powered by Gemini 2.5 Flash Image
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;