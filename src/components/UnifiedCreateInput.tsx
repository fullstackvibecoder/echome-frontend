'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Paperclip, Link2, Mic, ArrowRight } from 'lucide-react';

interface UnifiedCreateInputProps {
  onSubmit: (text: string, file?: File) => void;
  onMicClick: () => void;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  zoomPasswordValue: string;
  onZoomPasswordChange: (value: string) => void;
}

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
      <h2 className="text-[22px] font-semibold text-foreground text-center">
        What are we turning into content?
      </h2>
      <p className="text-[13px] text-muted-foreground text-center mb-9">
        A video, a link, a topic — whatever you&apos;ve got.
      </p>

      <div className="max-w-[520px] w-full mx-auto">
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
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Start typing, paste a URL, or drop a file..."
            rows={1}
            disabled={disabled}
            className="w-full bg-transparent text-foreground text-[15px] border-none outline-none resize-none px-4 py-[14px]"
            style={{ paddingLeft: 16, paddingRight: 16 }}
          />

          {/* Bottom toolbar */}
          <div className="border-t border-border px-3 py-2 flex justify-between items-center">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <Paperclip className="w-[18px] h-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => textareaRef.current?.focus()}
                disabled={disabled}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <Link2 className="w-[18px] h-[18px]" />
              </button>
              <button
                type="button"
                onClick={onMicClick}
                disabled={disabled}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mic className="w-[18px] h-[18px]" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-interactive text-white transition-colors"
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
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary-interactive transition-colors"
            />
          </div>
        )}
      </div>
    </div>
  );
}
