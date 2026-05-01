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
import { X, RotateCcw, Download, Upload, Loader2, Type, Gauge, FlipHorizontal2, Camera, AlertCircle, Maximize2, Minimize2, ZoomIn, ChevronUp, ChevronDown } from 'lucide-react';
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

/**
 * Strip the codec parameters from a MediaRecorder mime type before sending
 * to the backend. Recorded blobs come back as e.g. "video/mp4;codecs=h264,aac"
 * but the backend r2-init validator does a strict `allowedTypes.includes()`
 * against unsuffixed types ("video/mp4", "video/webm", etc.). The codec
 * suffix is informational only — the actual file is fine.
 */
function baseMimeType(mimeType: string): string {
  const semicolonIdx = mimeType.indexOf(';');
  return semicolonIdx >= 0 ? mimeType.slice(0, semicolonIdx).trim() : mimeType;
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
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [zoom, setZoom] = useState(1);
  // Hardware zoom probe — `track.getCapabilities().zoom` exists on Android
  // Chrome (back camera) and some Safari iOS builds. When unsupported we
  // fall back to a CSS transform on the preview only — that does NOT
  // reflect in the recording, which we surface in the slider label.
  const [zoomCapability, setZoomCapability] = useState<{ min: number; max: number; step: number } | null>(null);

  // wpm mirror — the rAF scroll loop reads this on every frame so changing
  // the slider during recording updates speed live (without re-binding the
  // animation, which would reset progress).
  const wpmRef = useRef(wpm);
  useEffect(() => { wpmRef.current = wpm; }, [wpm]);

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
      // Aspect-ratio HINTS (browsers may ignore them — phones especially
      // rotate freely). We still pass them so desktop webcams pick the
      // closest available mode.
      const dims = aspectRatio === '9:16'
        ? { width: { ideal: 720 }, height: { ideal: 1280 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } };
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, ...dims },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // Probe zoom capability of the freshly-acquired video track. Cast
      // through unknown because MediaTrackCapabilities.zoom isn't in
      // every TS lib version. When present, the slider drives a real
      // hardware zoom that's reflected in the recording. When absent, we
      // fall back to a CSS transform on the preview only.
      const track = stream.getVideoTracks()[0];
      const caps = (track && typeof track.getCapabilities === 'function')
        ? (track.getCapabilities() as unknown as { zoom?: { min: number; max: number; step?: number } })
        : {};
      if (caps.zoom && typeof caps.zoom.min === 'number' && typeof caps.zoom.max === 'number') {
        setZoomCapability({
          min: caps.zoom.min,
          max: caps.zoom.max,
          step: caps.zoom.step ?? 0.1,
        });
        setZoom(caps.zoom.min);
      } else {
        setZoomCapability(null);
        setZoom(1);
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

  // Best-effort orientation lock on mobile webapp. Fails silently on desktop
  // and on browsers that don't expose the orientation lock API. Locks to
  // portrait for 9:16 capture and landscape for 16:9 — without this, the
  // 16:9 toggle would still leave the device in portrait and clip the frame.
  const lockOrientation = useCallback(() => {
    try {
      const screenAny = screen as Screen & { orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void } };
      const target = aspectRatio === '16:9' ? 'landscape' : 'portrait';
      screenAny.orientation?.lock?.(target).catch(() => {});
    } catch {
      // ignore
    }
  }, [aspectRatio]);
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

  // When facingMode or aspectRatio flips, restart the stream + re-target
  // the orientation lock so the new constraints take effect.
  useEffect(() => {
    if (!open || phase === 'recording' || phase === 'countdown') return;
    if (!streamRef.current) return;
    stopStream();
    lockOrientation();
    startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, aspectRatio]);

  // Apply the zoom slider to the live track when hardware zoom is supported.
  // No-op when zoomCapability is null — the CSS-fallback transform is wired
  // directly on the <video> element below.
  useEffect(() => {
    if (!streamRef.current || !zoomCapability) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    track
      .applyConstraints({ advanced: [{ zoom } as MediaTrackConstraintSet & { zoom: number }] })
      .catch(() => {/* device declined; visual transform still applies */});
  }, [zoom, zoomCapability]);

  // Re-attach the live stream to the <video> element whenever it re-mounts.
  // The conditional renderer swaps the element on phase change (review →
  // ready) and on layoutMode change (overlay ↔ fullscreen). When that
  // happens, the ref points at a fresh DOM node whose srcObject is empty —
  // without this, "Retake" leaves the user staring at a black box.
  useEffect(() => {
    if (!open) return;
    if (phase === 'review' || phase === 'permission' || phase === 'denied' || phase === 'unsupported') return;
    if (!videoRef.current || !streamRef.current) return;
    if (videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [open, phase, layoutMode]);

  // ─── Script scrolling ──────────────────────────────────────────────
  // Word count is fixed for the session; total scroll distance depends on
  // layout (recomputed once per scroll start). The PER-FRAME pixel delta
  // reads `wpmRef.current` so dragging the WPM slider mid-recording adjusts
  // speed live instead of waiting for the next take.
  const wordCount = useMemo(
    () => script.trim().split(/\s+/).filter(Boolean).length,
    [script],
  );

  // Estimated reading time displayed before recording (uses current wpm; not
  // load-bearing once recording starts).
  const estimatedSecondsAtStart = useMemo(
    () => (wordCount === 0 ? 0 : Math.round((wordCount / wpm) * 60)),
    [wordCount, wpm],
  );

  const startScroll = useCallback(() => {
    const el = scriptScrollRef.current;
    if (!el) return;
    let lastFrameTime = performance.now();
    // Total distance: content height minus viewport plus a tail so the last
    // line scrolls off-screen rather than stopping at the bottom edge.
    const totalScroll = Math.max(0, el.scrollHeight - el.clientHeight + 80);
    if (totalScroll === 0 || wordCount === 0) {
      scrollAnimationRef.current = null;
      return;
    }

    const tick = (now: number) => {
      const elapsedFrameMs = now - lastFrameTime;
      lastFrameTime = now;
      // Pixels-per-ms at the CURRENT wpm:
      //   secondsToRead = wordCount / wpm * 60
      //   pixelsPerMs   = totalScroll / (secondsToRead * 1000)
      //                 = totalScroll * wpm / (wordCount * 60_000)
      const currentWpm = wpmRef.current;
      const pixelsPerMs = (totalScroll * currentWpm) / (wordCount * 60_000);
      el.scrollTop = el.scrollTop + pixelsPerMs * elapsedFrameMs;
      if (el.scrollTop < totalScroll) {
        scrollAnimationRef.current = requestAnimationFrame(tick);
      } else {
        scrollAnimationRef.current = null;
      }
    };
    scrollAnimationRef.current = requestAnimationFrame(tick);
  }, [wordCount]);

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
      // The backend's allowedTypes check is a strict `.includes()` against
      // unsuffixed mime types ("video/mp4", "video/webm", ...). MediaRecorder
      // hands us "video/mp4;codecs=h264,aac" — strip the codec suffix so the
      // r2-init validator accepts the upload.
      const fileMime = baseMimeType(recordedMimeType) || 'video/mp4';
      const filename = `teleprompter-${contentKitId ?? Date.now()}.${ext}`;
      const file = new File([recordedBlob], filename, { type: fileMime });
      await api.clips.uploadViaR2(
        file,
        {
          knowledgeBaseId,
          title: contentKitTitle ? `Teleprompter: ${contentKitTitle}` : undefined,
        },
        (pct) => setUploadProgress(pct),
      );
      setUploadProgress(100);
      showSuccessToast(
        'Uploaded to Echo',
        'Your recording is processing — Echo will turn it into clips, captions, and posts in a minute.',
      );
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

  const estimatedSeconds = estimatedSecondsAtStart;
  // Combine mirror flip + CSS-fallback zoom into one transform string.
  // Hardware zoom (when supported) is applied to the track itself, so the
  // CSS scale stays at 1 in that path — otherwise CSS scale handles the
  // visual zoom on the preview only.
  const cssScale = zoomCapability ? 1 : zoom;
  const videoTransform = [
    mirror ? 'scaleX(-1)' : '',
    cssScale !== 1 ? `scale(${cssScale})` : '',
  ].filter(Boolean).join(' ') || undefined;

  // Manual nudge for the script container — used by the up/down arrow
  // buttons so the user can correct drift without changing WPM. The auto-
  // scroll loop reads/writes scrollTop on every frame, so this nudge just
  // changes "where the loop continues from" — no special pause needed.
  const nudgeScroll = (direction: 'up' | 'down') => {
    const el = scriptScrollRef.current;
    if (!el) return;
    // Roughly one line of text at current font size (line-height 1.5).
    const sizeMap = layoutMode === 'fullscreen' ? FONT_SIZE_PX_FULLSCREEN : FONT_SIZE_PX_OVERLAY;
    const lineHeight = sizeMap[fontSize] * 1.5;
    el.scrollTop += direction === 'up' ? -lineHeight * 2 : lineHeight * 2;
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Top bar — z-30 so the close (X) button stays clickable above the
          review screen and the camera-thumbnail in fullscreen mode (both z-20). */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
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
          style={{ transform: videoTransform }}
        />
      )}
      {phase !== 'review' && layoutMode === 'fullscreen' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-16 right-3 w-[120px] h-[180px] rounded-lg object-cover border-2 border-white/30 shadow-2xl z-20 bg-black"
          style={{ transform: videoTransform }}
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

      {/* Manual nudge — up/down arrows on the right edge of the screen.
          Lets the user correct script drift during recording without
          touching WPM. Hidden during permission/review/error phases. */}
      {(phase === 'ready' || phase === 'countdown' || phase === 'recording') && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => nudgeScroll('up')}
            className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/15 active:scale-95 transition"
            aria-label="Scroll script up"
            title="Scroll script up"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => nudgeScroll('down')}
            className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/15 active:scale-95 transition"
            aria-label="Scroll script down"
            title="Scroll script down"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
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
                ? 'bg-black/60 backdrop-blur-sm rounded-xl px-5 py-4 text-white overflow-y-auto pointer-events-auto'
                : 'bg-black/85 backdrop-blur-sm rounded-2xl px-8 py-6 text-white overflow-y-auto pointer-events-auto h-full'
            }
            style={{
              fontSize: (layoutMode === 'fullscreen' ? FONT_SIZE_PX_FULLSCREEN : FONT_SIZE_PX_OVERLAY)[fontSize],
              lineHeight: 1.5,
              maxHeight: layoutMode === 'overlay' ? '38vh' : undefined,
              transform: mirror ? 'scaleX(-1)' : undefined,
              // Touch-pan only on the Y axis so a horizontal swipe doesn't
              // hijack a system gesture (e.g. iOS back-swipe).
              touchAction: 'pan-y',
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
              {/* Aspect-ratio toggle: 9:16 (vertical) vs 16:9 (horizontal).
                  Hint to getUserMedia; phones may rotate freely. */}
              <button
                type="button"
                onClick={() => setAspectRatio((a) => (a === '9:16' ? '16:9' : '9:16'))}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm bg-black/50 text-white hover:bg-black/70 transition"
                title="Toggle vertical (9:16) vs horizontal (16:9) framing"
              >
                {aspectRatio}
              </button>
              {/* Zoom slider — hardware zoom when supported, CSS preview-only
                  fallback otherwise. Different bounds depending on path so
                  CSS zoom doesn't pixelate too aggressively. */}
              <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5 text-white text-sm">
                <ZoomIn className="w-4 h-4" />
                <input
                  type="range"
                  min={zoomCapability ? zoomCapability.min : 1}
                  max={zoomCapability ? zoomCapability.max : 2.5}
                  step={zoomCapability ? zoomCapability.step : 0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-24 accent-white"
                />
                <span className="tabular-nums w-12 text-right">
                  {zoom.toFixed(1)}×
                </span>
                {!zoomCapability && zoom !== 1 && (
                  <span className="text-[10px] text-amber-300 ml-1" title="This camera doesn't expose hardware zoom; the slider only affects the preview, not your recording.">
                    preview
                  </span>
                )}
              </div>
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
