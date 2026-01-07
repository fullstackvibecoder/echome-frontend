/**
 * Client-Side MBOX Parser (Streaming)
 *
 * Parses MBOX email archives in the browser before uploading.
 * Uses streaming to handle files larger than available RAM.
 *
 * Key features:
 * - Streams file in 50MB chunks (works with limited RAM)
 * - Parses MBOX format (RFC 5322)
 * - Extracts only sent emails (filters by user email)
 * - Strips attachments and HTML, keeps only plain text
 * - Creates content hashes for deduplication
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
  maxEmails: 100, // Start with 100 emails - enough for voice matching, can expand later
  minContentLength: 50,
};

// RFC 5322 mbox format: line must start with "From " followed by email/date
const MBOX_SEPARATOR_REGEX = /^From \S+/;

// Chunk size for streaming (50MB - works well with limited RAM)
const CHUNK_SIZE = 50 * 1024 * 1024;

/**
 * Parse MBOX file in browser using streaming (low memory usage)
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
  const startTime = Date.now();
  const fileSize = file.size;
  const fileSizeGB = (fileSize / 1024 / 1024 / 1024).toFixed(2);

  console.log(`[MBOX Parser] Starting STREAMING parse of ${file.name} (${fileSizeGB} GB)`);
  console.log(`[MBOX Parser] Using ${CHUNK_SIZE / 1024 / 1024}MB chunks to conserve memory`);

  let buffer = ''; // Holds incomplete data between chunks
  let bytesRead = 0;
  let messageCount = 0;
  let lastProgressUpdate = Date.now();

  // Process file in chunks
  let offset = 0;
  while (offset < fileSize) {
    // Check if we have enough emails
    if (result.emails.length >= opts.maxEmails) {
      console.log(`[MBOX Parser] Reached ${opts.maxEmails} email limit, stopping early`);
      break;
    }

    // Read next chunk
    const chunkEnd = Math.min(offset + CHUNK_SIZE, fileSize);
    const chunk = await readFileSlice(file, offset, chunkEnd);
    bytesRead = chunkEnd;
    offset = chunkEnd;

    // Combine with leftover buffer
    buffer += chunk;

    // Find all complete emails in buffer (separated by "From " lines)
    const lines = buffer.split(/\r?\n/);

    // Keep last partial line in buffer (might be incomplete)
    // Also keep content after last "From " separator
    let lastSeparatorIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (MBOX_SEPARATOR_REGEX.test(lines[i])) {
        lastSeparatorIndex = i;
        break;
      }
    }

    // If no separator found in this chunk, keep accumulating
    if (lastSeparatorIndex === -1) {
      // Keep entire buffer, continue to next chunk
      // But if buffer is getting too large (>200MB), we have a problem
      if (buffer.length > 200 * 1024 * 1024) {
        console.warn(`[MBOX Parser] Buffer exceeded 200MB without finding email separator, skipping chunk`);
        buffer = '';
      }
      continue;
    }

    // Process all complete emails (everything before the last separator)
    const linesToProcess = lines.slice(0, lastSeparatorIndex);
    buffer = lines.slice(lastSeparatorIndex).join('\n');

    // Parse emails from these lines
    let currentMessage: string[] = [];
    for (const line of linesToProcess) {
      const isSeparator = MBOX_SEPARATOR_REGEX.test(line);

      if (isSeparator && currentMessage.length > 0) {
        // Process this email
        messageCount++;
        result.totalEmailsFound = messageCount;

        if (result.emails.length < opts.maxEmails) {
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

        currentMessage = [line];
      } else {
        currentMessage.push(line);
      }
    }

    // Update progress
    const now = Date.now();
    if (now - lastProgressUpdate > 100) {
      const percent = Math.round((bytesRead / fileSize) * 70); // 0-70% for parsing
      opts.onProgress?.({
        percent,
        emailsFound: result.emailsParsed,
        status: `Scanned ${(bytesRead / 1024 / 1024).toFixed(0)}MB, found ${messageCount.toLocaleString()} emails, kept ${result.emailsParsed}...`,
      });
      lastProgressUpdate = now;

      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Process any remaining buffer content (last email)
  if (buffer.length > 0 && result.emails.length < opts.maxEmails) {
    const lines = buffer.split(/\r?\n/);
    let currentMessage: string[] = [];

    for (const line of lines) {
      const isSeparator = MBOX_SEPARATOR_REGEX.test(line);

      if (isSeparator && currentMessage.length > 0) {
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

        currentMessage = [line];
      } else {
        currentMessage.push(line);
      }
    }

    // Final email
    if (currentMessage.length > 0) {
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
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[MBOX Parser] Complete in ${totalTime}s:`, {
    totalEmailsFound: result.totalEmailsFound,
    emailsParsed: result.emailsParsed,
    emailsFiltered: result.emailsFiltered,
    parseErrors: result.parseErrors,
    skippedReasons: result.skippedReasons,
  });

  opts.onProgress?.({
    percent: 70,
    emailsFound: result.emailsParsed,
    status: 'Parsing complete',
  });

  return result;
}

/**
 * Read a slice of a file as text
 */
async function readFileSlice(file: File, start: number, end: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const slice = file.slice(start, end);
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file slice ${start}-${end}`));
    };

    reader.readAsText(slice);
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
