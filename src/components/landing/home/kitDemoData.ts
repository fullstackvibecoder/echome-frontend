/**
 * Data for the homepage kit demo: one 5-20 minute recording becomes 5 clips of
 * 30-90 seconds, 2 posts, and a scheduled week.
 *
 * It's one real person on purpose: Jess Lenouvel (coach and former agent), a
 * solo video from her own YouTube channel (upload 2e6995fe). Clip start/end
 * times, opening lines and captions come straight from Echo's output in her
 * account (emoji removed). The content is general, not just real estate.
 */

export type Media = { video: string; poster: string };

export type DemoClip = {
  /** Seconds into the source recording. */
  start: number;
  end: number;
  /** The first words spoken in the clip, verbatim. */
  opening: string;
  media?: Media;
};

export type KitExtra = {
  kind: 'caption' | 'carousel' | 'post';
  label: string;
  /** Short label used where the card is small. */
  short: string;
  body: string;
};

export type Persona = {
  /** Who's talking, shown above the demo. */
  who: string;
  source: { type: 'phone' | 'link'; link?: string; seconds: number; where: string };
  /** Footage that plays inside the phone while it records or imports. */
  sourceMedia?: Media;
  clips: [DemoClip, DemoClip, DemoClip, DemoClip, DemoClip];
  extras: [KitExtra, KitExtra];
  /** Network per week slot, Mon to Sun. */
  networks: [string, string, string, string, string, string, string];
  /** Closes the end-of-loop summary. */
  outro: string;
  note: string;
};

export const DEMO: Persona = {
  who: 'Jess Lenouvel, real estate coach',
  source: { type: 'link', link: 'youtube.com/watch?v=4XOndg1c0Zw', seconds: 2261, where: 'Jess Lenouvel’s YouTube video' },
  sourceMedia: { video: '/home/jess5-source.mp4', poster: '/home/jess5-clip-1.jpg' },
  clips: [
    { start: 950, end: 1007, opening: 'Now let’s get into something nobody on Instagram is talking about. It might be the single biggest reason you feel busy', media: { video: '/home/jess5-clip-1.mp4', poster: '/home/jess5-clip-1.jpg' } },
    { start: 1057, end: 1117, opening: 'You can take twelve months of bank and credit card statements, drop them into the', media: { video: '/home/jess5-clip-2.mp4', poster: '/home/jess5-clip-2.jpg' } },
    { start: 1125, end: 1167, opening: 'For some of you, the subscription audit alone will save you a thousand bucks a year. I did this the other day', media: { video: '/home/jess5-clip-3.mp4', poster: '/home/jess5-clip-3.jpg' } },
    { start: 1228, end: 1293, opening: 'Most of you are making business decisions based on vibes, based on good feelings, and you think you’re doing', media: { video: '/home/jess5-clip-4.mp4', poster: '/home/jess5-clip-4.jpg' } },
    { start: 1400, end: 1457, opening: 'So I did this two weeks ago. I had Claude look for the top 20 real estate', media: { video: '/home/jess5-clip-5.mp4', poster: '/home/jess5-clip-5.jpg' } },
  ],
  extras: [
    { kind: 'caption', label: 'Instagram caption', short: 'Caption', body: 'Most top agents doing 100+ deals a year are barely scratching the surface of what AI can actually do.' },
    { kind: 'post', label: 'LinkedIn post', short: 'Post', body: 'Ever feel like we’re just skimming the surface with AI?' },
  ],
  networks: ['Instagram', 'Instagram', 'Instagram', 'TikTok', 'LinkedIn', 'Instagram', 'TikTok'],
  outro: 'From one video she’d already made.',
  note: 'Real: a 38-minute video from Jess Lenouvel’s YouTube channel, pasted as a link. These are the 5 clips Echo cut in her account, at their real lengths and positions, and the posts it wrote. The schedule is an example.',
};

/** Which kit item lands on which day. Refs index into [clip1..clip5, extra1, extra2]. */
export const WEEK_PLAN = [
  { day: 'Mon', ref: 0, time: '9:00 AM' },
  { day: 'Tue', ref: 5, time: '8:30 AM' },
  { day: 'Wed', ref: 1, time: '12:00 PM' },
  { day: 'Thu', ref: 2, time: '9:00 AM' },
  { day: 'Fri', ref: 6, time: '7:30 AM' },
  { day: 'Sat', ref: 3, time: '10:00 AM' },
  { day: 'Sun', ref: 4, time: '6:00 PM' },
] as const;

/**
 * Demo timeline, as fractions of one loop. The recording plays through, Echo
 * brackets each clip on the timeline, the brackets lift off into the kit, then
 * every card drops into its day.
 */
export const PHASE = {
  recordEnd: 0.26,
  bracketStart: 0.28,
  bracketStep: 0.055,
  bracketLength: 0.045,
  kitStart: 0.57,
  kitStep: 0.026,
  kitLength: 0.07,
  weekStart: 0.8,
  weekStep: 0.022,
  weekLength: 0.06,
} as const;

/** One loop is 17s, then it holds on the finished week for ~5s. */
export const LOOP_MS = 17000;
export const LOOP_HOLD = 1.3;
