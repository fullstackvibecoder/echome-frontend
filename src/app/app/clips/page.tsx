'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Video,
  Scissors,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Download,
  Copy,
  RefreshCw,
  Trash2,
  Link as LinkIcon,
  Youtube,
  Instagram,
  ChevronRight,
  Loader2,
  Film,
  Zap,
  TrendingUp,
} from 'lucide-react';
import api, { VideoUpload, VideoClip, ContentKit, ClipJob } from '@/lib/api-client';

// Processing status steps
const PROCESSING_STEPS = [
  { key: 'transcribing', label: 'Transcribing', icon: Sparkles },
  { key: 'analyzing', label: 'Finding Clips', icon: Scissors },
  { key: 'extracting', label: 'Extracting', icon: Film },
  { key: 'captioning', label: 'Adding Captions', icon: Video },
  { key: 'generating', label: 'Writing Content', icon: Zap },
];

export default function ClipsPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<VideoUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [selectedUpload, setSelectedUpload] = useState<VideoUpload | null>(null);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [contentKit, setContentKit] = useState<ContentKit | null>(null);
  const [processingJob, setProcessingJob] = useState<ClipJob | null>(null);

  // Load uploads on mount
  useEffect(() => {
    loadUploads();
  }, []);

  // Poll for job status when processing
  useEffect(() => {
    if (!selectedUpload || !processingJob) return;
    if (processingJob.status === 'completed' || processingJob.status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const result = await api.clips.getJob(selectedUpload.id, processingJob.id);
        setProcessingJob(result.data.job);

        // If completed, refresh the upload data
        if (result.data.job.status === 'completed') {
          await loadUploadDetails(selectedUpload.id);
        }
      } catch (err) {
        console.error('Error polling job status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedUpload, processingJob]);

  const loadUploads = async () => {
    try {
      setLoading(true);
      const result = await api.clips.list(20);
      setUploads(result.data.uploads || []);
    } catch (err) {
      console.error('Error loading uploads:', err);
      setError('Failed to load uploads');
    } finally {
      setLoading(false);
    }
  };

  const loadUploadDetails = async (uploadId: string) => {
    try {
      const result = await api.clips.get(uploadId);
      setSelectedUpload(result.data.upload);
      setClips(result.data.clips || []);
      setContentKit(result.data.contentKit);
    } catch (err) {
      console.error('Error loading upload details:', err);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const result = await api.clips.upload(
        { file, sourceType: 'upload' },
        (progress) => setUploadProgress(progress)
      );

      // Add to list and select
      const newUpload = result.data.upload;
      setUploads((prev) => [newUpload, ...prev]);
      setSelectedUpload(newUpload);
      setClips([]);
      setContentKit(null);

      // Start processing
      await startProcessing(newUpload.id);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    try {
      setUploading(true);
      setError(null);

      // Detect platform from URL
      const isYoutube = urlInput.includes('youtube.com') || urlInput.includes('youtu.be');
      const isInstagram = urlInput.includes('instagram.com');
      const sourceType = isYoutube ? 'youtube' : isInstagram ? 'instagram' : 'upload';

      const result = await api.clips.upload({
        sourceType,
        sourceUrl: urlInput,
      });

      const newUpload = result.data.upload;
      setUploads((prev) => [newUpload, ...prev]);
      setSelectedUpload(newUpload);
      setClips([]);
      setContentKit(null);
      setUrlInput('');

      // Start processing
      await startProcessing(newUpload.id);
    } catch (err: any) {
      console.error('URL import error:', err);
      setError(err.response?.data?.error || 'Failed to import from URL');
    } finally {
      setUploading(false);
    }
  };

  const startProcessing = async (uploadId: string) => {
    try {
      const result = await api.clips.process(uploadId, {
        generateContent: true,
      });

      // Create a mock job object for tracking
      setProcessingJob({
        id: result.data.jobId,
        userId: '',
        videoUploadId: uploadId,
        jobType: 'full_process',
        config: {},
        status: 'pending',
        progressPercent: 0,
        stepsCompleted: [],
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Processing error:', err);
      setError(err.response?.data?.error || 'Failed to start processing');
    }
  };

  const handleDelete = async (uploadId: string) => {
    if (!confirm('Delete this video and all its clips?')) return;

    try {
      await api.clips.delete(uploadId);
      setUploads((prev) => prev.filter((u) => u.id !== uploadId));
      if (selectedUpload?.id === uploadId) {
        setSelectedUpload(null);
        setClips([]);
        setContentKit(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'pending':
        return 'text-stone-400';
      default:
        return 'text-[#00D4FF]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-[#1C1C1E] mb-2">
            Clip Finder
          </h1>
          <p className="text-stone-600">
            Review, download, and manage your extracted clips and content kits
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & List */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Zone */}
            <div className="bg-white rounded-2xl border-2 border-stone-200 p-6 shadow-lg">
              <h2 className="text-lg font-bold text-[#1C1C1E] mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#00D4FF]" />
                New Video
              </h2>

              {/* Input Mode Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setInputMode('file')}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
                    inputMode === 'file'
                      ? 'bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Upload File
                </button>
                <button
                  disabled
                  className="flex-1 py-2 px-4 rounded-xl text-sm font-semibold bg-stone-100 text-stone-400 cursor-not-allowed relative"
                  title="Coming Soon"
                >
                  From URL
                  <span className="absolute -top-1 -right-1 text-[9px] bg-[#00D4FF]/20 text-[#00D4FF] px-1 rounded font-bold">Soon</span>
                </button>
              </div>

              {inputMode === 'file' ? (
                <label className="block">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      uploading
                        ? 'border-[#00D4FF] bg-[#00D4FF]/5'
                        : 'border-stone-300 hover:border-[#00D4FF] hover:bg-stone-50'
                    }`}
                  >
                    {uploading ? (
                      <div className="space-y-3">
                        <Loader2 className="w-10 h-10 mx-auto text-[#00D4FF] animate-spin" />
                        <p className="text-sm text-stone-600">
                          Uploading... {uploadProgress}%
                        </p>
                        <div className="w-full bg-stone-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-[#00D4FF] to-[#0099CC] h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Video className="w-10 h-10 mx-auto text-stone-400 mb-3" />
                        <p className="text-sm font-medium text-stone-700 mb-1">
                          Drop your video here
                        </p>
                        <p className="text-xs text-stone-500">
                          MP4, MOV, WebM up to 2GB
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    disabled={uploading}
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 text-xs text-stone-500 mb-2">
                    <div className="flex items-center gap-1">
                      <Youtube className="w-4 h-4 text-red-500" />
                      YouTube
                    </div>
                    <div className="flex items-center gap-1">
                      <Instagram className="w-4 h-4 text-pink-500" />
                      Instagram
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Paste video URL..."
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-[#00D4FF] focus:outline-none text-sm"
                      disabled={uploading}
                    />
                    <button
                      onClick={handleUrlSubmit}
                      disabled={uploading || !urlInput.trim()}
                      className="px-4 py-3 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <LinkIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>

            {/* Recent Uploads */}
            <div className="bg-white rounded-2xl border-2 border-stone-200 p-6 shadow-lg">
              <h2 className="text-lg font-bold text-[#1C1C1E] mb-4 flex items-center gap-2">
                <Film className="w-5 h-5 text-[#00D4FF]" />
                Recent Projects
              </h2>

              {loading ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-8 h-8 mx-auto text-[#00D4FF] animate-spin" />
                </div>
              ) : uploads.length === 0 ? (
                <p className="text-sm text-stone-500 text-center py-8">
                  No videos yet. Upload your first video above!
                </p>
              ) : (
                <div className="space-y-3">
                  {uploads.map((upload) => (
                    <button
                      key={upload.id}
                      onClick={() => {
                        setSelectedUpload(upload);
                        loadUploadDetails(upload.id);
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        selectedUpload?.id === upload.id
                          ? 'border-[#00D4FF] bg-[#00D4FF]/5'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {upload.thumbnailUrl ? (
                            <img
                              src={upload.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Video className="w-6 h-6 text-stone-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1C1C1E] truncate">
                            {upload.originalFilename || 'Video Upload'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span>{formatDuration(upload.durationSeconds)}</span>
                            <span className={`flex items-center gap-1 ${getStatusColor(upload.status)}`}>
                              {getStatusIcon(upload.status)}
                              {upload.status}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Selected Upload Details */}
          <div className="lg:col-span-2">
            {selectedUpload ? (
              <div className="space-y-6">
                {/* Upload Header */}
                <div className="bg-white rounded-2xl border-2 border-stone-200 p-6 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-[#1C1C1E]">
                        {selectedUpload.originalFilename || 'Video Upload'}
                      </h2>
                      <p className="text-sm text-stone-500">
                        {formatDuration(selectedUpload.durationSeconds)} •{' '}
                        {selectedUpload.sourceType === 'upload' ? 'Uploaded' : selectedUpload.sourceType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedUpload.status === 'completed' && (
                        <button
                          onClick={() => startProcessing(selectedUpload.id)}
                          className="p-2 text-stone-500 hover:text-[#00D4FF] hover:bg-stone-100 rounded-lg transition-all"
                          title="Reprocess"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(selectedUpload.id)}
                        className="p-2 text-stone-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Processing Status */}
                  {selectedUpload.status !== 'completed' && selectedUpload.status !== 'failed' && (
                    <div className="bg-gradient-to-r from-[#00D4FF]/10 to-[#B794F6]/10 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Loader2 className="w-5 h-5 text-[#00D4FF] animate-spin" />
                        <span className="text-sm font-semibold text-[#1C1C1E]">
                          {selectedUpload.statusMessage || 'Processing...'}
                        </span>
                        <span className="ml-auto text-sm font-bold text-[#00D4FF]">
                          {selectedUpload.progressPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-white rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] h-2 rounded-full transition-all"
                          style={{ width: `${selectedUpload.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-3">
                        {PROCESSING_STEPS.map((step, idx) => {
                          const isActive = selectedUpload.status === step.key;
                          const isCompleted = PROCESSING_STEPS.findIndex(s => s.key === selectedUpload.status) > idx;
                          return (
                            <div
                              key={step.key}
                              className={`flex items-center gap-1 text-xs ${
                                isActive
                                  ? 'text-[#00D4FF] font-semibold'
                                  : isCompleted
                                  ? 'text-green-500'
                                  : 'text-stone-400'
                              }`}
                            >
                              <step.icon className="w-3 h-3" />
                              {step.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedUpload.status === 'failed' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                      Processing failed: {selectedUpload.statusMessage || 'Unknown error'}
                    </div>
                  )}
                </div>

                {/* Clips Grid */}
                {clips.length > 0 && (
                  <div className="bg-white rounded-2xl border-2 border-stone-200 p-6 shadow-lg">
                    <h3 className="text-lg font-bold text-[#1C1C1E] mb-4 flex items-center gap-2">
                      <Scissors className="w-5 h-5 text-[#00D4FF]" />
                      Extracted Clips ({clips.length})
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {clips.map((clip) => (
                        <div
                          key={clip.id}
                          className="border-2 border-stone-200 rounded-xl overflow-hidden hover:border-[#00D4FF] transition-all"
                        >
                          <div className="aspect-video bg-stone-100 relative">
                            {clip.thumbnailUrl ? (
                              <img
                                src={clip.thumbnailUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="w-12 h-12 text-stone-300" />
                              </div>
                            )}
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {formatDuration(clip.duration)}
                            </div>
                            {clip.viralityScore && (
                              <div className="absolute top-2 left-2 bg-gradient-to-r from-[#FFD93D] to-[#FF6B9D] text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {clip.viralityScore}%
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold text-[#1C1C1E] mb-1 truncate">
                              {clip.title || `Clip ${clip.sortOrder + 1}`}
                            </p>
                            <p className="text-xs text-stone-500 line-clamp-2">
                              {clip.transcriptText?.substring(0, 100)}...
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              {clip.exports.length > 0 && (
                                <a
                                  href={clip.exports[0].url}
                                  download
                                  className="flex-1 py-2 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white text-xs font-semibold rounded-lg text-center"
                                >
                                  <Download className="w-3 h-3 inline mr-1" />
                                  Download
                                </a>
                              )}
                              <button className="p-2 text-stone-500 hover:text-[#00D4FF] hover:bg-stone-100 rounded-lg">
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Kit */}
                {contentKit && (
                  <div className="bg-white rounded-2xl border-2 border-stone-200 p-6 shadow-lg">
                    <h3 className="text-lg font-bold text-[#1C1C1E] mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-[#00D4FF]" />
                      Content Kit
                    </h3>
                    <p className="text-sm text-stone-600 mb-4">
                      Voice-matched content for all your platforms
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { key: 'contentLinkedin', label: 'LinkedIn', icon: '💼' },
                        { key: 'contentTwitter', label: 'Twitter/X', icon: '🐦' },
                        { key: 'contentInstagram', label: 'Instagram', icon: '📸' },
                        { key: 'contentTiktok', label: 'TikTok', icon: '🎵' },
                        { key: 'contentBlog', label: 'Blog', icon: '📝' },
                        { key: 'contentEmail', label: 'Email', icon: '📧' },
                      ].map((platform) => {
                        const content = contentKit[platform.key as keyof ContentKit] as string;
                        if (!content) return null;
                        return (
                          <div
                            key={platform.key}
                            className="p-4 border-2 border-stone-200 rounded-xl hover:border-[#00D4FF] transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-[#1C1C1E]">
                                {platform.icon} {platform.label}
                              </span>
                              <button
                                onClick={() => navigator.clipboard.writeText(content)}
                                className="p-1.5 text-stone-500 hover:text-[#00D4FF] hover:bg-stone-100 rounded-lg"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-xs text-stone-600 line-clamp-3">
                              {content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="bg-white rounded-2xl border-2 border-stone-200 p-12 shadow-lg text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#00D4FF]/20 to-[#B794F6]/20 rounded-2xl flex items-center justify-center">
                  <Scissors className="w-10 h-10 text-[#00D4FF]" />
                </div>
                <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">
                  No Clips Yet
                </h3>
                <p className="text-stone-600 mb-6 max-w-md mx-auto">
                  Select a video from the list, or go to the Dashboard and use the
                  Video or URL tab to upload new videos for clip extraction.
                </p>
                <a
                  href="/app"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  <Video className="w-5 h-5" />
                  Go to Dashboard
                </a>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    AI identifies best clips
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Auto-add captions
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Voice-matched content
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
