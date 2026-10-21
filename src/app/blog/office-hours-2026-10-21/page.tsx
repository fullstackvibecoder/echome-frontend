import Link from 'next/link';
import { Figure, H2, PostLayout, Strong } from '@/components/blog/PostLayout';
import { postMetadata } from '../posts';

const SLUG = 'office-hours-2026-10-21';

export const metadata = postMetadata(SLUG);

export default function OfficeHoursRecapPage() {
  return (
    <PostLayout slug={SLUG}>
      <p>
        Every week we run live office hours for EchoMe and Closr users. You bring questions, we show what is new, and we fix what is broken. Here is what we covered on October 21.
      </p>

      <H2>Start with one box</H2>
      <p>
        The Create screen is where everything starts. Drop in a video, or paste a YouTube, Zoom or Loom link, and EchoMe turns it into a full set of content. You don&apos;t need polished production to get something worth posting.
      </p>
      <p>
        That same box understands what you mean. Type or say something and Echo works out whether you are creating a kit, adding to your voice, asking a question or giving it a command, and shows you before it acts.
      </p>

      <Figure
        src="/blog/detected-intent.webp"
        alt="The Create box showing detected intent options: creating a kit, adding to your voice, question, command"
        width={1600}
        height={905}
        caption="Echo reads what you typed and suggests what to do with it."
      />

      <H2>One long video, many short pieces</H2>
      <p>
        Paste a video link and submit it. EchoMe scans the whole thing for the strongest moments and gives you short clips, captions, downloads, and post-ready versions for the platforms you&apos;ve connected. Every clip is editable, so you can trim it before it goes anywhere.
      </p>

      <Figure
        src="/blog/clip-editor.webp"
        alt="The EchoMe clip editor with a vertical clip, transcript, caption and posting options"
        width={1600}
        height={805}
        caption="Trim the clip, adjust the caption, then post now or schedule it."
      />

      <p>
        From the same video you also get carousel slides, a blog post draft, LinkedIn and X posts, and platform-specific captions. EchoMe can post or schedule directly to Instagram, Facebook, LinkedIn, YouTube, TikTok and more. The blog draft is written to paste straight into Substack, and if you use a Closr website, it can populate your site&apos;s blog too.
      </p>

      <p>
        This is exactly what Giovanna did this week, and it got her almost 3,000 views overnight.{' '}
        <Link href="/blog/giovanna-3000-views-overnight" className="text-accent hover:underline">Read why it worked</Link>.
      </p>

      <H2>No video? Start with an opinion</H2>
      <p>
        You don&apos;t have to begin with a video. Give EchoMe a topic and it will build a content kit, a blog draft, carousel content and a video script. It works best when you include your own take, not just a subject. &ldquo;Affordable housing&rdquo; gets you something generic. What you actually think about it gets you something that sounds like you.
      </p>

      <Figure
        src="/blog/kit-written-content.webp"
        alt="A content kit in EchoMe with written content tabs for LinkedIn, email, TikTok and a video script"
        width={1600}
        height={904}
        caption="A kit built from a text prompt: posts for each platform, plus a video script."
      />

      <H2>Record it with the teleprompter</H2>
      <p>
        If EchoMe writes you a script, open it in the built-in teleprompter and record right there. Then send that recording back into EchoMe to cut clips from it. Script, record and clip, all in one place.
      </p>

      <H2>Teach Echo your voice</H2>
      <p>
        EchoMe starts with a public search to build a first picture of how you sound. You can make it much stronger by adding your website or blog, your YouTube channel, your Instagram, past videos and other public content. It can also learn from your sent email: export it with Google Takeout and upload it.
      </p>
      <p>
        Once that material is in, EchoMe looks for content opportunities in it every day, up to three at a time. They don&apos;t pile up if you skip them, and you get an email for each one.
      </p>

      <Figure
        src="/blog/voice-profile-numbers.webp"
        alt="The EchoMe home screen with voice profile strength and the Your numbers panel"
        width={1600}
        height={982}
        caption="Your voice profile strength and your numbers live on the home screen."
      />

      <H2>Finish your settings</H2>
      <p>
        A lot of questions this week came back to setup. Make sure onboarding and settings are complete: your website, your area, a profile photo, and your connected social accounts. Two of these matter more than they look. <Strong>Your profile photo is used in carousels</Strong>, and <Strong>connected accounts are what make posting from EchoMe work</Strong>.
      </p>

      <Figure
        src="/blog/settings-connections.webp"
        alt="EchoMe settings showing connected Facebook, LinkedIn, YouTube and Instagram accounts"
        width={1600}
        height={982}
        caption="Settings, Connections: connect each account you want EchoMe to post to."
      />

      <H2>Two carousel fixes</H2>
      <p>
        <Strong>Changing photos on every slide.</Strong> A user reported they could only swap the image on some slides. That is fixed: you can now change the photo on any slide.
      </p>
      <p>
        <Strong>Edits reverting on download.</Strong> Another user reported that after editing a carousel, the download came out looking like the original. On the call I guessed it was a short hosting outage we had that day. It wasn&apos;t. We looked into it right after, and it was a bug: Download was rebuilding the carousel from scratch instead of using your edited version. It was fixed and live the same day. Download now gives you exactly what you see in the editor, your photos, text and highlighted word included. We&apos;re also removing the slide numbers that were printing above the copy on every carousel style.
      </p>
      <p>
        If you want a walkthrough, the <Link href="/guides/carousels" className="text-accent hover:underline">carousel guide</Link> now has a short video.
      </p>

      <H2>Next week</H2>
      <p>
        We&apos;ll save more time for Closr questions. Until then, keep sending questions and bug reports. Every one of the fixes above started with somebody telling us something was off.
      </p>
    </PostLayout>
  );
}
