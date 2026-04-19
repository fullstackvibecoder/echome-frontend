'use client';

import { useState } from 'react';
import { Play, Zap } from 'lucide-react';

const YOUTUBE_VIDEO_ID = 'Yr9VltWMqsY';
const YOUTUBE_THUMBNAIL = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`;

export function HeroDemoVideo() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative group">
      {/* Glass Container */}
      <div className="relative z-10 p-4 sm:p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/5 shadow-[0_20px_40px_rgba(0,103,126,0.15)]">
        <div className="rounded-xl overflow-hidden bg-gray-950 relative">
          {!isPlaying ? (
            /* Thumbnail with play overlay */
            <button
              onClick={() => setIsPlaying(true)}
              className="relative w-full group/video cursor-pointer"
              style={{ paddingBottom: '56.25%' }}
              aria-label="Play demo video"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={YOUTUBE_THUMBNAIL}
                alt="EchoMe product demo"
                fetchPriority="high"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/video:scale-105"
              />

              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/40 group-hover/video:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                {/* Play button */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/30 scale-100 group-hover/video:scale-110 transition-transform duration-300">
                  <Play className="w-7 h-7 ml-1" fill="white" />
                </div>
              </div>

              {/* Bottom gradient with title */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white font-headline font-bold text-sm tracking-tight">
                  See EchoMe in Action
                </p>
              </div>
            </button>
          ) : (
            /* YouTube iframe */
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`}
                title="EchoMe product demo"
                allow="autoplay; fullscreen; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}
        </div>

        {/* Floating card: Voice Matched — top right, bouncing */}
        <div className="absolute -top-5 -right-5 sm:-top-6 sm:-right-6 z-20 bg-white/[0.03] backdrop-blur-xl p-3 sm:p-4 rounded-xl border border-white/10 shadow-[0_20px_40px_rgba(0,103,126,0.15)] flex items-center gap-3 animate-bounce pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-accent-purple" />
          </div>
          <span className="text-[11px] font-bold text-white whitespace-nowrap">Voice Matched 99%</span>
        </div>

        {/* Floating card: LinkedIn Carousel Gen — bottom left */}
        <div className="absolute -bottom-6 -left-4 sm:-bottom-8 sm:-left-12 z-20 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,103,126,0.15)] flex flex-col gap-2 max-w-[180px] pointer-events-none">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/40 uppercase tracking-tight">Drafting...</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse" />
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-[70%] bg-primary rounded-full transition-all duration-1000" />
          </div>
          <span className="text-xs text-white/80 font-medium">Instagram Carousel Gen</span>
        </div>
      </div>

      {/* Decorative circle behind container */}
      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-white/5 rounded-full opacity-50 pointer-events-none" />
    </div>
  );
}
