'use client';

import { useState, useEffect } from 'react';
import { Upload, ArrowRight, Video, FileText, LayoutGrid, Calendar, Loader2 } from 'lucide-react';

type AnimationPhase = 'input' | 'processing' | 'transforming' | 'output' | 'complete';

export function HeroShowcaseV4() {
  const [phase, setPhase] = useState<AnimationPhase>('input');

  useEffect(() => {
    const runAnimation = () => {
      const sequence = [
        { phase: 'input' as AnimationPhase, delay: 0 },
        { phase: 'processing' as AnimationPhase, delay: 1000 },
        { phase: 'transforming' as AnimationPhase, delay: 2500 },
        { phase: 'output' as AnimationPhase, delay: 3500 },
        { phase: 'complete' as AnimationPhase, delay: 5000 },
      ];

      sequence.forEach(({ phase: nextPhase, delay }) => {
        setTimeout(() => setPhase(nextPhase), delay);
      });

      // Loop animation
      setTimeout(() => {
        setPhase('input');
        setTimeout(runAnimation, 100);
      }, 10000);
    };

    runAnimation();
  }, []);

  return (
    <div className="relative flex flex-col items-center gap-6">
      {/* Ambient glow */}
      <div className="absolute -inset-8 bg-gradient-to-b from-[#00D4FF]/10 via-[#B794F6]/10 to-transparent rounded-[40px] blur-3xl pointer-events-none" />

      {/* Input: Raw Video */}
      <div
        className={`relative w-full max-w-sm transition-all duration-500 ${
          phase === 'input' ? 'opacity-100 scale-100' : 'opacity-100 scale-95'
        }`}
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 font-medium text-sm">Input</span>
          </div>
          <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center border border-white/5 relative">
            <Video
              className={`w-12 h-12 text-white/40 transition-opacity duration-300 ${
                phase === 'processing' ? 'opacity-50' : 'opacity-100'
              }`}
            />
            {phase === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
              </div>
            )}
          </div>
          <p className="text-white/60 text-xs mt-3 text-center">
            {phase === 'processing' ? 'Processing...' : 'Zoom call · Podcast · Raw footage'}
          </p>
        </div>
      </div>

      {/* Arrow Down */}
      <div className="relative">
        <ArrowRight
          className={`w-6 h-6 text-[#00D4FF] rotate-90 transition-all duration-500 ${
            phase === 'transforming'
              ? 'scale-125 opacity-100'
              : phase === 'processing'
              ? 'scale-110 opacity-80'
              : 'scale-100 opacity-60'
          }`}
        />
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
            <div
              className={`aspect-square bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/5 border border-[#00D4FF]/30 rounded-lg flex flex-col items-center justify-center p-3 transition-all duration-300 ${
                phase === 'output' || phase === 'complete'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '0ms' }}
            >
              <Video className="w-6 h-6 text-[#00D4FF] mb-2" />
              <span className="text-white text-xs font-medium">5 Clips</span>
            </div>
            <div
              className={`aspect-square bg-gradient-to-br from-[#B794F6]/20 to-[#B794F6]/5 border border-[#B794F6]/30 rounded-lg flex flex-col items-center justify-center p-3 transition-all duration-300 ${
                phase === 'output' || phase === 'complete'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '100ms' }}
            >
              <LayoutGrid className="w-6 h-6 text-[#B794F6] mb-2" />
              <span className="text-white text-xs font-medium">3 Carousels</span>
            </div>
            <div
              className={`aspect-square bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/5 border border-[#00D4FF]/30 rounded-lg flex flex-col items-center justify-center p-3 transition-all duration-300 ${
                phase === 'output' || phase === 'complete'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              <FileText className="w-6 h-6 text-[#00D4FF] mb-2" />
              <span className="text-white text-xs font-medium">7 Posts</span>
            </div>
            <div
              className={`aspect-square bg-gradient-to-br from-[#B794F6]/20 to-[#B794F6]/5 border border-[#B794F6]/30 rounded-lg flex flex-col items-center justify-center p-3 transition-all duration-300 ${
                phase === 'output' || phase === 'complete'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '300ms' }}
            >
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
      <div
        className={`flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg backdrop-blur-sm transition-all duration-500 ${
          phase === 'complete' ? 'opacity-100 scale-100' : 'opacity-50 scale-95'
        }`}
      >
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-green-400 text-xs font-bold">94% Voice Match</span>
      </div>
    </div>
  );
}
