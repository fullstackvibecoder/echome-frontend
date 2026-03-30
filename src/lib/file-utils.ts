// File upload utilities and validation

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'audio/wav': ['.wav'],
  'audio/mpeg': ['.mp3'],
  'audio/webm': ['.webm'],
  'audio/mp4': ['.m4a'],
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

  // Check file type - also check by extension for edge cases where MIME type is wrong
  const acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES);
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  const acceptedExtensions: string[] = Object.values(ACCEPTED_FILE_TYPES).flat();

  // PDF files can have various MIME types depending on OS/browser
  const isPdf = file.name.toLowerCase().endsWith('.pdf') ||
                file.type === 'application/pdf' ||
                file.type === 'application/x-pdf';

  // Give specific guidance for video files
  if (file.type.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(fileExtension)) {
    return {
      valid: false,
      error: 'Video files can\'t be added to the Knowledge Base. Use the Clip Finder to process videos.',
    };
  }

  if (!acceptedTypes.includes(file.type) && !acceptedExtensions.includes(fileExtension) && !isPdf) {
    console.log('[file-utils] Rejected file:', { name: file.name, type: file.type, extension: fileExtension });
    return {
      valid: false,
      error: `File type not supported: ${file.type || 'unknown'}`,
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
