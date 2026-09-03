'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Loader2, Check, Copy, RefreshCw, Save, ImageIcon, Download } from 'lucide-react';
import { copyAsRichText, copyAsPlainText } from '@/lib/clipboard';
import { downloadImage } from '@/lib/download';
import api from '@/lib/api-client';
import type { GeneratedImage } from '@/types';

interface SubstackEditorModalProps {
  open: boolean;
  onClose: () => void;
  content: string;
  title: string;
  contentKitId: string;
  onContentUpdate: (newContent: string) => void;
}

interface Section {
  header: string;
  content: string;
}

function splitIntoSections(markdown: string): Section[] {
  const parts = markdown.split(/^(## .+)$/m);
  const sections: Section[] = [];

  if (parts[0]?.trim()) {
    sections.push({ header: 'Introduction', content: parts[0].trim() });
  }

  for (let i = 1; i < parts.length; i += 2) {
    sections.push({
      header: parts[i].replace('## ', ''),
      content: (parts[i + 1] || '').trim(),
    });
  }

  return sections;
}

function reassembleMarkdown(sections: Section[]): string {
  return sections
    .map((s, i) => {
      if (i === 0 && s.header === 'Introduction') return s.content;
      return `## ${s.header}\n\n${s.content}`;
    })
    .join('\n\n');
}

export default function SubstackEditorModal({
  open,
  onClose,
  content,
  title,
  contentKitId,
  onContentUpdate,
}: SubstackEditorModalProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [richCopied, setRichCopied] = useState(false);
  const [plainCopied, setPlainCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerImage, setHeaderImage] = useState<GeneratedImage | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);

  // Parse sections from content
  useEffect(() => {
    if (open && content) {
      setSections(splitIntoSections(content));
    }
  }, [open, content]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  const fullMarkdown = reassembleMarkdown(sections);

  const updateSection = useCallback((index: number, newContent: string) => {
    setSections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], content: newContent };
      return updated;
    });
  }, []);

  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    try {
      const fullText = reassembleMarkdown(sections);
      const result = await api.images.generateBlogHeader(title, undefined, fullText);
      if (result.success && result.data?.image) {
        setHeaderImage(result.data.image);
      }
    } catch (err) {
      console.error('Failed to generate header image:', err);
    } finally {
      setGeneratingImage(false);
    }
  };

  const markdownWithHeaderImage = headerImage
    ? `![${headerImage.altText || 'Article header'}](${headerImage.publicUrl})\n\n${fullMarkdown}`
    : fullMarkdown;

  const handleCopyRichText = async () => {
    const success = await copyAsRichText(markdownWithHeaderImage);
    if (success) {
      setRichCopied(true);
      setTimeout(() => setRichCopied(false), 2000);
    }
  };

  const handleCopyPlainText = async () => {
    const success = await copyAsPlainText(markdownWithHeaderImage);
    if (success) {
      setPlainCopied(true);
      setTimeout(() => setPlainCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.contentKits.update(contentKitId, { contentBlog: fullMarkdown });
      onContentUpdate(fullMarkdown);
    } catch (err) {
      console.error('Failed to save', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await api.contentKits.regenerate(contentKitId, {
        platforms: ['blog'],
      });
      const newKit = res.data?.kit;
      if (newKit?.contentBlog) {
        setSections(splitIntoSections(newKit.contentBlog));
        onContentUpdate(newKit.contentBlog);
      }
    } catch (err) {
      console.error('Regeneration failed', err);
      setError('Regeneration failed. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative flex w-full max-w-[900px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col lg:flex-row w-full overflow-y-auto">
          {/* Left: Article Preview */}
          <div className="lg:w-1/2 shrink-0 overflow-y-auto border-b lg:border-b-0 lg:border-r border-border bg-background/50 p-6">
            <div className="prose prose-sm prose-invert max-w-none">
              <h1 className="text-xl font-bold text-foreground mb-4">{title}</h1>
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold text-foreground mt-6 mb-2">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-foreground mt-4 mb-1">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary-interactive pl-4 my-3 text-sm italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-3">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground mb-3">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-muted-foreground">{children}</li>
                  ),
                }}
              >
                {fullMarkdown}
              </ReactMarkdown>
            </div>
          </div>

          {/* Right: Editor */}
          <div className="flex flex-col gap-4 p-6 lg:w-1/2 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Substack Article</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Header image */}
            <div className="space-y-2">
              {headerImage ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={headerImage.publicUrl} alt={headerImage.altText || 'Article header'} className="w-full" />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadImage(headerImage.publicUrl, `substack-header-${Date.now()}.png`)}
                      className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${generatingImage ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={generatingImage}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary-interactive hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {generatingImage ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating header image...</>
                  ) : (
                    <><ImageIcon className="w-4 h-4" /> Generate Header Image</>
                  )}
                </button>
              )}
            </div>

            {/* Section editors */}
            <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
              {sections.map((section, index) => (
                <div key={index} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {section.header}
                  </label>
                  <textarea
                    value={section.content}
                    onChange={(e) => updateSection(index, e.target.value)}
                    rows={Math.min(Math.max(section.content.split('\n').length + 1, 3), 8)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-interactive/50 resize-y"
                  />
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleCopyRichText}
                className="flex items-center gap-1.5 rounded-lg bg-primary-interactive px-3 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                {richCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy for Substack
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyPlainText}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-card transition-colors"
              >
                {plainCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy as Markdown
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>

              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
