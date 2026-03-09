'use client';

/**
 * Blog Post Section
 *
 * Full-width blog content display with:
 * - Auto-generated header image (via DALL-E / FLUX)
 * - Formatted markdown rendering
 * - Copy, download, and schedule actions
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Download, RefreshCw, Copy, Check, Maximize2, X, ImagePlus, CalendarPlus } from 'lucide-react';
import { BlogHeaderPreview } from '@/components/blog-header-preview';
import { ShareDropdown, QuickShareButton } from '@/components/share-buttons';
import { downloadImage } from '@/lib/download';
import api from '@/lib/api-client';
import type { GeneratedImage } from '@/types';

interface BlogPostSectionProps {
  content: string;
  contentKitId: string;
  sourceContent?: string;
  onSchedule?: () => void;
}

export function BlogPostSection({
  content,
  contentKitId,
  sourceContent,
  onSchedule,
}: BlogPostSectionProps) {
  const [blogImage, setBlogImage] = useState<GeneratedImage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  // Extract a title from the blog content (first # or ## heading)
  const titleMatch = content.match(/^#{1,2}\s+(.+)$/m);
  const blogTitle = titleMatch ? titleMatch[1] : 'Blog Post';

  // No auto-generation — header image is generated on-demand to avoid
  // burning API credits every time the content kit page is opened

  const generateHeaderImage = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const response = await api.images.generateBlogHeader(
        sourceContent || content.substring(0, 500),
        { style: 'professional' },
        content,
      );
      if (response.data?.image) {
        setBlogImage(response.data.image);
      }
    } catch (err) {
      console.error('Blog header generation failed:', err);
      setGenerateError('Failed to generate header image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section id="blog-post-section">
      <h2 className="text-display text-2xl mb-6 flex items-center gap-3">
        <span>📝</span>
        <span>Blog Post</span>
      </h2>

      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        {/* Header Image Area */}
        <div className="relative">
          {blogImage ? (
            <BlogHeaderPreview
              image={blogImage}
              onRegenerate={generateHeaderImage}
              isRegenerating={isGenerating}
              className="p-6 pb-0"
            />
          ) : (
            <div className="relative aspect-[21/9] bg-gradient-to-br from-emerald-500/10 via-bg-tertiary to-primary/10 flex items-center justify-center">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-text-secondary text-sm">Generating header image...</p>
                </div>
              ) : generateError ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-text-secondary text-sm">{generateError}</p>
                  <button
                    onClick={generateHeaderImage}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              ) : (
                <button
                  onClick={generateHeaderImage}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                >
                  <ImagePlus className="w-4 h-4" />
                  Generate Header Image
                </button>
              )}
            </div>
          )}
        </div>

        {/* Blog Title Bar */}
        <div className="px-6 py-4 border-b border-border/50 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <h3 className="text-xl font-bold text-foreground">{blogTitle}</h3>
            </div>
            <div className="flex items-center gap-2">
              <ShareDropdown content={content} platform="blog" />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  copied
                    ? 'bg-success/10 text-success'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <QuickShareButton content={content} platformKey="blog" />
              {onSchedule && (
                <button
                  onClick={onSchedule}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600/10 text-purple-600 hover:bg-purple-600/20 transition-all"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Schedule
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Formatted Blog Content */}
        <div className="p-6">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-accent hover:underline mb-4"
          >
            {isExpanded ? 'Collapse content' : 'Expand full blog post...'}
          </button>

          {isExpanded && (
            <article className="prose prose-sm sm:prose-base max-w-none
              prose-headings:text-foreground prose-headings:font-bold
              prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6
              prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5
              prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
              prose-p:text-text-secondary prose-p:leading-relaxed prose-p:mb-3
              prose-strong:text-foreground
              prose-ul:text-text-secondary prose-ul:my-2
              prose-ol:text-text-secondary prose-ol:my-2
              prose-li:text-text-secondary prose-li:mb-1
              prose-blockquote:border-l-accent prose-blockquote:text-text-secondary prose-blockquote:bg-bg-tertiary prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
              prose-a:text-accent prose-a:no-underline hover:prose-a:underline
              prose-code:text-accent prose-code:bg-bg-tertiary prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            ">
              <ReactMarkdown>{content}</ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

export default BlogPostSection;
