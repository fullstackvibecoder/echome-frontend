'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Play, Check, ArrowRight, Zap, MessageSquare, Video, FileText, Repeat, Sparkles, Brain, TrendingUp, Heart, Gauge, Clock, Clipboard, XCircle, Upload, Hash, Mail } from 'lucide-react';
import { SoundWave } from '@/components/shared/SoundWave';
import { NumberCounter } from '@/components/shared/NumberCounter';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Scroll-triggered animations with Intersection Observer
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-on-scroll');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('[data-animate="true"]');
    animatedElements.forEach((el) => {
      el.classList.add('opacity-0');
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1C1C1E]">
      {/* Ambient cursor glow */}
      <div
        className="fixed w-96 h-96 bg-gradient-to-br from-[#00D4FF]/10 to-[#B794F6]/10 rounded-full blur-3xl pointer-events-none transition-all duration-700 ease-out"
        style={{
          left: `${mousePosition.x}px`,
          top: `${mousePosition.y}px`,
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg' : 'bg-gray-900/50 backdrop-blur-md border-b border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <Image src="/media/echome-logo.svg" alt="Echo, your AI content assistant" width={40} height={40} className="object-contain transition-transform group-hover:scale-110" />
              <span className={`text-xl font-bold tracking-tight transition-colors ${scrolled ? 'text-[#1C1C1E]' : 'text-white'}`}>EchoMe</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className={`transition font-medium ${scrolled ? 'text-[#1C1C1E] hover:text-[#00D4FF]' : 'text-white hover:text-[#00D4FF]'}`}>Features</a>
              <a href="#how" className={`transition font-medium ${scrolled ? 'text-[#1C1C1E] hover:text-[#00D4FF]' : 'text-white hover:text-[#00D4FF]'}`}>How It Works</a>
              <a href="#pricing" className={`transition font-medium ${scrolled ? 'text-[#1C1C1E] hover:text-[#00D4FF]' : 'text-white hover:text-[#00D4FF]'}`}>Pricing</a>
              <Link
                href="/auth/login"
                className={`transition font-medium ${scrolled ? 'text-[#1C1C1E] hover:text-[#00D4FF]' : 'text-white hover:text-[#00D4FF]'}`}
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2.5 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all shadow-md"
              >
                Enter Your Echosystem
              </Link>
            </div>

            <button className={`md:hidden ${scrolled ? 'text-[#1C1C1E]' : 'text-white'}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-xl">
              <div className="flex flex-col p-6 space-y-4">
                <a href="#features" className="text-[#1C1C1E] hover:text-[#00D4FF] transition font-medium">Features</a>
                <a href="#how" className="text-[#1C1C1E] hover:text-[#00D4FF] transition font-medium">How It Works</a>
                <a href="#pricing" className="text-[#1C1C1E] hover:text-[#00D4FF] transition font-medium">Pricing</a>
                <Link
                  href="/auth/login"
                  className="text-left text-[#1C1C1E] hover:text-[#00D4FF] transition font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-xl font-semibold hover:shadow-lg transition-all text-center shadow-md"
                >
                  Enter Your Echosystem
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#1C1C1E] to-gray-900" />

        {/* Animated voice wave effect */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <div className="flex items-end gap-1 h-64">
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-[#00D4FF] to-[#B794F6] rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.sin(i * 0.3) * 60 + Math.random() * 40}%`,
                  animationDelay: `${i * 50}ms`,
                  animationDuration: `${1000 + Math.random() * 500}ms`
                }}
              />
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-20 w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Messaging */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur
                              border border-white/20 rounded-full mb-8 animate-fade-in">
                <Brain className="w-4 h-4 text-[#00D4FF]" />
                <span className="text-white/90 font-medium text-sm">AI That Learns Your Voice</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.1]">
                <span className="text-white">Content That</span>
                <br />
                <span className="text-white">Sounds Like </span>
                <span className="bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D]
                               bg-clip-text text-transparent">
                  You.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-gray-300 mb-4 font-light leading-relaxed max-w-xl mx-auto lg:mx-0">
                Stop sounding like every other AI tool.
              </p>
              <p className="text-lg md:text-xl text-white/90 mb-8 font-medium max-w-xl mx-auto lg:mx-0">
                EchoMe learns your unique voice from your existing content, then creates posts,
                threads, and articles that are unmistakably you.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-10">
                <Link
                  href="/auth/signup"
                  className="px-8 py-4 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white
                             rounded-xl font-bold hover:shadow-2xl hover:shadow-[#00D4FF]/25 hover:scale-105 transition-all
                             shadow-lg text-lg flex items-center gap-2 group"
                >
                  Start Building Your Voice
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20
                             text-white rounded-xl font-bold hover:bg-white/20 transition-all
                             text-lg flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Watch Demo
                </button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center justify-center lg:justify-start gap-6 text-white/70">
                <div className="text-center lg:text-left">
                  <p className="text-2xl font-bold text-white"><NumberCounter end={12847} /></p>
                  <p className="text-xs">Unique Voices</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center lg:text-left">
                  <p className="text-2xl font-bold text-white"><NumberCounter end={94} suffix="%" /></p>
                  <p className="text-xs">Voice Match Rate</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center lg:text-left">
                  <p className="text-2xl font-bold text-white"><NumberCounter end={8} /></p>
                  <p className="text-xs">Platforms</p>
                </div>
              </div>
            </div>

            {/* Right Column - Voice Profile Preview */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-[#00D4FF]/20 via-[#B794F6]/20 to-[#FF6B9D]/20 rounded-3xl blur-2xl" />

              {/* Voice Profile Card */}
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Your Voice Profile</p>
                      <p className="text-white/50 text-sm">Learned from 47 samples</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#00D4FF] font-bold text-lg">87%</p>
                    <p className="text-white/50 text-xs">Confidence</p>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="mb-6">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00D4FF] to-[#B794F6] rounded-full transition-all duration-1000"
                      style={{ width: '87%' }}
                    />
                  </div>
                </div>

                {/* Signature Phrases */}
                <div className="mb-5">
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">Signature Phrases</p>
                  <div className="flex flex-wrap gap-2">
                    {["Here's the thing...", "Let me tell you", "The secret is", "What do you think?"].map((phrase, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-lg text-[#00D4FF] text-sm font-medium"
                      >
                        "{phrase}"
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tone Markers */}
                <div className="mb-5">
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">Your Tone</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Conversational", color: "from-purple-500/20 to-purple-500/10 border-purple-500/30 text-purple-400" },
                      { label: "Direct", color: "from-pink-500/20 to-pink-500/10 border-pink-500/30 text-pink-400" },
                      { label: "Encouraging", color: "from-green-500/20 to-green-500/10 border-green-500/30 text-green-400" }
                    ].map((tone, i) => (
                      <span
                        key={i}
                        className={`px-3 py-1.5 bg-gradient-to-r ${tone.color} border rounded-lg text-sm font-medium`}
                      >
                        {tone.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Things You Avoid */}
                <div>
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">Things You Never Say</p>
                  <div className="flex flex-wrap gap-2">
                    {["Corporate jargon", "Generic AI phrases", "Passive voice"].map((avoid, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400/80 text-sm font-medium line-through decoration-red-500/50"
                      >
                        {avoid}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Floating elements for visual interest */}
                <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-[#FFD93D] to-[#FF6B9D] rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
                  <span className="text-3xl">🎯</span>
                </div>
              </div>

              {/* Platform icons floating */}
              <div className="absolute -bottom-4 -left-4 flex gap-2">
                {[
                  { icon: 'in', bg: 'from-blue-600 to-blue-700' },
                  { icon: '𝕏', bg: 'from-gray-700 to-gray-800' },
                  { icon: '📸', bg: 'from-pink-500 to-purple-600' },
                  { icon: '📧', bg: 'from-green-500 to-green-600' }
                ].map((platform, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 bg-gradient-to-br ${platform.bg} rounded-xl flex items-center justify-center shadow-lg text-white text-sm font-bold`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {platform.icon}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built from Your Echo */}
      <section className="py-20 px-6 bg-white relative overflow-hidden" data-animate="true">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[#00D4FF]/5 to-[#B794F6]/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-6xl md:text-7xl lg:text-8xl font-extrabold mb-8 tracking-tight leading-tight">
              Built from
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">Your Echo</span> 🎯
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 font-light leading-relaxed max-w-3xl mx-auto mb-4">
              Every video you upload, every voice note, every piece of content you create becomes part of <strong className="font-semibold text-[#00D4FF]">Your Echo</strong>: a living model of how you write and think.
            </p>
            <p className="text-lg md:text-xl bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent font-bold">
              The more you share, the more powerful Your Echo becomes ✨
            </p>
          </div>

          {/* Centered Robot Animation */}
          <div className="flex justify-center mb-10">
            <Image
              src="/media/echome-logo.svg"
              alt=""
              aria-hidden="true"
              width={180}
              height={180}
              className="robot-float"
            />
          </div>

          {/* Ways to Build Your Echo */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Manual Uploads */}
            <div className="group relative bg-white/60 backdrop-blur-xl rounded-3xl p-8 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_48px_rgba(0,212,255,0.12)] hover:border-[#00D4FF]/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-[#00D4FF]/10 to-[#00D4FF]/5 rounded-xl group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-[#00D4FF] icon-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1C1C1E]">Manual Uploads 📤</h3>
                </div>
                <p className="text-gray-600 font-light leading-relaxed">
                  Upload videos, voice notes, documents, or any content you&apos;ve created. Echo learns from everything you share.
                </p>
              </div>
            </div>

            {/* Social Integrations */}
            <div className="group relative bg-gradient-to-br from-white to-[#F0F4FF] rounded-3xl p-8 border-2 border-[#00D4FF]/30 hover:border-[#00D4FF] shadow-[0_8px_32px_rgba(0,212,255,0.15)] hover:shadow-[0_20px_60px_rgba(0,212,255,0.25)] hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                EASY IMPORT ⚡
              </div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Repeat className="w-6 h-6 text-[#00D4FF] icon-rotate" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1C1C1E]">Social Integrations 🔗</h3>
                </div>
                <p className="text-gray-600 font-light leading-relaxed mb-4">
                  Import from Instagram, Facebook, or YouTube. Paste any URL and Echo transcribes and learns from your past content.
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-[#B794F6]" />
                  <span className="text-[#B794F6] font-semibold">LinkedIn integration coming soon</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Ways In - Bento Grid */}
      <section id="how" className="py-20 px-6 bg-gradient-to-br from-[#FAFAFA] to-white relative overflow-hidden" data-animate="true">
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#B794F6]/5 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <Image
                src="/media/echo-mascot.svg"
                alt=""
                aria-hidden="true"
                width={128}
                height={128}
                className="echo-float"
              />
            </div>
            <h2 className="text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 tracking-tight leading-tight">
              Three ways in 🎯
              <br />
              <span className="text-5xl md:text-6xl font-light italic bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                One voice out 🚀
              </span>
            </h2>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-6 max-w-6xl mx-auto">
            {/* Large featured card - Upload Video */}
            <div className="md:col-span-2 md:row-span-2 group relative bg-gradient-to-br from-[#00D4FF]/10 via-white to-white rounded-3xl p-8 border-2 border-[#00D4FF]/20 hover:border-[#00D4FF] shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-full flex flex-col">
                <div className="mb-6">
                  <div className="inline-flex p-4 bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/10 rounded-2xl group-hover:scale-110 transition-transform">
                    <Video className="w-16 h-16 text-[#00D4FF]" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-4 text-[#1C1C1E]">Upload Video 🎥</h3>
                <p className="text-lg text-gray-600 font-light leading-relaxed mb-6">
                  Raw Zoom, selfie video, or client explainer. Echo extracts your ideas and creates a full content kit.
                </p>

                <div className="flex items-start gap-2 mb-6">
                  <ArrowRight className="w-5 h-5 text-[#00D4FF] flex-shrink-0 mt-0.5" />
                  <p className="text-[#00D4FF] font-semibold">Get blog post + 5 social posts + newsletter in 3 minutes</p>
                </div>

                <div className="mt-auto bg-gradient-to-r from-[#00D4FF] to-[#0099CC] rounded-2xl p-6 text-center shadow-lg">
                  <p className="text-white font-bold text-lg">One 30-min video = 10+ content pieces ✨</p>
                </div>
              </div>
            </div>

            {/* Voice or Text card */}
            <div className="md:col-span-2 group bg-white rounded-3xl p-6 border-2 border-[#B794F6]/20 hover:border-[#B794F6] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-[#B794F6]/20 to-[#B794F6]/10 rounded-xl group-hover:scale-110 transition-transform">
                  <FileText className="w-12 h-12 text-[#B794F6]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 text-[#1C1C1E]">Voice or Text 🎤</h3>
                  <p className="text-gray-600 font-light text-sm leading-relaxed mb-3">
                    Ramble into your phone or type an idea. Echo turns it into polished content.
                  </p>
                  <div className="inline-block bg-gradient-to-r from-[#B794F6]/10 to-[#B794F6]/5 border border-[#B794F6]/30 rounded-xl px-4 py-2">
                    <p className="text-[#B794F6] font-semibold text-sm">5-min voice note = Full LinkedIn article</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Import Content card */}
            <div className="md:col-span-2 group bg-gradient-to-br from-[#FF6B9D]/10 via-white to-white rounded-3xl p-6 border-2 border-[#FF6B9D]/20 hover:border-[#FF6B9D] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-[#FF6B9D]/20 to-[#FF6B9D]/10 rounded-xl group-hover:scale-110 transition-transform">
                  <Repeat className="w-12 h-12 text-[#FF6B9D]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 text-[#1C1C1E]">Import Content 🔗</h3>
                  <p className="text-gray-600 font-light text-sm leading-relaxed mb-3">
                    Paste a YouTube link, IG post, or blog URL. Echo remixes it in your voice.
                  </p>
                  <div className="inline-block bg-gradient-to-r from-[#FF6B9D]/10 to-[#FF6B9D]/5 border border-[#FF6B9D]/30 rounded-xl px-4 py-2">
                    <p className="text-[#FF6B9D] font-semibold text-sm">Any viral post = Your original take 🔥</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats cards */}
            <div className="md:col-span-1 bg-gradient-to-br from-[#00D4FF] to-[#0099CC] text-white rounded-2xl p-6 flex flex-col justify-center items-center shadow-lg hover:scale-105 transition-transform">
              <span className="text-5xl font-extrabold mb-2">
                <NumberCounter end={10} suffix="+" />
              </span>
              <span className="text-sm font-semibold opacity-90">Formats</span>
            </div>

            <div className="md:col-span-1 bg-gradient-to-br from-[#B794F6] to-[#9B8BAF] text-white rounded-2xl p-6 flex flex-col justify-center items-center shadow-lg hover:scale-105 transition-transform group">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-5xl font-extrabold">
                  <NumberCounter end={3} suffix="min" />
                </span>
                <SoundWave bars={4} color="white" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <span className="text-sm font-semibold opacity-90">Process</span>
            </div>
          </div>
        </div>
      </section>

      {/* What Happens Next */}
      <section className="py-20 px-6 bg-white relative overflow-hidden" data-animate="true">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-[#00D4FF]/5 to-[#B794F6]/5 -skew-y-2 transform origin-top-left -translate-y-12" />

        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 tracking-tight leading-tight">
              Then the
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">magic happens</span> ✨
            </h2>
          </div>

          {/* Timeline */}
          <div className="max-w-5xl mx-auto">
            <div className="relative">
              <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5 bg-[#3A8E9C]/20" style={{ top: '4rem' }} />

              <div className="grid md:grid-cols-5 gap-6">
                {[
                  { icon: <Upload className="w-6 h-6" />, title: 'Upload', desc: 'Your content goes to S3', color: 'from-[#00D4FF] to-[#0099CC]' },
                  { icon: <Brain className="w-6 h-6" />, title: 'Echo Learns', desc: 'Added to Your Echo', color: 'from-[#B794F6] to-[#9B8BAF]' },
                  { icon: <Clock className="w-6 h-6" />, title: 'Processing', desc: '0% → 100% in ~3 min', color: 'from-[#FF6B9D] to-[#FFD93D]' },
                  { icon: <Sparkles className="w-6 h-6" />, title: '10+ Formats', desc: 'All output types ready', color: 'from-[#00D4FF] to-[#B794F6]' },
                  { icon: <Clipboard className="w-6 h-6" />, title: 'Copy & Paste', desc: 'Platform-formatted, ready to post', color: 'from-[#B794F6] to-[#FF6B9D]' }
                ].map((step, i) => (
                  <div key={i} className="relative text-center group">
                    <div className={`bg-gradient-to-br ${step.color} w-20 h-20 rounded-full flex items-center justify-center text-white mx-auto mb-4 shadow-xl relative z-10 group-hover:scale-110 transition-transform`}>
                      {step.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-[#1C1C1E]">{step.title}</h3>
                    <p className="text-sm text-gray-600 font-light">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Voice Temperature Gauge */}
            <div className="mt-16 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF] to-[#B794F6] rounded-3xl blur-xl opacity-25 group-hover:opacity-40 transition duration-500" />

              <div className="relative bg-gradient-to-br from-white to-[#F0F4FF] rounded-3xl p-8 border-2 border-[#00D4FF]/30 shadow-xl">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-3 p-4 bg-gradient-to-br from-[#00D4FF]/10 to-[#B794F6]/10 rounded-2xl mb-4">
                    <Gauge className="w-12 h-12 text-[#00D4FF]" />
                    <SoundWave bars={5} color="#00D4FF" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-[#1C1C1E] mb-2">Voice Temperature 🌡️</h3>
                  <p className="text-gray-600 font-light">The more you upload, the better Echo gets</p>
                </div>

                <div className="relative">
                  <div className="flex justify-between mb-2">
                    {['❄️ Cold', '🌤️ Warming Up', '☀️ Warm', '🔥 Hot', '🚀 On Fire'].map((temp, i) => (
                      <div key={i} className="text-xs font-semibold text-gray-500">{temp}</div>
                    ))}
                  </div>
                  <div className="h-4 bg-gradient-to-r from-blue-300 via-yellow-300 to-red-500 rounded-full shadow-inner" />
                </div>

                <div className="mt-6 text-center">
                  <p className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent font-bold text-lg">
                    Your knowledge base grows with every upload ✨
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* See What Echo Creates - Output Examples */}
      <section id="features" className="py-20 px-6 bg-gradient-to-br from-[#0f0f23] to-[#1a1a3e] relative overflow-hidden" data-animate="true">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-[#00D4FF]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-[#B794F6]/10 to-transparent rounded-full blur-3xl" />

        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8">
              <Sparkles className="w-5 h-5 text-[#00D4FF]" />
              <span className="text-white font-medium">See the Output</span>
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight leading-tight text-white">
              One Video Becomes
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent">All of This</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From a single 15-minute video, Echo creates platform-ready content for everywhere you publish.
            </p>
          </div>

          {/* Output Grid */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
            {[
              { icon: '📝', title: 'Blog Article', desc: '2,400 words with headers, quotes, and SEO optimization', gradient: 'from-[#00D4FF] to-[#0099CC]', badge: 'Ready to publish' },
              { icon: '🐦', title: 'Twitter Thread', desc: '6 connected tweets with hooks, value drops, and CTA', gradient: 'from-[#1DA1F2] to-[#0077B5]', badge: '89K impressions' },
              { icon: '💼', title: 'LinkedIn Post', desc: 'Professional format with engagement-optimized structure', gradient: 'from-[#0077B5] to-[#005582]', badge: '847 reactions' },
              { icon: '📸', title: 'Instagram Carousel', desc: '5-slide carousel with visual hierarchy and swipe hooks', gradient: 'from-[#E1306C] to-[#F77737]', badge: '5 slides' },
              { icon: '🎵', title: 'TikTok Script', desc: '47-second script with timing cues and visual directions', gradient: 'from-[#000000] to-[#333333]', badge: '0:47 runtime' },
              { icon: '🎬', title: 'Viral Clips', desc: 'AI-detected best moments, cropped vertical, auto-captioned', gradient: 'from-[#FF6B9D] to-[#FFD93D]', badge: '5 clips' }
            ].map((output, i) => (
              <div key={i} className="group relative">
                <div className="relative bg-[#1c1c2e] rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                  <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm text-white/80 text-xs font-semibold px-3 py-1 rounded-full">
                    {output.badge}
                  </div>
                  <div className={`w-16 h-16 bg-gradient-to-br ${output.gradient} rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    {output.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{output.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{output.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 py-8 px-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">1</div>
              <div className="text-gray-400 text-sm mt-1">Video Input</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent">6</div>
              <div className="text-gray-400 text-sm mt-1">Content Formats</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#FF6B9D] to-[#FFD93D] bg-clip-text text-transparent">15+</div>
              <div className="text-gray-400 text-sm mt-1">Platform Posts</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-white">3min</div>
              <div className="text-gray-400 text-sm mt-1">Processing</div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="py-20 px-6 bg-gradient-to-br from-white to-[#F0F4FF] relative overflow-hidden" data-animate="true">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-[#FF6B9D]/5 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 tracking-tight leading-tight">
              What Makes
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">Echo Different</span> 💎
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { icon: <Brain className="w-10 h-10" />, headline: 'Echo Remembers Everything 🧠', body: 'Unlike ChatGPT, Echo builds Your Echo: a permanent record of your voice. Every upload strengthens how you sound.', proof: 'Learns your unique voice from every upload', gradient: 'from-[#00D4FF] to-[#0099CC]' },
              { icon: <Heart className="w-10 h-10" />, headline: 'Echo Learns What You Like 💜', body: 'Vote on outputs. Echo learns your preferences automatically. No manual settings required.', proof: 'Adapts to your style automatically', gradient: 'from-[#B794F6] to-[#9B8BAF]' },
              { icon: <TrendingUp className="w-10 h-10" />, headline: 'Echo Keeps Your Voice Consistent 📈', body: 'Track improvements. Echo detects when voice drifts. Restore previous versions with snapshots.', proof: 'Maintains consistent voice across all content', gradient: 'from-[#FF6B9D] to-[#FFD93D]' }
            ].map((feature, i) => (
              <div key={i} className="group relative bg-white/60 backdrop-blur-xl rounded-3xl p-8 border border-white/40 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity`} />
                <div className="relative">
                  <div className="mb-6">
                    <div className={`inline-flex p-3 bg-gradient-to-br ${feature.gradient} rounded-2xl group-hover:scale-110 transition-transform`}>
                      <div className="text-white">{feature.icon}</div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-[#1C1C1E]">{feature.headline}</h3>
                  <p className="text-gray-600 font-light leading-relaxed mb-6">{feature.body}</p>
                  <div className={`bg-gradient-to-r ${feature.gradient} p-[2px] rounded-xl`}>
                    <div className="bg-white rounded-xl p-4">
                      <p className={`bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent font-bold text-sm`}>{feature.proof}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Your Echo - CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#00D4FF] via-[#0099CC] to-[#00D4FF] text-white relative overflow-hidden" data-animate="true">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-[#B794F6]/30 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-[#FF6B9D]/30 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Image src="/media/echome-logo.svg" alt="" aria-hidden="true" width={384} height={384} className="animate-float-gentle" />
        </div>

        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full border border-white/30 mb-8 shadow-lg">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-bold">The Secret ✨</span>
            </div>

            <h2 className="text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-tight tracking-tight">
              Echo learns you first.
              <br />
              Creates later 🎯
            </h2>
            <p className="text-2xl md:text-3xl font-light max-w-4xl mx-auto">
              Your Echo is why it sounds like you. Not generic AI.
            </p>
          </div>

          <div className="bg-white/20 backdrop-blur-xl border-2 border-white/30 rounded-3xl p-8 md:p-12 max-w-5xl mx-auto shadow-2xl hover:scale-105 transition-transform duration-300">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 bg-white text-[#00D4FF] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl">
                <Zap className="w-10 h-10" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl font-extrabold mb-4">Every Upload Strengthens Your Echo 💪</h3>
                <p className="text-xl font-light leading-relaxed">
                  Voice note? Echo adds it to Your Echo. Video upload? Echo learns more. The more you share, the more Echo sounds exactly like you. ✨
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gradient-to-br from-[#FAFAFA] to-white relative overflow-hidden" data-animate="true">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#00D4FF]/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#B794F6]/5 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00D4FF]/10 to-[#B794F6]/10 rounded-full border border-[#00D4FF]/20 mb-8 backdrop-blur-sm">
              <span className="text-2xl">💰</span>
              <span className="text-sm font-bold bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">Pricing</span>
            </div>
            <h2 className="text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 tracking-tight text-[#1C1C1E] leading-tight">
              Your voice,
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">your way</span> 🎨
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Choose a plan that works with your creative rhythm.
            </p>

            {/* Billing Period Toggle */}
            <div className="flex justify-center mt-12 mb-4">
              <div className="inline-flex items-center bg-white/60 backdrop-blur-xl border-2 border-stone-200 rounded-2xl p-2 shadow-lg">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    billingPeriod === 'monthly'
                      ? 'bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white shadow-md'
                      : 'text-stone-600 hover:text-[#00D4FF]'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`relative px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    billingPeriod === 'annual'
                      ? 'bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white shadow-md'
                      : 'text-stone-600 hover:text-[#00D4FF]'
                  }`}
                >
                  Annual
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-[#FFD93D] to-[#FF6B9D] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
                    SAVE 17%
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
            {/* Echo - $29 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00D4FF]/20 to-[#B794F6]/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-stone-200 p-8 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div className="mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <span className="text-3xl">🎬</span>
                  </div>
                  <h3 className="text-3xl font-extrabold text-[#1C1C1E] mb-3">Echo</h3>
                  <p className="text-sm font-light text-stone-600 mb-6 leading-relaxed">Turn raw videos into viral clips + voice-matched content</p>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-extrabold bg-gradient-to-r from-[#00D4FF] to-[#0099CC] bg-clip-text text-transparent">
                        ${billingPeriod === 'monthly' ? '29' : '290'}
                      </span>
                      <span className="text-base font-light text-stone-500">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-gradient-to-r from-[#00D4FF]/10 to-[#0099CC]/10 border border-[#00D4FF]/30 rounded-lg px-3 py-1">
                        <p className="text-xs font-semibold text-[#00D4FF]">Save $58/year 🎉</p>
                      </div>
                    )}
                  </div>
                  <div className="mb-6 inline-block bg-gradient-to-r from-[#FFD93D]/20 to-[#FF6B9D]/20 border border-[#FFD93D]/40 rounded-lg px-3 py-1.5">
                    <p className="text-xs font-bold text-[#FF6B9D]">✨ 7-Day Free Trial</p>
                  </div>
                  <Link href="/auth/signup" className="relative w-full px-6 py-4 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden group/btn block text-center">
                    <span className="relative z-10">Start Free Trial 🎯</span>
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="space-y-4 pt-6 border-t-2 border-stone-200">
                    {[
                      '100 video minutes/month',
                      'Up to 5 viral clips per video',
                      'AI identifies best moments',
                      'All 8 content platforms',
                      '5 caption styles',
                      'Voice-matched written content',
                      '1080p export quality',
                      'Monitor 3 creators'
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-stone-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Echo Pro - $59 - Popular */}
            <div className="relative md:-mt-8 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD93D] via-[#FF6B9D] to-[#B794F6] rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 animate-pulse transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-[#00D4FF] via-[#0099CC] to-[#00D4FF] rounded-3xl p-8 flex flex-col shadow-2xl hover:shadow-[0_30px_60px_-15px_rgba(0,212,255,0.5)] hover:-translate-y-2 transition-all duration-300">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FFD93D] to-[#FF6B9D] text-white text-xs font-extrabold px-6 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
                  <span className="text-base">⭐</span> BEST VALUE
                </div>
                <div className="mb-6 mt-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <span className="text-3xl">💎</span>
                  </div>
                  <h3 className="text-3xl font-extrabold text-white mb-3">Echo Pro</h3>
                  <p className="text-sm font-light text-white/90 mb-6 leading-relaxed">Maximum clips, 4K quality, unlimited styles. For serious creators.</p>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-extrabold text-white drop-shadow-lg">
                        ${billingPeriod === 'monthly' ? '59' : '590'}
                      </span>
                      <span className="text-base font-light text-white/80">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1">
                        <p className="text-xs font-semibold text-white">Save $118/year 🎉</p>
                      </div>
                    )}
                  </div>
                  <div className="mb-6 inline-block bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1.5">
                    <p className="text-xs font-bold text-white">✨ 7-Day Free Trial</p>
                  </div>
                  <Link href="/auth/signup" className="relative w-full px-6 py-4 bg-gradient-to-r from-[#1C1C1E] to-[#2a2a2c] text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden group/btn border-2 border-white/20 block text-center">
                    <span className="relative z-10">Start Free Trial 🚀</span>
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="space-y-4 pt-6 border-t-2 border-white/30">
                    {[
                      '500 video minutes/month',
                      'Up to 15 viral clips per video',
                      'Everything in Echo, plus:',
                      'Unlimited caption styles',
                      'Custom caption presets',
                      '4K export quality',
                      'Monitor 15 creators',
                      'Virality predictions',
                      'Priority processing',
                      'Priority support'
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-white">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem - Before/After */}
      <section className="relative py-24 px-6 overflow-hidden" data-animate="true">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAFAFA] via-[#F6F6F6] to-[#FAFAFA]" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[#00D4FF]/10 to-[#B794F6]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-[#FF6B9D]/10 to-[#FFD93D]/10 rounded-full blur-3xl" />

        <div className="relative max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 tracking-tight">
              Stop Rewriting.
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent">
                Start Repurposing.
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto">
            {/* The Old Way */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-400/20 to-gray-500/20 rounded-3xl blur-lg opacity-50" />
              <div className="relative bg-white/60 backdrop-blur-xl rounded-3xl p-10 border-2 border-stone-300 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl mb-6 shadow-lg">
                    <MessageSquare className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-gray-600 mb-2">The Old Way</h3>
                  <p className="text-sm font-light text-gray-500">Slow, manual, and exhausting</p>
                </div>
                <div className="space-y-5">
                  {[
                    { text: 'Generic AI forgets your context', emoji: '😵' },
                    { text: 'Manually rewrite for every platform', emoji: '⏰' },
                    { text: 'Inconsistent voice across channels', emoji: '😕' },
                    { text: '10+ hours per week on content', emoji: '😩' }
                  ].map((pain, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 bg-gray-100/50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-700 font-medium block">{pain.text}</span>
                      </div>
                      <span className="text-2xl">{pain.emoji}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* The EchoMe Way */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D] rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
              <div className="relative bg-gradient-to-br from-[#00D4FF] via-[#0099CC] to-[#00D4FF] rounded-3xl p-10 shadow-2xl hover:shadow-[0_30px_60px_-15px_rgba(0,212,255,0.6)] hover:-translate-y-1 transition-all duration-300">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-xl rounded-2xl mb-6 shadow-lg">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-white mb-2">The EchoMe Way</h3>
                  <p className="text-sm font-light text-white/90">Fast, smart, and effortless</p>
                </div>
                <div className="space-y-5">
                  {[
                    { text: 'Echo learns and remembers your voice', emoji: '🧠' },
                    { text: 'Upload once, Echo posts everywhere', emoji: '⚡' },
                    { text: 'Echo keeps your voice consistent', emoji: '✨' },
                    { text: '10+ hours back in your week', emoji: '🎉' }
                  ].map((solution, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-bold block">{solution.text}</span>
                      </div>
                      <span className="text-2xl">{solution.emoji}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-20 px-6 bg-gradient-to-br from-[#1C1C1E] via-[#2a2a2c] to-[#1C1C1E] text-white overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D]" />
        <div className="absolute top-10 right-20 w-64 h-64 bg-gradient-to-br from-[#00D4FF]/10 to-[#B794F6]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-20 w-72 h-72 bg-gradient-to-br from-[#FF6B9D]/10 to-[#FFD93D]/10 rounded-full blur-3xl" />

        <div className="relative max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00D4FF] to-[#B794F6] rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Image src="/media/echome-logo.svg" alt="Echo, your AI content assistant" width={48} height={48} className="relative object-contain" />
                </div>
                <span className="text-2xl font-extrabold bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                  EchoMe
                </span>
              </div>
              <p className="text-white/80 font-light text-lg leading-relaxed mb-6">
                Echo is your personal content engine. Train once, scale forever.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl hover:bg-gradient-to-r hover:from-[#00D4FF] hover:to-[#B794F6] flex items-center justify-center transition-all duration-300 group">
                  <span className="text-white/70 group-hover:text-white text-lg">𝕏</span>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl hover:bg-gradient-to-r hover:from-[#00D4FF] hover:to-[#B794F6] flex items-center justify-center transition-all duration-300 group">
                  <span className="text-white/70 group-hover:text-white text-lg">in</span>
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-lg mb-6 bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">Product</h4>
              <ul className="space-y-3 text-white/70 font-light">
                <li><a href="#features" className="hover:text-[#00D4FF] transition-colors duration-200">Features</a></li>
                <li><a href="#pricing" className="hover:text-[#00D4FF] transition-colors duration-200">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-extrabold text-lg mb-6 bg-gradient-to-r from-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent">Company</h4>
              <ul className="space-y-3 text-white/70 font-light">
                <li><Link href="/auth/login" className="hover:text-[#B794F6] transition-colors duration-200">Sign In</Link></li>
                <li><Link href="/auth/signup" className="hover:text-[#B794F6] transition-colors duration-200">Sign Up</Link></li>
              </ul>
            </div>
          </div>

          <div className="relative h-px mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          <div className="text-center text-white/60 text-sm font-light flex flex-col md:flex-row items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <Image src="/media/echo-mini.svg" alt="" aria-hidden="true" width={20} height={20} className="echo-wave-hover inline-block" />
              <span>© 2024 EchoMe Inc. All rights reserved.</span>
            </div>
            <span className="hidden md:inline text-white/30">•</span>
            <span className="bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent font-medium">
              Made with ✨ for creators
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
