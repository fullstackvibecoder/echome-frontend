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
  muted: initialMuted = false, // Default to unmuted so audio plays
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
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(duration || 0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const aspectClasses: Record<AspectRatio, string> = {
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '1:1': 'aspect-square',
  };

  // Validate video source URL
  const isValidVideoUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false;
    
    try {
      const urlObj = new URL(url);
      // Check for common video file extensions
      const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v'];
      const pathname = urlObj.pathname.toLowerCase();
      return videoExtensions.some(ext => pathname.endsWith(ext)) || 
             url.includes('/video/') || // Common video API pattern
             url.includes('supabase') || // Supabase storage
             url.includes('amazonaws.com'); // AWS S3
    } catch {
      return false;
    }
  };

  // Reset player state when the video source changes (e.g. switching clips)
  useEffect(() => {
    setIsPlaying(false);
    setShowOverlay(true);
    setCurrentTime(0);
    setVideoDuration(duration || 0);
    setHasError(false);
    setIsLoading(true);
    setErrorMessage(null);

    // Validate URL before attempting to load
    if (!isValidVideoUrl(src)) {
      setHasError(true);
      setIsLoading(false);
      setErrorMessage(src ? 'Invalid video source URL' : 'No video source provided');
      return;
    }

    const video = videoRef.current;
    if (video) {
      video.load(); // Force the browser to load the new source
    }
  }, [src, duration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
      setIsLoading(false);
      setHasError(false);
    };
    const handleLoadedData = () => {
      setIsLoading(false);
    };
    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setShowOverlay(false);
      setHasError(false);
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
    const handleError = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      const error = target.error;
      
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
      setShowOverlay(true);

      // Provide user-friendly error messages
      let friendlyMessage = 'Video failed to load';
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            friendlyMessage = 'Video loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            friendlyMessage = 'Network error while loading video';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            friendlyMessage = 'Video format is corrupted or unsupported';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            friendlyMessage = 'Video format is not supported by your browser';
            break;
          default:
            friendlyMessage = error.message || 'Unknown video error';
        }
      }
      
      setErrorMessage(friendlyMessage);
      console.error('Video loading error:', { src, error: error?.message, code: error?.code });
    };
    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
    };
  }, [src, onPlay, onEnded]);

  const togglePlay = () => {
    if (hasError) return; // Don't attempt to play if there's an error
    
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(error => {
        console.error('Play failed:', error);
        setHasError(true);
        setErrorMessage('Failed to play video: ' + error.message);
      });
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const progress = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setErrorMessage(null);
    
    const video = videoRef.current;
    if (video) {
      video.load();
    }
  };

  // Show error state if video failed to load
  if (hasError) {
    return (
      <div
        className={`relative bg-bg-secondary rounded-lg overflow-hidden border-2 border-dashed border-border ${aspectClasses[aspectRatio]} ${className}`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-text-secondary/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-text-secondary font-medium mb-2">Video Unavailable</h3>
          <p className="text-text-muted text-sm leading-relaxed mb-4">
            {errorMessage || 'This video could not be loaded. It may be processing or temporarily unavailable.'}
          </p>
          
          {isValidVideoUrl(src) && (
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          )}
          
          {poster && (
            <div className="mt-4">
              <img
                src={poster}
                alt="Video thumbnail"
                className="w-20 h-20 rounded-lg object-cover opacity-50"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
        
        {/* Hidden video element for retry functionality */}
        <video
          ref={videoRef}
          src={src}
          className="hidden"
          playsInline
          preload="none"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden group ${aspectClasses[aspectRatio]} ${className}`}
      onClick={togglePlay}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-text-secondary text-sm">Loading video...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={isMuted}
        loop={loop}
        playsInline
        preload="metadata"
        className="w-full h-full object-contain"
        style={{ display: hasError ? 'none' : 'block' }}
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
      {showOverlay && !isLoading && !hasError && (
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

          {/* Time Display and Controls */}
          <div className="flex items-center justify-between text-white text-xs">
            <span>{formatDuration(currentTime)}</span>
            <button
              onClick={toggleMute}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <span>{formatDuration(videoDuration)}</span>
          </div>
        </div>
      )}

      {/* Mute indicator when video is muted */}
      {isMuted && isPlaying && (
        <button
          onClick={toggleMute}
          className="absolute top-3 right-3 bg-black/70 text-white text-sm px-2 py-1 rounded-full z-10 hover:bg-black/90 transition-colors"
        >
          🔇 Tap for sound
        </button>
      )}
    </div>
  );
}

export default VideoPlayer;
