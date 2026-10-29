'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { trackCtaClick } from '@/lib/analytics';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#voice', label: 'Your voice' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#community', label: 'Community' },
];

export function HomeNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-50 bg-home-paper text-home-ink">
      <nav aria-label="Main" className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link href="/" className="font-grotesk text-2xl font-bold tracking-[-0.03em] text-home-ink">
          EchoMe
        </Link>

        <div className="hidden items-center gap-7 text-[15px] md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-home-muted transition-colors hover:text-home-ink">
              {l.label}
            </a>
          ))}
          <a href="/auth/login" className="text-home-muted transition-colors hover:text-home-ink">
            Sign in
          </a>
          <a
            href="/auth/signup"
            onClick={() => trackCtaClick('nav_signup')}
            className="rounded-full bg-home-ink px-5 py-3 font-semibold text-home-paper transition-opacity hover:opacity-85"
          >
            Start free
          </a>
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="-m-3 p-3 md:hidden"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="absolute inset-x-0 top-full border-t border-black/10 bg-home-paper md:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {[...LINKS, { href: '/auth/login', label: 'Sign in' }].map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 text-lg text-home-ink">
                {l.label}
              </a>
            ))}
            <a
              href="/auth/signup"
              onClick={() => {
                setOpen(false);
                trackCtaClick('nav_signup_mobile');
              }}
              className="mt-2 rounded-full bg-home-ink px-5 py-4 text-center font-semibold text-home-paper"
            >
              Start free
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
