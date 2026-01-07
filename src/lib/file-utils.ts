// File upload utilities and validation

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'text/plain': ['.txt'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'audio/wav': ['.wav'],
  'audio/mpeg': ['.mp3'],
  // MBOX files can have various MIME types depending on OS/browser
  'application/mbox': ['.mbox'],
  'application/octet-stream': ['.mbox'],
} as const;

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export interface FileWithProgress {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

/**
 * Check if a file is an MBOX file (by extension or MIME type)
 */
export function isMboxFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return (
    fileName.endsWith('.mbox') ||
    fileName === 'mbox' || // Apple Mail exports as 'mbox' with no extension
    file.type === 'application/mbox'
  );
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  // MBOX files have special handling - they're parsed client-side
  // so they can be any size and have various MIME types
  if (isMboxFile(file)) {
    return { valid: true };
  }

  // Check file type
  const acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES);
  if (!acceptedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not supported',
    };
  }

  // Check file size (only for non-MBOX files)
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType === 'application/pdf') return '📄';
  return '📝';
}

export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
