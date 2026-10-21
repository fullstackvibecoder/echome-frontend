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
    expect(iframe).toHaveAttribute('src', 'https://www.loom.com/embed/df3ea6a04b8e4173be0b85a0f0557829');
  });

  it('renders every chapter line', () => {
    render(<SeeItWorkSection />);
    expect(screen.getByText("0:00 Almost 3,000 views overnight, and why it worked")).toBeInTheDocument();
    expect(screen.getByText("4:00 One box: drop a video or paste a YouTube link")).toBeInTheDocument();
    expect(screen.getByText("5:35 Clips arrive: captions, styles, trimming")).toBeInTheDocument();
    expect(screen.getByText("7:30 Carousels with your photos")).toBeInTheDocument();
    expect(screen.getByText("8:45 Substack-ready blog and platform-tuned posts")).toBeInTheDocument();
    expect(screen.getByText("11:15 No video? Start from an idea")).toBeInTheDocument();
    expect(screen.getByText("12:40 Add to your voice instead of making content")).toBeInTheDocument();
    expect(screen.getByText("16:20 A full content kit from one typed idea")).toBeInTheDocument();
    expect(screen.getByText("18:20 Video script and built-in teleprompter")).toBeInTheDocument();
    expect(screen.getByText("20:40 Creator Radar: your take on creators you follow")).toBeInTheDocument();
    expect(screen.getByText("22:15 Record in the car, no polish needed")).toBeInTheDocument();
    expect(screen.getByText("23:40 Work Before the Work: your voice profile builds itself")).toBeInTheDocument();
    expect(screen.getByText("25:25 Connect Gmail or upload your sent folder")).toBeInTheDocument();
    expect(screen.getByText("29:00 Settings, profile photo and connections")).toBeInTheDocument();
  });

  it('links to All guides', () => {
    render(<SeeItWorkSection />);
    const link = screen.getByRole('link', { name: /all guides/i });
    expect(link).toHaveAttribute('href', '/guides');
  });
});
