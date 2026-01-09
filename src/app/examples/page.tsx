'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Menu,
  X,
  ArrowRight,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  FileText,
  Video,
  Sparkles,
  Scissors,
  MessageSquare,
  Clock,
  Zap,
  Check,
} from 'lucide-react';

// Pre-rendered carousel template images from Supabase
const CAROUSEL_TEMPLATES = [
  {
    id: 'bold-statement',
    name: 'Bold Statement',
    description: 'Minimal, punchy hooks that interrupt the scroll',
    bestFor: 'Hook slides, attention-grabbing openers',
    imageUrl:
      'https://bbsrpkjwuujuszjqwnul.supabase.co/storage/v1/object/public/generated-images/examples/carousel-templates/bold-statement.png',
  },
  {
    id: 'data-point',
    name: 'Data Point',
    description: 'Statistics and metrics with visual hierarchy',
    bestFor: 'Stats, percentages, key numbers',
    imageUrl:
      'https://bbsrpkjwuujuszjqwnul.supabase.co/storage/v1/object/public/generated-images/examples/carousel-templates/data-point.png',
  },
  {
    id: 'insight-card',
    name: 'Insight Card',
    description: 'Quotable, memorable insights with decorative styling',
    bestFor: 'Key takeaways, wisdom, quotes',
    imageUrl:
      'https://bbsrpkjwuujuszjqwnul.supabase.co/storage/v1/object/public/generated-images/examples/carousel-templates/insight-card.png',
  },
  {
    id: 'story-lesson',
    name: 'Story / Lesson',
    description: 'Personal stories and vulnerable moments',
    bestFor: 'Personal experiences, lessons learned',
    imageUrl:
      'https://bbsrpkjwuujuszjqwnul.supabase.co/storage/v1/object/public/generated-images/examples/carousel-templates/story-lesson.png',
  },
  {
    id: 'action-cta',
    name: 'Action CTA',
    description: 'High-energy calls to action with animated arrow',
    bestFor: 'Final slides, driving engagement',
    imageUrl:
      'https://bbsrpkjwuujuszjqwnul.supabase.co/storage/v1/object/public/generated-images/examples/carousel-templates/action-cta.png',
  },
  {
    id: 'list-steps',
    name: 'List / Steps',
    description: 'Numbered lists and actionable steps',
    bestFor: 'How-to content, processes, tips',
    imageUrl:
      'https://bbsrpkjwuujuszjqwnul.supabase.co/storage/v1/object/public/generated-images/examples/carousel-templates/list-steps.png',
  },
  {
    id: 'tweet-style',
    name: 'Tweet Style',
    description: 'Twitter/X post card with profile and interactions',
    bestFor: 'Thread-style content, social proof',
    imageUrl:
      'https://bbsrpkjwuujuszjqwnul.supabase.co/storage/v1/object/public/generated-images/examples/carousel-templates/tweet-style.png',
  },
];

// Platform content types
const PLATFORM_CONTENT = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'from-pink-500 to-purple-600',
    description: 'Captions that match your authentic voice',
    features: ['Voice-matched captions', 'Hashtag suggestions', 'Carousel text'],
    example: `Here's the thing about consistency...

It's not about being perfect.
It's about showing up.

I used to think I needed the perfect caption, the perfect photo, the perfect timing.

Spoiler: I was wrong.

What actually matters? Being authentically you. Every. Single. Day.

Save this for when you need the reminder.

#contentcreator #authenticitymatters`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'from-blue-600 to-blue-700',
    description: 'Professional posts with your personal touch',
    features: ['Story-driven posts', 'Professional tone', 'Engagement hooks'],
    example: `I made a mistake that cost me 6 months of progress.

Here's what happened:

I was so focused on "looking professional" that I forgot to be human.

My posts were technically correct. But they had zero personality.

Then I tried something different...

I started writing like I actually talk. Shorter sentences. Real stories. Honest opinions.

The result? 3x more engagement. Real conversations. Actual connections.

The lesson: Professional ≠ Boring.

Your voice IS your brand. Use it.

What's holding you back from being more authentic on LinkedIn?`,
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    icon: Twitter,
    color: 'from-gray-700 to-gray-900',
    description: 'Threads and tweets in your unique style',
    features: ['Thread creation', 'Viral hooks', 'Concise messaging'],
    example: `Hot take: Most "productivity tips" are just procrastination in disguise.

🧵 Here's what actually works:

1/ Do the hard thing first.
Not the easy quick wins. The thing you're avoiding.

2/ Time blocks > To-do lists
Your calendar is your commitment. Everything else is a wish.

3/ "Done" beats "perfect"
Ship it. Learn from it. Improve next time.

4/ Energy management > Time management
Protect your peak hours ruthlessly.

5/ Say no more than yes.
Every yes is a no to something else.

That's it. No fancy apps. No complex systems.

Just discipline.`,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Video,
    color: 'from-gray-900 to-pink-600',
    description: 'Video scripts with your speaking style',
    features: ['Hook-first scripts', 'Natural pacing', 'Trend-aware'],
    example: `[HOOK - 0:00]
"Stop doing this immediately if you want to grow on social media..."

[SETUP - 0:03]
"I see this mistake everywhere and it's killing your engagement."

[VALUE - 0:08]
"You're posting content for everyone, which means you're actually posting for no one."

[REVEAL - 0:15]
"Pick ONE person. Your ideal follower. Write every single post as if you're talking directly to them."

[CTA - 0:22]
"Follow for more tips that actually work."`,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'from-red-500 to-red-600',
    description: 'Descriptions and scripts for video content',
    features: ['SEO-optimized descriptions', 'Timestamps', 'Video scripts'],
    example: `In this video, I'm breaking down the exact system I use to create a week's worth of content in just 2 hours.

🕐 TIMESTAMPS:
0:00 - Why batching changed everything
2:15 - The prep work that saves hours
5:30 - My content batching workflow
8:45 - Tools I actually use
12:00 - Common mistakes to avoid

📚 RESOURCES MENTIONED:
• Content Calendar Template (link in bio)
• My favorite scheduling tool

🔔 Don't forget to subscribe for weekly content creation tips!

#contentcreation #productivity #creatortips`,
  },
  {
    id: 'blog',
    name: 'Blog Post',
    icon: FileText,
    color: 'from-emerald-500 to-teal-600',
    description: 'Long-form articles in your writing style',
    features: ['SEO structure', 'Voice consistency', 'Engaging format'],
    example: `# The Truth About Content Consistency (That No One Talks About)

You've heard it a thousand times: "Just be consistent."

But here's what they don't tell you...

## Consistency Isn't About Posting Every Day

It's about showing up as the same person every time you do post.

Your audience doesn't need daily content. They need to know what to expect from you.

That means:
- Same voice
- Same values
- Same level of quality

## The Real Secret

**Batching.**

I create all my content in 2-hour blocks. Then I schedule it out.

This gives me:
1. More time to think
2. Better quality content
3. Less daily stress

Try it for one week. You'll never go back.`,
  },
  {
    id: 'email',
    name: 'Email Newsletter',
    icon: Mail,
    color: 'from-amber-500 to-orange-500',
    description: 'Newsletters that feel personal',
    features: ['Personal tone', 'Clear CTAs', 'Story-driven'],
    example: `Subject: The one thing I wish I knew 3 years ago

Hey there,

Quick story for you today...

Three years ago, I was posting content every single day. Burning out. Getting nowhere.

Then someone told me something that changed everything:

"You're creating content. But you're not building connection."

Ouch. But they were right.

So I changed my approach:
- Fewer posts, more depth
- Less "value," more vulnerability
- Stopped chasing algorithms, started serving people

The result? 10x growth in 6 months.

Here's my challenge for you this week:

Post ONE thing that scares you a little. Something real.

Then reply and tell me how it goes.

Talk soon,
[Your name]

P.S. If you found this helpful, forward it to a creator friend who needs to hear it.`,
  },
  {
    id: 'video-script',
    name: 'Video Script',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
    description: 'Full video scripts with visual cues',
    features: ['Scene directions', 'B-roll suggestions', 'Pacing notes'],
    example: `[SCENE 1 - COLD OPEN]
[You, looking directly at camera]

"I'm about to show you the exact system that helped me create 30 pieces of content from a single idea."

[Cut to screen recording]

[SCENE 2 - THE PROBLEM]
"Most creators think they need 30 different ideas for 30 posts. Wrong."

[B-roll: frustrated person at computer]

[SCENE 3 - THE SOLUTION]
"Here's what you do instead..."

[Graphics: content repurposing flowchart]

"One piece of long-form content becomes..."

[SCENE 4 - THE BREAKDOWN]
[Numbered list appearing on screen]

1. "3 Twitter threads"
2. "5 LinkedIn posts"
3. "10 Instagram carousel slides"
4. "1 newsletter"
5. "And 10+ short-form video clips"

[SCENE 5 - CTA]
"Want the full system? Link in description."`,
  },
];

export default function ExamplesPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1C1C1E]">
      {/* Navigation */}
      <nav
        className={`fixed w-full z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg'
            : 'bg-gray-900/50 backdrop-blur-md border-b border-white/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group cursor-pointer">
              <Image
                src="/media/echome-logo.svg"
                alt="EchoMe"
                width={40}
                height={40}
                className="object-contain transition-transform group-hover:scale-110"
              />
              <span
                className={`text-xl font-bold tracking-tight transition-colors ${
                  scrolled ? 'text-[#1C1C1E]' : 'text-white'
                }`}
              >
                EchoMe
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/#features"
                className={`transition font-medium ${
                  scrolled ? 'text-[#1C1C1E] hover:text-[#00D4FF]' : 'text-white hover:text-[#00D4FF]'
                }`}
              >
                Features
              </Link>
              <Link
                href="/#pricing"
                className={`transition font-medium ${
                  scrolled ? 'text-[#1C1C1E] hover:text-[#00D4FF]' : 'text-white hover:text-[#00D4FF]'
                }`}
              >
                Pricing
              </Link>
              <Link
                href="/auth/login"
                className={`transition font-medium ${
                  scrolled ? 'text-[#1C1C1E] hover:text-[#00D4FF]' : 'text-white hover:text-[#00D4FF]'
                }`}
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2.5 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all shadow-md"
              >
                Get Started
              </Link>
            </div>

            <button
              className={`md:hidden ${scrolled ? 'text-[#1C1C1E]' : 'text-white'}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-xl">
              <div className="flex flex-col p-6 space-y-4">
                <Link href="/#features" className="text-[#1C1C1E] hover:text-[#00D4FF] transition font-medium">
                  Features
                </Link>
                <Link href="/#pricing" className="text-[#1C1C1E] hover:text-[#00D4FF] transition font-medium">
                  Pricing
                </Link>
                <Link href="/auth/login" className="text-[#1C1C1E] hover:text-[#00D4FF] transition font-medium">
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-xl font-semibold text-center"
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#1C1C1E] to-gray-900" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FAFAFA]" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#00D4FF]" />
            <span className="text-white/90 font-medium text-sm">See What&apos;s Possible</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            <span className="text-white">See What You Can </span>
            <span className="bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent">
              Create
            </span>
          </h1>

          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            From Instagram carousels to LinkedIn posts, blog articles to video scripts. Explore all the content types
            EchoMe generates in your unique voice.
          </p>
        </div>
      </section>

      {/* Carousel Templates Section */}
      <section className="py-20 px-6 bg-white" id="carousel-templates">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Instagram Carousel Templates</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              7 professionally designed templates that auto-select based on your content. Or choose your favorite style
              for all slides.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {CAROUSEL_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="group bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 hover:border-[#00D4FF] hover:shadow-xl transition-all cursor-pointer"
                onClick={() => setSelectedTemplate(selectedTemplate === template.id ? null : template.id)}
              >
                {/* Image Preview */}
                <div className="relative aspect-[9/16] bg-gray-900 overflow-hidden">
                  <Image
                    src={template.imageUrl}
                    alt={template.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{template.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{template.description}</p>
                  <div className="flex items-center gap-2 text-xs text-[#00D4FF] font-medium">
                    <Zap className="w-3 h-3" />
                    <span>Best for: {template.bestFor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Content Section */}
      <section className="py-20 px-6 bg-gray-50" id="platforms">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Content for Every Platform</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              One idea, endless possibilities. See how EchoMe transforms your thoughts into platform-perfect content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLATFORM_CONTENT.map((platform) => {
              const Icon = platform.icon;
              return (
                <div
                  key={platform.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all"
                >
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${platform.color} p-6`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{platform.name}</h3>
                        <p className="text-white/80 text-sm">{platform.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {platform.features.map((feature) => (
                        <span
                          key={feature}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-white text-xs font-medium"
                        >
                          <Check className="w-3 h-3" />
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Example Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                      <MessageSquare className="w-4 h-4" />
                      <span>Example Output</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-100">
                      {platform.example}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Video Features Section */}
      <section className="py-20 px-6 bg-white" id="video">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
                <Video className="w-4 h-4 text-purple-600" />
                <span className="text-purple-600 font-medium text-sm">Video to Content</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Turn Videos Into
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {' '}
                  Viral Clips
                </span>
              </h2>

              <p className="text-gray-600 text-lg mb-8">
                Upload any video and let EchoMe find the best moments, transcribe everything, and generate a complete
                content kit ready for every platform.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Scissors, text: 'AI detects viral-worthy clip moments' },
                  { icon: FileText, text: 'Full transcription with timestamps' },
                  { icon: Sparkles, text: 'Auto-generates captions for each clip' },
                  { icon: Clock, text: 'Save hours of editing time' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Feature Preview Card */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-8 text-white">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold">my_podcast_ep42.mp4</p>
                    <p className="text-white/70 text-sm">45:32 duration</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="text-sm">Transcription</span>
                    <span className="text-green-300 text-sm font-medium">Complete</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="text-sm">Viral Clips Found</span>
                    <span className="text-yellow-300 text-sm font-medium">8 clips</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                    <span className="text-sm">Content Kit</span>
                    <span className="text-cyan-300 text-sm font-medium">Ready</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-white/80 mb-4">From one 45-minute video:</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-xs text-white/70">Short Clips</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-2xl font-bold">24</p>
                    <p className="text-xs text-white/70">Social Posts</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-2xl font-bold">1</p>
                    <p className="text-xs text-white/70">Blog Article</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-900 via-[#1C1C1E] to-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Create Content That Sounds Like You?</h2>
          <p className="text-gray-300 text-lg mb-8">
            Start building your voice profile today. No credit card required.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-[#00D4FF]/25 hover:scale-105 transition-all shadow-lg text-lg flex items-center gap-2 group"
            >
              Start Creating
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition-all text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center space-x-3">
              <Image src="/media/echome-logo.svg" alt="EchoMe" width={32} height={32} className="object-contain" />
              <span className="text-lg font-bold">EchoMe</span>
            </Link>

            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/#features" className="hover:text-white transition">
                Features
              </Link>
              <Link href="/#pricing" className="hover:text-white transition">
                Pricing
              </Link>
              <Link href="/examples" className="hover:text-white transition">
                Examples
              </Link>
            </div>

            <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} EchoMe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
