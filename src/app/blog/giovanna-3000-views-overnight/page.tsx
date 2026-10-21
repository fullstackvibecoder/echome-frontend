import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Almost 3,000 Views Overnight From a Video She Had Already Made | EchoMe',
  description:
    'Giovanna Cavarra was not getting views. Then she posted a short clip cut from a real video and got almost 3,000 views overnight. Why it worked.',
  alternates: { canonical: 'https://tryechome.com/blog/giovanna-3000-views-overnight' },
};

export default function GiovannaCaseStudyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Almost 3,000 views overnight from a video she had already made',
    description:
      'Giovanna Cavarra was not getting views. Then she posted a short clip cut from a real video and got almost 3,000 views overnight. Why it worked.',
    url: 'https://tryechome.com/blog/giovanna-3000-views-overnight',
    datePublished: '2026-10-21',
    dateModified: '2026-10-21',
    author: { '@type': 'Person', name: 'Ara Mamourian' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://tryechome.com/blog' },
        { '@type': 'ListItem', position: 3, name: 'Giovanna Cavarra case study', item: 'https://tryechome.com/blog/giovanna-3000-views-overnight' },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <JsonLd data={jsonLd} />
      <article className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="mb-8">
          <a href="/blog" className="text-sm text-accent hover:underline">&larr; Blog</a>
        </div>

        <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">Case study</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Almost 3,000 views overnight from a video she had already made
        </h1>
        <p className="text-sm text-text-secondary/70 mb-10">
          By Ara Mamourian &middot; October 21, 2026 &middot; 4 min read
        </p>

        <div className="space-y-6 text-lg text-text-secondary leading-relaxed">
          <p>
            Giovanna Cavarra is a real estate sales representative. At our weekly office hours she told the group something I want every EchoMe user to hear, so here it is with her permission.
          </p>

          <blockquote className="border-l-4 border-accent pl-5 text-text-primary italic">
            &ldquo;I wasn&apos;t getting a lot of views. Then I put a video I&apos;d made into EchoMe, it cut it into short clips, and I posted right from EchoMe. Overnight I got almost 3,000 views. I didn&apos;t do anything except click a couple buttons.&rdquo;
          </blockquote>

          <p>
            That&apos;s a great result. But my first reaction on the call was to tell her not to give EchoMe the credit for it, and I meant it.
          </p>

          <h2 className="text-2xl font-bold text-text-primary pt-4">Credit the clip, not the tool</h2>
          <p>
            EchoMe made the clip. It found the moment in her video, cut it, captioned it, and posted it. That part saved her time, and that is what the product is for.
          </p>
          <p>
            The views came from what was in the clip. The software didn&apos;t invent anything. It found something real she had already said and put it in front of people. If the video had been a polished pitch, the same clip-cutting would have produced a polished pitch, and people would have scrolled past it.
          </p>

          <h2 className="text-2xl font-bold text-text-primary pt-4">Why clips like hers work</h2>
          <p>
            <strong className="text-text-primary">It wasn&apos;t staged.</strong> Everyone has seen the sit-down talking-head video: good lighting, a script, a smile, &ldquo;Hi everyone, today I want to talk about.&rdquo; People have learned that format usually means an ad is coming, and they move on before you get to the point.
          </p>
          <p>
            <strong className="text-text-primary">It was cut from something longer.</strong> A clip pulled from the middle of a longer video doesn&apos;t open with a formal intro or close with a sign-off. It starts where the thinking starts.
          </p>
          <p>
            <strong className="text-text-primary">It holds one complete thought.</strong> A good clip is a whole idea, said the way you would actually say it to someone. That comes across as natural, and natural is what people stop for.
          </p>

          <h2 className="text-2xl font-bold text-text-primary pt-4">More of you in, better content out</h2>
          <p>
            Giovanna said something else that matters. She had started to feel EchoMe&apos;s output was generic, and then she noticed it turning around: &ldquo;because I&apos;m putting more information in.&rdquo;
          </p>
          <p>
            That is the whole idea behind EchoMe. It can only sound like you if it has heard you. A typed prompt gives it very little to go on. A real video of you explaining something gives it your words, your opinions, and the way you put things. The more real material you give it, the less generic everything it makes becomes.
          </p>

          <h2 className="text-2xl font-bold text-text-primary pt-4">How to do what Giovanna did</h2>
          <ol className="list-decimal pl-6 space-y-3">
            <li>
              <strong className="text-text-primary">Record something you would say anyway.</strong> Talk through a question a client asked you, or what you are seeing in your market this week. Record it on your phone while you&apos;re driving somewhere. No script, no setup.
            </li>
            <li>
              <strong className="text-text-primary">Upload the whole thing.</strong> Don&apos;t trim it first. EchoMe needs the full video to find the complete thoughts inside it.
            </li>
            <li>
              <strong className="text-text-primary">Pick the clip that sounds most like you talking to one person</strong>, and post it straight from EchoMe.
            </li>
          </ol>
          <p>
            You don&apos;t need to show up with produced content. I say it every week at office hours, and Giovanna&apos;s post is the best proof of it so far.
          </p>

          <p className="text-base text-text-secondary/80 border-t border-border pt-6">
            One honest note: this was one post on one night. Not every clip will do 3,000 views, and anyone who promises you that is selling something. What does hold up is the pattern: real, unscripted thinking, cut into a complete thought, beats polished content that reads like an ad.
          </p>
        </div>

        <section className="text-center py-12">
          <p className="text-text-secondary mb-4">Have a video on your phone you never posted?</p>
          <a href="/auth/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">
            Turn it into clips, free
          </a>
          <p className="text-xs text-text-secondary/70 mt-3">No credit card required.</p>
        </section>
      </article>
    </div>
  );
}
