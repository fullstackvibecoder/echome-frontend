export type AdvisorState = 'empty' | 'thin' | 'rich';

export const DIMENSION_KEYS = [
  'work',
  'industry',
  'interests',
  'personal',
  'relationships',
  'voice',
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  work: 'Work',
  industry: 'Industry',
  interests: 'Interests',
  personal: 'Personal',
  relationships: 'Relationships',
  voice: 'Voice',
};

export interface DimensionCoverage {
  covered: boolean;
  strength: number; // 0..1
  sampleCount: number;
}

export type Coverage = Record<DimensionKey, DimensionCoverage>;

export type NudgeActionType = 'voice' | 'ingest' | 'create';

export interface NudgeAction {
  label: string;
  type: NudgeActionType;
  payload?: Record<string, unknown>;
}

export interface Nudge {
  headline: string;
  subhead: string;
  actions: NudgeAction[];
}

export interface Proposal {
  id: string;
  title: string;
  rationale: string;
  kitType: string;
  sourceRefs: string[];
}

export interface AdvisorResponse {
  state: AdvisorState;
  coverage: Coverage;
  nudge: Nudge;
  proposals: Proposal[];
}
