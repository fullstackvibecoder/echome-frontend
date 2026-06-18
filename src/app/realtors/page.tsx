'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ArrowRight, Video, MessageSquare, Mic, FileText, Mail, Brain, Play } from 'lucide-react';
import { JsonLd } from '@/components/json-ld';

const LOOM_VIDEO_ID = '136ee8a0709e44eaa5a2ba128d3ab624';
const LOOM_THUMBNAIL_URL = `https://cdn.loom.com/sessions/thumbnails/${LOOM_VIDEO_ID}-3920a96cb0e456fa-full-play.gif#t=0.1`;

// Single source of truth for the FAQ: rendered on-page AND emitted as FAQPage
// structured data so LLMs and search engines can quote these answers when a
// realtor asks "what's the best AI content tool for real estate agents."
const realtorFaqs: { q: string; a: string }[] = [
  {
    q: 'What is EchoMe?',
    a: 'EchoMe is an AI content engine that learns how you actually sound, then turns one piece of raw material — a market update, a client story, a quick voice note — into a week of social content in your own voice. It reads what you have already published — your videos, emails, blog, and past posts — to map your phrasing and tone, then writes Instagram carousels, LinkedIn posts, X threads, email newsletters, and short captioned clips that read like you wrote them. It is built for real estate agents who are great at their work but do not have hours to spend on content.',
  },
  {
    q: "I'm not tech savvy. Can I actually use this?",
    a: 'Yes. If you can record a video on your phone and upload a file, you can use EchoMe. No editing, no design tools, no prompt engineering. You upload content, EchoMe handles the rest.',
  },
  {
    q: 'How is this different from ChatGPT?',
    a: "ChatGPT writes from prompts — you have to tell it what to say and how to say it. EchoMe writes from context. It learns from your actual videos, emails, and content, then generates posts grounded in your voice and your ideas. No 'act like a real estate agent' instructions needed.",
  },
  {
    q: 'Do I need to edit my videos before uploading?',
    a: "No. Raw, unpolished video is perfect. EchoMe extracts your ideas and speaking style from the audio — it doesn't care about production quality. A 3-minute phone recording of you talking about a listing is ideal.",
  },
  {
    q: 'I do not have video to upload. Can I still use EchoMe?',
    a: 'Yes. Video is optional. From a typed topic, a voice note, or a link, EchoMe writes social captions, carousels, and TikTok scripts. Only short captioned clips need a video source.',
  },
  {
    q: 'What kind of content does it create?',
    a: 'From one talking-head video, EchoMe pulls short captioned clips and generates Instagram carousels, LinkedIn posts, X/Twitter threads, email newsletters, blog posts, and teleprompter scripts — all in your voice, across the platforms where your clients spend time. Your listing walkthrough footage works as b-roll behind the clips.',
  },
  {
    q: 'How is this different from template tools like RealEstateContent.ai?',
    a: 'Template tools give every agent the same pre-written posts with different headshots. EchoMe learns YOUR voice from YOUR content and generates original posts grounded in your ideas, your expertise, and your way of communicating. Your sphere can tell the difference.',
  },
  {
    q: 'How much does it cost?',
    a: 'EchoMe starts at $37/mo with 5 free content kits to try (no credit card). Compare that to template tools charging $99/mo for fill-in-the-blank posts, or a social media manager charging $1,000+/mo who still won\'t capture your voice.',
  },
  {
    q: 'I already have a social media person. Why would I need this?',
    a: 'Give them EchoMe. It solves the hardest part of their job — writing in your voice. They handle scheduling and engagement, EchoMe handles making sure every post sounds like you, not like a marketing agency.',
  },
  {
    q: "What if I don't have any content to upload?",
    a: 'You have more than you think. Your sent emails, listing descriptions, past social posts, even a 2-minute voice recording talking about your market — all of it works. Start small, and your voice profile gets stronger over time.',
  },
  {
    q: 'Does EchoMe set up my Knowledge Base for me?',
    a: 'When you sign up, EchoMe can search the public web for your profiles and pre-fill your Knowledge Base, with your consent. You can skip it, and re-run it anytime from your Voice page.',
  },
  {
    q: 'What kinds of things should I record for my Knowledge Base?',
    a: 'Anything that captures how you think. Client conversations, listing walkthroughs, a quick voice note in the car about why you made a call. EchoMe learns your reasoning, not just your words. The bar is low. An off-the-cuff voice memo is genuinely useful.',
  },
  {
    q: 'Does EchoMe write content for me automatically?',
    a: 'Yes. Once your Knowledge Base has enough to work with, EchoMe can draft content for you and deliver it to your dashboard, marked as drafted by Echo. You review, edit, and schedule what you want, and skip the rest.',
  },
  {
    q: 'How good is voice matching at the start?',
    a: 'Voice matching learns over time. It will be rough on day one and gets stronger as you add more of your videos, emails, and posts. Stick with it. The more you feed it, the closer the output reads to how you actually write.',
  },
];

export default function RealtorsPage() {
  const [isPlaying, setIsPlaying] = useState(false);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'EchoMe for Real Estate Agents',
    description: 'AI content creation tool that learns your voice. Built for real estate professionals.',
    url: 'https://tryechome.com/realtors',
    isPartOf: { '@type': 'WebSite', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'For Real Estate', item: 'https://tryechome.com/realtors' },
      ],
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: realtorFaqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <JsonLd data={jsonLd} />
      <JsonLd data={faqJsonLd} />

      {/* Nav */}
      <nav className="fixed w-full z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <Image src="/media/echome-logo.svg" alt="EchoMe" width={36} height={36} />
            <span className="text-xl font-bold text-white">EchoMe</span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">for Real Estate</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="/auth/login" className="hidden sm:block text-white/70 hover:text-white transition font-medium text-sm">Sign In</a>
            <a href="/auth/signup" className="px-5 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold text-sm hover:scale-105 transition-all shadow-md">
              Try Free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-purple/10 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4 pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="text-primary font-bold text-xs tracking-widest uppercase">For Real Estate Agents</span>
          </div>

          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
            Your Clients Hired{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              You.
            </span>
            <br />
            Your Content Should{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              Sound Like You.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-4 leading-relaxed">
            Stop using templates that make you sound like every other agent in your market.
            EchoMe learns your voice from your videos, emails, and content &mdash; then creates
            social media posts that are unmistakably you.
          </p>

          <p className="text-sm text-white/40 mb-10">
            No design skills needed. No video editing. No prompt engineering.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a href="/auth/signup" className="px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-primary/30 flex items-center gap-3">
              Try Free &mdash; 5 Content Kits
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
          <p className="text-xs text-white/40 mt-4">No credit card required. See if it gets your voice right.</p>

          {/* Demo video */}
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/5 shadow-[0_20px_40px_rgba(0,103,126,0.15)]">
              <div className="rounded-xl overflow-hidden bg-gray-950 relative">
                {!isPlaying ? (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="relative w-full group/video cursor-pointer"
                    style={{ paddingBottom: '64.98%' }}
                    aria-label="Play demo video"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={LOOM_THUMBNAIL_URL}
                      alt="EchoMe product demo"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/video:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover/video:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/30 scale-100 group-hover/video:scale-110 transition-transform duration-300">
                        <Play className="w-7 h-7 ml-1" fill="white" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white font-bold text-sm">See EchoMe in Action</p>
                    </div>
                  </button>
                ) : (
                  <div className="relative w-full" style={{ paddingBottom: '64.98%' }}>
                    <iframe
                      src={`https://www.loom.com/embed/${LOOM_VIDEO_ID}?autoplay=1`}
                      title="EchoMe product demo"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 px-6 bg-gray-900 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
            You Know You Need to Post.
            <br />
            <span className="text-white/50">You Just Don&apos;t Have Time to Do It Right.</span>
          </h2>
          <p className="text-center text-white/60 max-w-2xl mx-auto mb-12">
            Between showings, closings, and client calls, content creation falls to the bottom of the list.
            So you either don&apos;t post, or you use a template tool and sound like everyone else.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { pain: 'You post for 2 weeks, then go silent for a month', result: 'Your sphere forgets about you' },
              { pain: 'You use ChatGPT and it sounds... off', result: 'People can tell it\'s not you' },
              { pain: 'Template tools give you the same posts as every agent', result: 'You blend in instead of stand out' },
              { pain: 'You have listing videos sitting on your phone', result: 'Hours of content going to waste' },
              { pain: 'You know social media generates leads', result: 'But you can\'t justify 5 hours/week on it' },
              { pain: 'You hired a VA or social media manager', result: 'They don\'t capture your voice either' },
            ].map((item, i) => (
              <div key={i} className="p-5 bg-white/[0.03] border border-white/5 rounded-xl">
                <p className="text-white font-medium mb-2">{item.pain}</p>
                <p className="text-white/40 text-sm">{item.result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How EchoMe Is Different */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-900 to-gray-900 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Not Another Template Tool.
              <br />
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">A Voice Engine.</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              EchoMe doesn&apos;t give you pre-written posts to fill in. It learns how you talk, how you explain things,
              how you close &mdash; then writes content that your sphere would believe you sat down and wrote yourself.
            </p>
          </div>

          {/* Comparison */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 opacity-80">
              <div className="w-12 h-12 mb-6 bg-white/5 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white/40" />
              </div>
              <h3 className="text-xl font-bold text-white/70 mb-4">Template Tools</h3>
              <div className="space-y-3 text-white/50 text-sm">
                <p className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-white/30" />Same posts as every other agent</p>
                <p className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-white/30" />Fill-in-the-blank captions</p>
                <p className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-white/30" />No voice learning</p>
                <p className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-white/30" />Sounds like AI or a script</p>
                <p className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-white/30" />$99/mo for Canva templates</p>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-primary/15 to-accent-purple/15 border-2 border-primary/40 rounded-2xl p-8 shadow-[0_0_40px_-10px_rgba(0,212,255,0.3)]">
              <div className="w-14 h-14 mb-6 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Video className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">EchoMe</h3>
              <div className="space-y-3 text-white">
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><ArrowRight className="w-3 h-3 text-primary" /></span>Learns YOUR voice from YOUR content</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><ArrowRight className="w-3 h-3 text-primary" /></span>Upload a listing video, get a week of posts</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><ArrowRight className="w-3 h-3 text-primary" /></span>Context is King &mdash; grounded in your history</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><ArrowRight className="w-3 h-3 text-primary" /></span>Your sphere thinks you wrote it</p>
                <p className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><ArrowRight className="w-3 h-3 text-primary" /></span>Starts at $37/mo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works for Realtors */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
            How It Works
          </h2>
          <p className="text-center text-white/60 max-w-xl mx-auto mb-16">
            Three steps. No editing. No design skills. No prompt engineering.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number={1}
              icon={<Brain className="w-6 h-6 text-primary" />}
              title="Your voice, already learning"
              description="Drop your listing videos, market update recordings, sent emails, and blog posts. EchoMe maps how you actually communicate."
              detail="The more it reads, the more it sounds like you. No prompts to engineer."
            />
            <StepCard
              number={2}
              icon={<Video className="w-6 h-6 text-primary" />}
              title="Drop in Content"
              description="Record a quick video on your phone about a new listing, a market insight, or a tip for buyers. Or just paste a YouTube link. No editing needed."
              detail="Raw, unpolished video is perfect. EchoMe extracts your ideas, not your production quality."
            />
            <StepCard
              number={3}
              icon={<FileText className="w-6 h-6 text-primary" />}
              title="Get a Week of Posts"
              description="EchoMe generates Instagram carousels, LinkedIn posts, X threads, email newsletters, and video scripts — all in your voice, grounded in your ideas."
              detail="15+ content pieces from one video. Copy, paste, post."
            />
          </div>
        </div>
      </section>

      {/* What You Can Feed It */}
      <section className="py-20 px-6 bg-gray-900 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
            Feed It What You Already Have
          </h2>
          <p className="text-center text-white/60 max-w-xl mx-auto mb-12">
            You don&apos;t need to create anything new. EchoMe works with content you&apos;ve already made.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Video className="w-5 h-5" />, title: 'Listing walkthrough videos', desc: 'The ones sitting on your phone right now' },
              { icon: <Mic className="w-5 h-5" />, title: 'Voice recordings', desc: 'Talk about a topic for 2 minutes. That\'s it.' },
              { icon: <Mail className="w-5 h-5" />, title: 'Emails you\'ve sent', desc: 'Your follow-ups, market updates, client responses' },
              { icon: <FileText className="w-5 h-5" />, title: 'Blog posts & articles', desc: 'Market reports, neighborhood guides, buyer tips' },
              { icon: <Video className="w-5 h-5" />, title: 'YouTube & social videos', desc: 'Paste a link. No upload needed.' },
              { icon: <MessageSquare className="w-5 h-5" />, title: 'Any text you\'ve written', desc: 'Paste anything. Newsletters, bios, presentations.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{item.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Real Talk Section */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-8">
            Real Talk: Why This Matters for{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">Your Business</span>
          </h2>

          <div className="space-y-6 text-white/80 text-lg leading-relaxed">
            <p>
              Your sphere does business with people they <strong className="text-white">know, like, and trust</strong>.
              Social media is how you stay in front of them between transactions.
            </p>
            <p>
              But here&apos;s the thing &mdash; if your posts sound like they were written by a robot or a template,
              you&apos;re not building trust. You&apos;re building noise.
            </p>
            <p>
              The agents winning on social media aren&apos;t the ones with the best graphics.
              They&apos;re the ones who <strong className="text-white">sound like themselves</strong>. Their posts feel real because they are real &mdash;
              grounded in their actual expertise, their actual personality, their actual way of communicating.
            </p>
            <p>
              That&apos;s what EchoMe does. It doesn&apos;t replace you. It <strong className="text-white">scales you</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ - GEO optimized */}
      <section className="py-20 px-6 bg-gray-900 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold text-center mb-12">
            Questions Real Estate Agents Ask
          </h2>

          <div className="space-y-6">
            {realtorFaqs.map((item) => (
              <FAQ key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 border-t border-white/5 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Stop Sounding Like{' '}
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              Every Other Agent
            </span>
          </h2>
          <p className="text-lg text-white/60 mb-8 max-w-xl mx-auto">
            5 free content kits. No credit card. See if EchoMe gets your voice right.
          </p>
          <a
            href="/auth/signup"
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-primary/30"
          >
            Try Free
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-xs text-white/30 mt-6">
            Used by 250+ content creators and real estate professionals across North America
          </p>
        </div>
      </section>

      {/* Guides link */}
      <section className="py-12 px-6 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/40 text-sm mb-4">Need help getting started?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/guides/email-upload" className="text-sm text-primary hover:underline">How to upload your emails &rarr;</Link>
            <Link href="/guides/compress-video" className="text-sm text-primary hover:underline">How to compress videos for upload &rarr;</Link>
          </div>
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

function StepCard({ number, icon, title, description, detail }: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  detail: string;
}) {
  return (
    <div className="relative p-6 bg-white/[0.03] border border-white/5 rounded-2xl">
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-sm font-bold text-white shadow-lg">
        {number}
      </div>
      <div className="w-12 h-12 mb-4 bg-primary/10 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm mb-3">{description}</p>
      <p className="text-primary/80 text-xs italic">{detail}</p>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="p-5 bg-white/[0.03] border border-white/5 rounded-xl">
      <h3 className="font-semibold text-white mb-2">{q}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{a}</p>
    </div>
  );
}
