/**
 * Data for the homepage kit demo (one recording becomes a week of content).
 *
 * The coach persona is REAL: Jess Lenouvel's Realizations podcast interview
 * (YouTube 4Hdm70iyynI, upload de7450fe in her EchoMe account). The highlighted
 * lines are her exact words, the clips are the ones Echo cut, and the captions
 * are Echo's suggested captions with emoji removed. The other personas are
 * labeled samples until we have real member data for them.
 */

export type PersonaId = 'coach' | 'agent' | 'podcaster';

/** A transcript run. `highlight` is 1-3 when the run becomes that clip, else 0. */
export type TranscriptRun = { text: string; highlight: 0 | 1 | 2 | 3 };

export type KitExtra = {
  kind: 'caption' | 'carousel' | 'post';
  label: string;
  /** Short label used in the week schedule. */
  short: string;
  body: string;
};

export type Persona = {
  id: PersonaId;
  label: string;
  isReal: boolean;
  source: { type: 'phone' | 'link'; link?: string; seconds: number; where: string };
  transcript: TranscriptRun[];
  /** Looping clip video + poster per highlight, when real footage exists. */
  clipMedia?: { video: string; poster: string }[];
  extras: [KitExtra, KitExtra];
  networks: string[];
  note: string;
};

export const PERSONAS: Persona[] = [
  {
    id: 'coach',
    label: 'Coach',
    isReal: true,
    source: {
      type: 'link',
      link: 'youtube.com/watch?v=4Hdm70iyynI',
      seconds: 1226,
      where: 'Jess Lenouvel on the Realizations podcast',
    },
    transcript: [
      { text: 'They said you’ve got to door knock and cold call. And I said, ', highlight: 0 },
      { text: 'I’m 21, I look like I’m 16. ', highlight: 1 },
      { text: 'So I used to call it ', highlight: 0 },
      { text: 'prospecting for my PJs. ', highlight: 2 },
      { text: 'I’m actually naturally quite shy. That’s really where my first 100 deals came from. ', highlight: 0 },
      { text: 'I think that we have actually more opportunity now than we had then.', highlight: 3 },
    ],
    clipMedia: [
      { video: '/home/jess-clip-1.mp4', poster: '/home/jess-clip-1.jpg' },
      { video: '/home/jess-clip-2.mp4', poster: '/home/jess-clip-2.jpg' },
      { video: '/home/jess-clip-3.mp4', poster: '/home/jess-clip-3.jpg' },
    ],
    extras: [
      { kind: 'caption', label: 'Instagram caption', short: 'Caption', body: 'Ever feel like you’re too shy to succeed in business?' },
      { kind: 'caption', label: 'Instagram caption', short: 'Caption', body: 'Think you missed the boat because you weren’t an early social media adopter?' },
    ],
    networks: ['Instagram', 'Instagram', 'Instagram', 'Instagram', 'Instagram'],
    note: 'Real: Jess Lenouvel’s 20-minute podcast interview, pasted from YouTube. The highlighted lines are her exact words, and these are the clips and captions Echo made in her account. The schedule is an example.',
  },
  {
    id: 'agent',
    label: 'Real estate agent',
    isReal: false,
    source: { type: 'phone', seconds: 492, where: 'Walking the listing' },
    transcript: [
      { text: 'This is the part buyers never see in the photos. ', highlight: 0 },
      { text: 'The light in this kitchen at four o’clock is unreal. ', highlight: 1 },
      { text: 'Three bedrooms, a yard that actually gets sun, and ', highlight: 0 },
      { text: 'you can walk to the school in six minutes. ', highlight: 2 },
      { text: 'If downtown priced you out, ', highlight: 0 },
      { text: 'this street is where I’d look next.', highlight: 3 },
    ],
    extras: [
      { kind: 'carousel', label: 'Carousel', short: 'Carousel', body: 'Listing highlights, in 8 slides' },
      { kind: 'post', label: 'Facebook post', short: 'Post', body: 'Where I’d look if downtown priced you out' },
    ],
    networks: ['Instagram', 'Facebook', 'Instagram', 'Instagram', 'Facebook'],
    note: 'Sample recording, shown to illustrate the phone path.',
  },
  {
    id: 'podcaster',
    label: 'Podcaster',
    isReal: false,
    source: { type: 'link', link: 'zoom.us/rec/share/episode', seconds: 3150, where: 'Imported from Zoom' },
    transcript: [
      { text: 'My guest said something I can’t stop thinking about. ', highlight: 0 },
      { text: 'Your audience doesn’t want polish. They want proof. ', highlight: 1 },
      { text: 'We talked for an hour, but ', highlight: 0 },
      { text: 'the best advice took forty seconds. ', highlight: 2 },
      { text: 'So here’s what I keep asking myself: ', highlight: 0 },
      { text: 'what would you post if nobody was grading it?', highlight: 3 },
    ],
    extras: [
      { kind: 'carousel', label: 'Carousel', short: 'Carousel', body: 'Episode takeaways, in 6 slides' },
      { kind: 'post', label: 'LinkedIn post', short: 'Post', body: 'The 40 seconds that mattered most' },
    ],
    networks: ['Instagram', 'LinkedIn', 'Instagram', 'Instagram', 'LinkedIn'],
    note: 'Sample recording, shown to illustrate the link path.',
  },
];

/** Which kit item lands on which weekday (0 = Mon). Refs index into [clip1, clip2, clip3, extra1, extra2]. */
export const WEEK_PLAN = [
  { day: 0, ref: 0, time: '9:00 AM' },
  { day: 1, ref: 3, time: '8:30 AM' },
  { day: 2, ref: 1, time: '12:00 PM' },
  { day: 3, ref: 4, time: '9:00 AM' },
  { day: 4, ref: 2, time: '5:00 PM' },
] as const;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Demo timeline, as fractions of one loop. */
export const PHASE = {
  recordEnd: 0.42,
  highlightStart: 0.44,
  highlightStep: 0.055,
  highlightLength: 0.05,
  kitStart: 0.62,
  kitStep: 0.035,
  kitLength: 0.06,
  weekStart: 0.84,
  weekStep: 0.022,
  weekLength: 0.04,
} as const;

/** One loop is 12s, then it holds on the finished week for ~4s. */
export const LOOP_MS = 12000;
export const LOOP_HOLD = 1.35;
