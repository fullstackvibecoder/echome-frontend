'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import Image from 'next/image';

const YOUTUBE_VIDEO_ID = 'rpTc2wZXnG8';
const THUMBNAIL_URL = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`;

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
            className="relative w-full aspect-video group cursor-pointer"
            aria-label="Play demo video"
          >
            <Image
              src={THUMBNAIL_URL}
              alt="EchoMe product demo"
              fill
              className="object-cover"
              priority
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center shadow-2xl shadow-primary/30 group-hover:scale-110 group-hover:bg-primary transition-all">
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              </div>
            </div>

            {/* Duration badge */}
            <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20">
              <span className="text-white text-sm font-medium">2:30</span>
            </div>
          </button>
        ) : (
          /* YouTube iframe - loads only when user clicks play */
          <div className="relative w-full aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
              title="EchoMe product demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
