'use client';

/**
 * TeleprompterModal — record a video while reading a generated script.
 *
 * Web port of the mobile teleprompter spec
 * (echome-mobile/docs/superpowers/specs/2026-04-19-teleprompter-mode.md)
 * with browser-API substitutions:
 *   - getUserMedia  ← expo-camera
 *   - MediaRecorder ← cameraRef.recordAsync
 *   - blob download ← MediaLibrary.saveToLibraryAsync
 *   - api.clips.uploadViaR2 ← (no mobile equivalent; web-specific)
 *
 * State machine:
 *   permission → ready → countdown(3,2,1) → recording → review → (upload | download | retake)
 *
 * Mobile webapp polish (Safari iOS):
 *   - <video playsInline muted> on the live preview (autoplay quirk)
 *   - Camera permission must come from a user gesture (the Record button click)
 *   - screen.orientation.lock('portrait') is best-effort; not all browsers
 *     support it, so we guard with optional chaining
 *
 * Design: portrait-locked layout (9:16-ish), full-screen camera with the
 * scrolling script in the top third so the user's eyes stay near the lens.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, RotateCcw, Download, Upload, Loader2, Type, Gauge, FlipHorizontal2, Camera, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

interface TeleprompterModalProps {
  open: boolean;
  onClose: () => void;
  /** The generated video script. Falsy → modal renders an empty-state message. */
  script: string;
  /** Used to title the upload + populate KB metadata. */
  contentKitId?: string;
  contentKitTitle?: string;
  /** Optional KB to ingest the recording into. Defaults to user's primary. */
  knowledgeBaseId?: string;
}

type FontSize = 'S' | 'M' | 'L';
type LayoutMode = 'overlay' | 'fullscreen';
// Two layout presets:
//  - overlay: camera fills the screen, script sits in the top third (eyes near
//    the lens). Default; matches the mobile spec.
//  - fullscreen: script dominates the screen at ~1.7× the font size, camera
//    shrinks to a 120×180 corner thumbnail. Easier to read for long scripts.
const FONT_SIZE_PX_OVERLAY: Record<FontSize, number> = { S: 18, M: 24, L: 32 };
const FONT_SIZE_PX_FULLSCREEN: Record<FontSize, number> = { S: 32, M: 44, L: 60 };

type Phase =
  | 'permission'   // requesting camera + mic
  | 'denied'       // user blocked permissions
  | 'unsupported'  // browser missing MediaRecorder / getUserMedia
  | 'ready'        // preview live, awaiting Record press
  | 'countdown'    // 3-2-1 before recording starts
  | 'recording'    // recording + script scrolling
  | 'review';      // recording stopped, blob in hand

/**
 * Pick a MediaRecorder mime type the browser supports. Safari is picky:
 * desktop Safari supports mp4, others prefer webm/vp9 → vp8 → webm. We
 * fall back through the list until something passes isTypeSupported.
 * Returning empty string lets the browser pick its default.
 */
function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function fileExtensionFor(mimeType: string): string {
  if (mimeType.startsWith('video/mp4')) return 'mp4';
  return 'webm';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TeleprompterModal({
  open,
  onClose,
  script,
  contentKitId,
  contentKitTitle,
  knowledgeBaseId,
}: TeleprompterModalProps) {
  // ─── State ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('permission');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<3 | 2 | 1 | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Settings (persisted within the modal session, reset on close)
  const [wpm, setWpm] = useState(140);
  const [fontSize, setFontSize] = useState<FontSize>('M');
  const [mirror, setMirror] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('overlay');

  // ─── Refs ────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const recordingTimerRef = useRef<number | null>(null);
  const scriptScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollAnimationRef = useRef<number | null>(null);

  // ─── Permission + stream lifecycle ──────────────────────────────────
  const startStream = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPhase('unsupported');
      setErrorMessage('Your browser does not support camera capture. Try Chrome, Edge, Firefox, or Safari 14+.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setPhase('unsupported');
      setErrorMessage('Your browser does not support video recording. Try a different browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPhase('ready');
      setErrorMessage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // NotAllowedError = user denied; NotFoundError = no camera; others = misc
      const denied = /denied|NotAllowed|Permission/i.test(message);
      setPhase(denied ? 'denied' : 'unsupported');
      setErrorMessage(denied
        ? 'Camera and microphone access is required. Enable them in your browser settings and try again.'
        : `Couldn't start the camera: ${message}`);
    }
  }, [facingMode]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Best-effort portrait lock on mobile webapp. Fails silently on desktop
  // and on browsers that don't expose the orientation lock API.
  const lockOrientation = useCallback(() => {
    try {
      const screenAny = screen as Screen & { orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void } };
      screenAny.orientation?.lock?.('portrait').catch(() => {});
    } catch {
      // ignore
    }
  }, []);
  const unlockOrientation = useCallback(() => {
    try {
      const screenAny = screen as Screen & { orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void } };
      screenAny.orientation?.unlock?.();
    } catch {
      // ignore
    }
  }, []);

  // Open: kick off the permission request once the modal mounts (a click
  // on the parent's "Record with Teleprompter" CTA is the user gesture
  // that satisfies Safari's policy).
  useEffect(() => {
    if (!open) return;
    setPhase('permission');
    setRecordedBlob(null);
    setRecordedSeconds(0);
    setUploadProgress(null);
    setErrorMessage(null);
    lockOrientation();
    startStream();
    return () => {
      stopStream();
      unlockOrientation();
      if (scrollAnimationRef.current) cancelAnimationFrame(scrollAnimationRef.current);
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // When facingMode flips, restart the stream.
  useEffect(() => {
    if (!open || phase === 'recording' || phase === 'countdown') return;
    if (!streamRef.current) return;
    stopStream();
    startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ─── Script scrolling ──────────────────────────────────────────────
  const scrollDurationMs = useMemo(() => {
    const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount === 0) return 0;
    return (wordCount / wpm) * 60 * 1000;
  }, [script, wpm]);

  const startScroll = useCallback(() => {
    const el = scriptScrollRef.current;
    if (!el) return;
    const startTime = performance.now();
    const initial = el.scrollTop;
    // Total distance we need to scroll: the difference between the content
    // height and the visible viewport. Add a little tail so the last line
    // crosses up off-screen rather than stopping at the bottom edge.
    const totalScroll = Math.max(0, el.scrollHeight - el.clientHeight + 80);

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / Math.max(1, scrollDurationMs));
      el.scrollTop = initial + totalScroll * progress;
      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(tick);
      } else {
        scrollAnimationRef.current = null;
      }
    };
    scrollAnimationRef.current = requestAnimationFrame(tick);
  }, [scrollDurationMs]);

  const stopScroll = useCallback(() => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
  }, []);

  // ─── Recording lifecycle ───────────────────────────────────────────
  const beginRecording = useCallback(() => {
    if (!streamRef.current) return;
    const mimeType = pickSupportedMimeType();
    const recorder = mimeType
      ? new MediaRecorder(streamRef.current, { mimeType })
      : new MediaRecorder(streamRef.current);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const finalMime = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: finalMime });
      setRecordedBlob(blob);
      setRecordedMimeType(finalMime);
      setPhase('review');
      stopScroll();
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
    recorder.start(500); // 500ms chunks → smoother memory profile
    recorderRef.current = recorder;
    recordingStartRef.current = performance.now();
    setRecordedSeconds(0);
    recordingTimerRef.current = window.setInterval(() => {
      setRecordedSeconds((performance.now() - recordingStartRef.current) / 1000);
    }, 250);
    // Reset script position to the top, then start scrolling in lockstep.
    if (scriptScrollRef.current) scriptScrollRef.current.scrollTop = 0;
    startScroll();
    setPhase('recording');
  }, [startScroll, stopScroll]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setCountdown(3);
    let n = 3;
    const tick = () => {
      n -= 1;
      if (n <= 0) {
        setCountdown(null);
        beginRecording();
      } else {
        setCountdown(n as 2 | 1);
        window.setTimeout(tick, 1000);
      }
    };
    window.setTimeout(tick, 1000);
  }, [beginRecording]);

  // ─── Post-record actions ───────────────────────────────────────────
  const handleRetake = useCallback(() => {
    setRecordedBlob(null);
    setRecordedSeconds(0);
    setUploadProgress(null);
    setPhase('ready');
  }, []);

  const handleDownload = useCallback(() => {
    if (!recordedBlob) return;
    const ext = fileExtensionFor(recordedMimeType);
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (contentKitTitle ?? 'echome-recording')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'echome-recording';
    a.download = `${safeTitle}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recordedBlob, recordedMimeType, contentKitTitle]);

  const handleUpload = useCallback(async () => {
    if (!recordedBlob) return;
    try {
      setUploadProgress(0);
      const ext = fileExtensionFor(recordedMimeType);
      const filename = `teleprompter-${contentKitId ?? Date.now()}.${ext}`;
      const file = new File([recordedBlob], filename, { type: recordedMimeType });
      await api.clips.uploadViaR2(
        file,
        {
          knowledgeBaseId,
          title: contentKitTitle ? `Teleprompter: ${contentKitTitle}` : undefined,
        },
        (pct) => setUploadProgress(pct),
      );
      setUploadProgress(100);
      showSuccessToast('Uploaded to Echo', 'Your recording is processing — check your library in a minute.');
      onClose();
    } catch (err) {
      showErrorToast(err, 'uploading recording');
      setUploadProgress(null);
    }
  }, [recordedBlob, recordedMimeType, contentKitId, contentKitTitle, knowledgeBaseId, onClose]);

  // Wire the recorded blob into the review video element once it's set.
  useEffect(() => {
    if (phase !== 'review' || !recordedBlob || !reviewVideoRef.current) return;
    const url = URL.createObjectURL(recordedBlob);
    reviewVideoRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [phase, recordedBlob]);

  // Escape closes (only when not actively recording).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'recording' && phase !== 'countdown') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, phase, onClose]);

  if (!open) return null;

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round((wordCount / wpm) * 60);

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <button
          type="button"
          onClick={onClose}
          disabled={phase === 'recording' || phase === 'countdown'}
          className="text-white p-2 rounded-full hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Close teleprompter"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="text-white text-sm font-medium">
          {phase === 'recording' && (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {formatDuration(recordedSeconds)}
            </span>
          )}
          {phase === 'ready' && (
            <span className="text-white/70">
              ~{formatDuration(estimatedSeconds)} estimated
            </span>
          )}
        </div>
        {phase === 'ready' && (
          <button
            type="button"
            onClick={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))}
            className="text-white p-2 rounded-full hover:bg-white/10"
            aria-label="Flip camera"
          >
            <Camera className="w-5 h-5" />
          </button>
        )}
        {phase !== 'ready' && <div className="w-10" />}
      </div>

      {/* Camera preview.
          - overlay mode: fills the screen behind everything (script sits on top)
          - fullscreen mode: shrinks to a 120×180 thumbnail in the top-right
            corner so the user can confirm framing while reading the big script. */}
      {phase !== 'review' && layoutMode === 'overlay' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: mirror ? 'scaleX(-1)' : undefined }}
        />
      )}
      {phase !== 'review' && layoutMode === 'fullscreen' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-16 right-3 w-[120px] h-[180px] rounded-lg object-cover border-2 border-white/30 shadow-2xl z-20 bg-black"
          style={{ transform: mirror ? 'scaleX(-1)' : undefined }}
        />
      )}

      {/* Permission / error states */}
      {(phase === 'permission' || phase === 'denied' || phase === 'unsupported') && (
        <div className="relative z-10 max-w-md mx-auto px-6 text-center text-white">
          {phase === 'permission' && (
            <>
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
              <p className="text-lg">Requesting camera & microphone access…</p>
              <p className="text-sm text-white/70 mt-2">Allow when your browser prompts.</p>
            </>
          )}
          {(phase === 'denied' || phase === 'unsupported') && (
            <>
              <AlertCircle className="w-10 h-10 mx-auto mb-4 text-amber-400" />
              <p className="text-lg font-semibold mb-2">
                {phase === 'denied' ? 'Permission needed' : 'Browser not supported'}
              </p>
              <p className="text-sm text-white/80 mb-4">{errorMessage}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                Close
              </button>
            </>
          )}
        </div>
      )}

      {/* Scrolling script overlay.
          - overlay mode: top-third banner, smaller font, eyes-near-lens
          - fullscreen mode: dominates the viewport (~70vh), bigger font for
            distance reading; camera thumbnail floats above it. */}
      {(phase === 'ready' || phase === 'countdown' || phase === 'recording') && (
        <div
          className={
            layoutMode === 'overlay'
              ? 'absolute top-16 left-3 right-3 max-w-2xl mx-auto z-10 pointer-events-none'
              : 'absolute top-16 bottom-40 left-3 right-3 max-w-3xl mx-auto z-10 pointer-events-none'
          }
        >
          <div
            ref={scriptScrollRef}
            className={
              layoutMode === 'overlay'
                ? 'bg-black/60 backdrop-blur-sm rounded-xl px-5 py-4 text-white overflow-hidden'
                : 'bg-black/85 backdrop-blur-sm rounded-2xl px-8 py-6 text-white overflow-hidden h-full'
            }
            style={{
              fontSize: (layoutMode === 'fullscreen' ? FONT_SIZE_PX_FULLSCREEN : FONT_SIZE_PX_OVERLAY)[fontSize],
              lineHeight: 1.5,
              maxHeight: layoutMode === 'overlay' ? '38vh' : undefined,
              transform: mirror ? 'scaleX(-1)' : undefined,
            }}
          >
            <div style={{ paddingBottom: '50vh' }} className="whitespace-pre-wrap">
              {script || '(No script available — generate a script in your content kit first.)'}
            </div>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {phase === 'countdown' && countdown !== null && (
        <div className="relative z-20 text-white text-9xl font-black drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
          {countdown}
        </div>
      )}

      {/* Bottom controls — settings row + record button */}
      {(phase === 'ready' || phase === 'recording') && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 py-6 bg-gradient-to-t from-black/80 to-transparent">
          {phase === 'ready' && (
            <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
              {/* Font size */}
              <div className="flex items-center gap-1 bg-black/50 rounded-full px-3 py-1.5 text-white text-sm">
                <Type className="w-4 h-4" />
                {(['S', 'M', 'L'] as FontSize[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFontSize(s)}
                    className={`px-2 py-0.5 rounded-full transition ${fontSize === s ? 'bg-white text-black' : 'hover:bg-white/10'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* WPM slider */}
              <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5 text-white text-sm">
                <Gauge className="w-4 h-4" />
                <input
                  type="range"
                  min={80}
                  max={220}
                  step={10}
                  value={wpm}
                  onChange={(e) => setWpm(parseInt(e.target.value, 10))}
                  className="w-28 accent-white"
                />
                <span className="tabular-nums w-14 text-right">{wpm} WPM</span>
              </div>
              {/* Mirror toggle */}
              <button
                type="button"
                onClick={() => setMirror((m) => !m)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition ${
                  mirror ? 'bg-white text-black' : 'bg-black/50 text-white hover:bg-black/70'
                }`}
              >
                <FlipHorizontal2 className="w-4 h-4" />
                Mirror
              </button>
              {/* Layout toggle: overlay (camera-dominant) vs fullscreen (script-dominant) */}
              <button
                type="button"
                onClick={() => setLayoutMode((m) => (m === 'overlay' ? 'fullscreen' : 'overlay'))}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition ${
                  layoutMode === 'fullscreen' ? 'bg-white text-black' : 'bg-black/50 text-white hover:bg-black/70'
                }`}
                title={layoutMode === 'overlay' ? 'Switch to large script (camera shrinks to corner)' : 'Switch to camera-first (script overlays the top)'}
              >
                {layoutMode === 'overlay' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                {layoutMode === 'overlay' ? 'Big script' : 'Camera-first'}
              </button>
            </div>
          )}

          <div className="flex justify-center">
            {phase === 'ready' && (
              <button
                type="button"
                onClick={startCountdown}
                disabled={!script.trim()}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-2xl"
                aria-label="Start recording"
              >
                <span className="w-12 h-12 rounded-full bg-white" />
              </button>
            )}
            {phase === 'recording' && (
              <button
                type="button"
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition flex items-center justify-center shadow-2xl"
                aria-label="Stop recording"
              >
                <span className="w-8 h-8 rounded-md bg-white" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Review screen — preview + post-record actions */}
      {phase === 'review' && recordedBlob && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4">
          <video
            ref={reviewVideoRef}
            controls
            playsInline
            className="max-h-[70vh] max-w-full rounded-xl bg-black"
          />
          <div className="text-white/70 text-sm mt-3">
            {formatDuration(recordedSeconds)} · {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB
          </div>
          {uploadProgress !== null && uploadProgress < 100 && (
            <div className="w-full max-w-sm mt-4">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-white/70 text-xs mt-1 text-center">Uploading… {uploadProgress}%</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              type="button"
              onClick={handleRetake}
              disabled={uploadProgress !== null}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={uploadProgress !== null}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploadProgress !== null}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark font-semibold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploadProgress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadProgress !== null ? 'Uploading…' : 'Upload to Echo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
