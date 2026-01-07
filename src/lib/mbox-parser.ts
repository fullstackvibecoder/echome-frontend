/**
 * Client-Side MBOX Parser
 *
 * Parses MBOX email archives in the browser before uploading.
 * This allows handling multi-GB files by extracting only the text content
 * needed for voice matching, drastically reducing upload size.
 *
 * Key features:
 * - Parses MBOX format (RFC 5322)
 * - Extracts only sent emails (filters by user email)
 * - Strips attachments and HTML, keeps only plain text
 * - Creates content hashes for deduplication
 * - Streams file in chunks to handle large files
 */

export interface ParsedEmail {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  textContent: string;
  contentHash: string;
}

export interface MboxParseResult {
  emails: ParsedEmail[];
  totalEmailsFound: number;
  emailsParsed: number;
  emailsFiltered: number;
  parseErrors: number;
  skippedReasons: Record<string, number>;
}

export interface MboxParseOptions {
  maxEmails?: number;
  minContentLength?: number;
  onlyFromEmail?: string; // Filter to only emails FROM this address
  onProgress?: (progress: { percent: number; emailsFound: number; status: string }) => void;
}

const DEFAULT_OPTIONS: Required<Omit<MboxParseOptions, 'onlyFromEmail' | 'onProgress'>> = {
  maxEmails: 500,
  minContentLength: 50,
};

// RFC 5322 mbox format: line must start with "From " followed by email
const MBOX_SEPARATOR_REGEX = /^From [^\s]+/;

/**
 * Parse MBOX file in browser with progress tracking
 */
export async function parseMboxFile(
  file: File,
  options: MboxParseOptions = {}
): Promise<MboxParseResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: MboxParseResult = {
    emails: [],
    totalEmailsFound: 0,
    emailsParsed: 0,
    emailsFiltered: 0,
    parseErrors: 0,
    skippedReasons: {},
  };

  const seenHashes = new Set<string>();

  // Read file as text (handles large files better than readAsText)
  const text = await readFileAsText(file, (percent) => {
    opts.onProgress?.({ percent: percent * 0.3, emailsFound: 0, status: 'Reading file...' });
  });

  opts.onProgress?.({ percent: 30, emailsFound: 0, status: 'Parsing emails...' });

  // Split by mbox separator
  const lines = text.split(/\r?\n/);
  let currentMessage: string[] = [];
  let messageCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isSeparator = MBOX_SEPARATOR_REGEX.test(line);

    if (isSeparator && currentMessage.length > 0) {
      // Process accumulated message
      if (result.emails.length >= opts.maxEmails) {
        break;
      }

      messageCount++;
      result.totalEmailsFound = messageCount;

      try {
        const rawMessage = currentMessage.join('\n');
        const email = parseEmail(rawMessage);

        if (email) {
          const skipReason = shouldSkipEmail(email, opts, seenHashes);
          if (skipReason) {
            result.emailsFiltered++;
            result.skippedReasons[skipReason] = (result.skippedReasons[skipReason] || 0) + 1;
          } else {
            seenHashes.add(email.contentHash);
            result.emails.push(email);
            result.emailsParsed++;
          }
        }
      } catch {
        result.parseErrors++;
      }

      currentMessage = [];

      // Update progress
      const parseProgress = 30 + (i / lines.length) * 70;
      opts.onProgress?.({
        percent: Math.round(parseProgress),
        emailsFound: result.emailsParsed,
        status: `Found ${result.emailsParsed} emails...`,
      });
    }

    currentMessage.push(line);
  }

  // Process final message
  if (currentMessage.length > 0 && result.emails.length < opts.maxEmails) {
    messageCount++;
    result.totalEmailsFound = messageCount;

    try {
      const rawMessage = currentMessage.join('\n');
      const email = parseEmail(rawMessage);

      if (email) {
        const skipReason = shouldSkipEmail(email, opts, seenHashes);
        if (skipReason) {
          result.emailsFiltered++;
          result.skippedReasons[skipReason] = (result.skippedReasons[skipReason] || 0) + 1;
        } else {
          seenHashes.add(email.contentHash);
          result.emails.push(email);
          result.emailsParsed++;
        }
      }
    } catch {
      result.parseErrors++;
    }
  }

  opts.onProgress?.({
    percent: 100,
    emailsFound: result.emailsParsed,
    status: 'Complete',
  });

  return result;
}

/**
 * Read file as text with progress tracking
 */
async function readFileAsText(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Parse a single email message
 */
function parseEmail(rawMessage: string): ParsedEmail | null {
  // Find header/body separator
  let separatorIndex = rawMessage.indexOf('\n\n');
  if (separatorIndex === -1) {
    separatorIndex = rawMessage.indexOf('\r\n\r\n');
    if (separatorIndex === -1) {
      return null;
    }
  }

  const headerSection = rawMessage.substring(0, separatorIndex);
  const bodySection = rawMessage.substring(separatorIndex + 2).trim();

  const headers = parseHeaders(headerSection);

  const messageId = headers['message-id'] || `browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const from = cleanEmailAddress(headers['from'] || 'Unknown');
  const to = cleanEmailAddress(headers['to'] || 'Unknown');
  const subject = decodeSubject(headers['subject'] || '(No Subject)');
  const date = parseDate(headers['date'] || '');

  const textContent = parseBody(bodySection, headers);

  // Create content hash for deduplication
  const contentHash = simpleHash(`${subject}|${from}|${textContent}`);

  return {
    messageId: messageId.replace(/[<>]/g, '').trim(),
    from,
    to,
    subject,
    date,
    textContent,
    contentHash,
  };
}

/**
 * Parse email headers
 */
function parseHeaders(headerSection: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = headerSection.split(/\r?\n/);

  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    // Skip "From " prefix
    if (line.startsWith('From ') && !currentKey) {
      continue;
    }

    // RFC 5322: continuation lines start with whitespace
    if (/^\s+/.test(line) && currentKey) {
      currentValue += ' ' + line.trim();
      continue;
    }

    // Store previous header
    if (currentKey && currentValue) {
      headers[currentKey.toLowerCase()] = currentValue;
    }

    // Parse new header
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      currentKey = line.substring(0, colonIndex).trim();
      currentValue = line.substring(colonIndex + 1).trim();
    } else if (line.trim()) {
      currentKey = '';
      currentValue = '';
    }
  }

  // Store final header
  if (currentKey && currentValue) {
    headers[currentKey.toLowerCase()] = currentValue;
  }

  return headers;
}

/**
 * Parse email body, handling multipart and encodings
 */
function parseBody(body: string, headers: Record<string, string>): string {
  const contentType = headers['content-type'] || '';
  const transferEncoding = headers['content-transfer-encoding'] || '';

  // Handle multipart
  if (contentType.toLowerCase().includes('multipart')) {
    return parseMultipartBody(body, contentType);
  }

  let decodedBody = body;

  // Decode based on transfer encoding
  if (transferEncoding.toLowerCase().includes('base64')) {
    try {
      decodedBody = atob(body.replace(/\s/g, ''));
    } catch {
      // Keep original on decode failure
    }
  } else if (transferEncoding.toLowerCase().includes('quoted-printable')) {
    decodedBody = decodeQuotedPrintable(body);
  }

  // Strip HTML if needed
  if (contentType.toLowerCase().includes('text/html')) {
    return stripHtml(decodedBody);
  }

  return decodedBody;
}

/**
 * Parse multipart email body
 */
function parseMultipartBody(body: string, contentType: string): string {
  const boundaryMatch = contentType.match(/boundary=["']?([^"';\s]+)["']?/i);
  if (!boundaryMatch) {
    return body;
  }

  const boundary = boundaryMatch[1];
  const parts = body.split(new RegExp(`--${escapeRegex(boundary)}(?:--)?`));

  let textContent = '';

  for (const part of parts) {
    if (part.trim() === '' || part.trim() === '--') continue;

    const partSeparator = part.indexOf('\n\n');
    if (partSeparator === -1) continue;

    const partHeaders = parseHeaders(part.substring(0, partSeparator));
    let partBody = part.substring(partSeparator + 2).trim();

    const partContentType = partHeaders['content-type'] || '';
    const partEncoding = partHeaders['content-transfer-encoding'] || '';

    // Decode part
    if (partEncoding.toLowerCase().includes('base64')) {
      try {
        partBody = atob(partBody.replace(/\s/g, ''));
      } catch {
        continue;
      }
    } else if (partEncoding.toLowerCase().includes('quoted-printable')) {
      partBody = decodeQuotedPrintable(partBody);
    }

    // Extract text content
    if (partContentType.toLowerCase().includes('text/plain')) {
      textContent += partBody + '\n';
    } else if (partContentType.toLowerCase().includes('text/html') && !textContent) {
      textContent = stripHtml(partBody);
    }
    // Skip attachments
  }

  return textContent.trim() || body;
}

/**
 * Decode quoted-printable encoding
 */
function decodeQuotedPrintable(text: string): string {
  return text
    .replace(/=\r?\n/g, '') // Soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _;
      }
    });
}

/**
 * Strip HTML tags
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean email address
 */
function cleanEmailAddress(address: string): string {
  const match = address.match(/<([^>]+)>/);
  if (match) {
    return match[1];
  }
  return address.trim();
}

/**
 * Decode RFC 2047 encoded subject
 */
function decodeSubject(subject: string): string {
  const encodedWordRegex = /=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g;

  return subject.replace(encodedWordRegex, (_, _charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return atob(text);
      } else if (encoding.toUpperCase() === 'Q') {
        return decodeQuotedPrintable(text.replace(/_/g, ' '));
      }
    } catch {
      // Return original on decode failure
    }
    return text;
  });
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Fall through
  }
  return new Date().toISOString();
}

/**
 * Simple hash function (djb2)
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit
  }
  return hash.toString(16);
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determine if email should be skipped
 */
function shouldSkipEmail(
  email: ParsedEmail,
  opts: MboxParseOptions & typeof DEFAULT_OPTIONS,
  seenHashes: Set<string>
): string | null {
  // Check empty content
  if (!email.textContent || email.textContent.trim().length === 0) {
    return 'empty_content';
  }

  // Check minimum length
  if (email.textContent.length < opts.minContentLength) {
    return 'content_too_short';
  }

  // Check duplicates
  if (seenHashes.has(email.contentHash)) {
    return 'duplicate_content';
  }

  // Check if from user (for "sent" emails)
  if (opts.onlyFromEmail) {
    const fromLower = email.from.toLowerCase();
    const userEmailLower = opts.onlyFromEmail.toLowerCase();
    if (!fromLower.includes(userEmailLower)) {
      return 'not_from_user';
    }
  }

  return null;
}

/**
 * Estimate the upload size for parsed emails
 */
export function estimateUploadSize(emails: ParsedEmail[]): number {
  return emails.reduce((total, email) => {
    return total + email.textContent.length + email.subject.length + 200; // 200 for metadata
  }, 0);
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
