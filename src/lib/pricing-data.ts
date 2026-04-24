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
}

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
      '2 free generations',
      'Voice matching from your content',
      '1 platform per generation',
      'Standard templates',
      'Full auto-posting to Instagram, LinkedIn & Facebook during your 2 generations',
    ],
  },
  {
    name: 'Echo',
    slug: 'echo',
    description: 'For creators with a body of work to draw from',
    monthlyPrice: 29,
    annualPrice: 290,
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
    monthlyPrice: 49,
    annualPrice: 490,
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
  {
    name: 'Echo Pro',
    slug: 'echo-pro',
    description: 'For agencies and teams managing multiple voices',
    monthlyPrice: 99,
    annualPrice: 990,
    buttonText: 'Go Pro',
    accentColor: 'purple',
    features: [
      'Unlimited video processing',
      'Up to 15 clips per video',
      'Full voice matching pipeline',
      'Unlimited Creator Radar',
      'Custom carousel design system',
      '1080p exports',
      '5GB file upload limit',
      'Email import (up to 100 emails)',
      'Priority processing queue',
      'Priority support',
      'Auto-post to Instagram, LinkedIn & Facebook',
    ],
  },
];

export const teamsPlans: PlanData[] = [
  {
    name: 'EchoTeams Duo',
    slug: 'echo-teams-2',
    description: '2 voices',
    monthlyPrice: 129,
    annualPrice: 1075,
    buttonText: 'Get Started',
    accentColor: 'purple',
    features: [
      'Everything in Echo Pro',
      '2 distinct voice profiles',
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
  {
    name: 'EchoTeams Pro',
    slug: 'echo-teams-5',
    description: '5 voices',
    monthlyPrice: 179,
    annualPrice: 1492,
    buttonText: 'Get Started',
    highlight: true,
    badge: 'BEST VALUE',
    accentColor: 'purple',
    features: [
      'Everything in Echo Pro',
      '5 distinct voice profiles',
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
  {
    name: 'EchoTeams Agency',
    slug: 'echo-teams-10',
    description: '10 voices',
    monthlyPrice: 249,
    annualPrice: 2075,
    buttonText: 'Get Started',
    accentColor: 'purple',
    features: [
      'Everything in Echo Pro',
      '10 distinct voice profiles',
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
