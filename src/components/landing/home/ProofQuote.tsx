export function ProofQuote() {
  return (
    <section aria-label="Member result" className="mx-auto max-w-[1320px] px-4 py-28 sm:px-6">
      <figure className="m-0 flex max-w-[1000px] flex-col gap-5">
        <blockquote className="m-0 font-grotesk text-[clamp(30px,3.8vw,52px)] font-semibold leading-[1.1] tracking-[-0.03em] text-home-ink">
          &ldquo;Overnight I got almost 3,000 views. I didn&apos;t do anything except click a couple buttons.&rdquo;
        </blockquote>
        <figcaption className="text-base text-home-muted">
          Giovanna Cavarra, Real Estate Sales Representative. From a video she&apos;d already recorded.{' '}
          <a href="/blog/giovanna-3000-views-overnight" className="text-home-ink underline underline-offset-4 hover:opacity-80">
            Read why it worked
          </a>
        </figcaption>
      </figure>
    </section>
  );
}
