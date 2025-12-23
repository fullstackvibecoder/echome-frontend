import { Navbar } from '@/components/navbar';
import { HeroSection } from '@/components/hero-section';
import { SocialProof } from '@/components/social-proof';
import { Features } from '@/components/features';
import { CTASection } from '@/components/cta-section';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <SocialProof />
      <Features />
      <CTASection />
      <Footer />
    </main>
  );
}
