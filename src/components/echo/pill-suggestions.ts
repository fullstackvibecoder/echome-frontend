/**
 * Route-keyed suggestion chips for the expanded Echo pill. Static copy only,
 * no API calls. Chips PREFILL the input (never auto-submit) so the user
 * always reviews before sending. Order matters: most likely ask first.
 */

const KIT_DETAIL = /^\/app\/library\/[^/]+$/;

export function getPillSuggestions(pathname: string): string[] {
  if (KIT_DETAIL.test(pathname)) {
    return [
      'Regenerate the LinkedIn post',
      "What's in this kit?",
      'Schedule this kit',
    ];
  }
  if (pathname === '/app/library') {
    return ['What should I post next?', 'Find my kit about...'];
  }
  if (pathname === '/app/calendar') {
    return ["What's scheduled this week?", 'What should I post next?'];
  }
  if (pathname === '/app/voice') {
    return ['How strong is my voice profile?'];
  }
  return ['Paste a link to create content', 'Ask me anything about your content'];
}
