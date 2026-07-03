import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CreateHeroHeader } from './CreateHeroHeader';

describe('CreateHeroHeader', () => {
  it('renders nothing for empty state (EchoHero owns the teach-first header)', () => {
    const { container } = render(
      <CreateHeroHeader state="empty" nudgeHeadline="x" firstName="Ara" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while advisor state is unknown (null)', () => {
    const { container } = render(<CreateHeroHeader state={null} firstName="Ara" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders personalized H1 in rich state', () => {
    render(<CreateHeroHeader state="rich" firstName="Ara" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What do you want to create, Ara?' }),
    ).toBeInTheDocument();
  });

  it('renders personalized H1 in thin state', () => {
    render(<CreateHeroHeader state="thin" firstName="Ara" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What do you want to create, Ara?' }),
    ).toBeInTheDocument();
  });

  it('renders nameless H1 when firstName is missing', () => {
    render(<CreateHeroHeader state="rich" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What do you want to create?' }),
    ).toBeInTheDocument();
  });

  it('renders the nudge line when headline is non-empty', () => {
    render(<CreateHeroHeader state="rich" firstName="Ara" nudgeHeadline="Echo learned from 3 new videos" />);
    expect(screen.getByText('Echo learned from 3 new videos')).toBeInTheDocument();
  });

  it('renders no nudge line when headline is empty or absent', () => {
    render(<CreateHeroHeader state="rich" firstName="Ara" nudgeHeadline="" />);
    expect(screen.queryByTestId('hero-nudge-line')).not.toBeInTheDocument();
  });
});
