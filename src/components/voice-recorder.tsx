'use client';

/**
 * Voice Recorder Component
 *
 * Browser-based voice recording with transcription for KB ingestion.
 * Uses MediaRecorder API for audio capture and OpenAI Whisper for transcription.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/api-client';

interface VoiceRecorderProps {
  /** Called when recording is saved to KB */
  onSaved?: (result: {
    contentId: string;
    transcription: string;
    chunksCreated: number;
  }) => void;
  /** Called when transcription is complete (before saving) */
  onTranscribed?: (text: string) => void;
  /** Optional: Pre-set KB ID to save to */
  knowledgeBaseId?: string;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Class name for custom styling */
  className?: string;
}

type RecorderState = 'idle' | 'recording' | 'processing' | 'preview' | 'saving';

export function VoiceRecorder({
  onSaved,
  onTranscribed,
  knowledgeBaseId,
  compact = false,
  className = '',
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [title, setTitle] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioBlobRef.current = audioBlob;
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        // Auto-transcribe after recording stops
        transcribeRecording(audioBlob);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');

      // Start duration timer
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('processing');
    }
  }, [state]);

  const transcribeRecording = async (audioBlob: Blob) => {
    try {
      const result = await api.kbContent.transcribeVoice(audioBlob);

      if (result.success && result.text) {
        setTranscription(result.text);
        setState('preview');
        onTranscribed?.(result.text);
      } else {
        throw new Error('No transcription returned');
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio. Please try again.');
      setState('idle');
    }
  };

  const saveToKnowledgeBase = async () => {
    if (!audioBlobRef.current) return;

    setState('saving');
    setError(null);

    try {
      const result = await api.kbContent.ingestVoice({
        audioBlob: audioBlobRef.current,
        title: title || `Voice Recording - ${new Date().toLocaleDateString()}`,
        knowledgeBaseId,
      });

      if (result.success) {
        onSaved?.({
          contentId: result.contentId,
          transcription: result.transcription,
          chunksCreated: result.chunksCreated,
        });
        // Reset to idle state
        reset();
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save recording. Please try again.');
      setState('preview');
    }
  };

  const reset = () => {
    setState('idle');
    setTranscription('');
    setRecordingDuration(0);
    setTitle('');
    setError(null);
    audioBlobRef.current = null;
    audioChunksRef.current = [];
  };

  // Compact mode - just a mic button
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <button
          onClick={state === 'recording' ? stopRecording : startRecording}
          disabled={state === 'processing' || state === 'saving'}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            transition-all duration-200
            ${state === 'recording'
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}
            ${(state === 'processing' || state === 'saving') ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={state === 'recording' ? 'Stop recording' : 'Start recording'}
        >
          {state === 'recording' ? (
            <span className="w-4 h-4 bg-white rounded-sm" />
          ) : state === 'processing' || state === 'saving' ? (
            <svg className="w-5 h-5 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          )}
        </button>
        {state === 'recording' && (
          <span className="text-sm text-red-500 font-medium">
            {formatDuration(recordingDuration)}
          </span>
        )}
      </div>
    );
  }

  // Full mode - card with preview and controls
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}>
      <div className="text-center">
        {/* Recording Controls */}
        {(state === 'idle' || state === 'recording') && (
          <>
            <div className="mb-4">
              <button
                onClick={state === 'recording' ? stopRecording : startRecording}
                className={`
                  w-20 h-20 rounded-full flex items-center justify-center mx-auto
                  transition-all duration-200 shadow-lg
                  ${state === 'recording'
                    ? 'bg-red-500 hover:bg-red-600 scale-110'
                    : 'bg-indigo-600 hover:bg-indigo-700'}
                `}
              >
                {state === 'recording' ? (
                  <span className="w-8 h-8 bg-white rounded-md" />
                ) : (
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                  </svg>
                )}
              </button>
            </div>

            {state === 'recording' ? (
              <div>
                <p className="text-2xl font-bold text-red-500 mb-1">
                  {formatDuration(recordingDuration)}
                </p>
                <p className="text-sm text-gray-500">Recording... Click to stop</p>
                <div className="flex justify-center gap-1 mt-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 20 + 10}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Click to start recording
              </p>
            )}
          </>
        )}

        {/* Processing State */}
        {state === 'processing' && (
          <div className="py-8">
            <svg className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-300">Transcribing...</p>
          </div>
        )}

        {/* Preview State */}
        {state === 'preview' && (
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Transcription Preview
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
              <p className="text-gray-700 dark:text-gray-200 text-sm whitespace-pre-wrap">
                {transcription}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Voice Recording"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                         transition-colors"
              >
                Discard
              </button>
              <button
                onClick={saveToKnowledgeBase}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg
                         transition-colors font-medium"
              >
                Save to Knowledge Base
              </button>
            </div>
          </div>
        )}

        {/* Saving State */}
        {state === 'saving' && (
          <div className="py-8">
            <svg className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-300">Saving to Knowledge Base...</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VoiceRecorder;
