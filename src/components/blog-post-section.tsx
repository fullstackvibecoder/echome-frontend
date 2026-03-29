'use client';

/**
 * Blog Post Section
 *
 * Full-width blog content display with:
 * - On-demand header image with style picker
 * - Formatted markdown rendering
 * - Copy, download, and schedule actions
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, ImagePlus, CalendarPlus, ChevronDown } from 'lucide-react';
import { BlogHeaderPreview } from '@/components/blog-header-preview';
import { ShareDropdown, QuickShareButton } from '@/components/share-buttons';
import api from '@/lib/api-client';
import type { GeneratedImage, ImageStyle } from '@/types';

interface StyleOption {
  value: ImageStyle;
  label: string;
  icon: string;
  description: string;
}

const IMAGE_STYLES: StyleOption[] = [
  { value: 'editorial', label: 'Editorial', icon: '📰', description: 'Magazine photography' },
  { value: 'cinematic', label: 'Cinematic', icon: '🎬', description: 'Dramatic & filmic' },
  { value: 'illustration', label: 'Illustration', icon: '✏️', description: 'Modern hand-drawn' },
  { value: '3d-render', label: '3D Render', icon: '🧊', description: 'Clean & tech-forward' },
  { value: 'watercolor', label: 'Watercolor', icon: '🎨', description: 'Soft & organic' },
  { value: 'flat-design', label: 'Flat Design', icon: '🔷', description: 'Bold geometric' },
  { value: 'gradient-abstract', label: 'Gradient', icon: '🌈', description: 'Abstract & vibrant' },
  { value: 'minimalist', label: 'Minimalist', icon: '◻️', description: 'Clean & simple' },
  { value: 'professional', label: 'Professional', icon: '💼', description: 'Business editorial' },
  { value: 'creative', label: 'Creative', icon: '✨', description: 'Artistic & striking' },
  { value: 'casual', label: 'Casual', icon: '☀️', description: 'Warm & friendly' },
];

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
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('editorial');
  const [showStylePicker, setShowStylePicker] = useState(false);

  // Extract a title from the blog content (first # or ## heading)
  const titleMatch = content.match(/^#{1,2}\s+(.+)$/m);
  const blogTitle = titleMatch ? titleMatch[1] : 'Blog Post';

  const currentStyleDef = IMAGE_STYLES.find(s => s.value === selectedStyle) || IMAGE_STYLES[0];

  const generateHeaderImage = async (style?: ImageStyle) => {
    const useStyle = style || selectedStyle;
    setIsGenerating(true);
    setGenerateError(null);
    setShowStylePicker(false);
    try {
      const response = await api.images.generateBlogHeader(
        sourceContent || content.substring(0, 500),
        { style: useStyle },
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
      <h2 className="font-headline font-bold text-2xl mb-6 flex items-center gap-3">
        <span>📝</span>
        <span>Blog Post</span>
      </h2>

      <div className="bg-white dark:bg-card rounded-[2rem] border border-outline-variant/40 shadow-[0_30px_80px_rgba(0,0,0,0.03)] p-8 overflow-hidden">
        {/* Header Image Area */}
        <div className="relative">
          {blogImage ? (
            <div>
              <BlogHeaderPreview
                image={blogImage}
                onRegenerate={() => generateHeaderImage()}
                isRegenerating={isGenerating}
                className="p-6 pb-0"
              />
              {/* Style switcher below generated image */}
              <div className="px-6 pt-3 pb-1 flex items-center gap-2">
                <span className="text-xs text-text-secondary">Style:</span>
                <div className="relative">
                  <button
                    onClick={() => setShowStylePicker(!showStylePicker)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <span>{currentStyleDef.icon}</span>
                    <span>{currentStyleDef.label}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showStylePicker && (
                    <StylePickerDropdown
                      styles={IMAGE_STYLES}
                      selected={selectedStyle}
                      onSelect={(style) => {
                        setSelectedStyle(style);
                        generateHeaderImage(style);
                      }}
                      onClose={() => setShowStylePicker(false)}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative aspect-[21/9] bg-gradient-to-r from-primary/10 to-accent-purple/10 rounded-2xl flex items-center justify-center">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-text-secondary text-sm">
                    Generating {currentStyleDef.label.toLowerCase()} header...
                  </p>
                </div>
              ) : generateError ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-text-secondary text-sm">{generateError}</p>
                  <button
                    onClick={() => generateHeaderImage()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {/* Style grid */}
                  <p className="text-text-secondary text-sm font-medium">Choose a style for your header image</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-w-lg px-4">
                    {IMAGE_STYLES.map((style) => (
                      <button
                        key={style.value}
                        onClick={() => setSelectedStyle(style.value)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-2xl border text-center transition-all ${
                          selectedStyle === style.value
                            ? 'border-outline-variant/40 ring-2 ring-primary bg-accent/15 text-accent'
                            : 'border-outline-variant/40 bg-bg-tertiary/50 hover:bg-bg-tertiary text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <span className="text-lg">{style.icon}</span>
                        <span className="text-[10px] font-medium leading-tight">{style.label}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => generateHeaderImage()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Generate {currentStyleDef.label} Header
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Blog Title Bar */}
        <div className="px-6 py-4 rounded-2xl bg-surface-container-low">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <h3 className="text-xl font-bold text-foreground">{blogTitle}</h3>
            </div>
            <div className="flex items-center gap-2">
              <ShareDropdown content={content} platform="blog" />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-headline font-semibold transition-all ${
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-headline font-semibold bg-purple-600/10 text-purple-600 hover:bg-purple-600/20 transition-all"
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
              prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:text-text-secondary prose-blockquote:bg-primary/5 prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:rounded-r-xl
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

/** Dropdown for switching style after an image is already generated */
function StylePickerDropdown({
  styles,
  selected,
  onSelect,
  onClose,
}: {
  styles: StyleOption[];
  selected: ImageStyle;
  onSelect: (style: ImageStyle) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Dropdown */}
      <div className="absolute left-0 top-full mt-1 z-50 bg-bg-secondary border border-border rounded-xl shadow-xl p-2 w-64 grid grid-cols-3 gap-1">
        {styles.map((style) => (
          <button
            key={style.value}
            onClick={() => onSelect(style.value)}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-lg text-center transition-all ${
              selected === style.value
                ? 'bg-accent/15 text-accent'
                : 'hover:bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="text-base">{style.icon}</span>
            <span className="text-[10px] font-medium leading-tight">{style.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default BlogPostSection;
