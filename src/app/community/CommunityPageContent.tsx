'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { CommunitySection } from '@/components/landing/CommunitySection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { HelpWidget } from '@/components/help-widget';

export default function CommunityPageContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation — matches homepage */}
      <nav
        className={`fixed w-full z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg'
            : 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <Image
                src="/media/echome-logo.svg"
                alt="Echo, your Agentic content assistant"
                width={40}
                height={40}
                className="object-contain transition-transform group-hover:scale-110"
              />
              <span className="text-xl font-bold tracking-tight text-foreground">EchoMe</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/#how" className="text-foreground hover:text-primary transition font-medium">
                How It Works
              </Link>
              <Link href="/#output-showcase" className="text-foreground hover:text-primary transition font-medium">
                Examples
              </Link>
              <Link href="/#pricing" className="text-foreground hover:text-primary transition font-medium">
                Pricing
              </Link>
              <Link
                href="/community"
                className="text-primary font-semibold"
              >
                Community
              </Link>
              <Link href="/auth/login" className="text-foreground hover:text-primary transition font-medium">
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all shadow-md"
              >
                Try Free
              </Link>
            </div>

            <button
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              className="md:hidden text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-xl">
              <div className="flex flex-col p-6 space-y-4">
                <Link href="/#how" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">
                  How It Works
                </Link>
                <Link href="/#output-showcase" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">
                  Examples
                </Link>
                <Link href="/#pricing" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">
                  Pricing
                </Link>
                <Link href="/community" onClick={() => setIsMenuOpen(false)} className="text-primary font-semibold">
                  Community
                </Link>
                <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition font-medium">
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

      {/* Spacer for fixed nav */}
      <div className="h-20" />

      {/* Community Section */}
      <main>
        <CommunitySection />
      </main>

      <SiteFooter />
      <HelpWidget isPublic />
    </div>
  );
}
