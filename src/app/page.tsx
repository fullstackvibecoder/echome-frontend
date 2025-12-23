import { Navbar } from '@/components/homepage/navbar';
import { HeroSection } from '@/components/homepage/hero-section';
import { SocialProof } from '@/components/homepage/social-proof';
import { EchosystemSection } from '@/components/homepage/echosystem-section';
import { InputMethods } from '@/components/homepage/input-methods';
import { OutputFormats } from '@/components/homepage/output-formats';
import { WhatMakesDifferent } from '@/components/homepage/what-makes-different';
import { VoiceTemperature } from '@/components/homepage/voice-temperature';
import { TheSecret } from '@/components/homepage/the-secret';
import { PricingSection } from '@/components/homepage/pricing-section';
import { ComparisonSection } from '@/components/homepage/comparison-section';
import { BottomCTA } from '@/components/homepage/bottom-cta';
import { Footer } from '@/components/homepage/footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <Navbar />
      <HeroSection />
      <SocialProof />
      <EchosystemSection />
      <InputMethods />
      <OutputFormats />
      <WhatMakesDifferent />
      <VoiceTemperature />
      <TheSecret />
      <PricingSection />
      <ComparisonSection />
      <BottomCTA />
      <Footer />
    </main>
  );
}
