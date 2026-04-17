'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Paperclip,
  Mic,
  ArrowRight,
  Play,
  FileText,
  Mail,
  LayoutGrid,
  Video,
  BookOpen,
  Youtube,
  Mic2,
  MonitorPlay,
} from 'lucide-react';

interface UnifiedCreateInputProps {
  onSubmit: (text: string, file?: File) => void;
  onMicClick: () => void;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  zoomPasswordValue: string;
  onZoomPasswordChange: (value: string) => void;
}

const OUTPUT_ITEMS = [
  { icon: Play, label: 'Clips', detail: 'With captions' },
  { icon: LayoutGrid, label: 'Carousel', detail: 'Slides' },
  { icon: FileText, label: 'Blog', detail: 'Draft' },
  { icon: Mail, label: 'Email', detail: 'Newsletter' },
];

const PLATFORM_NAMES = ['LinkedIn', 'Instagram', 'Twitter/X', 'TikTok', 'YouTube'];

const GUIDES = [
  {
    href: '/guides/youtube-to-content',
    icon: Youtube,
    title: 'YouTube to Content',
    description: 'Turn any YouTube video into a full content suite',
  },
  {
    href: '/guides/video-content',
    icon: MonitorPlay,
    title: 'Video Content Guide',
    description: 'How to create and manage video content',
  },
  {
    href: '/guides/build-your-voice',
    icon: Mic2,
    title: 'Build Your Voice',
    description: 'Train EchoMe to sound like you',
  },
  {
    href: '/guides/compress-video',
    icon: FileText,
    title: 'Compress Video',
    description: 'Reduce file size before uploading',
  },
];

export default function UnifiedCreateInput({
  onSubmit,
  onMicClick,
  onFileSelect,
  disabled,
  zoomPasswordValue,
  onZoomPasswordChange,
}: UnifiedCreateInputProps) {
  const [text, setText] = useState('');
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const handleSubmit = useCallback(() => {
    if (!text.trim() && !droppedFile) return;
    onSubmit(text, droppedFile ?? undefined);
    setText('');
    setDroppedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, droppedFile, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDroppedFile(file);
      onFileSelect(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setDroppedFile(file);
      onFileSelect(file);
    }
  };

  const isZoomUrl = /zoom\.us/i.test(text);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Heading */}
      <h2 className="text-[22px] font-semibold text-foreground text-center">
        What are we turning into content?
      </h2>
      <p className="text-[13px] text-muted-foreground text-center mb-8">
        A video, a link, a topic — whatever you&apos;ve got.
      </p>

      <div className="max-w-[520px] w-full mx-auto">
        {/* Input box */}
        <div
          className={`bg-card border rounded-[14px] overflow-hidden transition-colors ${
            isDragging
              ? 'border-primary-interactive bg-accent/5'
              : 'border-border'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Paste a link, type a topic, or drop a video..."
            rows={1}
            disabled={disabled}
            className="w-full bg-transparent text-foreground text-[15px] border-none outline-none resize-none px-4 py-[14px] placeholder:text-muted-foreground/60"
          />

          {/* Bottom toolbar */}
          <div className="border-t border-border px-3 py-2 flex justify-between items-center">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                title="Upload a video file"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onMicClick}
                disabled={disabled}
                title="Record a voice note"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled || (!text.trim() && !droppedFile)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-interactive text-white transition-opacity disabled:opacity-40"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.avi"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Zoom password field */}
        {isZoomUrl && (
          <div className="mt-3">
            <input
              type="text"
              value={zoomPasswordValue}
              onChange={(e) => onZoomPasswordChange(e.target.value)}
              placeholder="Zoom passcode (if required)"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary-interactive transition-colors"
            />
          </div>
        )}

        {/* Supported sources hint */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-3">
          {['YouTube', 'Zoom', 'Loom', 'Vimeo', 'Upload'].map((source) => (
            <span key={source} className="text-[11px] text-muted-foreground/50">
              {source}
            </span>
          ))}
          <span className="text-[11px] text-muted-foreground/30">
            or just type a topic
          </span>
        </div>
      </div>

      {/* What you'll get — output preview */}
      <div className="max-w-[560px] w-full mx-auto mt-10">
        <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest text-center mb-3">
          One input becomes all of this
        </p>

        <div className="grid grid-cols-4 gap-2">
          {OUTPUT_ITEMS.map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-[10px] p-3 text-center"
            >
              <div className="w-9 h-9 mx-auto mb-1.5 bg-surface-container-low rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary-interactive" />
              </div>
              <div className="text-foreground text-[11px] font-medium">{label}</div>
              <div className="text-[10px] text-muted-foreground/60">{detail}</div>
            </div>
          ))}
        </div>

        {/* Platform list */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <Video className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[11px] text-muted-foreground/40">
            + {PLATFORM_NAMES.join(', ')} posts
          </span>
        </div>

        <p className="text-[12px] text-muted-foreground/40 text-center mt-2">
          All in your voice. All from one input.
        </p>
      </div>

      {/* Guides */}
      <div className="max-w-[560px] w-full mx-auto mt-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest">
            Get more from EchoMe
          </p>
          <Link
            href="/guides"
            className="text-[11px] text-muted-foreground/40 hover:text-primary-interactive transition-colors"
          >
            All guides
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {GUIDES.map(({ href, icon: Icon, title, description }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-3 bg-card border border-border rounded-[10px] p-3 hover:border-primary-interactive transition-colors"
            >
              <div className="w-8 h-8 flex-shrink-0 bg-surface-container-low rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary-interactive transition-colors" />
              </div>
              <div className="min-w-0">
                <div className="text-foreground text-[12px] font-medium leading-tight">{title}</div>
                <div className="text-[11px] text-muted-foreground/50 leading-tight mt-0.5">{description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
