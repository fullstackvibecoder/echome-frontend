'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Twitter, Linkedin } from 'lucide-react';
import { spaceGrotesk } from '@/lib/fonts';

export function SiteFooter() {
  return (
    <footer className={`${spaceGrotesk.variable} relative z-20 bg-home-stage py-20 text-home-paper`}>
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="mb-6 flex items-center gap-3">
              <Image src="/media/echome-logo.svg" alt="Echo, your Agentic content assistant" width={44} height={44} className="object-contain" />
              <span className="font-grotesk text-2xl font-bold tracking-[-0.02em]">EchoMe</span>
            </div>
            <p className="mb-6 max-w-[28em] font-grotesk text-2xl font-semibold leading-tight tracking-[-0.02em]">
              Talk once. Show up all week.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex gap-3">
                <a href="https://x.com/tryechome" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
                  <Twitter className="w-4 h-4 text-home-paper" />
                </a>
                <a href="https://linkedin.com/company/tryechome" target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
                  <Linkedin className="w-4 h-4 text-home-paper" />
                </a>
              </div>
              <a href="https://www.bestin2026.com/articles/echome-review-2026" target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.bestin2026.com/api/badge?title=EchoMe&theme=dark" alt="EchoMe - Best in 2026" width={200} height={50} className="opacity-80 hover:opacity-100 transition-opacity" />
              </a>
            </div>
            <div className="mt-4">
              <a href="https://apps.apple.com/app/id6761504034" target="_blank" rel="noopener noreferrer" className="inline-block hover:opacity-80 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83" alt="Download EchoMe on the App Store" width={150} height={50} className="rounded-lg" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-5 font-grotesk text-lg font-bold">Product</h4>
            <ul className="space-y-3 text-home-stage-muted">
              <li><Link href="/#how" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">How It Works</Link></li>
              <li><Link href="/#pricing" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Pricing</Link></li>
              <li><a href="/developers" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">API</a></li>
              <li><a href="/community" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Community</a></li>
              <li><a href="/guides" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Guides</a></li>
              <li><a href="/blog" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Blog</a></li>
              <li><a href="/tools/compress-video" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Free Video Compressor</a></li>
              <li><a href="/tools/transcribe" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Free YouTube Transcript Generator</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-grotesk text-lg font-bold">Company</h4>
            <ul className="space-y-3 text-home-stage-muted">
              <li><a href="/auth/login" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Sign In</a></li>
              <li><a href="/auth/signup" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Sign Up</a></li>
              <li><a href="/affiliates" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Affiliates</a></li>
              <li><a href="/support" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Support</a></li>
              <li><a href="/privacy" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Privacy Policy</a></li>
              <li><a href="/terms" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Terms of Service</a></li>
              <li><a href="/data-deletion" className="inline-block py-2 -my-1 transition-colors hover:text-home-paper">Data Deletion</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/15 pt-8 text-sm text-home-stage-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Image src="/media/echo-mini.svg" alt="" aria-hidden="true" width={20} height={20} className="echo-wave-hover inline-block" />
            <span>© 2025–{new Date().getFullYear()} EchoMe. All rights reserved.</span>
          </div>
          <span>
            EchoMe is a <a href="https://bottlenecklabs.ai" target="_blank" rel="noopener noreferrer" className="text-home-paper underline-offset-4 hover:underline">BottleneckLabs.ai</a> company
          </span>
        </div>
      </div>
    </footer>
  );
}
