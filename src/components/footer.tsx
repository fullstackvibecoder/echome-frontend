'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-bg-secondary border-t border-border py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-display font-bold text-accent">
                EchoMe
              </span>
            </Link>
            <p className="text-body text-text-secondary max-w-sm">
              Content, in your voice. Stop sounding like ChatGPT. Start sounding
              like you.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-text-primary mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#features"
                  className="text-body text-text-secondary hover:text-accent transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-body text-text-secondary hover:text-accent transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="#docs"
                  className="text-body text-text-secondary hover:text-accent transition-colors"
                >
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-text-primary mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="text-body text-text-secondary hover:text-accent transition-colors"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-body text-text-secondary hover:text-accent transition-colors"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <a
                  href="https://twitter.com/echome"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body text-text-secondary hover:text-accent transition-colors"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/echome"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body text-text-secondary hover:text-accent transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-border">
          <p className="text-small text-text-secondary text-center">
            © {currentYear} EchoMe. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
