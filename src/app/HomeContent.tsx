'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Check, Mail } from 'lucide-react';
import { HelpWidget } from '@/components/help-widget';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { KnowledgeBaseSection } from '@/components/landing/KnowledgeBaseSection';
import { CreatorRadarSection } from '@/components/landing/CreatorRadarSection';
import { OutputShowcase } from '@/components/landing/OutputShowcase';
import { NotChatGPTSection } from '@/components/landing/NotChatGPTSection';

export default function HomeContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1C1C1E]">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg' : 'bg-gray-900/50 backdrop-blur-md border-b border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <Image src="/media/echome-logo.svg" alt="Echo, your Agentic content assistant" width={40} height={40} className="object-contain transition-transform group-hover:scale-110" />
              <span className={`text-xl font-bold tracking-tight transition-colors ${scrolled ? 'text-[#1C1C1E]' : 'text-white'}`}>EchoMe</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#how" className={`transition font-medium ${scrolled ? 'text-[#1C1C1E] hover:text-[#00D4FF]' : 'text-white hover:text-[#00D4FF]'}`}>How It Works</a>
              <a href="#output-showcase" className={`transition font-medium ${scrolled ? 'text-[#1C1C1E] hover:text-[#00D4FF]' : 'text-white hover:text-[#00D4FF]'}`}>Examples</a>
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
                Try Free
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
                <a href="#how" className="text-[#1C1C1E] hover:text-[#00D4FF] transition font-medium">How It Works</a>
                <a href="#output-showcase" className="text-[#1C1C1E] hover:text-[#00D4FF] transition font-medium">Examples</a>
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
                  Try Free
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <HeroSection />

      {/* How It Works */}
      <HowItWorks />

      {/* Knowledge Base */}
      <KnowledgeBaseSection />

      {/* Creator Radar */}
      <CreatorRadarSection />

      {/* Output Showcase */}
      <OutputShowcase />

      {/* Not ChatGPT */}
      <NotChatGPTSection />

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gradient-to-br from-[#FAFAFA] to-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#00D4FF]/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#B794F6]/5 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight text-[#1C1C1E] leading-tight">
              Choose Your
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">Plan</span>
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Start with 2 free generations — no credit card required.
              <br />
              <span className="text-base">Then choose a plan that works with your creative rhythm.</span>
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
                  <h3 className="text-2xl font-extrabold text-[#1C1C1E] mb-2">Echo</h3>
                  <p className="text-xs font-light text-stone-600 mb-4 leading-relaxed">For creators with growing video libraries</p>
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
                  <Link href="/auth/signup?plan=echo" className="relative w-full px-4 py-3 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 block text-center text-sm">
                    Get Started
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
                        <span className="text-sm font-medium text-stone-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Echo Studio - $49 - Popular */}
            <div className="relative md:-mt-6 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF] to-[#B794F6] rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-[#00D4FF] via-[#0099CC] to-[#00D4FF] rounded-3xl p-6 flex flex-col shadow-2xl hover:shadow-[0_30px_60px_-15px_rgba(0,212,255,0.5)] hover:-translate-y-2 transition-all duration-300 h-full">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-lg">
                  MOST POPULAR
                </div>
                <div className="mb-6 mt-3">
                  <h3 className="text-2xl font-extrabold text-white mb-2">Echo Studio</h3>
                  <p className="text-xs font-light text-white/90 mb-4 leading-relaxed">For video creators proliferating content at scale</p>
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
                  <Link href="/auth/signup?plan=echo-studio" className="relative w-full px-4 py-3 bg-gradient-to-r from-[#1C1C1E] to-[#2a2a2c] text-white rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white/20 block text-center text-sm">
                    Get Started
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-white/30">
                    {[
                      'Up to 5 hours of video processing',
                      'Up to 10 clips per video',
                      'Advanced voice matching',
                      'Up to 10 Creator Radar slots',
                      'All templates + custom colors',
                      '1080p exports',
                      '750MB file upload limit',
                      'Email import (up to 50 emails)',
                      'Priority processing queue'
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-white">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Echo Pro - $99 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#B794F6]/30 to-[#B794F6]/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-[#B794F6]/40 p-6 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-[#1C1C1E] mb-2">Echo Pro</h3>
                  <p className="text-xs font-light text-stone-600 mb-4 leading-relaxed">For agencies managing multiple creator video libraries</p>
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-[#B794F6] to-[#9F7AEA] bg-clip-text text-transparent">
                        ${billingPeriod === 'monthly' ? '99' : '990'}
                      </span>
                      <span className="text-sm font-light text-stone-500">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-[#B794F6]/10 border border-[#B794F6]/30 rounded-lg px-2 py-0.5">
                        <p className="text-[10px] font-semibold text-[#B794F6]">2 months free</p>
                      </div>
                    )}
                  </div>
                  <Link href="/auth/signup?plan=echo-pro" className="relative w-full px-4 py-3 bg-gradient-to-r from-[#B794F6] to-[#9F7AEA] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 block text-center text-sm">
                    Get Started
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-stone-200">
                    {[
                      'Unlimited video processing',
                      'Up to 15 clips per video',
                      'Premium voice matching',
                      'Unlimited Creator Radar',
                      'Custom carousel design system',
                      '1080p exports',
                      '5GB file upload limit',
                      'Email import (up to 100 emails)',
                      'Priority processing queue',
                      'Priority support'
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#B794F6] to-[#9F7AEA] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-stone-700">{feature}</span>
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

      {/* Footer */}
      <footer className="relative py-20 px-6 bg-gradient-to-br from-[#1C1C1E] via-[#2a2a2c] to-[#1C1C1E] text-white overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00D4FF] to-[#B794F6]" />
        <div className="absolute top-10 right-20 w-64 h-64 bg-[#00D4FF]/8 rounded-full blur-3xl" />

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
                <li><a href="#how" className="hover:text-[#00D4FF] transition-colors duration-200">How It Works</a></li>
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

      {/* Public help widget (FAQ-only) */}
      <HelpWidget isPublic />
    </div>
  );
}
