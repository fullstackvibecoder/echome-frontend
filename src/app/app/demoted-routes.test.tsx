import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./toolkit/CreatorLibraryContent', () => ({
  default: () => <div data-testid="toolkit-content" />,
}));
vi.mock('./radar/FollowingContent', () => ({
  default: () => <div data-testid="radar-content" />,
}));
vi.mock('./voice/VoiceTabs', () => ({
  default: () => <div data-testid="voice-content" />,
}));
vi.mock('./billing/BillingContent', () => ({
  default: () => <div data-testid="billing-content" />,
}));
vi.mock('./developers/DevelopersContent', () => ({
  default: () => <div data-testid="developers-content" />,
}));

import ToolkitPage from './toolkit/page';
import RadarPage from './radar/page';
import VoicePage from './voice/page';
import BillingPage from './billing/page';
import DevelopersPage from './developers/page';

describe('demoted routes still render their content', () => {
  it.each([
    ['/app/toolkit', ToolkitPage, 'toolkit-content'],
    ['/app/radar', RadarPage, 'radar-content'],
    ['/app/voice', VoicePage, 'voice-content'],
    ['/app/billing', BillingPage, 'billing-content'],
    ['/app/developers', DevelopersPage, 'developers-content'],
  ] as const)('%s renders its content component', (_route, Page, testId) => {
    render(<Page />);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
});
