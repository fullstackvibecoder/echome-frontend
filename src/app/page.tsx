'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Play, Check, ArrowRight, MessageSquare, Video, FileText, Sparkles, Brain, XCircle, Upload, Hash, Mail } from 'lucide-react';
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
                Start Building Your Voice
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
                  Start Building Your Voice
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
                <Link
                  href="/examples"
                  className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20
                             text-white rounded-xl font-bold hover:bg-white/20 transition-all
                             text-lg flex items-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  See Examples
                </Link>
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

      {/* How Voice Learning Works */}
      <section id="how" className="py-24 px-6 bg-white relative overflow-hidden" data-animate="true">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[#00D4FF]/5 to-[#B794F6]/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#B794F6]/5 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-full mb-6">
              <Brain className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-[#00D4FF] font-semibold text-sm">How It Works</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-[#1C1C1E]">
              Voice Learning in
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent"> 3 Steps</span>
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              The more content you share, the better Echo understands your unique voice.
            </p>
          </div>

          {/* 3-Step Process */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {/* Step 1: Feed */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF]/20 to-[#B794F6]/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-lg hover:shadow-xl transition-all h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    1
                  </div>
                  <h3 className="text-2xl font-bold text-[#1C1C1E]">Feed Your Echo</h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Upload your existing content - blog posts, emails, social posts, videos, podcasts.
                  Everything you&apos;ve already created becomes training data.
                </p>
                <div className="space-y-3">
                  {[
                    { icon: <FileText className="w-4 h-4" />, text: "Blog posts & articles" },
                    { icon: <Mail className="w-4 h-4" />, text: "Emails & newsletters" },
                    { icon: <MessageSquare className="w-4 h-4" />, text: "Social media posts" },
                    { icon: <Video className="w-4 h-4" />, text: "Videos & podcasts" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-gray-500">
                      <div className="w-8 h-8 bg-[#00D4FF]/10 rounded-lg flex items-center justify-center text-[#00D4FF]">
                        {item.icon}
                      </div>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Learn */}
            <div className="relative group md:-mt-4">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#B794F6]/20 to-[#FF6B9D]/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all h-full text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <h3 className="text-2xl font-bold">Echo Learns You</h3>
                </div>
                <p className="text-white/90 mb-6 leading-relaxed">
                  Our AI analyzes your content to extract your unique voice patterns,
                  signature phrases, and communication style.
                </p>
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Echo Discovers</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#FFD93D]" />
                        <span className="text-sm">Your signature phrases</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#FFD93D]" />
                        <span className="text-sm">Your tone & energy</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#FFD93D]" />
                        <span className="text-sm">Words you never use</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#FFD93D]" />
                        <span className="text-sm">Your storytelling style</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Create */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FF6B9D]/20 to-[#FFD93D]/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-lg hover:shadow-xl transition-all h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B9D] to-[#FFD93D] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    3
                  </div>
                  <h3 className="text-2xl font-bold text-[#1C1C1E]">Create as You</h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Give Echo a topic or idea. It generates content for any platform
                  that sounds exactly like you wrote it.
                </p>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">One idea becomes:</p>
                  <div className="flex flex-wrap gap-2">
                    {["LinkedIn", "Twitter", "Instagram", "Blog", "Email", "TikTok", "YouTube", "Newsletter"].map((platform, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Improvement Indicator */}
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-8 border border-gray-100">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">Your Voice Gets Stronger</h3>
                <p className="text-gray-600">Add 3+ new pieces of content and Echo automatically refreshes your voice profile.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#00D4FF]">3</p>
                  <p className="text-xs text-gray-500">samples</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#B794F6]">60%</p>
                  <p className="text-xs text-gray-500">confidence</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-[#FF6B9D]">10+</p>
                  <p className="text-xs text-gray-500">samples</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <div className="text-center">
                  <p className="text-3xl font-bold bg-gradient-to-r from-[#00D4FF] to-[#FF6B9D] bg-clip-text text-transparent">95%</p>
                  <p className="text-xs text-gray-500">confidence</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Input Methods - What You Can Upload */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#FAFAFA] to-white relative overflow-hidden" data-animate="true">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#1C1C1E]">
              Many Ways to Build Your Voice
            </h2>
            <p className="text-xl text-gray-600 font-light">
              Import from anywhere. Echo learns from everything.
            </p>
          </div>

          {/* Bento Grid of Input Methods */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { icon: <Upload className="w-8 h-8" />, label: "Upload Files", desc: "PDFs, Docs, Text", color: "from-[#00D4FF] to-[#0099CC]" },
              { icon: <Hash className="w-8 h-8" />, label: "Social Posts", desc: "Import from platforms", color: "from-[#B794F6] to-[#9F7AEA]" },
              { icon: <Video className="w-8 h-8" />, label: "Videos", desc: "YouTube, Loom, etc.", color: "from-[#FF6B9D] to-[#F56565]" },
              { icon: <Mail className="w-8 h-8" />, label: "Emails", desc: "Newsletters & more", color: "from-[#FFD93D] to-[#F6AD55]" },
              { icon: <MessageSquare className="w-8 h-8" />, label: "Voice Notes", desc: "Record or upload", color: "from-[#48BB78] to-[#38A169]", span: true },
              { icon: <FileText className="w-8 h-8" />, label: "Paste Text", desc: "Copy from anywhere", color: "from-[#667EEA] to-[#5A67D8]", span: true }
            ].map((item, i) => (
              <div
                key={i}
                className={`group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all ${item.span ? 'col-span-1 md:col-span-2' : ''}`}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-[#1C1C1E] mb-1">{item.label}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Social Import Highlight */}
          <div className="mt-12 bg-gradient-to-r from-[#00D4FF]/10 to-[#B794F6]/10 rounded-2xl p-8 border border-[#00D4FF]/20 max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex -space-x-3">
                {[
                  { icon: '📸', bg: 'from-pink-500 to-purple-600' },
                  { icon: '▶️', bg: 'from-red-500 to-red-600' },
                  { icon: 'in', bg: 'from-blue-600 to-blue-700' },
                  { icon: '𝕏', bg: 'from-gray-700 to-gray-900' }
                ].map((p, i) => (
                  <div key={i} className={`w-12 h-12 bg-gradient-to-br ${p.bg} rounded-xl flex items-center justify-center text-white font-bold shadow-lg border-2 border-white`}>
                    {p.icon}
                  </div>
                ))}
              </div>
              <div className="text-center md:text-left">
                <h3 className="font-bold text-[#1C1C1E] mb-1">Import Your Best Performing Content</h3>
                <p className="text-gray-600 text-sm">Connect Instagram, YouTube, or paste any URL. Echo learns from content that already resonates with your audience.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Outputs */}
      <section id="features" className="py-20 px-6 bg-white relative overflow-hidden" data-animate="true">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#1C1C1E]">
              One Idea. <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">Eight Platforms.</span>
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Every piece of content sounds like you wrote it - because Echo learned from you.
            </p>
          </div>

          {/* Platform Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
            {[
              { name: "LinkedIn", icon: "in", color: "from-blue-600 to-blue-700", desc: "Professional posts" },
              { name: "Twitter/X", icon: "𝕏", color: "from-gray-800 to-black", desc: "Threads & tweets" },
              { name: "Instagram", icon: "📸", color: "from-pink-500 to-purple-600", desc: "Captions & carousels" },
              { name: "TikTok", icon: "🎵", color: "from-pink-500 to-cyan-500", desc: "Video scripts" },
              { name: "YouTube", icon: "▶️", color: "from-red-500 to-red-600", desc: "Descriptions & scripts" },
              { name: "Blog", icon: "📝", color: "from-green-500 to-green-600", desc: "Long-form articles" },
              { name: "Email", icon: "📧", color: "from-purple-500 to-purple-600", desc: "Newsletters" },
              { name: "Video Scripts", icon: "🎬", color: "from-orange-500 to-orange-600", desc: "Talking points" }
            ].map((platform, i) => (
              <div key={i} className="group bg-gray-50 hover:bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
                <div className={`w-12 h-12 bg-gradient-to-br ${platform.color} rounded-xl flex items-center justify-center text-white text-lg mb-3 group-hover:scale-110 transition-transform`}>
                  {platform.icon}
                </div>
                <h3 className="font-bold text-[#1C1C1E] mb-1">{platform.name}</h3>
                <p className="text-xs text-gray-500">{platform.desc}</p>
              </div>
            ))}
          </div>

          {/* Voice Match Guarantee */}
          <div className="bg-gradient-to-r from-[#1C1C1E] to-[#2a2a2c] rounded-2xl p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-[#FFD93D]" />
              <h3 className="text-xl font-bold text-white">Voice Match Guarantee</h3>
              <Sparkles className="w-6 h-6 text-[#FFD93D]" />
            </div>
            <p className="text-white/80 max-w-xl mx-auto">
              Every piece of content is generated using your voice profile. No generic AI phrases.
              No corporate jargon. Just content that sounds like you.
            </p>
          </div>
        </div>
      </section>

      {/* Video Features - Condensed */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#FAFAFA] to-white relative overflow-hidden" data-animate="true">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Messaging */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B9D]/10 border border-[#FF6B9D]/20 rounded-full mb-6">
                <Video className="w-4 h-4 text-[#FF6B9D]" />
                <span className="text-[#FF6B9D] font-semibold text-sm">Video Feature</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-[#1C1C1E]">
                Got Video?
                <br />
                <span className="bg-gradient-to-r from-[#FF6B9D] to-[#FFD93D] bg-clip-text text-transparent">Get Everything.</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Upload any video - Zoom recordings, selfie videos, podcasts.
                Echo extracts the best moments and creates a full content kit.
              </p>
              <div className="space-y-4">
                {[
                  "AI identifies your most viral-worthy moments",
                  "Auto-generates captions in your style",
                  "Creates Instagram carousels from key points",
                  "Writes platform-specific posts from transcription"
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-[#FF6B9D] to-[#FFD93D] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Visual */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#FF6B9D]/20 to-[#FFD93D]/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl mb-4 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B9D] to-[#FFD93D] rounded-full flex items-center justify-center shadow-lg">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Your Video</span>
                  <span>12:34</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-[#00D4FF]/5 rounded-lg border border-[#00D4FF]/20">
                    <span className="text-sm font-medium text-[#1C1C1E]">5 Viral Clips Detected</span>
                    <span className="text-xs text-[#00D4FF] font-semibold">92% avg score</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-[#1C1C1E]">Full Transcription</span>
                    <span className="text-xs text-gray-500">2,847 words</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-[#1C1C1E]">Content Kit Ready</span>
                    <span className="text-xs text-gray-500">8 platforms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why EchoMe vs ChatGPT */}
      <section className="py-20 px-6 bg-white relative overflow-hidden" data-animate="true">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-[#1C1C1E]">
              Why EchoMe,
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">Not ChatGPT?</span>
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Generic AI tools give everyone the same output. EchoMe learns what makes you unique.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* ChatGPT Column */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-500">Generic AI Tools</h3>
              </div>
              <div className="space-y-4">
                {[
                  "Sounds like every other AI",
                  "Forgets your style each session",
                  "Same output for everyone",
                  "You prompt, it writes",
                  "Generic phrases and filler",
                  "No voice consistency"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* EchoMe Column */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF] to-[#B794F6] rounded-2xl blur-lg opacity-25 group-hover:opacity-50 transition-opacity" />
              <div className="relative bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-2xl p-8 text-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">EchoMe</h3>
                </div>
                <div className="space-y-4">
                  {[
                    "Sounds like YOU",
                    "Remembers everything about your voice",
                    "Personalized to your style",
                    "It learns, then writes",
                    "Your signature phrases",
                    "Consistent voice across all content"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-white/90">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#FAFAFA] to-white relative overflow-hidden" data-animate="true">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#1C1C1E]">
              Creators Who Sound Like
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent"> Themselves</span>
            </h2>
          </div>

          {/* Testimonial Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                quote: "I was skeptical, but after uploading 10 posts, Echo nailed my voice. Even my team couldn't tell the difference.",
                name: "Sarah K.",
                role: "Content Creator",
                avatar: "👩‍💼"
              },
              {
                quote: "Finally, AI content that doesn't sound like a robot wrote it. My LinkedIn engagement is up 3x since switching.",
                name: "Marcus T.",
                role: "Founder & CEO",
                avatar: "👨‍💻"
              },
              {
                quote: "I upload my podcast episodes and get a week's worth of content that actually sounds like me. Game changer.",
                name: "Jessica L.",
                role: "Podcast Host",
                avatar: "🎙️"
              }
            ].map((testimonial, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all">
                <div className="text-4xl mb-4">{testimonial.avatar}</div>
                <p className="text-gray-700 mb-4 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                <div>
                  <p className="font-bold text-[#1C1C1E]">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-r from-[#1C1C1E] to-[#2a2a2c] rounded-2xl p-8">
            <div className="flex flex-wrap justify-center gap-12 md:gap-20">
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                  <NumberCounter end={12847} />
                </p>
                <p className="text-white/60 text-sm mt-1">Unique Voices Learned</p>
              </div>
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent">
                  2.3M
                </p>
                <p className="text-white/60 text-sm mt-1">Pieces Generated</p>
              </div>
              <div className="text-center">
                <p className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#FF6B9D] to-[#FFD93D] bg-clip-text text-transparent">
                  <NumberCounter end={94} suffix="%" />
                </p>
                <p className="text-white/60 text-sm mt-1">Voice Match Satisfaction</p>
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
                    <span className="text-3xl">🎯</span>
                  </div>
                  <h3 className="text-3xl font-extrabold text-[#1C1C1E] mb-3">Echo</h3>
                  <p className="text-sm font-light text-stone-600 mb-6 leading-relaxed">Build your voice profile + create content that sounds like you</p>
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
                      'Build your voice profile',
                      '100 generations/month',
                      'All 8 content platforms',
                      'Voice learning from uploads',
                      'Video clip extraction (5/video)',
                      'Caption generation',
                      '1080p export quality',
                      'Import from social platforms'
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
                  <p className="text-sm font-light text-white/90 mb-6 leading-relaxed">Advanced voice learning, priority processing, unlimited style customization.</p>
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
                      'Everything in Echo, plus:',
                      '500 generations/month',
                      'Priority voice analysis',
                      'Unlimited clips per video',
                      'Advanced style customization',
                      'Custom caption presets',
                      '4K export quality',
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

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#00D4FF] via-[#0099CC] to-[#00D4FF] text-white relative overflow-hidden" data-animate="true">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-[#B794F6]/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-[#FF6B9D]/30 to-transparent rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
            Ready to Sound Like
            <br />
            <span className="text-white/90">Yourself?</span>
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-8 font-light max-w-2xl mx-auto">
            The more you share, the better Echo knows you.
            Start with a free trial - no credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-[#00D4FF] rounded-2xl font-bold text-lg shadow-2xl hover:shadow-xl hover:scale-105 transition-all group"
          >
            Start Building Your Voice
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
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
                AI content that sounds like you. Learn once, create forever.
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
