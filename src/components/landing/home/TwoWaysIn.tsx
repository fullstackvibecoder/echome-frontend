const WAYS = [
  {
    big: '5-20',
    title: 'Minutes on your phone',
    body: 'In the car, on a walk, between clients. Talk the way you already talk. No script, no ring light, no editing.',
  },
  {
    big: '1 link',
    title: 'From work you already made',
    body: 'Webinars, client calls, old episodes. Paste a YouTube, Zoom or Loom link and Echo finds the moments worth posting.',
  },
];

export function TwoWaysIn() {
  return (
    <section id="how" aria-label="Two ways to start" className="mx-auto flex max-w-[1320px] scroll-mt-6 flex-wrap gap-16 px-4 pb-28 pt-12 sm:px-6">
      {WAYS.map((w) => (
        <div key={w.title} className="flex flex-[1_1_440px] flex-col gap-3.5">
          <span aria-hidden="true" className="font-grotesk text-[clamp(80px,11vw,168px)] font-bold leading-[0.85] tracking-[-0.06em] text-home-ink">
            {w.big}
          </span>
          <h2 className="m-0 font-grotesk text-[30px] font-semibold tracking-[-0.02em] text-home-ink">
            <span className="sr-only">{w.big} </span>
            {w.title}
          </h2>
          <p className="m-0 max-w-[30em] text-lg leading-relaxed text-home-muted">{w.body}</p>
        </div>
      ))}
    </section>
  );
}
