import { Figure, H2, PostLayout, Quote, Strong } from '@/components/blog/PostLayout';
import { postMetadata } from '../posts';

const SLUG = 'giovanna-3000-views-overnight';

export const metadata = postMetadata(SLUG);

export default function GiovannaCaseStudyPage() {
  return (
    <PostLayout slug={SLUG}>
      <p>
        Giovanna Cavarra is a real estate sales representative. At our weekly office hours she told the group something I want every EchoMe user to hear, so here it is with her permission.
      </p>

      <Quote>
        &ldquo;I wasn&apos;t getting a lot of views. Then I put a video I&apos;d made into EchoMe, it cut it into short clips, and I posted right from EchoMe. Overnight I got almost 3,000 views. I didn&apos;t do anything except click a couple buttons.&rdquo;
      </Quote>

      <p>
        That&apos;s a great result. But my first reaction on the call was to tell her not to give EchoMe the credit for it, and I meant it.
      </p>

      <H2>Credit the clip, not the tool</H2>
      <p>
        EchoMe made the clip. It found the moment in her video, cut it, captioned it, and posted it. That part saved her time, and that is what the product is for.
      </p>

      <Figure
        src="/blog/clip-editor.webp"
        alt="The EchoMe clip editor showing a vertical clip, its transcript, the post caption and posting options"
        width={1600}
        height={805}
        caption="The clip editor: EchoMe picks the moment, you can trim it, tweak the caption, and post or schedule from one screen."
      />

      <p>
        The views came from what was in the clip. The software didn&apos;t invent anything. It found something real she had already said and put it in front of people. If the video had been a polished pitch, the same clip-cutting would have produced a polished pitch, and people would have scrolled past it.
      </p>

      <H2>Why clips like hers work</H2>
      <p>
        <Strong>It wasn&apos;t staged.</Strong> Everyone has seen the sit-down talking-head video: good lighting, a script, a smile, &ldquo;Hi everyone, today I want to talk about.&rdquo; People have learned that format usually means an ad is coming, and they move on before you get to the point.
      </p>
      <p>
        <Strong>It was cut from something longer.</Strong> A clip pulled from the middle of a longer video doesn&apos;t open with a formal intro or close with a sign-off. It starts where the thinking starts.
      </p>
      <p>
        <Strong>It holds one complete thought.</Strong> A good clip is a whole idea, said the way you would actually say it to someone. That comes across as natural, and natural is what people stop for.
      </p>

      <H2>More of you in, better content out</H2>
      <p>
        Giovanna said something else that matters. She had started to feel EchoMe&apos;s output was generic, and then she noticed it turning around: &ldquo;because I&apos;m putting more information in.&rdquo;
      </p>
      <p>
        That is the whole idea behind EchoMe. It can only sound like you if it has heard you. A typed prompt gives it very little to go on. A real video of you explaining something gives it your words, your opinions, and the way you put things. The more real material you give it, the less generic everything it makes becomes.
      </p>

      <H2>How to do what Giovanna did</H2>
      <ol className="list-decimal pl-6 space-y-3">
        <li>
          <Strong>Record something you would say anyway.</Strong> Talk through a question a client asked you, or what you are seeing in your market this week. Record it on your phone while you&apos;re driving somewhere. No script, no setup.
        </li>
        <li>
          <Strong>Upload the whole thing.</Strong> Don&apos;t trim it first. EchoMe needs the full video to find the complete thoughts inside it.
        </li>
        <li>
          <Strong>Pick the clip that sounds most like you talking to one person</Strong>, and post it straight from EchoMe.
        </li>
      </ol>
      <p>
        You don&apos;t need to show up with produced content. I say it every week at office hours, and Giovanna&apos;s post is the best proof of it so far.
      </p>

      <p className="text-base text-text-secondary/80 border-t border-border pt-6">
        One honest note: this was one post on one night. Not every clip will do 3,000 views, and anyone who promises you that is selling something. What does hold up is the pattern: real, unscripted thinking, cut into a complete thought, beats polished content that reads like an ad.
      </p>
    </PostLayout>
  );
}
