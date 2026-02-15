'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Video, Loader2, Sparkles, Check } from 'lucide-react';

const OUTPUTS = [
  { icon: '🎬', label: '5 Clips', color: '#ef4444' },
  { icon: '🧵', label: '3 Carousels', color: '#38bdf8' },
  { icon: '📝', label: '7 Posts', color: '#a78bfa' },
  { icon: '📅', label: 'Calendar', color: '#34d399' },
  { icon: '🧠', label: 'KB Enhanced', color: '#fbbf24' },
  { icon: '👥', label: 'Repurposed', color: '#fb923c' },
];

const STEPS = [
  'Transcribing audio...',
  'Identifying key moments...',
  'Matching your voice...',
  'Generating content kit...',
];

type Phase = 'idle' | 'upload' | 'processing' | 'output';

export function HeroAnimation() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const run = async () => {
      // Reset
      setPhase('idle');
      setProgress(0);
      setStepIdx(0);
      await new Promise((r) => setTimeout(r, 800));

      // Upload phase
      setPhase('upload');
      await new Promise((r) => setTimeout(r, 1200));

      // Processing phase with progress
      setPhase('processing');
      for (let i = 0; i <= 100; i += 2) {
        setProgress(i);
        if (i % 25 === 0 && i > 0) {
          setStepIdx(Math.min(Math.floor(i / 25), STEPS.length - 1));
        }
        await new Promise((r) => setTimeout(r, 40));
      }
      await new Promise((r) => setTimeout(r, 400));

      // Output phase - show all content types
      setPhase('output');
      await new Promise((r) => setTimeout(r, 4000));

      // Loop
      run();
    };
    run();
  }, []);

  const isProcessing = phase === 'processing';
  const showOutputs = phase === 'output';

  return (
    <div className="relative flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {/* Ambient glow */}
      <div className="absolute -inset-8 bg-gradient-to-b from-[#00D4FF]/10 via-[#B794F6]/10 to-transparent rounded-[40px] blur-3xl pointer-events-none" />

      {/* Input: Raw Video */}
      <div
        className={`relative w-full transition-all duration-700 ${
          phase === 'upload' || phase === 'idle' ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
        }`}
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 font-medium text-sm">Input</span>
          </div>
          <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl overflow-hidden border border-white/5 relative">
            <Image
              src="/showcase/source-video.png"
              alt="Input video"
              fill
              className="object-cover opacity-70"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border border-white/30">
                <Video className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          <p className="text-white/60 text-xs mt-3 text-center">
            Zoom call · Podcast · Raw footage
          </p>
        </div>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <div className="bg-[#0f172a]/95 backdrop-blur-xl border-2 border-[#00D4FF]/30 rounded-2xl p-8 shadow-2xl max-w-sm w-full">
            <div className="flex items-center gap-3 mb-6">
              <Loader2 className="w-6 h-6 text-[#00D4FF] animate-spin" />
              <span className="text-white font-semibold">Processing...</span>
            </div>
            <div className="relative w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#00D4FF] to-[#B794F6] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[#64748b] text-sm text-center">
              {STEPS[stepIdx]}
            </p>
          </div>
        </div>
      )}

      {/* Arrow/Sparkle Indicator */}
      <div className="relative">
        <Sparkles
          className={`w-6 h-6 transition-all duration-500 ${
            showOutputs
              ? 'text-[#00D4FF] scale-125 opacity-100'
              : 'text-[#00D4FF]/40 scale-100 opacity-60'
          }`}
        />
      </div>

      {/* Output: Content Kit */}
      <div
        className={`relative w-full transition-all duration-700 ${
          showOutputs ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-xl flex items-center justify-center shadow-lg">
              <Check className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 font-medium text-sm">Output</span>
          </div>

          {/* Grid of all output types */}
          <div className="grid grid-cols-3 gap-2">
            {OUTPUTS.map((output, index) => (
              <div
                key={output.label}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all duration-500 border`}
                style={{
                  backgroundColor: `${output.color}15`,
                  borderColor: `${output.color}40`,
                  transitionDelay: showOutputs ? `${index * 100}ms` : '0ms',
                  opacity: showOutputs ? 1 : 0,
                  transform: showOutputs ? 'translateY(0)' : 'translateY(10px)',
                }}
              >
                <span className="text-2xl mb-1">{output.icon}</span>
                <span
                  className="text-[10px] font-bold text-center leading-tight"
                  style={{ color: output.color }}
                >
                  {output.label}
                </span>
              </div>
            ))}
          </div>

          <p className="text-white/60 text-xs mt-4 text-center">
            Ready in 2-5 minutes
          </p>
        </div>
      </div>

      {/* Voice Match Badge */}
      <div
        className={`flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg backdrop-blur-sm transition-all duration-500 ${
          showOutputs ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-green-400 text-xs font-bold">94% Voice Match</span>
      </div>
    </div>
  );
}
