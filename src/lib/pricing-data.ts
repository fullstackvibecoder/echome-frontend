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
// - Free tier bumped 2 → 3 generations
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
      '3 free generations',
      'Voice matching from your content',
      '1 platform per generation',
      'Standard templates',
      'Full auto-posting to Instagram, LinkedIn & Facebook during your 3 generations',
    ],
  },
  {
    name: 'Echo',
    slug: 'echo',
    description: 'For creators with a body of work to draw from',
    monthlyPrice: 37,
    annualPrice: 370,
    buttonText: 'Go Echo',
    accentColor: 'primary',
    features: [
      '2 hours of video processing',
      '5 clips per video',
      '1 Knowledge Base',
      '3 Creator Radar slots',
      'Standard carousel templates',
      '1080p exports',
      'Manual document upload only',
      'Content calendar with scheduled email reminders (no auto-posting)',
    ],
  },
  {
    name: 'Echo Studio',
    slug: 'echo-studio',
    description: 'For creators who publish frequently and take their output seriously',
    monthlyPrice: 87,
    annualPrice: 870,
    buttonText: 'Go Studio',
    highlight: true,
    badge: 'MOST POPULAR',
    accentColor: 'primary',
    features: [
      'Up to 5 hours of video processing',
      'Up to 10 clips per video',
      'Deep voice matching',
      'Up to 10 Creator Radar slots',
      'All templates + custom colors',
      '1080p exports',
      '750MB file upload limit',
      'Email import (up to 50 emails)',
      'Priority processing queue',
      'Auto-post to Instagram, LinkedIn & Facebook',
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
    buttonText: 'Get Started',
    highlight: true,
    badge: 'PER VOICE',
    accentColor: 'purple',
    perVoice: true,
    features: [
      'Per-voice scaling — pay only for what you use',
      '2-voice minimum, no upper cap',
      'Per-voice knowledge bases',
      'Per-voice profile context',
      'Shared usage pool across voices',
      'Unlimited video processing',
      'Up to 15 clips per video',
      '5GB file upload limit',
      'Priority support',
      'Auto-post to Instagram, LinkedIn & Facebook',
    ],
  },
];
