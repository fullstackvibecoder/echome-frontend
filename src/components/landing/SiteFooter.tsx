'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Twitter, Linkedin } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="relative py-20 px-6 bg-gray-900 text-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent-purple" />
      <div className="absolute top-10 right-20 w-64 h-64 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent-purple rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Image src="/media/echome-logo.svg" alt="Echo, your Agentic content assistant" width={48} height={48} className="relative object-contain" />
              </div>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                EchoMe
              </span>
            </div>
            <p className="text-white/80 font-light text-lg leading-relaxed mb-6">
              Context-aware content generation. Your history, your voice, your output.
            </p>
            <div className="flex gap-3">
              <a href="https://x.com/tryechome" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl hover:bg-gradient-to-r hover:from-primary hover:to-accent-purple flex items-center justify-center transition-all duration-300 group">
                <Twitter className="w-4 h-4 text-white/70 group-hover:text-white" />
              </a>
              <a href="https://linkedin.com/company/tryechome" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl hover:bg-gradient-to-r hover:from-primary hover:to-accent-purple flex items-center justify-center transition-all duration-300 group">
                <Linkedin className="w-4 h-4 text-white/70 group-hover:text-white" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-extrabold text-lg mb-6 bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">Product</h4>
            <ul className="space-y-3 text-white/70 font-light">
              <li><a href="#how" className="hover:text-primary transition-colors duration-200">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors duration-200">Pricing</a></li>
              <li><Link href="/community" className="hover:text-primary transition-colors duration-200">Community</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-lg mb-6 bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent">Company</h4>
            <ul className="space-y-3 text-white/70 font-light">
              <li><a href="/auth/login" className="hover:text-accent-purple transition-colors duration-200">Sign In</a></li>
              <li><a href="/auth/signup" className="hover:text-accent-purple transition-colors duration-200">Sign Up</a></li>
              <li><Link href="/affiliates" className="hover:text-accent-purple transition-colors duration-200">Affiliates</Link></li>
              <li><Link href="/privacy" className="hover:text-accent-purple transition-colors duration-200">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-accent-purple transition-colors duration-200">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="relative h-px mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <div className="text-center text-white/60 text-sm font-light flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <Image src="/media/echo-mini.svg" alt="" aria-hidden="true" width={20} height={20} className="echo-wave-hover inline-block" />
            <span>© 2025–{new Date().getFullYear()} EchoMe. All rights reserved.</span>
          </div>
          <span className="text-white/50">
            EchoMe is a <a href="https://bottlenecklabs.ai" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-accent-purple transition-colors duration-200">BottleneckLabs.ai</a> company
          </span>
        </div>
      </div>
    </footer>
  );
}
