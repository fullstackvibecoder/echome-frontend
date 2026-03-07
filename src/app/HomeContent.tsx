'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Check, Mail, Users, ArrowRight } from 'lucide-react';
import { HelpWidget } from '@/components/help-widget';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { KnowledgeBaseSection } from '@/components/landing/KnowledgeBaseSection';
import { CreatorRadarSection } from '@/components/landing/CreatorRadarSection';
import { OutputShowcase } from '@/components/landing/OutputShowcase';
import { TestimonialStrip } from '@/components/landing/TestimonialStrip';
import { NotChatGPTSection } from '@/components/landing/NotChatGPTSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { CommunitySection } from '@/components/landing/CommunitySection';

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
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg">
        Skip to main content
      </a>
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg' : 'bg-gray-900/50 backdrop-blur-md border-b border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <Image src="/media/echome-logo.svg" alt="Echo, your Agentic content assistant" width={40} height={40} className="object-contain transition-transform group-hover:scale-110" />
              <span className={`text-xl font-bold tracking-tight transition-colors ${scrolled ? 'text-foreground' : 'text-white'}`}>EchoMe</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#how" className={`transition font-medium ${scrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-primary'}`}>How It Works</a>
              <a href="#output-showcase" className={`transition font-medium ${scrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-primary'}`}>Examples</a>
              <a href="#pricing" className={`transition font-medium ${scrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-primary'}`}>Pricing</a>
              <a href="#community" className={`transition font-medium ${scrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-primary'}`}>Community</a>
              <Link
                href="/auth/login"
                className={`transition font-medium ${scrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-primary'}`}
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all shadow-md"
              >
                Try Free
              </Link>
            </div>

            <button aria-label="Toggle navigation menu" aria-expanded={isMenuOpen} className={`md:hidden ${scrolled ? 'text-foreground' : 'text-white'}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-xl">
              <div className="flex flex-col p-6 space-y-4">
                <a href="#how" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">How It Works</a>
                <a href="#output-showcase" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">Examples</a>
                <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">Pricing</a>
                <a href="#community" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">Community</a>
                <Link
                  href="/auth/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-left text-foreground hover:text-primary transition font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all text-center shadow-md"
                >
                  Try Free
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main id="main-content">
      <HeroSection />

      {/* How It Works */}
      <HowItWorks />

      {/* Knowledge Base */}
      <KnowledgeBaseSection />

      {/* Creator Radar */}
      <CreatorRadarSection />

      {/* Output Showcase */}
      <OutputShowcase />

      {/* Testimonials */}
      <TestimonialStrip />

      {/* Not ChatGPT */}
      <NotChatGPTSection />

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gradient-to-br from-background to-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-accent-purple/5 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight text-foreground leading-tight">
              Choose Your
              <br />
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">Plan</span>
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Start with 2 free generations - no credit card required.
              <br />
              <span className="text-base">Then choose a plan that works with your creative rhythm.</span>
            </p>

            {/* Billing Period Toggle */}
            <div className="flex justify-center mt-12 mb-4">
              <div className="inline-flex items-center bg-white/60 backdrop-blur-xl border-2 border-gray-200 rounded-2xl p-2 shadow-lg">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    billingPeriod === 'monthly'
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                      : 'text-gray-600 hover:text-primary'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`relative px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    billingPeriod === 'annual'
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                      : 'text-gray-600 hover:text-primary'
                  }`}
                >
                  Annual
                  <span className="absolute -top-3 -right-4 bg-accent-yellow text-gray-900 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-md">
                    SAVE 17%
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16">
            {/* Free Tier */}
            <div className="relative group">
              <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border-2 border-gray-200 p-6 flex flex-col shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-foreground mb-2">Free</h3>
                  <p className="text-sm font-normal text-gray-600 mb-4 leading-relaxed">Try EchoMe with no commitment</p>
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">$0</span>
                      <span className="text-sm font-light text-gray-500">forever</span>
                    </div>
                  </div>
                  <Link href="/auth/signup" className="relative w-full px-4 py-3 bg-gray-100 text-foreground rounded-xl font-bold hover:bg-gray-200 transition-all duration-300 block text-center text-sm border border-gray-200">
                    Start Free
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-gray-200">
                    {[
                      '2 free generations',
                      'Basic voice matching',
                      '1 platform per generation',
                      'Standard templates',
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Echo - $29 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent-purple/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-gray-200 p-6 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-foreground mb-2">Echo</h3>
                  <p className="text-sm font-normal text-gray-600 mb-4 leading-relaxed">For creators with growing video libraries</p>
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                        ${billingPeriod === 'monthly' ? '29' : '290'}
                      </span>
                      <span className="text-sm font-light text-gray-500">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-gradient-to-r from-primary/10 to-primary-dark/10 border border-primary/30 rounded-lg px-2 py-0.5">
                        <p className="text-xs font-semibold text-primary">2 months free</p>
                      </div>
                    )}
                  </div>
                  <Link href="/auth/signup?plan=echo" className="relative w-full px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 block text-center text-sm">
                    Go Echo
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-gray-200">
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
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Echo Studio - $49 - Popular */}
            <div className="relative md:-mt-6 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent-purple rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-primary via-primary-dark to-primary rounded-3xl p-6 flex flex-col shadow-2xl hover:shadow-[0_30px_60px_-15px_rgba(0,212,255,0.5)] hover:-translate-y-2 transition-all duration-300 h-full">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-lg">
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
                        <p className="text-xs font-semibold text-white">2 months free</p>
                      </div>
                    )}
                  </div>
                  <Link href="/auth/signup?plan=echo-studio" className="relative w-full px-4 py-3 bg-gradient-to-r from-foreground to-foreground text-white rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white/20 block text-center text-sm">
                    Go Studio
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
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple/30 to-accent-purple/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-accent-purple/40 p-6 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-foreground mb-2">Echo Pro</h3>
                  <p className="text-sm font-normal text-gray-600 mb-4 leading-relaxed">For agencies managing multiple creator video libraries</p>
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-accent-purple to-accent-purple bg-clip-text text-transparent">
                        ${billingPeriod === 'monthly' ? '99' : '990'}
                      </span>
                      <span className="text-sm font-light text-gray-500">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-accent-purple/10 border border-accent-purple/30 rounded-lg px-2 py-0.5">
                        <p className="text-xs font-semibold text-accent-purple">2 months free</p>
                      </div>
                    )}
                  </div>
                  <Link href="/auth/signup?plan=echo-pro" className="relative w-full px-4 py-3 bg-gradient-to-r from-accent-purple to-accent-purple text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 block text-center text-sm">
                    Go Pro
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-gray-200">
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
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent-purple to-accent-purple flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teams Plans */}
          <div className="mt-20 mb-16">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-purple/10 border border-accent-purple/20 rounded-full mb-4">
                <Users className="w-4 h-4 text-accent-purple" />
                <span className="text-accent-purple font-semibold text-sm">For Teams</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">
                Multi-Voice Management
              </h3>
              <p className="text-gray-600 font-light max-w-2xl mx-auto">
                Manage multiple voices from one account. Everything in Echo Pro, plus per-voice knowledge bases and profile context.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* EchoTeams Duo - $129 */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple/20 to-primary/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-gray-200 p-6 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className="mb-6">
                    <h3 className="text-2xl font-extrabold text-foreground mb-1">EchoTeams Duo</h3>
                    <p className="text-sm font-normal text-gray-600 mb-4">2 voices</p>
                    <div className="mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold bg-gradient-to-r from-accent-purple to-accent-purple bg-clip-text text-transparent">
                          ${billingPeriod === 'monthly' ? '129' : '1,075'}
                        </span>
                        <span className="text-sm font-light text-gray-500">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>
                      {billingPeriod === 'annual' && (
                        <div className="mt-2 inline-block bg-accent-purple/10 border border-accent-purple/30 rounded-lg px-2 py-0.5">
                          <p className="text-xs font-semibold text-accent-purple">2 months free</p>
                        </div>
                      )}
                    </div>
                    <Link href="/auth/signup?plan=echo-teams-2" className="relative w-full px-4 py-3 bg-gradient-to-r from-accent-purple to-accent-purple text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 block text-center text-sm">
                      Get Started
                    </Link>
                  </div>
                  <div className="flex-1">
                    <div className="space-y-3 pt-4 border-t-2 border-gray-200">
                      {[
                        'Everything in Echo Pro',
                        '2 distinct voice profiles',
                        'Per-voice knowledge bases',
                        'Per-voice profile context',
                        'Shared usage pool across voices',
                        'Unlimited video processing',
                        'Up to 15 clips per video',
                        '5GB file upload limit',
                        'Priority support',
                      ].map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent-purple to-accent-purple flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* EchoTeams Pro - $179 - Best Value */}
              <div className="relative md:-mt-6 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent-purple to-accent-purple rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-accent-purple via-accent-purple to-accent-purple rounded-3xl p-6 flex flex-col shadow-2xl hover:shadow-[0_30px_60px_-15px_rgba(183,148,246,0.5)] hover:-translate-y-2 transition-all duration-300 h-full">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent-purple to-accent-purple text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-lg">
                    BEST VALUE
                  </div>
                  <div className="mb-6 mt-3">
                    <h3 className="text-2xl font-extrabold text-white mb-1">EchoTeams Pro</h3>
                    <p className="text-xs font-light text-white/90 mb-4">5 voices</p>
                    <div className="mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-white drop-shadow-lg">
                          ${billingPeriod === 'monthly' ? '179' : '1,492'}
                        </span>
                        <span className="text-sm font-light text-white/80">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>
                      {billingPeriod === 'annual' && (
                        <div className="mt-2 inline-block bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-2 py-0.5">
                          <p className="text-xs font-semibold text-white">2 months free</p>
                        </div>
                      )}
                    </div>
                    <Link href="/auth/signup?plan=echo-teams-5" className="relative w-full px-4 py-3 bg-gradient-to-r from-foreground to-foreground text-white rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white/20 block text-center text-sm">
                      Get Started
                    </Link>
                  </div>
                  <div className="flex-1">
                    <div className="space-y-3 pt-4 border-t-2 border-white/30">
                      {[
                        'Everything in Echo Pro',
                        '5 distinct voice profiles',
                        'Per-voice knowledge bases',
                        'Per-voice profile context',
                        'Shared usage pool across voices',
                        'Unlimited video processing',
                        'Up to 15 clips per video',
                        '5GB file upload limit',
                        'Priority support',
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

              {/* EchoTeams Agency - $249 */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple/20 to-primary/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-gray-200 p-6 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className="mb-6">
                    <h3 className="text-2xl font-extrabold text-foreground mb-1">EchoTeams Agency</h3>
                    <p className="text-sm font-normal text-gray-600 mb-4">10 voices</p>
                    <div className="mb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold bg-gradient-to-r from-accent-purple to-accent-purple bg-clip-text text-transparent">
                          ${billingPeriod === 'monthly' ? '249' : '2,075'}
                        </span>
                        <span className="text-sm font-light text-gray-500">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>
                      {billingPeriod === 'annual' && (
                        <div className="mt-2 inline-block bg-accent-purple/10 border border-accent-purple/30 rounded-lg px-2 py-0.5">
                          <p className="text-xs font-semibold text-accent-purple">2 months free</p>
                        </div>
                      )}
                    </div>
                    <Link href="/auth/signup?plan=echo-teams-10" className="relative w-full px-4 py-3 bg-gradient-to-r from-accent-purple to-accent-purple text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 block text-center text-sm">
                      Get Started
                    </Link>
                  </div>
                  <div className="flex-1">
                    <div className="space-y-3 pt-4 border-t-2 border-gray-200">
                      {[
                        'Everything in Echo Pro',
                        '10 distinct voice profiles',
                        'Per-voice knowledge bases',
                        'Per-voice profile context',
                        'Shared usage pool across voices',
                        'Unlimited video processing',
                        'Up to 15 clips per video',
                        '5GB file upload limit',
                        'Priority support',
                      ].map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent-purple to-accent-purple flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise CTA */}
          <div className="max-w-3xl mx-auto text-center mt-12 p-8 bg-gradient-to-r from-foreground to-foreground rounded-3xl">
            <h3 className="text-2xl font-bold text-white mb-2">Need Enterprise Features?</h3>
            <p className="text-white/70 mb-4 text-sm">API access, 4K exports, team collaboration, white-label options, and custom integrations.</p>
            <a href="mailto:enterprise@tryechome.com" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-foreground rounded-xl font-bold hover:bg-gray-100 transition-all">
              <Mail className="w-4 h-4" />
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Community */}
      <CommunitySection />

      {/* Affiliate Program */}
      <section className="py-20 px-6 bg-gradient-to-br from-foreground via-gray-900 to-foreground text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent-purple/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/15 border border-primary/25 rounded-full mb-6">
                <span className="text-lg">💰</span>
                <span className="text-primary font-semibold text-sm">Affiliate Program</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
                Earn <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">25% Recurring</span>
                <br />
                Sharing EchoMe
              </h2>
              <p className="text-white/70 font-light text-lg mb-6 leading-relaxed">
                Love what EchoMe does for your content? Share it with your audience and earn 25% of every subscription - not just the first month, every month they stay.
              </p>
              <Link
                href="/affiliates"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Learn More
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { plan: 'Echo', price: '$29/mo', commission: '$7.25', color: 'from-primary/20 to-primary/5' },
                { plan: 'Echo Studio', price: '$49/mo', commission: '$12.25', color: 'from-primary/25 to-primary/10', popular: true },
                { plan: 'Echo Pro', price: '$99/mo', commission: '$24.75', color: 'from-accent-purple/20 to-accent-purple/5' },
              ].map((tier) => (
                <div
                  key={tier.plan}
                  className={`flex items-center justify-between p-4 bg-gradient-to-r ${tier.color} rounded-xl border ${
                    tier.popular ? 'border-primary/30' : 'border-white/10'
                  }`}
                >
                  <div>
                    <span className="font-bold text-white">{tier.plan}</span>
                    <span className="text-white/50 text-sm ml-2">{tier.price}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-primary">{tier.commission}</span>
                    <span className="text-white/50 text-sm">/mo per referral</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <SiteFooter />

      {/* Public help widget (FAQ-only) */}
      <HelpWidget isPublic />
    </div>
  );
}
