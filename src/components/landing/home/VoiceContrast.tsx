/**
 * "Not ChatGPT" + "work before the work" in one block. The Echo side is Echo's
 * real caption for Jess Lenouvel's clip (upload de7450fe, clip 25b915e6), emoji
 * removed. Highlights mark her own words from the video.
 */
export function VoiceContrast() {
  return (
    <section id="voice" aria-labelledby="voice-heading" className="scroll-mt-6 bg-home-ink text-home-paper">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-12 px-4 py-28 sm:px-6">
        <div className="flex flex-wrap items-end gap-x-16 gap-y-6">
          <h2
            id="voice-heading"
            className="m-0 flex-[1_1_560px] font-grotesk text-[clamp(44px,6vw,88px)] font-bold leading-[0.92] tracking-[-0.045em]"
          >
            Same idea. Only one sounds like you.
          </h2>
          <p className="m-0 flex-[1_1_340px] text-lg leading-relaxed text-home-stage-muted">
            While you record, Echo is doing the work before the work: building a voice profile from everything you&apos;ve published. You
            can see what it learned, correct it, and feed it more.
          </p>
        </div>

        <div className="flex flex-wrap gap-5">
          <figure className="m-0 flex flex-[1_1_420px] flex-col gap-4 rounded-[20px] bg-home-stage-raised p-8">
            <figcaption className="text-[15px] text-home-stage-muted">A generic AI writer</figcaption>
            <p className="m-0 text-xl leading-relaxed">
              Unlock your potential by taking small, actionable steps toward your goals. Consistency is the key to lasting transformation.
              Start your journey today!
            </p>
          </figure>
          <figure className="m-0 flex flex-[1_1_420px] flex-col gap-4 rounded-md bg-home-paper p-8 text-home-ink">
            <figcaption className="text-[15px] text-home-muted">Echo, writing for Jess Lenouvel</figcaption>
            <p className="m-0 text-xl leading-relaxed">
              Ever felt like door-knocking is your worst nightmare? I get it, I&apos;m{' '}
              <mark className="bg-home-signal px-1 text-home-ink">naturally shy</mark> too. So I started{' '}
              <mark className="bg-home-signal px-1 text-home-ink">prospecting in my PJs</mark> instead. Built 100+ deals from online
              relationships.
            </p>
            <p className="m-0 text-sm leading-normal text-home-muted">
              Echo&apos;s real caption for one of Jess&apos;s clips. Highlighted: her own words, from the video.
            </p>
          </figure>
        </div>

        <a href="/guides/build-your-voice" className="self-start py-3 text-base text-home-paper underline underline-offset-4 hover:opacity-80">
          See how your voice profile works
        </a>
      </div>
    </section>
  );
}
