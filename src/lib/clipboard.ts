/**
 * Copy content as rich text HTML to clipboard. When pasted into Substack
 * (ProseMirror-based), formatting is preserved: headings, bold, blockquotes, lists.
 * Falls back to plain text if Clipboard API isn't available.
 */
export async function copyAsRichText(markdown: string): Promise<boolean> {
  try {
    const { marked } = await import('marked');
    const html = await marked(markdown, { breaks: false, gfm: true });
    const htmlBlob = new Blob([html as string], { type: 'text/html' });
    const textBlob = new Blob([markdown], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob }),
    ]);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }
}

export async function copyAsPlainText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
