import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateProfile = vi.fn();
vi.mock('@/lib/api-client', () => ({ api: { auth: { updateProfile: (u: unknown) => updateProfile(u) } } }));
vi.mock('@/lib/toast', () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));

import { ProfileFieldsReview, reviewableFields, EMPTY_CURRENT } from './ProfileFieldsReview';

const SUGGESTED = {
  bio: 'I run an AI automation consultancy.',
  role: 'AI automation consultant',
  topics: 'AI, automation',
  cta: 'Send people to example.com',
  guardrails: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  updateProfile.mockResolvedValue({ success: true });
});

describe('reviewableFields', () => {
  it('skips empty suggestions and ones equal to the saved value', () => {
    const keys = reviewableFields(SUGGESTED, { ...EMPTY_CURRENT, role: ' ai automation  consultant ' }).map(f => f.key);
    expect(keys).toEqual(['bio', 'topics', 'cta']);
  });
});

describe('ProfileFieldsReview', () => {
  it('ticks empty fields and saves them with the existing profile call', async () => {
    const onDone = vi.fn();
    render(<ProfileFieldsReview suggested={SUGGESTED} current={EMPTY_CURRENT} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save 4 to my profile' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(updateProfile).toHaveBeenCalledWith({
      bio: SUGGESTED.bio,
      profile_role: SUGGESTED.role,
      profile_topics: SUGGESTED.topics,
      profile_cta: SUGGESTED.cta,
    });
  });

  it('keeps a differing saved value by default and swaps in one click', async () => {
    render(
      <ProfileFieldsReview
        suggested={SUGGESTED}
        current={{ ...EMPTY_CURRENT, bio: 'Real estate broker.', topics: 'AI, automation' }}
        onDone={vi.fn()}
      />,
    );
    // bio differs (not ticked), topics equal (hidden), role + cta empty (ticked)
    expect(screen.getByText('Real estate broker.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save 2 to my profile' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Use Claude.s:/));
    fireEvent.click(screen.getByRole('button', { name: 'Save 3 to my profile' }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile.mock.calls[0][0]).toEqual({
      bio: SUGGESTED.bio,
      profile_role: SUGGESTED.role,
      profile_cta: SUGGESTED.cta,
    });
  });

  it('Not now saves nothing', () => {
    const onDone = vi.fn();
    render(<ProfileFieldsReview suggested={SUGGESTED} current={EMPTY_CURRENT} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDone).toHaveBeenCalledWith(false);
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
