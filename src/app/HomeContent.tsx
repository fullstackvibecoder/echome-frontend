'use client';

import { useState } from 'react';
import { Check, Mail } from 'lucide-react';
import { HelpWidget } from '@/components/help-widget';
import { HomeNav } from '@/components/landing/home/HomeNav';
import { HomeHero } from '@/components/landing/home/HomeHero';
import { KitDemo } from '@/components/landing/home/KitDemo';
import { TwoWaysIn } from '@/components/landing/home/TwoWaysIn';
import { VoiceContrast } from '@/components/landing/home/VoiceContrast';
import { ProofQuote } from '@/components/landing/home/ProofQuote';
import { ClosingCta } from '@/components/landing/home/ClosingCta';
import { TrackedSection } from '@/components/landing/TrackedSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { CommunitySection } from '@/components/landing/CommunitySection';
import { spaceGrotesk } from '@/lib/fonts';

export default function HomeContent() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  // Echo Teams card uses a per-voice selector. State default = 2 (plan minimum).
  const [echoTeamsVoices, setEchoTeamsVoices] = useState<number>(2);

  return (
    <div className={`${spaceGrotesk.variable} min-h-screen bg-background text-foreground`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg">
        Skip to main content
      </a>
      <HomeNav />

      <main id="main-content">
      {/* Story: talk once (phone or link) -> Echo cuts the kit -> week on autopilot, voice profile underneath */}
      <div className="bg-home-paper text-home-ink">
        <TrackedSection name="hero">
          <HomeHero />
          <KitDemo />
        </TrackedSection>

        <TrackedSection name="two_ways_in">
          <TwoWaysIn />
        </TrackedSection>

        <TrackedSection name="voice_contrast">
          <VoiceContrast />
        </TrackedSection>

        <TrackedSection name="testimonials">
          <ProofQuote />
        </TrackedSection>

        <TrackedSection name="closing_cta">
          <ClosingCta />
        </TrackedSection>
      </div>

      {/* Pricing */}
      <TrackedSection name="pricing">
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
                      'Creator Radar, track what your audience watches',
                      'Built-in teleprompter for talking-head video',
                      'Auto-post to Instagram, LinkedIn & Facebook',
                      'Content calendar with scheduled posting',
                      'Email import (up to 50 emails)'
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
                      'Per-voice scaling, pay only for what you use',
                      'A voice profile for every team member',
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
            <p className="text-white/70 mb-4 text-sm">API access, team collaboration, white-label options, and custom integrations.</p>
            <a href="mailto:enterprise@tryechome.com" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all">
              <Mail className="w-4 h-4" />
              Contact Sales
            </a>
          </div>
        </div>
      </section>
      </TrackedSection>

      {/* Community */}
      <TrackedSection name="community">
        <CommunitySection />
      </TrackedSection>

      </main>

      {/* Footer */}
      <SiteFooter />

      {/* Public help widget (FAQ-only) */}
      <HelpWidget isPublic />
    </div>
  );
}
