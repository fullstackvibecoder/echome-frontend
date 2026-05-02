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
  // Echo Teams card uses a per-voice selector. State default = 2 (plan minimum).
  const [echoTeamsVoices, setEchoTeamsVoices] = useState<number>(2);

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
      <nav className={`fixed w-full z-[999] transition-all duration-300 pointer-events-auto ${scrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 shadow-lg' : 'bg-gray-900/50 backdrop-blur-md border-b border-white/10'}`}>
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
              <a href="/privacy" className={`transition font-medium ${scrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-primary'}`}>Privacy</a>
              <a
                href="/auth/login"
                className={`transition font-medium ${scrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-primary'}`}
              >
                Sign In
              </a>
              <a
                href="/auth/signup"
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all shadow-md"
              >
                Try Free
              </a>
            </div>

            <button aria-label="Toggle navigation menu" aria-expanded={isMenuOpen} className={`md:hidden p-3 -m-3 ${scrolled ? 'text-foreground' : 'text-white'}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-white/10 shadow-xl">
              <div className="flex flex-col p-6 space-y-4">
                <a href="#how" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">How It Works</a>
                <a href="#output-showcase" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">Examples</a>
                <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">Pricing</a>
                <a href="#community" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">Community</a>
                <a href="/privacy" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">Privacy</a>
                <a
                  href="/auth/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-left text-foreground hover:text-primary transition font-medium"
                >
                  Sign In
                </a>
                <a
                  href="/auth/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all text-center shadow-md"
                >
                  Try Free
                </a>
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
      <section id="pricing" className="py-20 px-6 bg-gradient-to-br from-background to-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-accent-purple/5 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight text-foreground leading-tight">
              Choose Your{' '}
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">Plan</span>
            </h2>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
              Start with 5 free content kits - no credit card required.
              <br />
              <span className="text-base">Then choose a plan that works with your creative rhythm.</span>
            </p>

            {/* Billing Period Toggle */}
            <div className="flex justify-center mt-12 mb-4">
              <div className="inline-flex items-center bg-card/60 backdrop-blur-xl border-2 border-border rounded-2xl p-2 shadow-lg">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    billingPeriod === 'monthly'
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`relative px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    billingPeriod === 'annual'
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                      : 'text-muted-foreground hover:text-primary'
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
              <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border-2 border-border p-6 flex flex-col shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-foreground mb-2">Free</h3>
                  <p className="text-sm font-normal text-muted-foreground mb-4 leading-relaxed">See if it gets your voice right</p>
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">$0</span>
                      <span className="text-sm font-light text-muted-foreground">forever</span>
                    </div>
                  </div>
                  <a href="/auth/signup" className="relative w-full px-4 py-3 bg-muted text-foreground rounded-xl font-bold hover:bg-muted/80 transition-all duration-300 block text-center text-sm border border-border">
                    Start Free
                  </a>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-border">
                    {[
                      '5 free content kits to try it out',
                      'Your voice, learning from what you publish',
                      'Auto-post to Instagram, LinkedIn & Facebook',
                      'Clips, captions, carousels, and posts',
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Echo - $37 */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent-purple/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border-2 border-border p-6 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-foreground mb-2">Echo</h3>
                  <p className="text-sm font-normal text-muted-foreground mb-4 leading-relaxed">For creators with a body of work to draw from</p>
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                        ${billingPeriod === 'monthly' ? '37' : '370'}
                      </span>
                      <span className="text-sm font-light text-muted-foreground">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-gradient-to-r from-primary/10 to-primary-dark/10 border border-primary/30 rounded-lg px-2 py-0.5">
                        <p className="text-xs font-semibold text-primary">2 months free</p>
                      </div>
                    )}
                  </div>
                  <a href="/auth/signup?plan=echo" className="relative w-full px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 block text-center text-sm">
                    Try Echo Free
                  </a>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-border">
                    {[
                      'Your voice profile, learning continuously',
                      'Reads YouTube, Instagram, blog, email, voice notes, PDFs',
                      'Creator Radar — track what your audience watches',
                      'Auto-post to Instagram, LinkedIn & Facebook',
                      'Built-in teleprompter for talking-head video',
                      'Content calendar with email reminders'
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Echo Studio - $87 - Popular */}
            <div className="relative md:-mt-6 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent-purple rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-primary via-primary-dark to-primary rounded-3xl p-6 flex flex-col shadow-2xl hover:shadow-[0_30px_60px_-15px_rgba(0,212,255,0.5)] hover:-translate-y-2 transition-all duration-300 h-full">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-lg">
                  MOST POPULAR
                </div>
                <div className="mb-6 mt-3">
                  <h3 className="text-2xl font-extrabold text-white mb-2">Echo Studio</h3>
                  <p className="text-xs font-light text-white/90 mb-4 leading-relaxed">For creators who publish frequently and take their output seriously</p>
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white drop-shadow-lg">
                        ${billingPeriod === 'monthly' ? '87' : '870'}
                      </span>
                      <span className="text-sm font-light text-white/80">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-2 py-0.5">
                        <p className="text-xs font-semibold text-white">2 months free</p>
                      </div>
                    )}
                  </div>
                  <a href="/auth/signup?plan=echo-studio" className="relative w-full px-4 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white/20 block text-center text-sm">
                    Try Studio Free
                  </a>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-white/30">
                    {[
                      'Deep voice matching with thumbs feedback',
                      'Reads your full email history',
                      'Creator Radar with deeper insights',
                      'Auto-post to Instagram, LinkedIn & Facebook',
                      'Built-in teleprompter for talking-head video',
                      'Priority processing'
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

            {/* Echo Teams - $47/voice (per-voice billing, 2-voice min) */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-purple/30 to-accent-purple/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border-2 border-accent-purple/40 p-6 flex flex-col shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-foreground mb-2">Echo Teams</h3>
                  <p className="text-sm font-normal text-muted-foreground mb-4 leading-relaxed">For agencies and teams managing multiple voices</p>

                  {/* Voice selector */}
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Voices:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEchoTeamsVoices(v => Math.max(2, v - 1))}
                        disabled={echoTeamsVoices <= 2}
                        className="w-8 h-8 rounded-lg border-2 border-accent-purple/40 bg-card hover:bg-accent-purple/10 disabled:opacity-40 disabled:cursor-not-allowed text-base font-bold text-accent-purple"
                        aria-label="Decrease voice count"
                      >
                        -
                      </button>
                      <span className="min-w-[2.5rem] text-center font-extrabold text-foreground text-lg">{echoTeamsVoices}</span>
                      <button
                        type="button"
                        onClick={() => setEchoTeamsVoices(v => v + 1)}
                        className="w-8 h-8 rounded-lg border-2 border-accent-purple/40 bg-card hover:bg-accent-purple/10 text-base font-bold text-accent-purple"
                        aria-label="Increase voice count"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground">2 min</span>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold bg-gradient-to-r from-accent-purple to-accent-purple bg-clip-text text-transparent">
                        ${(billingPeriod === 'monthly' ? 47 : 470) * echoTeamsVoices}
                      </span>
                      <span className="text-sm font-light text-muted-foreground">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${billingPeriod === 'monthly' ? 47 : 470}/voice × {echoTeamsVoices} voices
                    </p>
                    {billingPeriod === 'annual' && (
                      <div className="mt-2 inline-block bg-accent-purple/10 border border-accent-purple/30 rounded-lg px-2 py-0.5">
                        <p className="text-xs font-semibold text-accent-purple">2 months free</p>
                      </div>
                    )}
                  </div>
                  <a href={`/auth/signup?plan=echo-teams&voices=${echoTeamsVoices}`} className="relative w-full px-4 py-3 bg-gradient-to-r from-accent-purple to-accent-purple text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 block text-center text-sm">
                    Try Echo Teams Free
                  </a>
                </div>
                <div className="flex-1">
                  <div className="space-y-3 pt-4 border-t-2 border-border">
                    {[
                      'Per-voice scaling — pay only for what you use',
                      'Per-voice knowledge bases',
                      'Per-voice profile context',
                      'Shared usage pool across voices',
                      'Auto-post to Instagram, LinkedIn & Facebook',
                      'Built-in teleprompter for talking-head video',
                      'Priority processing + Priority support',
                    ].map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent-purple to-accent-purple flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Voice subsection dropped 2026-04-30 — Echo Teams now
              lives in the main 4-column grid above with a per-voice
              quantity selector. Legacy EchoTeams Duo/Pro/Agency cards
              retired from advertising; their Stripe products remain
              active for the one grandfathered customer on Duo. */}

          {/* Enterprise CTA */}
          <div className="max-w-3xl mx-auto text-center mt-12 p-8 bg-gray-900 rounded-3xl">
            <h3 className="text-2xl font-bold text-white mb-2">Need Enterprise Features?</h3>
            <p className="text-white/70 mb-4 text-sm">API access, 4K exports, team collaboration, white-label options, and custom integrations.</p>
            <a href="mailto:enterprise@tryechome.com" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all">
              <Mail className="w-4 h-4" />
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Community */}
      <CommunitySection />

      {/* Affiliate Program */}
      <section className="py-20 px-6 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent-purple/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto">
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
              <a
                href="/affiliates"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Learn More
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { plan: 'Echo', price: '$37/mo', commission: '$9.25', color: 'from-primary/20 to-primary/5' },
                { plan: 'Echo Studio', price: '$87/mo', commission: '$21.75', color: 'from-primary/25 to-primary/10', popular: true },
                { plan: 'Echo Teams', price: '$47/voice/mo', commission: '$11.75/voice', color: 'from-accent-purple/20 to-accent-purple/5' },
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
