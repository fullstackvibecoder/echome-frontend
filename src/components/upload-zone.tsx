'use client';

import { useCallback, useState } from 'react';
import { ACCEPTED_FILE_TYPES } from '@/lib/file-utils';

interface UploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadZone({ onFilesAdded, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onFilesAdded(droppedFiles);
      }
    },
    [disabled, onFilesAdded]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
      if (selectedFiles.length > 0) {
        onFilesAdded(selectedFiles);
      }
      // Reset input
      e.target.value = '';
    },
    [disabled, onFilesAdded]
  );

  const acceptedExtensions = Object.values(ACCEPTED_FILE_TYPES)
    .flat()
    .join(', ');

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-8
        transition-all duration-200
        ${
          isDragging
            ? 'border-accent bg-accent/5 scale-[1.02]'
            : 'border-border hover:border-accent/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        h-[400px] flex flex-col items-center justify-center
      `}
    >
      {/* Upload Icon */}
      <div
        className={`
        text-6xl mb-4 transition-transform duration-200
        ${isDragging ? 'scale-110' : ''}
      `}
      >
        📤
      </div>

      {/* Main Text */}
      <h3 className="text-subheading text-xl mb-2">
        {isDragging ? 'Drop files here' : 'Drag and drop files'}
      </h3>

      <p className="text-body text-text-secondary mb-4 text-center">
        or click to browse
      </p>

      {/* File Upload Button */}
      <label
        className={`
        btn-primary cursor-pointer
        ${disabled ? 'pointer-events-none' : ''}
      `}
      >
        Choose Files
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={disabled}
          accept={acceptedExtensions}
          className="hidden"
        />
      </label>

      {/* Supported File Types */}
      <div className="mt-6 text-small text-text-secondary text-center">
        <p className="mb-1">Supported files:</p>
        <p className="text-xs">PDF, MP4, MOV, TXT, MBOX, JPG, PNG, WAV, MP3</p>
        <p className="text-xs mt-1">Max size: 500MB (MBOX files: any size)</p>
      </div>
    </div>
  );
}
