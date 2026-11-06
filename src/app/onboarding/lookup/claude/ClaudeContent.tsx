'use client';

import { useRouter } from 'next/navigation';
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
      <h1 className="sr-only">Transfer what Claude knows about you into Echo</h1>
      <FillFromClaude knowledgeBaseId={null} onAdded={done} onSkip={done} />
    </main>
  );
}
