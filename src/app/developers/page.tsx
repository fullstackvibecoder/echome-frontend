'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { JsonLd } from '@/components/json-ld';
import {
  Video,
  FileText,
  Mic,
  Plug,
  Code,
  Copy,
  Check,
  ArrowRight,
  Terminal,
  Key,
  Zap,
  Database,
  Users,
  Package,
  AlertCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Local helper components                                           */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition font-mono"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function highlightCode(code: string): string {
  let s = code
    // JSON keys
    .replace(/"([^"]+)":/g, '<span class="text-cyan-400">"$1"</span>:')
    // Remaining strings (values)
    .replace(/: "([^"]*)"/g, ': <span class="text-green-400">"$1"</span>')
    // Standalone strings in arrays
    .replace(/\["([^"]*)"/g, '[<span class="text-green-400">"$1"</span>')
    .replace(/, "([^"]*)"/g, ', <span class="text-green-400">"$1"</span>')
    // Numbers
    .replace(/: (\d+)/g, ': <span class="text-amber-400">$1</span>')
    // Booleans
    .replace(/: (true|false)/g, ': <span class="text-amber-400">$1</span>');
  return s;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="relative bg-[#0D0D0F] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-xs text-white/30 font-mono">{language ?? 'bash'}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-white/80">
        <code dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */

const TAB_KEYS = [
  'auth',
  'generate',
  'clips',
  'kb',
  'voices',
  'kits',
  'errors',
] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, { label: string; badge?: string }> = {
  auth: { label: 'Authentication' },
  generate: { label: 'Content Generation' },
  clips: { label: 'Video Clips', badge: 'NEW' },
  kb: { label: 'Knowledge Base' },
  voices: { label: 'Voice Profiles' },
  kits: { label: 'Content Kits' },
  errors: { label: 'Error Codes' },
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('auth');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'EchoMe API',
    applicationCategory: 'DeveloperApplication',
    description:
      'Content generation API. Turn videos, text, and voice notes into social media posts.',
    url: 'https://tryechome.com/developers',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '10',
      highPrice: '50',
      priceCurrency: 'USD',
    },
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <JsonLd data={jsonLd} />

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <nav className="fixed w-full z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Image src="/media/echome-logo.svg" alt="EchoMe" width={36} height={36} />
            <span className="text-xl font-bold text-white">EchoMe</span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
              API
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/app/developers"
              className="hidden sm:block text-white/70 hover:text-white transition font-medium text-sm"
            >
              Dashboard
            </Link>
            <Link
              href="/app/developers"
              className="px-5 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold text-sm hover:scale-105 transition-all shadow-md"
            >
              Get API Key
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-purple/10 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4 pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary font-bold text-xs tracking-widest uppercase">
              Developer API
            </span>
          </div>

          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
            EchoMe{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              API
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Turn any video, text, or voice note into social media content. Programmatically.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link
              href="/app/developers"
              className="px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-primary/30 flex items-center gap-3"
            >
              Get API Key
              <Key className="w-5 h-5" />
            </Link>
            <a
              href="#docs"
              className="px-8 py-4 rounded-full font-bold text-lg text-white hover:bg-white/5 transition-all flex items-center gap-3 border border-white/10"
            >
              Read the Docs
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          {/* Quick example */}
          <div className="max-w-2xl mx-auto text-left">
            <CodeBlock
              language="bash"
              code={`curl -X POST https://api.tryechome.com/api/generate \\
  -H "X-API-Key: ek_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_type": "text",
    "input_text": "Why context matters more than prompts",
    "platforms": ["linkedin", "x", "instagram"]
  }'`}
            />
          </div>
        </div>
      </section>

      {/* ── What You Can Build ────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
            What You Can{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              Build
            </span>
          </h2>
          <p className="text-center text-white/60 max-w-xl mx-auto mb-14">
            Four primitives. Infinite integrations.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Video className="w-6 h-6 text-primary" />,
                title: 'Video to Content',
                desc: 'Upload a YouTube, Loom, or Zoom link. Get clips with captions + written posts for every platform.',
              },
              {
                icon: <FileText className="w-6 h-6 text-primary" />,
                title: 'Text to Posts',
                desc: 'Send a topic or article. Get voice-matched posts for LinkedIn, Instagram, X, Facebook, email, and blog.',
              },
              {
                icon: <Mic className="w-6 h-6 text-primary" />,
                title: 'Voice to Content',
                desc: 'Transcribe voice notes into platform-ready content in your unique voice.',
              },
              {
                icon: <Plug className="w-6 h-6 text-primary" />,
                title: 'Custom Integrations',
                desc: 'Plug EchoMe into any CRM, scheduling tool, or content workflow via REST API.',
              },
            ].map((c, i) => (
              <div
                key={i}
                className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-primary/20 transition-colors"
              >
                <div className="w-12 h-12 mb-5 bg-primary/10 rounded-xl flex items-center justify-center">
                  {c.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{c.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
            Simple, Credit-Based{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-center text-white/60 max-w-xl mx-auto mb-14">
            Buy credits. Use them for any operation. All reads are free.
          </p>

          {/* Tier cards */}
          <div className="grid sm:grid-cols-3 gap-6 mb-14">
            {[
              {
                name: 'Starter',
                credits: 100,
                price: 10,
                perCredit: '0.10',
                popular: false,
              },
              {
                name: 'Builder',
                credits: 300,
                price: 25,
                perCredit: '0.083',
                popular: true,
              },
              {
                name: 'Scale',
                credits: 700,
                price: 50,
                perCredit: '0.071',
                popular: false,
              },
            ].map((tier, i) => (
              <div
                key={i}
                className={`relative p-8 rounded-2xl text-center ${
                  tier.popular
                    ? 'bg-gradient-to-br from-primary/15 to-accent-purple/15 border-2 border-primary/40 shadow-[0_0_40px_-10px_rgba(0,212,255,0.3)]'
                    : 'bg-white/[0.03] border border-white/5'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-gradient-to-r from-primary to-primary-dark text-white px-3 py-1 rounded-full">
                    POPULAR
                  </span>
                )}
                <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                <p className="text-white/40 text-sm mb-4">{tier.credits} credits</p>
                <p className="text-4xl font-extrabold text-white mb-1">${tier.price}</p>
                <p className="text-white/40 text-xs mb-6">~${tier.perCredit}/credit</p>
                <Link
                  href="/app/developers"
                  className="inline-block w-full py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] bg-gradient-to-r from-primary to-primary-dark text-white shadow-md"
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          {/* Credit costs table */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="font-bold text-white">Credit Costs</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/5">
                  <th className="px-6 py-3 font-medium">Operation</th>
                  <th className="px-6 py-3 font-medium text-right">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ['Generate written content', '10'],
                  ['Upload video', '5'],
                  ['Process video pipeline', '15'],
                  ['Export clip with captions', '2'],
                  ['All reads (GET requests)', 'Free'],
                ].map(([op, cost], i) => (
                  <tr key={i} className="text-white/70 hover:bg-white/[0.02] transition">
                    <td className="px-6 py-3">{op}</td>
                    <td className="px-6 py-3 text-right font-mono">
                      {cost === 'Free' ? (
                        <span className="text-green-400 font-semibold">Free</span>
                      ) : (
                        cost
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── API Docs ──────────────────────────────────────────────── */}
      <section id="docs" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
            API{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              Documentation
            </span>
          </h2>
          <p className="text-center text-white/60 max-w-xl mx-auto mb-12">
            Everything you need to integrate EchoMe into your product.
          </p>

          {/* Tab bar */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {TAB_KEYS.map((key) => {
              const { label, badge } = TAB_LABELS[key];
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    activeTab === key
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                  {badge && (
                    <span className="ml-1.5 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="space-y-8">{renderTabContent(activeTab)}</div>
        </div>
      </section>

      {/* ── Quick Start ───────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
            Quick{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              Start
            </span>
          </h2>
          <p className="text-center text-white/60 max-w-xl mx-auto mb-14">
            Three steps to your first API call.
          </p>

          <div className="space-y-10">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-lg">
                1
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-xl font-bold text-white">
                  Create an API key in your dashboard
                </h3>
                <p className="text-white/60 text-sm">
                  Go to{' '}
                  <Link href="/app/developers" className="text-primary hover:underline">
                    /app/developers
                  </Link>{' '}
                  and generate a new key. Choose scopes for the resources you need.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-lg">
                2
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-xl font-bold text-white">Generate content</h3>
                <CodeBlock
                  language="bash"
                  code={`curl -X POST https://api.tryechome.com/api/generate \\
  -H "X-API-Key: ek_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_type": "text",
    "input_text": "3 tips for first-time homebuyers",
    "platforms": ["linkedin", "instagram"]
  }'`}
                />
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-lg">
                3
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-xl font-bold text-white">Process a video</h3>
                <CodeBlock
                  language="bash"
                  code={`# Upload a video
curl -X POST https://api.tryechome.com/api/clips/upload \\
  -H "X-API-Key: ek_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{ "sourceType": "url", "sourceUrl": "https://youtube.com/watch?v=..." }'

# Start processing
curl -X POST https://api.tryechome.com/api/clips/{uploadId}/process \\
  -H "X-API-Key: ek_live_your_key_here"`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Ready to{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              Integrate?
            </span>
          </h2>
          <p className="text-lg text-white/60 mb-8 max-w-xl mx-auto">
            Get your API key and start building.
          </p>
          <Link
            href="/app/developers"
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-primary/30"
          >
            Get API Key
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <Link href="/" className="text-white/40 text-sm hover:text-white/60 transition">
          &larr; tryechome.com
        </Link>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab Content Renderer                                              */
/* ------------------------------------------------------------------ */

function EndpointRow({
  method,
  path,
  description,
  credits,
}: {
  method: string;
  path: string;
  description: string;
  credits: string;
}) {
  const curlCmd = `curl -X ${method} https://api.tryechome.com/api${path} \\\n  -H "X-API-Key: ek_live_your_key_here"`;
  return (
    <tr className="text-white/70 hover:bg-white/[0.02] transition border-b border-white/5 last:border-0">
      <td className="px-4 py-3">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            method === 'GET'
              ? 'bg-green-500/10 text-green-400'
              : method === 'POST'
                ? 'bg-blue-500/10 text-blue-400'
                : 'bg-red-500/10 text-red-400'
          }`}
        >
          {method}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-sm text-white/80">{path}</td>
      <td className="px-4 py-3 text-sm hidden md:table-cell">{description}</td>
      <td className="px-4 py-3 text-sm font-mono text-right hidden sm:table-cell">
        {credits === 'Free' ? (
          <span className="text-green-400">Free</span>
        ) : (
          credits
        )}
      </td>
      <td className="px-4 py-3">
        <CopyButton text={curlCmd} />
      </td>
    </tr>
  );
}

function EndpointTable({
  endpoints,
}: {
  endpoints: {
    method: string;
    path: string;
    description: string;
    credits: string;
  }[];
}) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="text-left text-white/40 border-b border-white/5">
            <th className="px-4 py-3 font-medium w-16">Method</th>
            <th className="px-4 py-3 font-medium">Endpoint</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Description</th>
            <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Credits</th>
            <th className="px-4 py-3 font-medium w-20"></th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((ep, i) => (
            <EndpointRow key={i} {...ep} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderTabContent(tab: TabKey) {
  switch (tab) {
    case 'auth':
      return (
        <>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Authentication
            </h3>
            <p className="text-white/60 text-sm leading-relaxed">
              All requests must include your API key in the{' '}
              <code className="px-1.5 py-0.5 bg-white/10 rounded text-xs font-mono text-white/80">
                X-API-Key
              </code>{' '}
              header. Keys prefixed with{' '}
              <code className="px-1.5 py-0.5 bg-white/10 rounded text-xs font-mono text-white/80">
                ek_live_
              </code>{' '}
              are production keys;{' '}
              <code className="px-1.5 py-0.5 bg-white/10 rounded text-xs font-mono text-white/80">
                ek_test_
              </code>{' '}
              are sandbox keys.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider">
              Base URL
            </h4>
            <code className="block px-4 py-3 bg-[#0D0D0F] border border-white/10 rounded-xl text-sm font-mono text-primary">
              https://api.tryechome.com/api
            </code>
          </div>

          <CodeBlock
            language="bash"
            code={`curl https://api.tryechome.com/api/voices \\
  -H "X-API-Key: ek_live_your_key_here"`}
          />

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider">
              Scopes
            </h4>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                ['generate:read', 'Read generation results'],
                ['generate:write', 'Create generations'],
                ['generate:*', 'Full generation access'],
                ['kb:read', 'Read knowledge base'],
                ['kb:write', 'Write knowledge base'],
                ['kb:*', 'Full KB access'],
                ['voice:read', 'Read voice profiles'],
                ['voice:write', 'Write voice profiles'],
                ['voice:*', 'Full voice access'],
                ['content-kits:read', 'Read content kits'],
                ['content-kits:*', 'Full kit access'],
                ['clips:read', 'Read video clips'],
                ['clips:write', 'Upload & process clips'],
                ['clips:*', 'Full clips access'],
                ['*', 'Wildcard — all scopes'],
              ].map(([scope, desc], i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg"
                >
                  <code className="text-xs font-mono text-primary flex-shrink-0">{scope}</code>
                  <span className="text-xs text-white/40">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      );

    case 'generate':
      return (
        <>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Content Generation
          </h3>
          <EndpointTable
            endpoints={[
              {
                method: 'POST',
                path: '/generate',
                description: 'Generate content',
                credits: '10',
              },
              {
                method: 'GET',
                path: '/generate/{id}',
                description: 'Get generation result',
                credits: 'Free',
              },
              {
                method: 'GET',
                path: '/generate/{id}/status',
                description: 'Check generation status',
                credits: 'Free',
              },
            ]}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <CodeBlock
              language="json"
              code={`// Request body
{
  "input_type": "text",
  "input_text": "Why context matters more than prompts",
  "platforms": ["linkedin", "x", "instagram"]
}`}
            />
            <CodeBlock
              language="json"
              code={`// Response
{
  "id": "gen_abc123",
  "status": "processing",
  "credits_used": 10,
  "platforms": ["linkedin", "x", "instagram"]
}`}
            />
          </div>
        </>
      );

    case 'clips':
      return (
        <>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" /> Video Clips
            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">
              NEW
            </span>
          </h3>
          <EndpointTable
            endpoints={[
              {
                method: 'POST',
                path: '/clips/upload',
                description: 'Upload or link video',
                credits: '5',
              },
              {
                method: 'POST',
                path: '/clips/{uploadId}/process',
                description: 'Start processing pipeline',
                credits: '15',
              },
              {
                method: 'GET',
                path: '/clips/{uploadId}',
                description: 'Get clips and status',
                credits: 'Free',
              },
              {
                method: 'GET',
                path: '/clips/{uploadId}/clips/{clipId}/export',
                description: 'Export clip with captions',
                credits: '2',
              },
            ]}
          />
          <CodeBlock
            language="json"
            code={`// Upload via URL
{
  "sourceType": "url",
  "sourceUrl": "https://youtube.com/watch?v=abc123"
}

// Upload via file — use multipart/form-data
// POST /clips/upload with file field`}
          />
        </>
      );

    case 'kb':
      return (
        <>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Knowledge Base
          </h3>
          <EndpointTable
            endpoints={[
              {
                method: 'GET',
                path: '/kb',
                description: 'List knowledge base items',
                credits: 'Free',
              },
              {
                method: 'POST',
                path: '/kb/content',
                description: 'Add content',
                credits: 'varies',
              },
              {
                method: 'POST',
                path: '/kb/content/social/import',
                description: 'Import from URL',
                credits: 'varies',
              },
              {
                method: 'DELETE',
                path: '/kb/content/{id}',
                description: 'Remove content',
                credits: 'Free',
              },
            ]}
          />
        </>
      );

    case 'voices':
      return (
        <>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Voice Profiles
          </h3>
          <EndpointTable
            endpoints={[
              {
                method: 'GET',
                path: '/voices',
                description: 'List voice profiles',
                credits: 'Free',
              },
              {
                method: 'GET',
                path: '/voices/{id}',
                description: 'Get voice details',
                credits: 'Free',
              },
              {
                method: 'GET',
                path: '/voices/{id}/strength',
                description: 'Get voice strength score',
                credits: 'Free',
              },
            ]}
          />
        </>
      );

    case 'kits':
      return (
        <>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Content Kits
          </h3>
          <EndpointTable
            endpoints={[
              {
                method: 'GET',
                path: '/content-kits',
                description: 'List content kits',
                credits: 'Free',
              },
              {
                method: 'GET',
                path: '/content-kits/{id}',
                description: 'Get content kit detail',
                credits: 'Free',
              },
              {
                method: 'POST',
                path: '/content-kits/{id}/regenerate',
                description: 'Regenerate content',
                credits: '10',
              },
            ]}
          />
        </>
      );

    case 'errors':
      return (
        <>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" /> Error Codes
          </h3>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/5">
                  <th className="px-6 py-3 font-medium w-24">Code</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ['401', 'Invalid or missing API key'],
                  ['402', 'Insufficient credits'],
                  ['403', 'Scope not authorized / CAPTCHA failed'],
                  ['404', 'Resource not found'],
                  ['429', 'Rate limit exceeded (60 requests/minute)'],
                  ['500', 'Internal server error'],
                ].map(([code, desc], i) => (
                  <tr
                    key={i}
                    className="text-white/70 hover:bg-white/[0.02] transition"
                  >
                    <td className="px-6 py-3">
                      <code className="text-sm font-mono font-bold text-red-400">
                        {code}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-sm">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
  }
}
