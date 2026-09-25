/**
 * WalkthroughVideo.tsx
 * Responsive 16:9 Loom embed for the founder's 20-minute product
 * walkthrough. Shared between the guides index ("hero" variant) and the
 * platform-overview guide ("inline" variant) so the embed markup never
 * drifts between the two placements.
 */

const LOOM_EMBED_URL = 'https://www.loom.com/embed/77e3e0f47fdc406cb5487ded1b87206c';

interface WalkthroughVideoProps {
  /** hero = larger heading, used on the guides index. inline = used inside a guide page. */
  variant: 'hero' | 'inline';
}

export function WalkthroughVideo({ variant }: WalkthroughVideoProps) {
  const isHero = variant === 'hero';

  return (
    <div id="watch" className="mb-10">
      <h2
        className={
          isHero
            ? 'text-2xl font-bold text-text-primary mb-1'
            : 'text-lg font-semibold text-text-primary mb-1'
        }
      >
        Watch the 20-minute walkthrough
      </h2>
      <p className="text-sm text-text-secondary mb-4">
        Ara takes four members through the whole flow, from dropping a video to posting, live.
      </p>
      <div className="rounded-xl overflow-hidden border border-border">
        <div style={{ position: 'relative', paddingBottom: '64.98%', height: 0 }}>
          <iframe
            src={LOOM_EMBED_URL}
            frameBorder="0"
            allowFullScreen
            loading="lazy"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            title="EchoMe walkthrough"
          />
        </div>
      </div>
    </div>
  );
}
