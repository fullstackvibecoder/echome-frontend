'use client';

import React from 'react';

interface TextOverlayPreviewProps {
  thumbnailUrl?: string;
  text: string;
  style: 'bold_impact' | 'minimal_clean' | 'brand_gradient' | 'story_cards';
  position?: 'top' | 'center' | 'bottom';
}

const positionClasses: Record<string, string> = {
  top: 'items-start pt-10',
  center: 'items-center',
  bottom: 'items-end pb-10',
};

export default function TextOverlayPreview({
  thumbnailUrl,
  text,
  style,
  position = 'center',
}: TextOverlayPreviewProps) {
  const renderText = () => {
    switch (style) {
      case 'bold_impact':
        return (
          <p
            className="text-white text-2xl font-bold text-center px-4 leading-tight"
            style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}
          >
            {text}
          </p>
        );

      case 'minimal_clean':
        return (
          <p className="text-white/90 text-sm font-light text-left px-5 self-start">
            {text}
          </p>
        );

      case 'brand_gradient':
        return (
          <span className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-base font-semibold text-center">
            {text}
          </span>
        );

      case 'story_cards':
        return (
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-4 mx-4 shadow-lg">
            <p className="text-gray-900 text-base font-medium text-center leading-snug">
              {text}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden relative border-2 border-border">
      {/* Background */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-950" />
      )}

      {/* Text overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-center ${positionClasses[position]} px-2`}
      >
        {renderText()}
      </div>
    </div>
  );
}
