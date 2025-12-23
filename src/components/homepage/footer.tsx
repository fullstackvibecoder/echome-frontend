'use client';

import Link from 'next/link';

export function Footer() {
  const footerLinks = {
    Product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Voice Temperature', href: '#voice-temperature' },
    ],
    Company: [
      { label: 'About', href: '#about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
    Resources: [
      { label: 'Help Center', href: '/help' },
      { label: 'API Docs', href: '/docs' },
      { label: 'Community', href: '/community' },
      { label: 'Status', href: '/status' },
    ],
    Legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  };

  const socialLinks = [
    { icon: '𝕏', href: 'https://twitter.com/echome', label: 'Twitter' },
    { icon: '📘', href: 'https://facebook.com/echome', label: 'Facebook' },
    { icon: '💼', href: 'https://linkedin.com/company/echome', label: 'LinkedIn' },
    { icon: '📺', href: 'https://youtube.com/echome', label: 'YouTube' },
  ];

  return (
    <footer className="bg-bg-secondary border-t border-border py-12">
      <div className="max-w-[1200px] mx-auto px-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="text-2xl font-display font-bold text-text-primary mb-4 block">
              EchoMe
            </Link>
            <p className="text-small text-text-muted mb-4">
              Turn your voice into content that scales. Your Echosystem learns you, then creates for you.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-bg-primary border border-border rounded-lg flex items-center justify-center text-xl hover:border-accent hover:text-accent transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-bold text-text-primary mb-3">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-small text-text-muted hover:text-text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            © 2024 EchoMe Inc. All rights reserved. Made with ✨ for creators.
          </p>
          <div className="flex gap-6">
            <a href="/privacy" className="text-xs text-text-muted hover:text-text-primary transition-colors">
              Privacy
            </a>
            <a href="/terms" className="text-xs text-text-muted hover:text-text-primary transition-colors">
              Terms
            </a>
            <a href="/cookies" className="text-xs text-text-muted hover:text-text-primary transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
