'use client';

import Image from 'next/image';
import { Play, User, Heart, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { useState } from 'react';

interface OutputCard {
  type: string;
  label: string;
  aspect: string;
  color: string;
  rotation: number;
  src: string | null;
  delay: number;
}

const cards: OutputCard[] = [
  {
    type: 'reel',
    label: 'Reels',
    aspect: 'aspect-[9/16]',
    color: '#FF6B9D',
    rotation: -4,
    src: '/showcase/reel-background.png',
    delay: 1200,
  },
  {
    type: 'carousel',
    label: 'Carousels',
    aspect: 'aspect-square',
    color: '#B794F6',
    rotation: -1,
    src: '/showcase/carousel-1.png',
    delay: 1350,
  },
  {
    type: 'post',
    label: 'Posts',
    aspect: 'aspect-[4/5]',
    color: '#00D4FF',
    rotation: 2,
    src: null,
    delay: 1500,
  },
  {
    type: 'blog',
    label: 'Blog',
    aspect: 'aspect-[3/4]',
    color: '#FFD93D',
    rotation: 4,
    src: null,
    delay: 1650,
  },
];

function ReelSkeleton() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center justify-center gap-2 p-3">
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
        <Play className="w-5 h-5 text-white/40 ml-0.5" />
      </div>
      <div className="w-3/4 h-1.5 bg-white/10 rounded-full" />
      <div className="w-1/2 h-1.5 bg-white/10 rounded-full" />
    </div>
  );
}

function CarouselSkeleton() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-3 relative">
      {/* Stacked layer hints */}
      <div className="absolute top-1 right-1 w-[85%] h-[85%] rounded-lg border border-white/5 bg-white/[0.02]" />
      <div className="absolute top-2.5 right-2.5 w-[85%] h-[85%] rounded-lg border border-white/5 bg-white/[0.02]" />
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-2">
        <div className="w-3/4 h-2 bg-white/10 rounded-full" />
        <div className="w-1/2 h-2 bg-white/10 rounded-full" />
        <div className="flex gap-1 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col p-3 gap-2">
      {/* Avatar row */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
          <User className="w-3 h-3 text-white/30" />
        </div>
        <div className="w-12 h-1.5 bg-white/10 rounded-full" />
      </div>
      {/* Text bars */}
      <div className="flex-1 flex flex-col gap-1.5 mt-1">
        <div className="w-full h-1.5 bg-white/10 rounded-full" />
        <div className="w-5/6 h-1.5 bg-white/10 rounded-full" />
        <div className="w-2/3 h-1.5 bg-white/10 rounded-full" />
      </div>
      {/* Action icons */}
      <div className="flex items-center gap-3 mt-auto pt-1 border-t border-white/5">
        <Heart className="w-3 h-3 text-white/20" />
        <MessageCircle className="w-3 h-3 text-white/20" />
        <Share2 className="w-3 h-3 text-white/20" />
      </div>
    </div>
  );
}

function BlogSkeleton() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col p-3 gap-2">
      {/* Title bars */}
      <div className="w-5/6 h-2 bg-white/15 rounded-full" />
      <div className="w-2/3 h-2 bg-white/15 rounded-full" />
      {/* Body bars */}
      <div className="flex-1 flex flex-col gap-1 mt-2">
        <div className="w-full h-1 bg-white/8 rounded-full" />
        <div className="w-full h-1 bg-white/8 rounded-full" />
        <div className="w-5/6 h-1 bg-white/8 rounded-full" />
        <div className="w-full h-1 bg-white/8 rounded-full" />
        <div className="w-3/4 h-1 bg-white/8 rounded-full" />
      </div>
      {/* Read more / bookmark */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-white/5">
        <div className="w-10 h-1.5 bg-white/10 rounded-full" />
        <Bookmark className="w-3 h-3 text-white/20" />
      </div>
    </div>
  );
}

const skeletons: Record<string, () => React.JSX.Element> = {
  reel: ReelSkeleton,
  carousel: CarouselSkeleton,
  post: PostSkeleton,
  blog: BlogSkeleton,
};

function CardFrame({ card }: { card: OutputCard }) {
  const [imgFailed, setImgFailed] = useState(false);
  const Skeleton = skeletons[card.type];
  const showImage = card.src && !imgFailed;

  // Phone bezel for reels
  if (card.type === 'reel') {
    return (
      <div className="rounded-2xl border-2 border-white/10 bg-black overflow-hidden shadow-xl">
        {/* Phone notch */}
        <div className="h-3 bg-black flex justify-center">
          <div className="w-10 h-1.5 bg-white/10 rounded-full mt-1" />
        </div>
        <div className={`${card.aspect} relative`}>
          {showImage ? (
            <Image
              src={card.src!}
              alt={card.label}
              fill
              className="object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <Skeleton />
          )}
        </div>
        {/* Home bar */}
        <div className="h-3 bg-black flex justify-center">
          <div className="w-8 h-1 bg-white/15 rounded-full mt-1" />
        </div>
      </div>
    );
  }

  // All other card types: simple rounded card
  return (
    <div className="rounded-xl border border-white/10 bg-black/50 overflow-hidden shadow-xl">
      <div className={`${card.aspect} relative`}>
        {showImage ? (
          <Image
            src={card.src!}
            alt={card.label}
            fill
            className="object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Skeleton />
        )}
      </div>
    </div>
  );
}

export function ContentOutputFan() {
  return (
    <div className="relative">
      {/* Desktop: horizontal fan with overlapping rotated cards */}
      <div className="hidden md:flex items-end justify-center gap-[-8px] relative" style={{ minHeight: 220 }}>
        {cards.map((card, i) => (
          <div
            key={card.type}
            className="opacity-0 animate-card-fan-in-individual w-[130px] flex-shrink-0"
            style={{
              '--fan-rotate': `${card.rotation}deg`,
              animationDelay: `${card.delay}ms`,
              transform: `rotate(${card.rotation}deg)`,
              marginLeft: i === 0 ? 0 : -8,
              zIndex: i,
            } as React.CSSProperties}
          >
            <CardFrame card={card} />
            <p
              className="text-[10px] font-semibold text-center mt-1.5 tracking-wide"
              style={{ color: card.color }}
            >
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Mobile: 2x2 grid, no rotations */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {cards.map((card) => (
          <div
            key={card.type}
            className="opacity-0 animate-card-fan-in-individual"
            style={{
              '--fan-rotate': '0deg',
              animationDelay: `${card.delay}ms`,
            } as React.CSSProperties}
          >
            <CardFrame card={card} />
            <p
              className="text-[10px] font-semibold text-center mt-1.5 tracking-wide"
              style={{ color: card.color }}
            >
              {card.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
