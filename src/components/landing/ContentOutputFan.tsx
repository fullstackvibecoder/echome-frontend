'use client';

import { useState, useEffect } from 'react';
import { Youtube, FileText, Mail, Video, Sparkles, ArrowRight, Check } from 'lucide-react';

/**
 * 4-Stage Workflow Visualization:
 * 1. Content Library Stack (YouTube, blog, emails)
 * 2. KB Building (Learning voice patterns, chunks count)
 * 3. Video Upload (Raw, unedited video)
 * 4. Content Kit (Clips, carousels, posts filtered through KB)
 */

export function ContentOutputFan() {
  const [chunksCount, setChunksCount] = useState(0);
  const [kbComplete, setKbComplete] = useState(false);

  // Animate chunks counter
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setChunksCount((prev) => {
          if (prev >= 894) {
            clearInterval(interval);
            setTimeout(() => setKbComplete(true), 300);
            return 894;
          }
          return prev + 47;
        });
      }, 80);
      return () => clearInterval(interval);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full relative">
      {/* Desktop: Horizontal 4-stage flow */}
      <div className="hidden md:grid md:grid-cols-4 gap-4 items-start">
        {/* Stage 1: Content Library Stack */}
        <div className="flex flex-col items-center opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '1200ms' }}>
          <div className="relative w-full">
            {/* Stacked cards effect */}
            <div className="absolute top-0 left-2 w-[calc(100%-16px)] h-24 bg-white/5 border border-white/10 rounded-lg transform -rotate-2" />
            <div className="absolute top-1 left-1 w-[calc(100%-8px)] h-24 bg-white/5 border border-white/10 rounded-lg transform rotate-1" />

            {/* Main card */}
            <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-white/10 rounded-lg p-4 shadow-xl">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-red-400">
                  <Youtube className="w-4 h-4" />
                  <span className="text-xs font-medium">12 videos</span>
                </div>
                <div className="flex items-center gap-2 text-blue-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-medium">8 posts</span>
                </div>
                <div className="flex items-center gap-2 text-purple-400">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-medium">50 emails</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-white/60 text-xs font-medium mt-3 text-center">Your Content Library</p>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center pt-8 opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '1400ms' }}>
          <ArrowRight className="w-5 h-5 text-primary" />
        </div>

        {/* Stage 2: KB Building */}
        <div className="flex flex-col items-center opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '1500ms' }}>
          <div className="relative w-full bg-gradient-to-br from-primary/10 to-accent-purple/10 border border-primary/30 rounded-lg p-4 shadow-xl">
            {/* Pulsing effect while building */}
            {!kbComplete && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent-purple/20 rounded-lg animate-kb-pulse" />
            )}

            <div className="relative flex flex-col items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${kbComplete ? 'bg-gradient-to-br from-primary to-accent-purple' : 'bg-white/10'} transition-all duration-500`}>
                {kbComplete ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                )}
              </div>

              <div className="text-center">
                <p className="text-white text-sm font-bold mb-1">
                  {kbComplete ? 'Voice Learned' : 'Learning Voice'}
                </p>
                <p className="text-primary text-lg font-black">
                  {chunksCount.toLocaleString()} chunks
                </p>
              </div>
            </div>
          </div>
          <p className="text-white/60 text-xs font-medium mt-3 text-center">Knowledge Base</p>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center pt-8 opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '1700ms' }}>
          <ArrowRight className="w-5 h-5 text-accent-purple" />
        </div>

        {/* Stage 3: Video Upload */}
        <div className="flex flex-col items-center opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '1800ms' }}>
          <div className="relative w-full aspect-video bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-lg overflow-hidden shadow-xl">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center">
                <Video className="w-5 h-5 text-white/60" />
              </div>
            </div>

            {/* RAW badge */}
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 backdrop-blur rounded">
              <span className="text-yellow-300 text-[10px] font-bold">RAW</span>
            </div>
          </div>
          <p className="text-white/60 text-xs font-medium mt-3 text-center">New Upload</p>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center pt-8 opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '2000ms' }}>
          <ArrowRight className="w-5 h-5 text-accent-pink" />
        </div>

        {/* Stage 4: Content Kit */}
        <div className="flex flex-col items-center opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '2100ms' }}>
          <div className="relative w-full">
            {/* Mini content cards stack */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-xl">
              <div className="grid grid-cols-2 gap-2 mb-2">
                {/* Mini cards */}
                <div className="aspect-[9/16] bg-gradient-to-br from-accent-pink/20 to-accent-pink/5 border border-accent-pink/30 rounded flex items-center justify-center">
                  <Video className="w-3 h-3 text-accent-pink" />
                </div>
                <div className="aspect-square bg-gradient-to-br from-accent-purple/20 to-accent-purple/5 border border-accent-purple/30 rounded flex items-center justify-center">
                  <span className="text-accent-purple text-[8px] font-bold">═</span>
                </div>
                <div className="aspect-[4/5] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded flex items-center justify-center">
                  <span className="text-primary text-[8px] font-bold">Aa</span>
                </div>
                <div className="aspect-[3/4] bg-gradient-to-br from-accent-yellow/20 to-accent-yellow/5 border border-accent-yellow/30 rounded flex items-center justify-center">
                  <FileText className="w-3 h-3 text-accent-yellow" />
                </div>
              </div>
              <div className="text-center pt-2 border-t border-white/10">
                <p className="text-white/60 text-[9px] font-medium">Sounds like YOU</p>
              </div>
            </div>
          </div>
          <p className="text-white/60 text-xs font-medium mt-3 text-center">Content Kit</p>
        </div>
      </div>

      {/* Mobile: Vertical flow */}
      <div className="md:hidden flex flex-col gap-4">
        {/* Stage 1: Content Library */}
        <div className="flex items-center gap-3 opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '1200ms' }}>
          <div className="flex-1 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-400" />
                <FileText className="w-4 h-4 text-blue-400" />
                <Mail className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-white/80 text-xs font-bold">Content Library</p>
            </div>
          </div>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '1400ms' }}>
          <div className="rotate-90">
            <ArrowRight className="w-4 h-4 text-primary" />
          </div>
        </div>

        {/* Stage 2: KB Building */}
        <div className="flex items-center gap-3 opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '1500ms' }}>
          <div className="flex-1 bg-gradient-to-br from-primary/10 to-accent-purple/10 border border-primary/30 rounded-lg p-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {kbComplete ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                )}
                <div>
                  <p className="text-white text-xs font-bold">{kbComplete ? 'Voice Learned' : 'Learning'}</p>
                  <p className="text-primary text-xs font-black">{chunksCount.toLocaleString()} chunks</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '1700ms' }}>
          <div className="rotate-90">
            <ArrowRight className="w-4 h-4 text-accent-purple" />
          </div>
        </div>

        {/* Stage 3 + 4: Video → Content Kit (combined for mobile) */}
        <div className="flex items-center gap-2 opacity-0 animate-hero-fade-in-up" style={{ animationDelay: '1800ms' }}>
          <div className="flex-1 aspect-video bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-lg overflow-hidden shadow-xl flex items-center justify-center relative">
            <Video className="w-6 h-6 text-white/60" />
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/30 backdrop-blur rounded text-[8px] font-bold text-yellow-300">
              RAW
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-accent-pink flex-shrink-0" />
          <div className="flex-1 grid grid-cols-2 gap-1 p-2 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl">
            <div className="aspect-square bg-accent-pink/10 border border-accent-pink/30 rounded" />
            <div className="aspect-square bg-accent-purple/10 border border-accent-purple/30 rounded" />
            <div className="aspect-square bg-primary/10 border border-primary/30 rounded" />
            <div className="aspect-square bg-accent-yellow/10 border border-accent-yellow/30 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
