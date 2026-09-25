'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { WalkthroughVideo } from '@/components/guides/WalkthroughVideo';

const chapters = [
  '0:00 What EchoMe does with one long video',
  '2:00 The content kit: posts, carousels, Substack article',
  '4:00 Onboarding and the settings that matter',
  '6:00 Paste a video link, clips arrive',
  '7:00 Post now or schedule the week',
  '9:00 Creator Radar',
  '10:00 B-roll reel for a listing',
  '11:00 Work Before the Work: your voice profile builds itself',
  '19:00 Voice match is for text; video is already you',
];

export function SeeItWorkSection() {
  return (
    <AnimatedSection>
      <section id="see-it-work" className="py-24 px-6 bg-gradient-to-b from-background to-secondary relative overflow-hidden">
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-foreground">
              See it work
            </h2>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
              Ara takes four members through EchoMe from dropping in a video to posting. Twenty minutes, no edits, real accounts.
            </p>
          </div>

          {/* Video + chapter list */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-start">
            <WalkthroughVideo variant="landing" />

            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Jump to
              </h3>
              <ul className="space-y-3">
                {chapters.map((chapter) => (
                  <li key={chapter} className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                    {chapter}
                  </li>
                ))}
              </ul>

              <Link
                href="/guides"
                className="inline-flex items-center gap-1.5 mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                All guides
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
