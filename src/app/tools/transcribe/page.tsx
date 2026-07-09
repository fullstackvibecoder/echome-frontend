'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileText, Copy, Download, Check, Loader2, ChevronDown, Zap, Shield, Clock, ArrowRight } from 'lucide-react';
import { JsonLd } from '@/components/json-ld';
import { copyAsPlainText } from '@/lib/clipboard';
import { formatTxt, formatSrt, formatVtt, type TranscriptSegment } from '@/lib/transcript-format';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.tryechome.com/api';

interface TranscriptResult {
  segments: TranscriptSegment[];
  plainText: string;
  language?: string;
  title?: string;
  source: 'captions' | 'sociavault';
}

function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

function downloadFile(name: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
}

export default function TranscribePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [copied, setCopied] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const hasTimestamps = (result?.segments.length ?? 0) > 0;
  const baseName = (result?.title || 'transcript').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'transcript';

  const generate = async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowTimestamps(false);
    try {
      const res = await fetch(`${API_BASE}/tools/transcribe/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        setError(body?.error?.message || 'Failed to generate transcript. Please try again.');
        return;
      }
      setResult(body.data as TranscriptResult);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    const ok = await copyAsPlainText(result.plainText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Free YouTube Transcript Generator',
        description: 'Get the full transcript of any YouTube video for free. No signup required.',
        url: 'https://tryechome.com/tools/transcribe',
        applicationCategory: 'UtilitiesApplication',
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
          { '@type': 'ListItem', position: 3, name: 'YouTube Transcript', item: 'https://tryechome.com/tools/transcribe' },
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

      <section className="relative pt-24 sm:pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-bold text-center mb-4">Free YouTube Transcript Generator</h1>
          <p className="text-center text-white/60 mb-8">
            Paste a YouTube link. Get the full transcript in seconds. Plain text or timestamped, no signup.
          </p>

          {/* Input */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') generate(); }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-primary"
            />
            <button
              onClick={generate}
              disabled={loading || !url.trim()}
              className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating</> : <><FileText className="w-4 h-4" /> Get Transcript</>}
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          {/* Result panel */}
          {result && (
            <div className="mt-8 rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
              {result.title && <p className="font-semibold mb-3 text-white/90">{result.title}</p>}

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={() => setShowTimestamps((v) => !v)}
                  disabled={!hasTimestamps}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 disabled:opacity-40"
                >
                  {showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
                </button>
                <button onClick={copy} className="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5">
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
                <div className="flex items-center gap-1.5 ml-auto text-sm">
                  <Download className="w-3.5 h-3.5 text-white/50" />
                  <button onClick={() => downloadFile(`${baseName}.txt`, formatTxt(result.segments, result.plainText))} className="px-2 py-1 rounded-md bg-white/5 border border-white/10">.txt</button>
                  <button onClick={() => downloadFile(`${baseName}.srt`, formatSrt(result.segments))} disabled={!hasTimestamps} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 disabled:opacity-40">.srt</button>
                  <button onClick={() => downloadFile(`${baseName}.vtt`, formatVtt(result.segments))} disabled={!hasTimestamps} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 disabled:opacity-40">.vtt</button>
                </div>
              </div>

              {!hasTimestamps && (
                <p className="text-xs text-white/40 mb-3">Timestamps are not available for this video.</p>
              )}

              <div className="max-h-[420px] overflow-y-auto rounded-lg bg-black/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {showTimestamps && hasTimestamps
                  ? result.segments.map((seg, i) => (
                      <div key={i} className="flex gap-3 py-0.5">
                        <span className="text-primary/70 tabular-nums shrink-0">[{mmss(seg.start)}]</span>
                        <span>{seg.text}</span>
                      </div>
                    ))
                  : result.plainText}
              </div>
            </div>
          )}

          {/* Trust bar */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-xs text-white/40">
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> No signup</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> No email</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> No account</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Works with any public video</span>
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
              { icon: <FileText className="w-6 h-6" />, title: 'Paste the video link', desc: 'Drop in any public YouTube URL. No file upload, no download needed.' },
              { icon: <Zap className="w-6 h-6" />, title: 'Get the transcript', desc: 'We pull the full transcript in seconds, plain text or with timestamps.' },
              { icon: <Download className="w-6 h-6" />, title: 'Copy or download', desc: 'Copy the text, or download as .txt, .srt or .vtt. No signup or email required.' },
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

      {/* Why Use Our Transcript Generator */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gray-900 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-8">
            Why Use Our Free YouTube Transcript Generator
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Shield className="w-5 h-5" />, title: 'No signup or email required', desc: 'Get a transcript without creating an account or entering any personal information.' },
              { icon: <Check className="w-5 h-5" />, title: 'Plain text or timestamped', desc: 'Read the full transcript as plain text, or toggle timestamps to jump to any moment.' },
              { icon: <Clock className="w-5 h-5" />, title: 'Fast and free', desc: 'Get your transcript in seconds. No queues, no watermarks, no hidden fees.' },
              { icon: <Zap className="w-5 h-5" />, title: 'Works with captions or audio', desc: 'Uses existing captions when available, falling back to transcription for videos without them.' },
              { icon: <FileText className="w-5 h-5" />, title: 'Three download formats', desc: 'Download as .txt for plain text, or .srt and .vtt for subtitle files.' },
              { icon: <Download className="w-5 h-5" />, title: 'Instant download', desc: 'Files are generated in your browser. No waiting for email links.' },
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
              'Turn a video into a blog post or article',
              'Pull quotes for social media captions',
              'Create subtitle files for editing',
              'Search a long video for a specific moment',
              'Repurpose a talk or podcast into written content',
              'Study or reference a lecture or tutorial',
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
          <p className="text-xs text-white/30 mt-4">5 free content kits. No credit card required.</p>
        </div>
      </section>

      {/* Related links */}
      <section className="py-8 px-4 sm:px-6 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/tools/compress-video" className="text-primary hover:underline">Video compressor</Link>
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
  { q: 'Is this YouTube transcript generator really free?', a: 'Yes. No signup, no watermark, no hidden fees. Generate as many transcripts as you need.' },
  { q: 'Does it work on any YouTube video?', a: 'It works on any public YouTube video. Private or unlisted videos may not be accessible.' },
  { q: 'What if the video does not have captions?', a: 'We fall back to transcription so you can still get a transcript, though timestamps may not be available in every case.' },
  { q: 'Can I download the transcript as a subtitle file?', a: 'Yes. Download as .srt or .vtt for use in video editors, or .txt for plain text.' },
  { q: 'Do I need to create an account?', a: 'No. No signup, no email, no registration required. Just paste a link and get your transcript.' },
  { q: 'Is my data stored?', a: 'No. Transcripts are generated on demand and not stored on our servers.' },
  { q: 'How accurate is the transcript?', a: 'Accuracy depends on the source. Transcripts pulled from existing captions are highly accurate. Transcribed audio may contain occasional errors.' },
  { q: 'Can I edit the transcript?', a: 'The transcript is copied or downloaded as text, so you can edit it in any text editor or word processor after.' },
];
