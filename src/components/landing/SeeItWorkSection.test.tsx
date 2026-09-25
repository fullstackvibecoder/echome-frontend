import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SeeItWorkSection } from './SeeItWorkSection';

describe('SeeItWorkSection', () => {
  it('renders the "See it work" heading', () => {
    render(<SeeItWorkSection />);
    expect(screen.getByRole('heading', { name: 'See it work' })).toBeInTheDocument();
  });

  it('renders the Loom walkthrough embed', () => {
    render(<SeeItWorkSection />);
    const iframe = screen.getByTitle('EchoMe walkthrough');
    expect(iframe).toHaveAttribute('src', 'https://www.loom.com/embed/77e3e0f47fdc406cb5487ded1b87206c');
  });

  it('renders all nine chapter lines', () => {
    render(<SeeItWorkSection />);
    expect(screen.getByText('0:00 What EchoMe does with one long video')).toBeInTheDocument();
    expect(screen.getByText('2:00 The content kit: posts, carousels, Substack article')).toBeInTheDocument();
    expect(screen.getByText('4:00 Onboarding and the settings that matter')).toBeInTheDocument();
    expect(screen.getByText('6:00 Paste a video link, clips arrive')).toBeInTheDocument();
    expect(screen.getByText('7:00 Post now or schedule the week')).toBeInTheDocument();
    expect(screen.getByText('9:00 Creator Radar')).toBeInTheDocument();
    expect(screen.getByText('10:00 B-roll reel for a listing')).toBeInTheDocument();
    expect(screen.getByText("11:00 Work Before the Work: your voice profile builds itself")).toBeInTheDocument();
    expect(screen.getByText('19:00 Voice match is for text; video is already you')).toBeInTheDocument();
  });

  it('links to All guides', () => {
    render(<SeeItWorkSection />);
    const link = screen.getByRole('link', { name: /all guides/i });
    expect(link).toHaveAttribute('href', '/guides');
  });
});
