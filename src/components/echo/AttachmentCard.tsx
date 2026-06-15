'use client';

/**
 * AttachmentCard.tsx
 * Loud, shared "file is attached and ready" card for the Echo composer.
 * Rendered by both EchoHero (Create page) and EchoPill (docked) so the
 * attachment-ready state looks identical everywhere. Replaces the old
 * 10px text-machine chip that was easy to miss.
 *
 * Cyan tint is intentional: an attached file is an active, pending action,
 * which is exactly what cyan is reserved for across the Echo surfaces.
 */

import { Video, FileAudio, FileText, Mail, File as FileIcon, X } from 'lucide-react';
import { classifyFile, type EchoFileKind } from './intent-meta';

/** Format bytes to a human-readable string (e.g. "4.2 MB") */
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const KIND_ICON: Record<EchoFileKind, typeof Video> = {
  video: Video,
  audio: FileAudio,
  text: FileText,
  document: FileText,
  mbox: Mail,
  unsupported: FileIcon,
};

const KIND_LABEL: Record<EchoFileKind, string> = {
  video: 'Video',
  audio: 'Audio',
  text: 'Text',
  document: 'Document',
  mbox: 'Email archive',
  unsupported: 'File',
};

interface AttachmentCardProps {
  file: File;
  onRemove: () => void;
}

export function AttachmentCard({ file, onRemove }: AttachmentCardProps) {
  const kind = classifyFile(file);
  const Icon = KIND_ICON[kind];
  return (
    <div className="flex items-center gap-3 mb-3 rounded-xl border border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.06)] px-3 py-2.5">
      <div
        className="shrink-0 flex items-center justify-center rounded-lg"
        style={{
          width: 36,
          height: 36,
          background: 'rgba(0,212,255,0.12)',
          color: 'rgba(0,212,255,0.95)',
        }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-[var(--muted-foreground)] truncate">
          {KIND_LABEL[kind]} · {humanSize(file.size)} · Ready
        </p>
      </div>
      <button
        type="button"
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
        className="shrink-0 text-[var(--muted-foreground)] hover:text-foreground transition-colors p-1"
      >
        <X size={16} />
      </button>
    </div>
  );
}
