import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Video Compressor — Reduce File Size Online',
  description:
    'Compress video files for free. Reduce MP4, MOV, WebM file sizes without losing quality. No signup, no watermark, no email, no account. Upload, compress, download.',
  keywords: [
    'free video compressor',
    'compress video online',
    'reduce video file size',
    'compress mp4 online free',
    'video file size reducer',
    'compress video for upload',
    'compress video no signup',
    'compress video no email required',
    'compress video no account needed',
    'free video compressor no registration',
    'compress video online no login',
    'reduce video size no watermark no signup',
  ],
  openGraph: {
    title: 'Free Video Compressor — No Signup, No Watermark',
    description: 'Compress video files online for free. No signup, no email, no watermark. Just drop your file.',
    url: 'https://tryechome.com/tools/compress-video',
    images: [{ url: '/media/echome-og.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://tryechome.com/tools/compress-video' },
};

export default function CompressToolLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
