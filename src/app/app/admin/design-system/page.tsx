'use client';

import { useAuth } from '@/hooks/useAuth';
import { Bookmark, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { IconButton } from '@/components/ds/IconButton';
import { Meter } from '@/components/ds/Meter';
import { Panel } from '@/components/ds/Panel';
import { PlatformBadge } from '@/components/ds/PlatformBadge';
import { ProgressWave } from '@/components/ds/ProgressWave';
import { Row } from '@/components/ds/Row';
import { StepBar } from '@/components/ds/StepBar';
import { ThemeSwitch } from '@/components/ds/ThemeSwitch';
import { Thumb } from '@/components/ds/Thumb';
import { Tile } from '@/components/ds/Tile';

const PLATFORMS = ['instagram', 'linkedin', 'facebook', 'tiktok', 'youtube', 'x', 'threads', 'blog', 'mastodon'];
const CLIP_STEPS = ['Upload', 'Transcribe', 'Find moments', 'Cut clips', 'Ready'];
// Deterministic so render is stable and hydration-safe.
const BARS = Array.from({ length: 48 }, (_, i) => 0.25 + 0.7 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23)));
const HITS = [6, 7, 19, 33, 34];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[12px] font-bold text-je-muted">{title}</h3>
      {children}
    </section>
  );
}

function Specimen({ theme }: { theme: 'dark' | 'light' }) {
  return (
    <div data-je-theme={theme} className="je je-canvas flex flex-col gap-6 rounded-[22px] p-6">
      <h2 className="text-[12px] font-bold text-je-muted">{theme === 'dark' ? 'Dark' : 'Light'}</h2>
      <p className="m-0 text-[36px] font-black leading-[1.05] tracking-[-0.04em]">
        Make something
        <br />
        <span className="je-grad-text">today.</span>
      </p>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">Make it</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" loading>Working</Button>
        </div>
      </Section>

      <Section title="Icon buttons">
        <div className="flex items-center gap-2">
          <IconButton label="Save" icon={Bookmark} variant="ghost" />
          <IconButton label="Send" icon={Send} variant="grad" />
        </div>
      </Section>

      <Section title="Platform badges">
        <div className="flex flex-wrap items-center gap-2">
          {PLATFORMS.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>
      </Section>

      <Section title="Thumbs">
        <div className="grid grid-cols-5 gap-2">
          <Thumb alt="Square" platform="instagram" />
          <Thumb alt="Reel" aspect="reel" duration={42} platform="tiktok" />
          <Thumb alt="Done" state="done" platform="linkedin" />
          <Thumb alt="Pending" state="pending" platform="youtube" />
          <Thumb alt="Broken" src="/does-not-exist.jpg" platform="facebook" />
        </div>
      </Section>

      <Section title="This week">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Thumb key={i} alt={`Day ${i + 1}`} state={i < 4 ? 'done' : 'default'} />
          ))}
        </div>
        <Meter value={4} total={7} label="Days covered" />
      </Section>

      <Section title="Rows">
        <div className="flex flex-col gap-2">
          <Row lead={<span className="block w-10 shrink-0"><Thumb alt="" /></span>} title="Weekly recap" detail="Instagram, 2 clips" trail={<PlatformBadge platform="instagram" />} selected />
          <Row lead={<span className="block w-10 shrink-0"><Thumb alt="" /></span>} title="Client story" detail="LinkedIn, draft" trail={<PlatformBadge platform="linkedin" />} />
        </div>
      </Section>

      <Section title="Tiles">
        <div className="grid grid-cols-3 gap-2">
          {['Clips', 'Carousel', 'Post'].map((a) => (
            <Tile key={a} action={a} picture={<span className="flex h-full w-full items-center justify-center bg-je-tint text-je-accent"><Sparkles size={18} strokeWidth={1.7} /></span>} />
          ))}
        </div>
      </Section>

      <Section title="Panel">
        <Panel title="Clips" onClose={() => {}} className="rounded-[22px] border">
          <StepBar steps={CLIP_STEPS} current={2} />
          <ProgressWave bars={BARS} hits={HITS} scanning />
        </Panel>
      </Section>
    </div>
  );
}

export default function DesignSystemPage() {
  const { user } = useAuth();
  if (!user?.isAdmin) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="je je-canvas flex items-center justify-between rounded-[22px] p-4">
        <span className="text-[15px] font-bold">Just Echo design system</span>
        <ThemeSwitch />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Specimen theme="dark" />
        <Specimen theme="light" />
      </div>
    </div>
  );
}
