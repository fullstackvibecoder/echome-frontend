'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

const LOOM_VIDEO_ID = '136ee8a0709e44eaa5a2ba128d3ab624';
const LOOM_THUMBNAIL_URL = `https://cdn.loom.com/sessions/thumbnails/${LOOM_VIDEO_ID}-3920a96cb0e456fa-full-play.gif#t=0.1`;

export function HeroDemoVideo() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Ambient glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-accent-purple/20 rounded-3xl blur-2xl pointer-events-none" />

      <div className="relative rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl bg-black">
        {!isPlaying ? (
          /* Custom thumbnail with play button overlay */
          <button
            onClick={() => setIsPlaying(true)}
            className="relative w-full group cursor-pointer"
            style={{ paddingBottom: '64.98%' }}
            aria-label="Play demo video"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOOM_THUMBNAIL_URL}
              alt="EchoMe product demo"
              fetchPriority="high"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center shadow-2xl shadow-primary/30 group-hover:scale-110 group-hover:bg-primary transition-all">
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </div>
            </div>
          </button>
        ) : (
          /* Loom iframe - loads only when user clicks play */
          <div className="relative w-full" style={{ paddingBottom: '64.98%' }}>
            <iframe
              src={`https://www.loom.com/embed/${LOOM_VIDEO_ID}?autoplay=1`}
              title="EchoMe product demo"
              allow="autoplay; fullscreen"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
