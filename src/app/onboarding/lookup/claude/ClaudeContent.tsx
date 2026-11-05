'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { FillFromClaude } from '@/app/app/voice/components/FillFromClaude';

/**
 * Last onboarding step: if the user already uses Claude, let it write what it
 * knows about them into their knowledge base (paste version, no connector).
 * Skippable; never blocks reaching the app.
 */
export default function ClaudeContent() {
  const router = useRouter();
  const done = () => router.push('/app');

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Already use Claude? Let it tell Echo about you.
        </h1>
        <p className="text-muted-foreground">
          One click asks Claude to write down what you do, who you serve and what you talk about.
          Paste its answer back and your first kit starts from more than a blank page.
        </p>
      </div>
      <FillFromClaude knowledgeBaseId={null} onAdded={done} onSkip={done} />
    </main>
  );
}
