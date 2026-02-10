'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Play, Check, ArrowRight, MessageSquare, Video, FileText, Sparkles, Brain, XCircle, Upload, Hash, Mail } from 'lucide-react';
import { NumberCounter } from '@/components/shared/NumberCounter';

export default function HomeContent() {
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
              <Image src="/media/echome-logo.svg" alt="Echo, your Agentic content assistant" width={40} height={40} className="object-contain transition-transform group-hover:scale-110" />
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

      {/* Hero Section - Video First */}
      <section className="min-h-screen flex items-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#1C1C1E] to-gray-900" />

        {/* Animated video frame effect */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="relative w-[600px] h-[400px] border-4 border-white/20 rounded-2xl">
            <div className="absolute inset-0 flex items-end gap-1 p-8">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-[#00D4FF] to-[#B794F6] rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.sin(i * 0.3) * 60 + Math.random() * 40}%`,
                    animationDelay: `${i * 50}ms`,
                    animationDuration: `${1000 + Math.random() * 500}ms`
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto py-20 w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Video-First Messaging */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur
                              border border-white/20 rounded-full mb-8 animate-fade-in">
                <Video className="w-4 h-4 text-[#FF6B9D]" />
                <span className="text-white/90 font-medium text-sm">Video-First Content Platform</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.1]">
                <span className="text-white">One Video.</span>
                <br />
                <span className="text-white">One Week of </span>
                <span className="bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D]
                               bg-clip-text text-transparent">
                  Content.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-gray-300 mb-4 font-light leading-relaxed max-w-xl mx-auto lg:mx-0">
                All in your authentic voice.
              </p>
              <p className="text-lg md:text-xl text-white/90 mb-8 font-medium max-w-xl mx-auto lg:mx-0">
                Upload any video and Echo transforms it into clips, carousels, posts, and emails -
                all matching your unique voice through our Knowledge Base system.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-10">
                <Link
                  href="/auth/signup"
                  className="px-8 py-4 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white
                             rounded-xl font-bold hover:shadow-2xl hover:shadow-[#00D4FF]/25 hover:scale-105 transition-all
                             shadow-lg text-lg flex items-center gap-2 group"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/examples"
                  className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20
                             text-white rounded-xl font-bold hover:bg-white/20 transition-all
                             text-lg flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  See It Work
                </Link>
              </div>

              {/* Social Proof - Video focused */}
              <div className="flex items-center justify-center lg:justify-start gap-6 text-white/70">
                <div className="text-center lg:text-left">
                  <p className="text-2xl font-bold text-white"><NumberCounter end={47} /></p>
                  <p className="text-xs">Avg. Content Pieces</p>
                  <p className="text-xs text-white/50">per video</p>
                </div>
                <div className="w-px h-12 bg-white/20" />
                <div className="text-center lg:text-left">
                  <p className="text-2xl font-bold text-white"><NumberCounter end={94} suffix="%" /></p>
                  <p className="text-xs">Voice Match</p>
                  <p className="text-xs text-white/50">accuracy</p>
                </div>
                <div className="w-px h-12 bg-white/20" />
                <div className="text-center lg:text-left">
                  <p className="text-2xl font-bold text-white"><NumberCounter end={8} /></p>
                  <p className="text-xs">Platforms</p>
                  <p className="text-xs text-white/50">supported</p>
                </div>
              </div>
            </div>

            {/* Right Column - Video to Content Kit Transformation */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-[#FF6B9D]/20 via-[#B794F6]/20 to-[#00D4FF]/20 rounded-3xl blur-2xl" />

              {/* Content Kit Preview */}
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                {/* Video Input */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B9D] to-[#FFD93D] rounded-lg flex items-center justify-center">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-white font-semibold">Your Video</p>
                    <span className="ml-auto text-white/50 text-sm">12:34</span>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <Image
                      src="/showcase/video-thumbnail.png"
                      alt="Video content example"
                      fill
                      className="object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center relative z-10">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center my-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-full flex items-center justify-center animate-bounce">
                    <ArrowRight className="w-5 h-5 text-white rotate-90" />
                  </div>
                </div>

                {/* Content Kit Output */}
                <div className="space-y-3">
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Your Content Kit</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-[#FF6B9D]/10 border border-[#FF6B9D]/30 rounded-lg">
                      <p className="text-[#FF6B9D] text-xs font-bold mb-1">5 Captioned Reels</p>
                      <p className="text-white/50 text-xs">Ready to post</p>
                    </div>
                    <div className="p-3 bg-[#B794F6]/10 border border-[#B794F6]/30 rounded-lg">
                      <p className="text-[#B794F6] text-xs font-bold mb-1">3 Carousels</p>
                      <p className="text-white/50 text-xs">Designed & branded</p>
                    </div>
                    <div className="p-3 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-lg">
                      <p className="text-[#00D4FF] text-xs font-bold mb-1">8 Social Posts</p>
                      <p className="text-white/50 text-xs">Platform-optimized</p>
                    </div>
                    <div className="p-3 bg-[#FFD93D]/10 border border-[#FFD93D]/30 rounded-lg">
                      <p className="text-[#FFD93D] text-xs font-bold mb-1">1 Newsletter</p>
                      <p className="text-white/50 text-xs">Long-form email</p>
                    </div>
                  </div>

                  {/* Voice Match Badge */}
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Check className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-green-400 text-sm font-bold">94% Voice Match</p>
                      <p className="text-white/50 text-xs">Powered by your Knowledge Base</p>
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -top-3 -right-3 px-4 py-2 bg-gradient-to-br from-[#FFD93D] to-[#FF6B9D] rounded-xl shadow-lg transform rotate-6">
                  <span className="text-white text-sm font-bold">47 pieces</span>
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

      {/* Knowledge Base - The Core */}
      <section className="py-24 px-6 bg-gradient-to-br from-[#1C1C1E] via-[#2a2a2c] to-[#1C1C1E] relative overflow-hidden" data-animate="true">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-[#00D4FF]/10 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tr from-[#B794F6]/10 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B794F6]/20 border border-[#B794F6]/30 rounded-full mb-6">
              <Brain className="w-4 h-4 text-[#B794F6]" />
              <span className="text-[#B794F6] font-semibold text-sm">The Foundation</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-white">
              Your Voice Lives in Your
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">Knowledge Base</span>
            </h2>
            <p className="text-xl text-white/70 font-light max-w-2xl mx-auto">
              The Knowledge Base is the brain behind Echo. Every upload teaches it.
              Every output reflects it. Your voice gets stronger with every piece of content.
            </p>
          </div>

          {/* Knowledge Base Visual */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Flow Diagram */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#00D4FF]/10 to-[#B794F6]/10 rounded-3xl blur-2xl" />

              <div className="relative space-y-4">
                {/* Inputs flowing in */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    {[
                      { icon: <Video className="w-4 h-4" />, label: "Videos", color: "from-[#FF6B9D] to-[#FFD93D]" },
                      { icon: <FileText className="w-4 h-4" />, label: "Documents", color: "from-[#00D4FF] to-[#0099CC]" },
                      { icon: <MessageSquare className="w-4 h-4" />, label: "Social Posts", color: "from-[#B794F6] to-[#9F7AEA]" },
                      { icon: <Mail className="w-4 h-4" />, label: "Emails", color: "from-[#48BB78] to-[#38A169]" },
                    ].map((input, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur border border-white/10 rounded-xl">
                        <div className={`w-8 h-8 bg-gradient-to-br ${input.color} rounded-lg flex items-center justify-center text-white`}>
                          {input.icon}
                        </div>
                        <span className="text-white/80 text-sm font-medium">{input.label}</span>
                        <ArrowRight className="w-4 h-4 text-white/30 ml-auto" />
                      </div>
                    ))}
                  </div>

                  {/* Knowledge Base Center */}
                  <div className="relative">
                    <div className="w-32 h-32 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#00D4FF]/20">
                      <div className="text-center">
                        <Brain className="w-10 h-10 text-white mx-auto mb-1" />
                        <p className="text-white text-xs font-bold">Knowledge</p>
                        <p className="text-white text-xs font-bold">Base</p>
                      </div>
                    </div>
                    {/* Pulse effect */}
                    <div className="absolute -inset-2 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-2xl animate-pulse opacity-20" />
                  </div>

                  {/* Outputs flowing out */}
                  <div className="flex-1 space-y-2">
                    {[
                      { label: "LinkedIn", icon: "in" },
                      { label: "Twitter/X", icon: "𝕏" },
                      { label: "Instagram", icon: "📸" },
                      { label: "Newsletter", icon: "📧" },
                    ].map((output, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur border border-white/10 rounded-xl">
                        <ArrowRight className="w-4 h-4 text-white/30" />
                        <span className="text-white/80 text-sm font-medium flex-1">{output.label}</span>
                        <span className="text-lg">{output.icon}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Voice Profile Card */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#B794F6]/20 to-[#FF6B9D]/20 rounded-3xl blur-2xl" />

              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Echo Learns From You</p>
                      <p className="text-white/50 text-sm">Getting smarter every day</p>
                    </div>
                  </div>
                </div>

                {/* What Echo Learns */}
                <div className="space-y-4">
                  <div className="p-4 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-xl">
                    <p className="text-[#00D4FF] text-xs font-bold uppercase tracking-wider mb-2">Signature Phrases Detected</p>
                    <div className="flex flex-wrap gap-2">
                      {["Here's the thing...", "Let me tell you", "The secret is"].map((phrase, i) => (
                        <span key={i} className="px-2 py-1 bg-[#00D4FF]/20 rounded text-white/80 text-xs">
                          &quot;{phrase}&quot;
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-[#B794F6]/10 border border-[#B794F6]/30 rounded-xl">
                    <p className="text-[#B794F6] text-xs font-bold uppercase tracking-wider mb-2">Your Communication Style</p>
                    <div className="flex flex-wrap gap-2">
                      {["Conversational", "Direct", "Encouraging", "Story-driven"].map((style, i) => (
                        <span key={i} className="px-2 py-1 bg-[#B794F6]/20 rounded text-white/80 text-xs">
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-2">Words You Never Use</p>
                    <div className="flex flex-wrap gap-2">
                      {["leverage", "synergy", "utilize", "circle back"].map((word, i) => (
                        <span key={i} className="px-2 py-1 bg-red-500/20 rounded text-red-400/80 text-xs line-through">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Confidence Meter */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-sm">Voice Confidence</span>
                    <span className="text-[#00D4FF] font-bold">94%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#00D4FF] to-[#B794F6] rounded-full" style={{ width: '94%' }} />
                  </div>
                  <p className="text-white/40 text-xs mt-2">Based on 47 content samples</p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Message */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-[#00D4FF]/20 to-[#B794F6]/20 border border-[#00D4FF]/30 rounded-2xl">
              <div className="text-left">
                <p className="text-white font-bold">This isn&apos;t session-based learning that forgets.</p>
                <p className="text-white/60 text-sm">Your Knowledge Base remembers everything, forever. The more you feed it, the better Echo knows you.</p>
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
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B9D]/10 border border-[#FF6B9D]/20 rounded-full mb-6">
              <Video className="w-4 h-4 text-[#FF6B9D]" />
              <span className="text-[#FF6B9D] font-semibold text-sm">How It Works</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-[#1C1C1E]">
              Video In.
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent"> Content Kit Out.</span>
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Upload once. Echo extracts highlights, generates platform-native content, and matches your voice automatically.
            </p>
          </div>

          {/* 4-Step Pipeline */}
          <div className="grid md:grid-cols-4 gap-6 mb-20">
            {/* Step 1: Upload */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FF6B9D]/20 to-[#FFD93D]/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B9D] to-[#FFD93D] rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                    1
                  </div>
                  <h3 className="text-lg font-bold text-[#1C1C1E]">Upload Video</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  Drop in any video - YouTube links, Zoom recordings, selfie videos, podcasts.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["YouTube", "Loom", "Upload"].map((source, i) => (
                    <span key={i} className="px-2 py-1 bg-[#FF6B9D]/10 text-[#FF6B9D] rounded text-xs font-medium">
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: AI Extracts */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#B794F6]/20 to-[#00D4FF]/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#B794F6] to-[#9F7AEA] rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                    2
                  </div>
                  <h3 className="text-lg font-bold text-[#1C1C1E]">AI Extracts</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  Echo identifies your most viral-worthy moments and key talking points.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Check className="w-3 h-3 text-[#B794F6]" />
                    <span>Highlight detection</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Check className="w-3 h-3 text-[#B794F6]" />
                    <span>Full transcription</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Check className="w-3 h-3 text-[#B794F6]" />
                    <span>Clip scoring</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Voice Match */}
            <div className="relative group md:-mt-4">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF]/30 to-[#B794F6]/30 rounded-3xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all h-full text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center font-bold">
                    3
                  </div>
                  <h3 className="text-lg font-bold">Voice Match</h3>
                </div>
                <p className="text-white/90 text-sm mb-4 leading-relaxed">
                  Your Knowledge Base ensures every piece sounds authentically you.
                </p>
                <div className="bg-white/10 backdrop-blur rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/70">Match Score</span>
                    <span className="text-sm font-bold">94%</span>
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: '94%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Content Kit */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD93D]/20 to-[#48BB78]/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#FFD93D] to-[#48BB78] rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                    4
                  </div>
                  <h3 className="text-lg font-bold text-[#1C1C1E]">Content Kit</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  Get clips, carousels, posts, and emails - ready to publish.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Clips", count: "5" },
                    { label: "Posts", count: "8" },
                    { label: "Carousels", count: "3" },
                    { label: "Emails", count: "1" },
                  ].map((item, i) => (
                    <div key={i} className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-[#1C1C1E]">{item.count}</p>
                      <p className="text-xs text-gray-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Time Savings */}
          <div className="bg-gradient-to-r from-[#1C1C1E] to-[#2a2a2c] rounded-2xl p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold text-white mb-2">From Hours to Minutes</h3>
                <p className="text-white/60">What used to take 10+ hours now happens automatically.</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-400 line-through">10hrs</p>
                  <p className="text-xs text-white/50">Manual work</p>
                </div>
                <ArrowRight className="w-6 h-6 text-[#00D4FF]" />
                <div className="text-center">
                  <p className="text-3xl font-bold bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">5min</p>
                  <p className="text-xs text-white/50">With Echo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* No Video? No Problem - Secondary Input Methods */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#FAFAFA] to-white relative overflow-hidden" data-animate="true">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-full mb-6">
              <FileText className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-[#00D4FF] font-semibold text-sm">Multiple Entry Points</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#1C1C1E]">
              No Video? <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">No Problem.</span>
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Start with whatever you have. Paste a link. Drop a document. Import your best posts.
              Echo learns from everything and adds it to your Knowledge Base.
            </p>
          </div>

          {/* Simple Input Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {/* Paste Links */}
            <div className="group relative bg-white rounded-2xl p-8 border border-gray-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Hash className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">Paste Any Link</h3>
              <p className="text-gray-600 mb-4">YouTube, blog posts, tweets, articles - just paste the URL and Echo extracts your content.</p>
              <div className="flex flex-wrap gap-2">
                {["YouTube", "Twitter", "Blog", "Article"].map((type, i) => (
                  <span key={i} className="px-2 py-1 bg-[#00D4FF]/10 text-[#00D4FF] rounded text-xs font-medium">
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {/* Drop Documents */}
            <div className="group relative bg-white rounded-2xl p-8 border border-gray-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-[#B794F6] to-[#9F7AEA] rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">Drop Documents</h3>
              <p className="text-gray-600 mb-4">PDFs, Word docs, text files - upload your existing content and Echo learns your writing style.</p>
              <div className="flex flex-wrap gap-2">
                {["PDF", "DOCX", "TXT", "MD"].map((type, i) => (
                  <span key={i} className="px-2 py-1 bg-[#B794F6]/10 text-[#B794F6] rounded text-xs font-medium">
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {/* Import Emails */}
            <div className="group relative bg-white rounded-2xl p-8 border border-gray-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B9D] to-[#F56565] rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">Import Emails</h3>
              <p className="text-gray-600 mb-4">Connect your email and Echo learns from your newsletters and customer communications.</p>
              <div className="flex flex-wrap gap-2">
                {["Gmail", "Newsletter", "Sent Items"].map((type, i) => (
                  <span key={i} className="px-2 py-1 bg-[#FF6B9D]/10 text-[#FF6B9D] rounded text-xs font-medium">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Everything Feeds KB */}
          <div className="bg-gradient-to-r from-[#00D4FF]/10 to-[#B794F6]/10 rounded-2xl p-8 border border-[#00D4FF]/20 max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-2xl flex items-center justify-center flex-shrink-0">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="font-bold text-[#1C1C1E] mb-1">Everything Feeds Your Knowledge Base</h3>
                <p className="text-gray-600 text-sm">Whether you start with video, documents, or social posts - it all goes into your Knowledge Base. The more you feed Echo, the better it knows your voice.</p>
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
              Every piece of content is generated using your voice profile. No generic phrases.
              No corporate jargon. Just content that sounds like you.
            </p>
          </div>
        </div>
      </section>

      {/* Reels Maker - Visual Content Creation */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#FF6B9D]/5 via-[#B794F6]/5 to-[#00D4FF]/5 relative overflow-hidden" data-animate="true">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#FF6B9D]/10 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#B794F6]/10 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Reel Preview */}
            <div className="relative order-2 md:order-1">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#FF6B9D]/20 via-[#B794F6]/20 to-[#00D4FF]/20 rounded-3xl blur-2xl" />

              {/* Phone Frame with Reel */}
              <div className="relative mx-auto w-[280px]">
                <div className="bg-[#1C1C1E] rounded-[3rem] p-3 shadow-2xl">
                  <div className="bg-black rounded-[2.5rem] overflow-hidden aspect-[9/16] relative">
                    {/* Reel Content - Real thumbnail with gradient fallback */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B9D] via-[#B794F6] to-[#00D4FF]" />
                    <Image
                      src="/showcase/reel-background.png"
                      alt="Reel content example"
                      fill
                      className="object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    {/* Play indicator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>

                    {/* Captions */}
                    <div className="absolute bottom-20 left-4 right-4">
                      <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
                        <p className="text-white text-sm font-medium leading-relaxed">
                          &quot;Here&apos;s the thing about content creation...
                          <span className="bg-[#00D4FF] px-1 rounded">most people</span> overthink it.&quot;
                        </p>
                      </div>
                    </div>

                    {/* Social UI elements */}
                    <div className="absolute right-3 bottom-32 flex flex-col items-center gap-4">
                      {[
                        { icon: "❤️", count: "12.4K" },
                        { icon: "💬", count: "847" },
                        { icon: "↗️", count: "2.1K" },
                      ].map((action, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <span className="text-2xl">{action.icon}</span>
                          <span className="text-white text-xs font-medium">{action.count}</span>
                        </div>
                      ))}
                    </div>

                    {/* Profile */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-full" />
                      <span className="text-white text-sm font-semibold">@yourhandle</span>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 px-4 py-2 bg-gradient-to-r from-[#00D4FF] to-[#B794F6] rounded-xl shadow-lg transform rotate-6">
                  <span className="text-white text-sm font-bold">Auto-Captioned</span>
                </div>
                <div className="absolute -bottom-4 -left-4 px-4 py-2 bg-gradient-to-r from-[#FF6B9D] to-[#FFD93D] rounded-xl shadow-lg transform -rotate-6">
                  <span className="text-white text-sm font-bold">Ready to Post</span>
                </div>
              </div>
            </div>

            {/* Right - Messaging */}
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B9D]/10 border border-[#FF6B9D]/20 rounded-full mb-6">
                <Video className="w-4 h-4 text-[#FF6B9D]" />
                <span className="text-[#FF6B9D] font-semibold text-sm">Reels Maker</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-[#1C1C1E]">
                Not Just Copy.
                <br />
                <span className="bg-gradient-to-r from-[#FF6B9D] to-[#B794F6] bg-clip-text text-transparent">Ready-to-Post Reels.</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Echo doesn&apos;t just write captions - it creates complete, captioned video reels
                you can post directly to Instagram, TikTok, and YouTube Shorts.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { title: "AI Clip Selection", desc: "Automatically identifies your most engaging moments" },
                  { title: "Smart Captions", desc: "Word-by-word animated captions that match your speaking" },
                  { title: "Template Library", desc: "Before/after, tutorials, hooks - pick your format" },
                  { title: "One-Click Export", desc: "9:16 vertical video, ready for every platform" }
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-[#FF6B9D] to-[#B794F6] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-[#1C1C1E] font-semibold">{feature.title}</span>
                      <p className="text-gray-500 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Output formats */}
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Export formats</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "Instagram Reels", icon: "📸" },
                    { name: "TikTok", icon: "🎵" },
                    { name: "YouTube Shorts", icon: "▶️" },
                    { name: "Stories", icon: "⏱️" }
                  ].map((format, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-700">
                      <span>{format.icon}</span>
                      {format.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Carousel Preview */}
          <div className="mt-20">
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-black text-[#1C1C1E] mb-2">
                Carousels Too. With Real Visuals.
              </h3>
              <p className="text-gray-600">
                Not just text slides - actual designed carousels with your branding, ready to post.
              </p>
            </div>

            {/* Carousel slides preview - uses real images if available */}
            <div className="flex justify-center gap-4 overflow-x-auto pb-4">
              {[1, 2, 3, 4].map((slideNum) => (
                <div key={slideNum} className="flex-shrink-0 w-48">
                  <div className="aspect-square rounded-2xl shadow-lg overflow-hidden relative bg-gradient-to-br from-[#FF6B9D] to-[#B794F6]">
                    <Image
                      src={`/showcase/carousel-${slideNum}.png`}
                      alt={`Carousel slide ${slideNum}`}
                      fill
                      className="object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Echo Voice Matching - The Differentiator */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#FAFAFA] to-white relative overflow-hidden" data-animate="true">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Messaging */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-[#00D4FF]" />
                <span className="text-[#00D4FF] font-semibold text-sm">Echo Voice Matching</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-[#1C1C1E]">
                Not Just AI.
                <br />
                <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">Your AI.</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Echo doesn&apos;t just generate content - it matches your voice with 94% accuracy.
                Here&apos;s exactly what makes your content sound like you:
              </p>
              <div className="space-y-4">
                {[
                  { title: "Signature Phrase Detection", desc: "Echo identifies the phrases you use repeatedly and incorporates them naturally" },
                  { title: "Tone & Energy Matching", desc: "Conversational? Authoritative? Echo matches your unique communication energy" },
                  { title: "Avoidance Patterns", desc: "Words you never use stay out of your content - no 'leverage' or 'synergy' if that's not you" },
                  { title: "Storytelling Style", desc: "Whether you lead with data or anecdotes, Echo mirrors your approach" }
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-[#1C1C1E] font-semibold">{feature.title}</span>
                      <p className="text-gray-500 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Voice Profile Visual */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#00D4FF]/20 to-[#B794F6]/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                {/* Voice Profile Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1C1C1E]">Your Voice Profile</p>
                      <p className="text-gray-500 text-sm">Based on 47 samples</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#00D4FF]">94%</p>
                    <p className="text-xs text-gray-500">Match Rate</p>
                  </div>
                </div>

                {/* Detected Patterns */}
                <div className="space-y-4">
                  <div className="p-4 bg-[#00D4FF]/5 border border-[#00D4FF]/20 rounded-xl">
                    <p className="text-xs text-[#00D4FF] font-bold uppercase tracking-wider mb-2">23 Signature Phrases</p>
                    <div className="flex flex-wrap gap-2">
                      {["Here's the thing...", "Let me tell you", "The secret is"].map((phrase, i) => (
                        <span key={i} className="px-2 py-1 bg-[#00D4FF]/10 rounded text-[#00D4FF] text-xs font-medium">
                          &quot;{phrase}&quot;
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-[#B794F6]/5 border border-[#B794F6]/20 rounded-xl">
                    <p className="text-xs text-[#B794F6] font-bold uppercase tracking-wider mb-2">Your Tone</p>
                    <div className="flex flex-wrap gap-2">
                      {["Conversational", "Direct", "Encouraging"].map((tone, i) => (
                        <span key={i} className="px-2 py-1 bg-[#B794F6]/10 rounded text-[#B794F6] text-xs font-medium">
                          {tone}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-2">Words You Never Use</p>
                    <div className="flex flex-wrap gap-2">
                      {["leverage", "synergy", "circle back", "utilize"].map((word, i) => (
                        <span key={i} className="px-2 py-1 bg-red-100 rounded text-red-400 text-xs font-medium line-through">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -top-3 -right-3 px-4 py-2 bg-gradient-to-br from-[#FFD93D] to-[#FF6B9D] rounded-xl shadow-lg transform rotate-6">
                  <span className="text-white text-sm font-bold">Unique to You</span>
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
              Generic tools give everyone the same output. EchoMe learns what makes you unique.
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

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
            {/* Echo - $29 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00D4FF]/20 to-[#B794F6]/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-stone-200 p-6 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#1C1C1E] mb-2">Echo</h3>
                  <p className="text-xs font-light text-stone-600 mb-4 leading-relaxed">For creators getting started with Agentic content</p>
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-[#00D4FF] to-[#0099CC] bg-clip-text text-transparent">
                        ${billingPeriod === 'monthly' ? '29' : '290'}
                      </span>
                      <span className="text-sm font-light text-stone-500">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-gradient-to-r from-[#00D4FF]/10 to-[#0099CC]/10 border border-[#00D4FF]/30 rounded-lg px-2 py-0.5">
                        <p className="text-[10px] font-semibold text-[#00D4FF]">2 months free</p>
                      </div>
                    )}
                  </div>
                  <div className="mb-4 inline-block bg-gradient-to-r from-[#FFD93D]/20 to-[#FF6B9D]/20 border border-[#FFD93D]/40 rounded-lg px-2 py-1">
                    <p className="text-[10px] font-bold text-[#FF6B9D]">7-Day Free Trial</p>
                  </div>
                  <Link href="/auth/signup?plan=echo" className="relative w-full px-4 py-3 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 block text-center text-sm">
                    Start Free Trial
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-stone-200">
                    {[
                      '2 hours of video processing',
                      '5 clips per video',
                      '1 Knowledge Base (your voice profile)',
                      '3 Creator Radar slots',
                      'Standard carousel templates',
                      '1080p exports',
                      'Manual document upload only'
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-medium text-stone-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Echo Studio - $49 - Popular */}
            <div className="relative md:-mt-6 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD93D] via-[#FF6B9D] to-[#B794F6] rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 animate-pulse transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-[#00D4FF] via-[#0099CC] to-[#00D4FF] rounded-3xl p-6 flex flex-col shadow-2xl hover:shadow-[0_30px_60px_-15px_rgba(0,212,255,0.5)] hover:-translate-y-2 transition-all duration-300 h-full">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FFD93D] to-[#FF6B9D] text-white text-[10px] font-extrabold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                  <span className="text-sm">⭐</span> MOST POPULAR
                </div>
                <div className="mb-6 mt-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <span className="text-2xl">🎬</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-white mb-2">Echo Studio</h3>
                  <p className="text-xs font-light text-white/90 mb-4 leading-relaxed">For professional creators and small content teams</p>
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white drop-shadow-lg">
                        ${billingPeriod === 'monthly' ? '49' : '490'}
                      </span>
                      <span className="text-sm font-light text-white/80">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-2 py-0.5">
                        <p className="text-[10px] font-semibold text-white">2 months free</p>
                      </div>
                    )}
                  </div>
                  <div className="mb-4 inline-block bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-2 py-1">
                    <p className="text-[10px] font-bold text-white">7-Day Free Trial</p>
                  </div>
                  <Link href="/auth/signup?plan=echo-studio" className="relative w-full px-4 py-3 bg-gradient-to-r from-[#1C1C1E] to-[#2a2a2c] text-white rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white/20 block text-center text-sm">
                    Start Free Trial
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-white/30">
                    {[
                      '5 hours of video processing',
                      '10 clips per video',
                      '3 Knowledge Bases (multiple voices)',
                      '10 Creator Radar slots',
                      'All templates + custom colors',
                      '1080p exports',
                      'Email import (50 emails)',
                      'Priority processing queue'
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-medium text-white">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Echo Pro - $99 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#B794F6]/30 to-[#FF6B9D]/30 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-[#B794F6]/40 p-6 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#B794F6] to-[#FF6B9D] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <span className="text-2xl">💎</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#1C1C1E] mb-2">Echo Pro</h3>
                  <p className="text-xs font-light text-stone-600 mb-4 leading-relaxed">For agencies and power users who need unlimited capacity</p>
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent">
                        ${billingPeriod === 'monthly' ? '99' : '990'}
                      </span>
                      <span className="text-sm font-light text-stone-500">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-gradient-to-r from-[#B794F6]/10 to-[#FF6B9D]/10 border border-[#B794F6]/30 rounded-lg px-2 py-0.5">
                        <p className="text-[10px] font-semibold text-[#B794F6]">2 months free</p>
                      </div>
                    )}
                  </div>
                  <div className="mb-4 inline-block bg-gradient-to-r from-[#B794F6]/20 to-[#FF6B9D]/20 border border-[#B794F6]/40 rounded-lg px-2 py-1">
                    <p className="text-[10px] font-bold text-[#B794F6]">7-Day Free Trial</p>
                  </div>
                  <Link href="/auth/signup?plan=echo-pro" className="relative w-full px-4 py-3 bg-gradient-to-r from-[#B794F6] to-[#FF6B9D] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 block text-center text-sm">
                    Start Free Trial
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-stone-200">
                    {[
                      'Unlimited video processing',
                      '15 clips per video',
                      'Unlimited Knowledge Bases (team voices)',
                      'Unlimited Creator Radar',
                      'Custom carousel design system',
                      '1080p exports',
                      'Email import (100 emails)',
                      'Priority processing queue',
                      'Priority support'
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#B794F6] to-[#FF6B9D] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-medium text-stone-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise CTA */}
          <div className="max-w-3xl mx-auto text-center mt-12 p-8 bg-gradient-to-r from-[#1C1C1E] to-[#2a2a2c] rounded-3xl">
            <h3 className="text-2xl font-bold text-white mb-2">Need Enterprise Features?</h3>
            <p className="text-white/70 mb-4 text-sm">API access, 4K exports, team collaboration, white-label options, and custom integrations.</p>
            <a href="mailto:enterprise@tryechome.com" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1C1C1E] rounded-xl font-bold hover:bg-gray-100 transition-all">
              <Mail className="w-4 h-4" />
              Contact Sales
            </a>
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
                    { text: 'Generic tools forget your context', emoji: '😵' },
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
            One Video.
            <br />
            <span className="text-white/90">Endless Content.</span>
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-8 font-light max-w-2xl mx-auto">
            Upload your first video and watch Echo transform it into a week&apos;s worth of content -
            all in your authentic voice. Start free, no credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-[#00D4FF] rounded-2xl font-bold text-lg shadow-2xl hover:shadow-xl hover:scale-105 transition-all group"
          >
            Start Your Free Trial
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
                  <Image src="/media/echome-logo.svg" alt="Echo, your Agentic content assistant" width={48} height={48} className="relative object-contain" />
                </div>
                <span className="text-2xl font-extrabold bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                  EchoMe
                </span>
              </div>
              <p className="text-white/80 font-light text-lg leading-relaxed mb-6">
                Video-first content platform. One video becomes a week of content, all in your voice.
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
                <li><Link href="/affiliates" className="hover:text-[#B794F6] transition-colors duration-200">Affiliates</Link></li>
                <li><Link href="/privacy" className="hover:text-[#B794F6] transition-colors duration-200">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[#B794F6] transition-colors duration-200">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="relative h-px mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          <div className="text-center text-white/60 text-sm font-light flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <Image src="/media/echo-mini.svg" alt="" aria-hidden="true" width={20} height={20} className="echo-wave-hover inline-block" />
              <span>© 2025–2026 EchoMe. All rights reserved.</span>
            </div>
            <span className="text-white/50">
              EchoMe is a <a href="https://bottlenecklabs.ai" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-[#B794F6] transition-colors duration-200">BottleneckLabs.ai</a> company
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
