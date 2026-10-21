'use client';

import { useState } from 'react';
import { Check, Facebook, Link2, Linkedin, Mail, Twitter } from 'lucide-react';

interface ShareBarProps {
  url: string;
  title: string;
}

export function ShareBar({ url, title }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const links = [
    { label: 'Share on X', href: `https://x.com/intent/post?url=${u}&text=${t}`, Icon: Twitter },
    { label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, Icon: Linkedin },
    { label: 'Share on Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: Facebook },
    { label: 'Share by email', href: `mailto:?subject=${t}&body=${u}`, Icon: Mail },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (permissions, insecure context); nothing else to do.
    }
  }

  const button =
    'w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent transition-colors';

  return (
    <div className="flex items-center gap-2">
      {links.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={button}>
          <Icon className="w-4 h-4" />
        </a>
      ))}
      <button type="button" onClick={copy} aria-label="Copy link" className={button}>
        {copied ? <Check className="w-4 h-4 text-accent" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
