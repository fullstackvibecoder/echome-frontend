export interface TranscriptSegment {
  start: number; // seconds
  dur: number; // seconds
  text: string;
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

function timestamp(seconds: number, msSep: ',' | '.'): string {
  const total = Math.max(0, seconds);
  const whole = Math.floor(total);
  const ms = Math.round((total - whole) * 1000);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}${msSep}${pad(ms, 3)}`;
}

export function formatTxt(_segments: TranscriptSegment[], plainText: string): string {
  return plainText;
}

export function formatSrt(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, i) => {
      const start = timestamp(seg.start, ',');
      const end = timestamp(seg.start + seg.dur, ',');
      return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join('\n');
}

export function formatVtt(segments: TranscriptSegment[]): string {
  const body = segments
    .map((seg) => {
      const start = timestamp(seg.start, '.');
      const end = timestamp(seg.start + seg.dur, '.');
      return `${start} --> ${end}\n${seg.text}`;
    })
    .join('\n\n');
  return `WEBVTT\n\n${body}\n`;
}
