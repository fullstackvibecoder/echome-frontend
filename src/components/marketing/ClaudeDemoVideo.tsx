/* eslint-disable @next/next/no-img-element */
const ALT =
  'EchoMe transfer: click Start transfer, paste the profile an AI chat writes, tick the voice rules to keep, and get a post that follows them.';

/**
 * Loop of the Claude transfer inside a generic AI chat panel (source:
 * scripts/marketing/claude-demo/). Reduced-motion visitors get the still poster.
 */
export function ClaudeDemoVideo({ className = '' }: { className?: string }) {
  return (
    <div
      className={`mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-home-ink/15 bg-home-stage ${className}`}
      style={{ aspectRatio: '16 / 9' }}
    >
      <video
        className="block h-full w-full motion-reduce:hidden"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/marketing/echome-claude-demo-poster.png"
        aria-label={ALT}
      >
        <source src="/marketing/echome-claude-demo.mp4" type="video/mp4" />
      </video>
      <img
        src="/marketing/echome-claude-demo-poster.png"
        alt={ALT}
        className="hidden h-full w-full motion-reduce:block"
        loading="lazy"
      />
    </div>
  );
}
