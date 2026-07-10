import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free YouTube Transcript Generator, No Signup',
  description:
    'Get the full transcript of any YouTube video for free as clean, copy-ready text. Download it as a .txt file. No signup, no email, no account.',
  keywords: [
    'youtube transcript generator',
    'youtube transcript',
    'get youtube transcript',
    'youtube to text',
    'transcribe youtube video',
    'youtube transcript to text file',
    'youtube transcript no signup',
    'free youtube transcript online',
    'youtube captions to text',
    'copy youtube transcript',
  ],
  openGraph: {
    title: 'Free YouTube Transcript Generator, No Signup',
    description: 'Paste a YouTube link, get the full transcript as clean, copy-ready text. Download as a .txt file.',
    url: 'https://tryechome.com/tools/transcribe',
    images: [{ url: '/media/echome-og.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://tryechome.com/tools/transcribe' },
};

export default function TranscribeToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
