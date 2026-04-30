'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Upload, Download, Zap, Shield, Clock, FileVideo, Check, ArrowRight, ChevronDown, Loader2 } from 'lucide-react';
import { JsonLd } from '@/components/json-ld';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.tryechome.com/api';
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

type Quality = 'low' | 'medium' | 'high';
type CompressState = 'idle' | 'uploading' | 'compressing' | 'done' | 'error';

const QUALITY_OPTIONS: Array<{ value: Quality; label: string; description: string }> = [
  { value: 'low', label: 'Maximum compression', description: 'Smallest file size' },
  { value: 'medium', label: 'Balanced', description: 'Recommended' },
  { value: 'high', label: 'High quality', description: 'Larger file, best quality' },
];

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'];
const ACCEPTED_EXTENSIONS = '.mp4,.mov,.webm,.avi,.mkv';

export default function CompressVideoToolPage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>('medium');
  const [state, setState] = useState<CompressState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    originalSize: number;
    compressedSize: number;
    reductionPercent: number;
    downloadUrl: string;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!ACCEPTED_TYPES.includes(selectedFile.type) && !selectedFile.name.match(/\.(mp4|mov|webm|avi|mkv)$/i)) {
      setError('Please select a video file (MP4, MOV, WebM, AVI, or MKV)');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File is too large (${formatSize(selectedFile.size)}). Maximum is 10GB.`);
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setState('idle');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleCompress = async () => {
    if (!file) return;
    setState('uploading');
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('quality', quality);

      const xhr = new XMLHttpRequest();

      const downloadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const uploadPercent = Math.round((e.loaded / e.total) * 50);
            setProgress(uploadPercent);
            if (uploadPercent >= 50) setState('compressing');
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const originalSize = parseInt(xhr.getResponseHeader('X-Original-Size') || '0', 10);
            const compressedSize = parseInt(xhr.getResponseHeader('X-Compressed-Size') || '0', 10);
            const reductionPercent = parseFloat(xhr.getResponseHeader('X-Reduction-Percent') || '0');

            const blob = new Blob([xhr.response], { type: 'video/mp4' });
            const downloadUrl = URL.createObjectURL(blob);

            setResult({
              originalSize: originalSize || file.size,
              compressedSize: compressedSize || blob.size,
              reductionPercent: reductionPercent || Math.round((1 - blob.size / file.size) * 100),
              downloadUrl,
            });
            setProgress(100);
            setState('done');
            resolve();
          } else if (xhr.status === 429) {
            setError("You've reached the compression limit. Try again in an hour, or sign up for unlimited access.");
            setState('error');
            reject(new Error('Rate limited'));
          } else {
            let errorMsg = 'Compression failed. Please try again.';
            try {
              const errorData = JSON.parse(xhr.responseText);
              if (errorData.error?.message) errorMsg = errorData.error.message;
            } catch { /* ignore parse errors */ }
            setError(errorMsg);
            setState('error');
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => {
          setError('Network error. Please check your connection and try again.');
          setState('error');
          reject(new Error('Network error'));
        };
      });

      xhr.open('POST', `${API_BASE}/tools/compress-video`);
      xhr.responseType = 'arraybuffer';
      xhr.send(formData);

      // Simulate compression progress after upload completes
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 50 && prev < 90) return prev + 2;
          return prev;
        });
      }, 500);

      await downloadPromise;
      clearInterval(progressTimer);
    } catch {
      // Error already handled in xhr callbacks
    }
  };

  const handleDownload = () => {
    if (!result?.downloadUrl || !file) return;
    const a = document.createElement('a');
    a.href = result.downloadUrl;
    const ext = file.name.split('.').pop() || 'mp4';
    a.download = file.name.replace(`.${ext}`, `-compressed.mp4`);
    a.click();
  };

  const resetTool = () => {
    setFile(null);
    setState('idle');
    setProgress(0);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Free Video Compressor',
        description: 'Compress video files online for free. No signup required.',
        url: 'https://tryechome.com/tools/compress-video',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        creator: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_DATA.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
          { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://tryechome.com/tools' },
          { '@type': 'ListItem', position: 3, name: 'Video Compressor', item: 'https://tryechome.com/tools/compress-video' },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <JsonLd data={jsonLd} />

      {/* Nav */}
      <nav className="fixed w-full z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Image src="/media/echome-logo.svg" alt="EchoMe" width={36} height={36} />
            <span className="text-xl font-bold text-white">EchoMe</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Free Tool</span>
          </Link>
          <a href="/auth/signup" className="px-5 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold text-sm hover:scale-105 transition-all shadow-md">
            Try EchoMe Free
          </a>
        </div>
      </nav>

      {/* Hero + Tool */}
      <section className="relative pt-24 sm:pt-32 pb-16 px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-primary/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/4 pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4">
              Free Video{' '}
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                Compressor
              </span>
            </h1>
            <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto">
              Reduce your video file size without losing quality. No signup. No email. No watermark. No account. Just drop your file and download.
            </p>
          </div>

          {/* Compression Tool */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-8 backdrop-blur-xl">
            <input
              type="file"
              ref={fileInputRef}
              accept={ACCEPTED_EXTENSIONS}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
              className="hidden"
            />

            {/* Upload zone */}
            {!file && state === 'idle' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-white/20 hover:border-primary/50 hover:bg-white/[0.02]'
                }`}
              >
                <Upload className="w-10 h-10 text-white/40 mx-auto mb-4" />
                <p className="text-white/70 font-medium mb-1">
                  {dragActive ? 'Drop your video here' : 'Drag and drop your video file'}
                </p>
                <p className="text-white/40 text-sm">or click to browse. MP4, MOV, WebM, AVI, MKV up to 10GB</p>
              </div>
            )}

            {/* File selected — show controls */}
            {file && state === 'idle' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileVideo className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{file.name}</p>
                      <p className="text-sm text-white/40">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  <button onClick={resetTool} className="text-sm text-white/40 hover:text-white transition-colors flex-shrink-0 ml-2">
                    Remove
                  </button>
                </div>

                {/* Quality selector */}
                <div>
                  <p className="text-sm font-medium text-white/70 mb-3">Compression level</p>
                  <div className="grid grid-cols-3 gap-2">
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setQuality(opt.value)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          quality === opt.value
                            ? 'border-primary bg-primary/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <p className={`text-sm font-medium ${quality === opt.value ? 'text-primary' : 'text-white'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCompress}
                  className="w-full py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold text-lg hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
                >
                  Compress Video
                </button>
              </div>
            )}

            {/* Processing state */}
            {(state === 'uploading' || state === 'compressing') && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                <p className="text-white font-medium mb-2">
                  {state === 'uploading' ? 'Uploading...' : 'Compressing...'}
                </p>
                <div className="w-full max-w-xs mx-auto h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent-purple rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-white/40 mt-2">{progress}%</p>
              </div>
            )}

            {/* Done state */}
            {state === 'done' && result && (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="text-xl font-bold text-white mb-4">Compression Complete</p>

                <div className="grid grid-cols-3 gap-4 mb-6 max-w-sm mx-auto">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Original</p>
                    <p className="font-bold text-white">{formatSize(result.originalSize)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Compressed</p>
                    <p className="font-bold text-emerald-400">{formatSize(result.compressedSize)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Reduced by</p>
                    <p className="font-bold text-primary">{result.reductionPercent}%</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    Download Compressed Video
                  </button>
                  <button
                    onClick={resetTool}
                    className="px-6 py-3 border border-white/20 text-white/70 rounded-xl font-medium hover:bg-white/5 transition-all"
                  >
                    Compress Another
                  </button>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
                {state === 'error' && (
                  <button onClick={resetTool} className="mt-2 text-sm text-white/60 hover:text-white underline">
                    Try again
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-xs text-white/40">
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> No signup</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> No email</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> No watermark</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> No account</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Files deleted after download</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: <Upload className="w-6 h-6" />, title: 'Upload your video', desc: 'Drag and drop or select a file. Supports MP4, MOV, WebM, AVI, MKV up to 10GB.' },
              { icon: <Zap className="w-6 h-6" />, title: 'Choose quality level', desc: 'Pick maximum compression, balanced (recommended), or high quality based on your needs.' },
              { icon: <Download className="w-6 h-6" />, title: 'Download compressed file', desc: 'Get your smaller video file instantly. No signup or email required.' },
            ].map((step, i) => (
              <div key={i} className="relative p-6 bg-white/[0.03] border border-white/5 rounded-2xl text-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-xs font-bold text-white">
                  {i + 1}
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
                  {step.icon}
                </div>
                <h3 className="font-bold text-white mb-1">{step.title}</h3>
                <p className="text-sm text-white/50">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Use Our Compressor */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gray-900 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-8">
            Why Use Our Free Video Compressor
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Shield className="w-5 h-5" />, title: 'No signup or email required', desc: 'Compress videos without creating an account or entering any personal information.' },
              { icon: <Check className="w-5 h-5" />, title: 'No watermark', desc: 'Your compressed video is clean. No branding, no watermarks, no strings attached.' },
              { icon: <Clock className="w-5 h-5" />, title: 'Files deleted after download', desc: 'Your privacy matters. Videos are processed in memory and deleted immediately.' },
              { icon: <Zap className="w-5 h-5" />, title: 'H.264 optimized encoding', desc: 'Modern codec optimized for web playback. Works on every device and platform.' },
              { icon: <FileVideo className="w-5 h-5" />, title: 'Multiple formats supported', desc: 'Works with MP4, MOV, WebM, AVI, and MKV files up to 10GB.' },
              { icon: <Download className="w-5 h-5" />, title: 'Instant download', desc: 'No waiting for email links. Download your compressed video immediately.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-8">
            What You Can Use It For
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Compress videos for uploading to social media',
              'Reduce file size for email attachments',
              'Shrink Zoom recordings for sharing',
              'Compress videos for faster uploads to EchoMe',
              'Make videos small enough for messaging apps',
              'Reduce storage space on your device',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-white/70">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gray-900 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {FAQ_DATA.map((faq, i) => (
              <div key={i} className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-medium text-white text-sm sm:text-base pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-white/40 flex-shrink-0 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === i && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                    <p className="text-sm text-white/60 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Soft CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 border-t border-white/5 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
            Need to Turn Your Videos into{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              Social Media Content?
            </span>
          </h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            EchoMe takes your video and generates clips with captions, Instagram carousels, LinkedIn posts, newsletters, and more. All written in your voice.
          </p>
          <a
            href="/auth/signup"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-primary/30"
          >
            Try EchoMe Free
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-xs text-white/30 mt-4">3 free generations. No credit card required.</p>
        </div>
      </section>

      {/* Related links */}
      <section className="py-8 px-4 sm:px-6 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/guides/compress-video" className="text-primary hover:underline">Video compression guide</Link>
          <Link href="/guides" className="text-primary hover:underline">All guides</Link>
          <Link href="/realtors" className="text-primary hover:underline">EchoMe for real estate</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-white/5 text-center">
        <Link href="/" className="text-white/40 text-sm hover:text-white/60 transition">tryechome.com</Link>
      </footer>
    </div>
  );
}

const FAQ_DATA = [
  { q: 'How much can I compress my video?', a: 'Typically 40-70% reduction depending on source quality and chosen compression level. Raw recordings from phones and screen recorders see the biggest reductions.' },
  { q: 'Will compression reduce video quality?', a: 'Balanced mode preserves near-original quality. Maximum compression may show slight quality reduction on close inspection, but is ideal for social media and web uploads.' },
  { q: 'What formats are supported?', a: 'MP4, MOV, WebM, AVI, and MKV files up to 10GB.' },
  { q: 'Is it really free?', a: 'Yes. No signup, no watermark, no hidden fees. Compress as many videos as you need.' },
  { q: 'Is my video stored?', a: 'No. Files are processed and deleted immediately after download. We never store your videos on our servers.' },
  { q: 'What codec does it use?', a: 'H.264 video with AAC audio, optimized for web playback. This is the most universally compatible format.' },
  { q: 'Do I need to create an account?', a: 'No. No signup, no email, no registration required. Just upload your video and compress it.' },
  { q: 'Do I need to enter my email?', a: "No. We don't ask for any personal information to use the compressor." },
  { q: 'Will there be a watermark on my video?', a: 'No. The compressed video is clean with no watermarks or branding of any kind.' },
];
