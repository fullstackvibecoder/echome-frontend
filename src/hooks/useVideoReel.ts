'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { LinkedReelSummary, MusicTrackSummary } from '@/types';

interface UseVideoReelOptions {
  contentKitId?: string;
  videoUploadId?: string;
  reel?: LinkedReelSummary | null;
  hasCarousel: boolean;
  slideCount: number;
  isAdmin: boolean;
  refresh: () => Promise<void>;
}

interface UseVideoReelReturn {
  // Carousel reel
  linkedReel: LinkedReelSummary | null;
  isGenerating: boolean;
  generateError: string | null;
  trendingAudio: string | null;
  generateCarouselReel: () => Promise<void>;

  // Reel options (admin)
  reelOptionsOpen: boolean;
  toggleReelOptions: () => void;
  smartTimingEnabled: boolean;
  setSmartTimingEnabled: (v: boolean) => void;
  selectedMusicTrackId: string | null;
  setSelectedMusicTrackId: (v: string | null) => void;
  musicTracks: MusicTrackSummary[];

  // B-Roll extraction
  isExtracting: boolean;
  brollSpeedUp: 1 | 1.5 | 2;
  setBrollSpeedUp: (v: 1 | 1.5 | 2) => void;
  extractBRoll: () => Promise<void>;
}

export function useVideoReel({
  contentKitId,
  videoUploadId,
  reel,
  hasCarousel,
  slideCount,
  isAdmin,
  refresh,
}: UseVideoReelOptions): UseVideoReelReturn {
  // Carousel reel state
  const [linkedReel, setLinkedReel] = useState<LinkedReelSummary | null>(reel || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [trendingAudio, setTrendingAudio] = useState<string | null>(null);

  // Reel options state
  const [reelOptionsOpen, setReelOptionsOpen] = useState(false);
  const [smartTimingEnabled, setSmartTimingEnabled] = useState(true);
  const [selectedMusicTrackId, setSelectedMusicTrackId] = useState<string | null>(null);
  const [musicTracks, setMusicTracks] = useState<MusicTrackSummary[]>([]);
  const [musicTracksLoaded, setMusicTracksLoaded] = useState(false);

  // B-Roll state
  const [isExtracting, setIsExtracting] = useState(false);
  const [brollSpeedUp, setBrollSpeedUp] = useState<1 | 1.5 | 2>(1);

  // Sync linked reel from parent detail data
  useEffect(() => {
    if (reel) {
      setLinkedReel(reel);
    }
  }, [reel]);

  // Poll for carousel reel completion
  useEffect(() => {
    if (!linkedReel || linkedReel.status !== 'processing') {
      if (linkedReel?.status === 'completed' || linkedReel?.status === 'failed') {
        setIsGenerating(false);
      }
      return;
    }
    setIsGenerating(true);
    const interval = setInterval(() => {
      refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [linkedReel?.status, refresh]);

  // Fetch music tracks when reel options panel opens
  useEffect(() => {
    if (reelOptionsOpen && !musicTracksLoaded) {
      setMusicTracksLoaded(true);
      api.reels.listMusic({ limit: 20 }).then((res) => {
        if (res.success && res.data) {
          setMusicTracks(res.data);
        }
      }).catch(() => { /* silent */ });
    }
  }, [reelOptionsOpen, musicTracksLoaded]);

  const generateCarouselReel = useCallback(async () => {
    if (!contentKitId || isGenerating) return;
    setIsGenerating(true);
    setGenerateError(null);
    setTrendingAudio(null);
    try {
      const response = await api.contentKits.generateCarouselReel(contentKitId, {
        musicTrackId: selectedMusicTrackId || undefined,
        smartTiming: smartTimingEnabled,
      });
      if (response.success) {
        if (response.data?.trendingAudioName) {
          setTrendingAudio(response.data.trendingAudioName);
        }
        refresh();
      } else {
        setGenerateError('Failed to start reel generation');
        setIsGenerating(false);
      }
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.error?.message || 'Failed to start reel generation';
      setGenerateError(message);
      setIsGenerating(false);
    }
  }, [contentKitId, isGenerating, selectedMusicTrackId, smartTimingEnabled, refresh]);

  const extractBRoll = useCallback(async () => {
    if (!videoUploadId || isExtracting) return;
    setIsExtracting(true);
    try {
      await api.clips.extractBRoll(videoUploadId, {
        maxClips: 5,
        speedUp: brollSpeedUp,
        useVisionScoring: false,
      });
      refresh();
    } catch (err) {
      console.error('Failed to extract B-roll:', err);
    } finally {
      setIsExtracting(false);
    }
  }, [videoUploadId, isExtracting, brollSpeedUp, refresh]);

  return {
    linkedReel,
    isGenerating,
    generateError,
    trendingAudio,
    generateCarouselReel,
    reelOptionsOpen,
    toggleReelOptions: () => setReelOptionsOpen(v => !v),
    smartTimingEnabled,
    setSmartTimingEnabled,
    selectedMusicTrackId,
    setSelectedMusicTrackId,
    musicTracks,
    isExtracting,
    brollSpeedUp,
    setBrollSpeedUp,
    extractBRoll,
  };
}
