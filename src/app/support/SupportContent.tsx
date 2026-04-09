'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, Upload, Mic, Video, Scissors, FileText, BookOpen, Mail, MessageSquare, AlertTriangle } from 'lucide-react';

export default function SupportContent() {
  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-stone-600 hover:text-[#00D4FF] transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        <div className="mb-12">
          <h1 className="bg-gradient-to-r from-[#00D4FF] to-[#0099CC] bg-clip-text text-transparent text-4xl md:text-5xl font-medium mb-4">
            Support
          </h1>
          <p className="text-lg text-stone-600">
            Everything you need to get the most out of EchoMe
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">

          {/* Getting Started */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                Getting Started
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              EchoMe turns your videos into ready-to-post content that sounds like you wrote it. Here is how to get up and running:
            </p>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-1">
                  1. Create your account
                </h3>
                <p className="text-stone-700 text-sm">
                  Sign up with your email or Google account. Your first 2 generations are free, no credit card required.
                </p>
              </div>
              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-1">
                  2. Build your voice profile
                </h3>
                <p className="text-stone-700 text-sm">
                  Add content to your Knowledge Base. Paste text, import URLs, upload documents, or record a voice sample. The more context EchoMe has, the better it matches your voice.
                </p>
              </div>
              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-1">
                  3. Upload your first video
                </h3>
                <p className="text-stone-700 text-sm">
                  Drop a video file, paste a YouTube link, or record directly. EchoMe will extract clips, add captions, and write social posts for LinkedIn, Twitter, and Instagram.
                </p>
              </div>
              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-1">
                  4. Review and share
                </h3>
                <p className="text-stone-700 text-sm">
                  Your Content Kit includes captioned clips, platform-specific posts, and carousel slides. Download, copy, or share directly from the app.
                </p>
              </div>
            </div>
          </div>

          {/* Uploading Videos */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                Uploading Videos
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Supported formats</h3>
                <p className="text-stone-700 text-sm">
                  MP4, MOV, and WebM. Videos between 2 and 60 minutes work best for clip extraction. Maximum file size is 4GB on most plans.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">YouTube link import</h3>
                <p className="text-stone-700 text-sm">
                  Paste any YouTube video URL (standard links, shorts, or youtu.be links). EchoMe will download the video and process it the same way as a direct upload. YouTube imports may occasionally fail due to platform restrictions. If a link fails, try downloading the video and uploading the file directly.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Processing time</h3>
                <p className="text-stone-700 text-sm">
                  Most videos are fully processed in 3 to 8 minutes. Longer videos or YouTube imports with retries may take up to 15 minutes. You can navigate away during processing. We will notify you when your Content Kit is ready.
                </p>
              </div>
            </div>
          </div>

          {/* Content Kit */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                Your Content Kit
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              Every video you process generates a complete Content Kit containing:
            </p>
            <ul className="text-stone-700 text-sm space-y-2 pl-4">
              <li>
                <span className="font-medium text-stone-800">Video clips</span> with auto-generated captions, scored by engagement potential. Each clip includes a thumbnail, transcript, and suggested caption.
              </li>
              <li>
                <span className="font-medium text-stone-800">Social posts</span> written in your voice for LinkedIn, Twitter, and Instagram. These are generated from the video transcript and matched to your voice profile.
              </li>
              <li>
                <span className="font-medium text-stone-800">Carousel slides</span> in square and portrait formats, ready to download for Instagram and LinkedIn.
              </li>
              <li>
                <span className="font-medium text-stone-800">Full transcript</span> of your video, available to copy or download.
              </li>
            </ul>
          </div>

          {/* Voice Profile and Knowledge Base */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                Voice Profile and Knowledge Base
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              EchoMe learns how you communicate so that generated content sounds like you, not like generic AI output.
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">How your voice profile works</h3>
                <p className="text-stone-700 text-sm">
                  Your voice profile is built from everything in your Knowledge Base. EchoMe analyzes your writing patterns, vocabulary, sentence structure, tone, and perspective. The more content you provide, the stronger the voice match.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Adding to your Knowledge Base</h3>
                <p className="text-stone-700 text-sm">
                  You can add content in several ways: paste text directly, import URLs from blog posts or articles, upload documents (PDF, DOCX, TXT), import email archives (MBOX), or record voice samples. Each source helps EchoMe understand a different dimension of how you communicate.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Voice strength</h3>
                <p className="text-stone-700 text-sm">
                  Your Knowledge Base screen shows a voice strength indicator. Aim for at least 5 to 10 content sources for a strong voice match. Posts generated with a higher voice strength score will sound more authentically like you.
                </p>
              </div>
            </div>
          </div>

          {/* Clips and Exports */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Video className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                Clips and Exports
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Caption styles</h3>
                <p className="text-stone-700 text-sm">
                  Choose from multiple caption styles including Modern, Big and Bold, Color Pop, Karaoke, Underline, One at a Time, Subtitle Bar, and Clean and Simple. Captions are synced at the word level for precise timing.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Caption position</h3>
                <p className="text-stone-700 text-sm">
                  Place captions at the bottom, center, or top of your clips. Your preference is saved per clip.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Export quality</h3>
                <p className="text-stone-700 text-sm">
                  Export clips in 720p, 1080p, or 4K resolution. Higher resolutions take slightly longer to render.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">View modes</h3>
                <p className="text-stone-700 text-sm">
                  Export in single view (standard vertical clip) or split-screen view (clip on top, original context on bottom). Split-screen works well for reaction-style content and talking-head videos.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Create */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                Quick Create
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              Generate content without uploading a video. There are three ways to use Quick Create:
            </p>
            <div className="space-y-3">
              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-1">Type or paste text</h3>
                <p className="text-stone-700 text-sm">
                  Describe a topic, paste an article, or write a prompt. EchoMe generates platform-specific posts in your voice.
                </p>
              </div>
              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-1">Record voice</h3>
                <p className="text-stone-700 text-sm">
                  Speak your idea. EchoMe transcribes it and turns it into polished content for each platform.
                </p>
              </div>
              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-1">Repurpose</h3>
                <p className="text-stone-700 text-sm">
                  Paste an existing post from one platform and EchoMe rewrites it for others, maintaining your voice across channels.
                </p>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                Troubleshooting
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">My YouTube import failed</h3>
                <p className="text-stone-700 text-sm">
                  YouTube occasionally blocks automated downloads due to platform restrictions. EchoMe attempts multiple download methods automatically. If all methods fail, download the video manually and upload the file directly. This is the most reliable approach.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Processing seems stuck</h3>
                <p className="text-stone-700 text-sm">
                  Most videos complete within 3 to 8 minutes. Longer videos (30+ minutes) or YouTube imports may take up to 15 minutes. If processing has not completed after 20 minutes, check your Library. If the upload shows as failed, try uploading again. If the issue persists, contact support.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Generated content does not sound like me</h3>
                <p className="text-stone-700 text-sm">
                  This usually means your Knowledge Base needs more content. Add at least 5 to 10 sources (past blog posts, social content, or voice recordings) to strengthen your voice profile. The more varied your sources, the better EchoMe captures your full range.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Clips are missing captions</h3>
                <p className="text-stone-700 text-sm">
                  Captions are burned into clips during export, not during initial processing. When downloading or sharing a clip, make sure the "Add Captions" option is enabled in the export settings.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">I cannot log in</h3>
                <p className="text-stone-700 text-sm">
                  Try resetting your password from the login screen. If you signed up with Google, use the Google sign-in button instead of email and password. If you are still locked out, email support and we will help you recover your account.
                </p>
              </div>
            </div>
          </div>

          {/* Plans and Billing */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                Plans and Billing
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Free plan</h3>
                <p className="text-stone-700 text-sm">
                  Includes 2 free generations with voice matching, 1 platform per generation, and standard templates. No credit card required.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Paid plans</h3>
                <p className="text-stone-700 text-sm">
                  Echo ($29/mo), Echo Studio ($49/mo), and Echo Pro ($99/mo) offer increasing processing hours, clips per video, Knowledge Base slots, export quality, and Creator Library access. Team plans are available starting at $129/mo for agencies managing multiple voices.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-stone-800 mb-2">Managing your subscription</h3>
                <p className="text-stone-700 text-sm">
                  You can upgrade, downgrade, or cancel your subscription at any time from your Settings page. Billing is handled securely through Stripe. We do not store your card details on our servers.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                Contact Support
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              Could not find what you are looking for? Reach out and we will get back to you within 24 hours.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#00D4FF]" />
                <a
                  href="mailto:support@tryechome.com"
                  className="text-[#00D4FF] hover:underline font-medium"
                >
                  support@tryechome.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-[#00D4FF]" />
                <span className="text-stone-700 text-sm">
                  Use the chat widget on{' '}
                  <a
                    href="https://tryechome.com"
                    className="text-[#00D4FF] hover:underline font-medium"
                  >
                    tryechome.com
                  </a>
                  {' '}for quick questions
                </span>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              Legal
            </h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/privacy"
                className="text-[#00D4FF] hover:underline font-medium text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-[#00D4FF] hover:underline font-medium text-sm"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-16"></div>
      </div>
    </div>
  );
}
