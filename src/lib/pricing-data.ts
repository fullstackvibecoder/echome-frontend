export interface PlanData {
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  buttonText: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  accentColor: 'primary' | 'purple';
  /**
   * For Echo Teams (per-voice billing): treat monthlyPrice/annualPrice as
   * the unit rate, not the total. UI multiplies by user-selected voice
   * count (2 minimum). Set on the Echo Teams plan only.
   */
  perVoice?: boolean;
}

// Marketing pricing — what new signups see. Updated 2026-04-30:
// - Echo: $29 → $37, Echo Studio: $49 → $87
// - Echo Pro $99 dropped (zero customers; no advertising)
// - EchoTeams Pro $179 / Agency $249 dropped (zero customers; no advertising)
// - EchoTeams Duo $129 retained in code only for the one grandfathered
//   customer (not in this list anymore)
// - NEW: Echo Teams ($47/voice/mo, 2-voice min) replaces all Teams plans
// - Free tier bumped 3 → 5 generations on 2026-05-01
export const individualPlans: PlanData[] = [
  {
    name: 'Free',
    slug: '',
    description: 'See if it gets your voice right',
    monthlyPrice: 0,
    annualPrice: 0,
    buttonText: 'Start Free',
    accentColor: 'primary',
    features: [
      '5 free content kits to try it out',
      'Your voice, learning from what you publish',
      'Auto-post to Instagram, LinkedIn & Facebook',
      'Clips, captions, carousels, and posts',
    ],
  },
  {
    name: 'Echo',
    slug: 'echo',
    description: 'For creators with a body of work to draw from',
    monthlyPrice: 37,
    annualPrice: 370,
    buttonText: 'Try Echo Free',
    accentColor: 'primary',
    features: [
      'Your voice profile, learning continuously',
      'Reads YouTube, Instagram, blog, email, voice notes, PDFs',
      'Creator Radar, track what your audience watches',
      'Auto-post to Instagram, LinkedIn & Facebook',
      'Built-in teleprompter for talking-head video',
      'Content calendar with email reminders',
    ],
  },
  {
    name: 'Echo Studio',
    slug: 'echo-studio',
    description: 'For creators who publish frequently and take their output seriously',
    monthlyPrice: 87,
    annualPrice: 870,
    buttonText: 'Try Studio Free',
    highlight: true,
    badge: 'MOST POPULAR',
    accentColor: 'primary',
    features: [
      'Deep voice matching with thumbs feedback',
      'Reads your full email history',
      'Creator Radar with deeper insights',
      'Auto-post to Instagram, LinkedIn & Facebook',
      'Built-in teleprompter for talking-head video',
      'Priority processing',
    ],
  },
];

// Multi-voice plans. Single SKU now: Echo Teams with per-voice pricing.
// Replaces the old fixed-quantity Duo/Pro/Agency tiers.
export const teamsPlans: PlanData[] = [
  {
    name: 'Echo Teams',
    slug: 'echo-teams',
    description: 'For agencies and teams managing multiple voices',
    // Per-voice unit rate. UI multiplies by selected voice count (2 min).
    monthlyPrice: 47,
    annualPrice: 470,
    buttonText: 'Try Echo Teams Free',
    highlight: true,
    badge: 'PER VOICE',
    accentColor: 'purple',
    perVoice: true,
    features: [
      'Per-voice scaling, pay only for what you use',
      '2-voice minimum, no upper cap',
      'Per-voice knowledge bases',
      'Per-voice profile context',
      'Shared usage pool across voices',
      'Auto-post to Instagram, LinkedIn & Facebook',
      'Built-in teleprompter for talking-head video',
      'Priority support',
    ],
  },
];
