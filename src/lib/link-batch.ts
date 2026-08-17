/**
 * Bulk link paste detection (FUL-34).
 *
 * A paste counts as a link batch only when it is two or more URLs and nothing
 * else. Mixed prose plus URLs stays a plain-text paste (the URLs are part of
 * the writing sample), and a single URL keeps the single-import flow with its
 * progress polling.
 *
 * URL-shaped tokens with non-http schemes (ftp://, mailto:// etc.) are kept in
 * the batch on purpose: the backend rejects them per link with a reason we can
 * surface, which beats silently reinterpreting the paste as prose.
 */
export function extractBulkLinks(text: string): string[] | null {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  const urls: string[] = [];
  for (const token of tokens) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(token)) {
      urls.push(token);
    } else if (/^www\./i.test(token)) {
      urls.push(`https://${token}`);
    } else {
      return null;
    }
  }
  return urls;
}
