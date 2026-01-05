'use client';

/**
 * VideoPlayer Component
 *
 * Custom video player with support for different aspect ratios,
 * poster images, and overlay controls.
 */

import { useState, useRef, useEffect } from 'react';
import { formatDuration } from '@/lib/content-kit-utils';

type AspectRatio = '16:9' | '9:16' | '1:1';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  aspectRatio?: AspectRatio;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  showControls?: boolean;
  viralityScore?: number;
  duration?: number;
  title?: string;
  onPlay?: () => void;
  onEnded?: () => void;
  className?: string;
}

export function VideoPlayer({
  src,
  poster,
  aspectRatio = '9:16',
  autoPlay = false,
  muted = true,
  loop = false,
  showControls = true,
  viralityScore,
  duration,
  title,
  onPlay,
  onEnded,
  className = '',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(duration || 0);
  const [showOverlay, setShowOverlay] = useState(true);

  const aspectClasses: Record<AspectRatio, string> = {
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '1:1': 'aspect-square',
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setVideoDuration(video.duration);
    const handlePlay = () => {
      setIsPlaying(true);
      setShowOverlay(false);
      onPlay?.();
    };
    const handlePause = () => {
      setIsPlaying(false);
      setShowOverlay(true);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setShowOverlay(true);
      onEnded?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onPlay, onEnded]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const progress = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden group ${aspectClasses[aspectRatio]} ${className}`}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        preload="metadata"
        className="w-full h-full object-contain"
      />

      {/* Virality Score Badge */}
      {viralityScore !== undefined && viralityScore > 0 && (
        <div className="absolute top-3 left-3 bg-gradient-to-r from-accent to-accent/80 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg z-10">
          🔥 {viralityScore}% viral
        </div>
      )}

      {/* Duration Badge */}
      {(videoDuration > 0 || duration) && (
        <div className="absolute bottom-12 right-3 bg-black/80 text-white text-xs px-2.5 py-1 rounded-full font-mono z-10">
          {formatDuration(videoDuration || duration || 0)}
        </div>
      )}

      {/* Play/Pause Overlay */}
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-16 h-16 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          >
            <span className="text-2xl ml-1">▶️</span>
          </button>
        </div>
      )}

      {/* Title (shown on hover) */}
      {title && (
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <p className="text-white text-sm font-medium line-clamp-1">{title}</p>
        </div>
      )}

      {/* Controls Bar */}
      {showControls && (
        <div
          className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Bar */}
          <div className="relative h-1 bg-white/30 rounded-full mb-2 cursor-pointer">
            <div
              className="absolute h-full bg-accent rounded-full"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min={0}
              max={videoDuration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-between text-white text-xs">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(videoDuration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
