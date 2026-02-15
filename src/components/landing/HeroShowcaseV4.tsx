'use client';

import { Upload, ArrowRight, Video, FileText, LayoutGrid, Calendar } from 'lucide-react';

export function HeroShowcaseV4() {
  return (
    <div className="relative flex flex-col items-center gap-6">
      {/* Ambient glow */}
      <div className="absolute -inset-8 bg-gradient-to-b from-[#00D4FF]/10 via-[#B794F6]/10 to-transparent rounded-[40px] blur-3xl pointer-events-none" />

      {/* Input: Raw Video */}
      <div className="relative w-full max-w-sm">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 font-medium text-sm">Input</span>
          </div>
          <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center border border-white/5">
            <Video className="w-12 h-12 text-white/40" />
          </div>
          <p className="text-white/60 text-xs mt-3 text-center">
            Zoom call · Podcast · Raw footage
          </p>
        </div>
      </div>

      {/* Arrow Down */}
      <div className="relative">
        <ArrowRight className="w-6 h-6 text-[#00D4FF] rotate-90" />
      </div>

      {/* Output: Content Kit */}
      <div className="relative w-full max-w-sm">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-xl flex items-center justify-center shadow-lg">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 font-medium text-sm">Output</span>
          </div>

          {/* Grid of content types */}
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-square bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/5 border border-[#00D4FF]/30 rounded-lg flex flex-col items-center justify-center p-3">
              <Video className="w-6 h-6 text-[#00D4FF] mb-2" />
              <span className="text-white text-xs font-medium">5 Clips</span>
            </div>
            <div className="aspect-square bg-gradient-to-br from-[#B794F6]/20 to-[#B794F6]/5 border border-[#B794F6]/30 rounded-lg flex flex-col items-center justify-center p-3">
              <LayoutGrid className="w-6 h-6 text-[#B794F6] mb-2" />
              <span className="text-white text-xs font-medium">3 Carousels</span>
            </div>
            <div className="aspect-square bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/5 border border-[#00D4FF]/30 rounded-lg flex flex-col items-center justify-center p-3">
              <FileText className="w-6 h-6 text-[#00D4FF] mb-2" />
              <span className="text-white text-xs font-medium">7 Posts</span>
            </div>
            <div className="aspect-square bg-gradient-to-br from-[#B794F6]/20 to-[#B794F6]/5 border border-[#B794F6]/30 rounded-lg flex flex-col items-center justify-center p-3">
              <Calendar className="w-6 h-6 text-[#B794F6] mb-2" />
              <span className="text-white text-xs font-medium">Calendar</span>
            </div>
          </div>

          <p className="text-white/60 text-xs mt-3 text-center">
            Ready in 2–5 minutes
          </p>
        </div>
      </div>

      {/* Voice Match Badge */}
      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-green-400 text-xs font-bold">94% Voice Match</span>
      </div>
    </div>
  );
}
