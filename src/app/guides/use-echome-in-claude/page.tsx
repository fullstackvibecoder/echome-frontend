import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

const TITLE = 'Use EchoMe in Claude';
const DESCRIPTION =
  'Connect EchoMe to Claude, Claude Code or Cursor. Ask Claude to draft posts and kits in your voice, check your schedule, and schedule posts after you confirm each one.';
const URL = 'https://tryechome.com/guides/use-echome-in-claude';

export const metadata: Metadata = {
  title: `${TITLE} | EchoMe Guide`,
  description: DESCRIPTION,
  keywords: ['echome claude', 'echome mcp', 'claude connector', 'claude code', 'cursor mcp'],
  alternates: { canonical: URL },
};

export default function UseEchoMeInClaudeGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    url: URL,
    datePublished: '2026-11-19',
    dateModified: '2026-11-19',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: TITLE, item: URL },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <JsonLd data={jsonLd} />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="mb-8">
          <a href="/guides" className="text-sm text-accent hover:underline">&larr; All Guides</a>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">{TITLE}</h1>
        <p className="text-lg text-text-secondary mb-2">
          Already talking things through with Claude? Connect EchoMe and Claude can read your voice, draft posts and kits that sound like you, and put them on your schedule.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">3 min read · Studio plan</p>

        <div className="mb-10 p-5 bg-accent/5 border border-accent/20 rounded-xl">
          <p className="text-sm text-text-secondary">
            <strong>Nothing posts by itself.</strong> Claude asks you before it schedules or publishes anything, one post at a time. You can disconnect anytime in EchoMe Settings.
          </p>
        </div>

        <h2 className="text-xl font-semibold text-text-primary mb-4">Claude.ai, Claude Desktop and the Claude app</h2>
        <section className="space-y-8 mb-10">
          <Step number={1} title="Copy your EchoMe URL">
            <p>In EchoMe, open <strong>Settings</strong>, then <strong>Connections</strong>. Under <strong>EchoMe in Claude</strong>, copy the EchoMe URL.</p>
          </Step>
          <Step number={2} title="Add EchoMe as a connector in Claude">
            <p>In Claude, open <strong>Settings</strong>, then <strong>Connectors</strong>. Choose <strong>Add custom connector</strong>, name it EchoMe, and paste the URL.</p>
          </Step>
          <Step number={3} title="Sign in and allow">
            <p>Select <strong>Connect</strong>. EchoMe opens, you sign in, and you see what Claude will be able to do. Choose <strong>Allow</strong> and you land back in Claude.</p>
            <Tip>Add the connector once on claude.ai and it works in Claude Desktop and the Claude phone app too.</Tip>
          </Step>
          <Step number={4} title="Ask for what you need">
            <p>Try: &ldquo;Draft a LinkedIn post about this week&apos;s rate drop in my voice&rdquo;, &ldquo;Make a content kit from this YouTube link&rdquo;, or &ldquo;What do I have scheduled next week?&rdquo;. If you have team voices, name the voice: &ldquo;write this as Sarah&rdquo;.</p>
          </Step>
        </section>

        <h2 className="text-xl font-semibold text-text-primary mb-4">Claude Code and Cursor</h2>
        <section className="space-y-8 mb-10">
          <Step number={1} title="Create a key">
            <p>In <strong>Settings</strong>, <strong>Connections</strong>, <strong>EchoMe in Claude</strong>, choose <strong>Create key</strong>. EchoMe shows the key once, with the exact command for Claude Code and the config for Cursor.</p>
          </Step>
          <Step number={2} title="Paste it in">
            <p>Run the Claude Code command in your terminal, or add the Cursor config to your mcp.json. Treat the key like a password. Revoke it in Settings if it leaks.</p>
          </Step>
        </section>

        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">EchoMe in Claude is included with Echo Studio.</p>
          <a href="/guides/plans" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">Compare plans</a>
        </section>

        <footer className="border-t border-border pt-6 mt-8 text-center text-xs text-text-secondary">
          <p>Need help? Use the chat widget in the bottom-right corner of any EchoMe page.</p>
        </footer>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-text-primary mb-1">{title}</h3>
        <div className="text-sm text-text-secondary">{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
      <strong>Tip:</strong> {children}
    </div>
  );
}
