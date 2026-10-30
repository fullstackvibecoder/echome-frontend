'use client';

import { HelpWidget } from '@/components/help-widget';
import { HomeNav } from '@/components/landing/home/HomeNav';
import { HomeHero } from '@/components/landing/home/HomeHero';
import { KitDemo } from '@/components/landing/home/KitDemo';
import { TwoWaysIn } from '@/components/landing/home/TwoWaysIn';
import { VoiceContrast } from '@/components/landing/home/VoiceContrast';
import { ProofQuote } from '@/components/landing/home/ProofQuote';
import { ClosingCta } from '@/components/landing/home/ClosingCta';
import { HomePricing } from '@/components/landing/home/HomePricing';
import { TrackedSection } from '@/components/landing/TrackedSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { CommunitySection } from '@/components/landing/CommunitySection';
import { spaceGrotesk } from '@/lib/fonts';

export default function HomeContent() {
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

      <TrackedSection name="pricing">
        <HomePricing />
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
