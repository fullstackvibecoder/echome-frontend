'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/guides', label: 'Guides' },
  { href: '/faq', label: 'FAQ' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#community', label: 'Community' },
];

export function SiteNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 w-full z-[999] transition-all duration-300 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-xl border-b border-border shadow-sm'
          : 'bg-background border-b border-border'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <Image
              src="/media/echome-logo.svg"
              alt="EchoMe"
              width={32}
              height={32}
              className="object-contain transition-transform group-hover:scale-110"
            />
            <span className="text-lg font-bold tracking-tight text-foreground">
              EchoMe
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-5 py-2 bg-primary-interactive text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Try Free
            </Link>
          </div>

          <button
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            className="md:hidden p-2 -m-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pt-4 pb-2 space-y-3 border-t border-border mt-3">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMenuOpen(false)}
                className="block text-foreground hover:text-primary-interactive transition-colors font-medium"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/auth/login"
              onClick={() => setIsMenuOpen(false)}
              className="block text-foreground hover:text-primary-interactive transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setIsMenuOpen(false)}
              className="block w-full text-center px-5 py-2.5 bg-primary-interactive text-white rounded-lg font-semibold"
            >
              Try Free
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
