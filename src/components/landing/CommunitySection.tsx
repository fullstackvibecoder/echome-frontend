'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, ExternalLink, Search } from 'lucide-react';
import { spaceGrotesk } from '@/lib/fonts';
import {
  OFFICE_HOURS_CONFIG,
  FAQS,
  FAQ_CATEGORY_LABELS,
  type FAQCategory,
  type FAQItem,
} from '@/lib/community-config';

function getNextWednesday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = (3 - day + 7) % 7 || 7; // 3 = Wednesday
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(11, 30, 0, 0); // 11:30 AM
  return next;
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="border-t border-home-ink/15">
      {items.map((item, idx) => (
        <div key={idx} className="border-b border-home-ink/15">
          <button
            type="button"
            aria-expanded={openIndex === idx}
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left"
          >
            <span className="font-grotesk text-lg font-semibold tracking-[-0.01em]">{item.question}</span>
            <ChevronDown
              className={`h-5 w-5 flex-none text-home-muted transition-transform ${openIndex === idx ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {openIndex === idx && <p className="m-0 max-w-[68ch] pb-6 leading-relaxed text-home-muted">{item.answer}</p>}
        </div>
      ))}
    </div>
  );
}

export function CommunitySection() {
  const [faqCategory, setFaqCategory] = useState<FAQCategory | 'all'>('all');
  const [faqSearch, setFaqSearch] = useState('');

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = faqCategory === 'all' || faq.category === faqCategory;
    const matchesSearch =
      !faqSearch ||
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Object.entries(FAQ_CATEGORY_LABELS) as [FAQCategory, string][];
  const pill = (active: boolean) =>
    `min-h-10 cursor-pointer whitespace-nowrap rounded-full px-4 text-[15px] font-semibold transition-colors ${
      active ? 'bg-home-ink text-home-paper' : 'border border-home-ink/15 text-home-ink hover:bg-home-ink/5'
    }`;

  return (
    <section id="community" className={`${spaceGrotesk.variable} bg-home-paper text-home-ink`}>
      <div className="mx-auto flex max-w-[1320px] flex-col gap-16 px-4 py-24 sm:px-6">
        {/* Office hours */}
        <div className="grid gap-10 rounded-[32px] bg-home-stage p-6 text-home-paper sm:p-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-5">
            <h2 className="m-0 font-grotesk text-[clamp(40px,5vw,72px)] font-bold leading-[0.95] tracking-[-0.04em]">
              You’re not doing this alone.
            </h2>
            <p className="m-0 max-w-[36em] text-[17px] leading-normal text-home-stage-muted">
              Office hours every {OFFICE_HOURS_CONFIG.dayOfWeek} at {OFFICE_HOURS_CONFIG.time}, on Zoom. Bring questions, share what
              you’re working on, and see how other members get better results from their voice profile. Open to everyone, paid or on
              the free kits.
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3 sm:flex-row sm:items-end lg:flex-col lg:items-start">
            <a
              href={OFFICE_HOURS_CONFIG.zoomLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-home-signal px-6 py-3.5 text-[15px] font-semibold text-home-ink transition-opacity hover:opacity-85"
            >
              Join the call
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <AddToCalendarButton />
          </div>
        </div>

        {/* FAQ */}
        <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <h2 className="m-0 font-grotesk text-[clamp(36px,4vw,56px)] font-bold leading-[0.95] tracking-[-0.04em]">Questions</h2>
            <p className="m-0 text-home-muted">
              Can’t find it? Bring it to {OFFICE_HOURS_CONFIG.dayOfWeek}’s call, or{' '}
              <a href="/auth/signup" className="text-home-ink underline underline-offset-4 hover:opacity-80">
                start free
              </a>{' '}
              and ask in the app.
            </p>
            <label className="relative block">
              <span className="sr-only">Search questions</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-home-muted" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search questions"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full rounded-full border border-home-ink/15 bg-white/60 py-3 pl-11 pr-4 text-home-ink placeholder:text-home-muted focus:border-home-ink focus:outline-none"
              />
            </label>
            <div role="group" aria-label="Filter questions" className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={faqCategory === 'all'} onClick={() => setFaqCategory('all')} className={pill(faqCategory === 'all')}>
                All
              </button>
              {categories.map(([key, label]) => (
                <button key={key} type="button" aria-pressed={faqCategory === key} onClick={() => setFaqCategory(key)} className={pill(faqCategory === key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredFaqs.length > 0 ? (
            <FAQAccordion items={filteredFaqs} />
          ) : (
            <div className="flex flex-col items-start gap-2 border-t border-home-ink/15 py-8">
              <p className="m-0 text-home-muted">No questions match your search.</p>
              <button
                type="button"
                onClick={() => {
                  setFaqSearch('');
                  setFaqCategory('all');
                }}
                className="cursor-pointer font-semibold text-home-ink underline underline-offset-4"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Add to Calendar Button ───────────────────────────────────────────

function AddToCalendarButton() {
  const handleAddToCalendar = () => {
    const title = 'EchoMe Office Hours';
    const description =
      'Weekly office hours with the EchoMe team. Live Q&A and best practices.\\n\\nJoin: ' +
      OFFICE_HOURS_CONFIG.zoomLink;

    // Generate .ics content
    const nextWed = getNextWednesday();
    const endDate = new Date(nextWed.getTime() + 60 * 60 * 1000); // 1 hour

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDate = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EchoMe//Office Hours//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(nextWed)}`,
      `DTEND:${formatDate(endDate)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=WE`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `URL:${OFFICE_HOURS_CONFIG.zoomLink}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'echome-office-hours.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleAddToCalendar}
      type="button"
      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-[15px] font-semibold text-home-paper transition-colors hover:bg-white/10"
    >
      <Calendar className="h-4 w-4" aria-hidden="true" />
      Add to Calendar
    </button>
  );
}
