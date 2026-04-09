'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Mic,
} from 'lucide-react';
import {
  OFFICE_HOURS_CONFIG,
  UPCOMING_SESSIONS,
  PAST_SESSIONS,
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

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-white/60 mt-2 font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all"
        >
          <button
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            className="w-full flex items-center justify-between p-5 text-left group"
          >
            <span className="font-semibold text-foreground pr-4 group-hover:text-primary transition-colors">
              {item.question}
            </span>
            {openIndex === idx ? (
              <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
          </button>
          {openIndex === idx && (
            <div className="px-5 pb-5 -mt-1">
              <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function CommunitySection() {
  const [activeTab, setActiveTab] = useState<'office-hours' | 'faq'>('office-hours');
  const [faqCategory, setFaqCategory] = useState<FAQCategory | 'all'>('all');
  const [faqSearch, setFaqSearch] = useState('');

  const nextSession = UPCOMING_SESSIONS[0];
  const sessionDate = nextSession ? new Date(nextSession.date) : getNextWednesday();
  const sessionDurationMs = (nextSession?.durationMinutes ?? 45) * 60 * 1000;
  const countdown = useCountdown(sessionDate);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const checkLive = () => {
      const now = Date.now();
      const start = sessionDate.getTime();
      const end = start + sessionDurationMs;
      setIsLive(now >= start && now <= end);
    };
    checkLive();
    const interval = setInterval(checkLive, 10_000);
    return () => clearInterval(interval);
  }, [sessionDate, sessionDurationMs]);

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = faqCategory === 'all' || faq.category === faqCategory;
    const matchesSearch =
      !faqSearch ||
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = Object.entries(FAQ_CATEGORY_LABELS) as [FAQCategory, string][];

  return (
    <section id="community" className="py-20 px-6 bg-gradient-to-br from-background to-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-accent-purple/5 to-transparent rounded-full blur-3xl -z-10" />

      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-primary font-semibold text-sm">Community</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight text-foreground leading-tight">
            You&apos;re Not Doing
            <br />
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              This Alone
            </span>
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Weekly office hours, expert guests, and real conversations about using EchoMe well.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center bg-card/60 backdrop-blur-xl border-2 border-border rounded-2xl p-1.5 shadow-lg">
            <button
              onClick={() => setActiveTab('office-hours')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'office-hours'
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Video className="w-4 h-4" />
              Office Hours
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'faq'
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              FAQ
            </button>
          </div>
        </div>

        {/* ── Office Hours Tab ── */}
        {activeTab === 'office-hours' && (
          <div className="space-y-8">
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gray-900 p-8 md:p-12 shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent-purple/15 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/30 rounded-full mb-4">
                      {isLive ? (
                        <>
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-red-400 font-semibold text-xs uppercase tracking-wider">Live Now</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span className="text-primary font-semibold text-xs uppercase tracking-wider">Next Session</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
                      {nextSession?.title || 'Weekly Office Hours'}
                    </h3>

                    {/* Guest Speaker Highlight */}
                    {nextSession?.guest && (
                      <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center flex-shrink-0">
                          <Mic className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{nextSession.guest.name}</p>
                          <p className="text-white/60 text-xs">{nextSession.guest.title}</p>
                        </div>
                      </div>
                    )}

                    <p className="text-white/70 font-light mb-6 max-w-lg leading-relaxed">
                      {nextSession?.description ||
                        'Join us every Wednesday for live Q&A, EchoMe tips, and guest speakers from across the creator economy.'}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-white/60 mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Every {OFFICE_HOURS_CONFIG.dayOfWeek}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{OFFICE_HOURS_CONFIG.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span>Via Zoom</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <a
                        href={OFFICE_HOURS_CONFIG.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                      >
                        {isLive ? 'Join Now' : 'Join Call'}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <AddToCalendarButton />
                    </div>
                  </div>

                  {/* Countdown */}
                  {!isLive && (
                    <div className="flex-shrink-0">
                      <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-3 text-center">
                        Starts in
                      </p>
                      <div className="flex gap-3">
                        <CountdownUnit value={countdown.days} label="Days" />
                        <CountdownUnit value={countdown.hours} label="Hrs" />
                        <CountdownUnit value={countdown.minutes} label="Min" />
                        <CountdownUnit value={countdown.seconds} label="Sec" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* What to Expect */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  icon: <Users className="w-5 h-5 text-primary" />,
                  title: 'Expert Guests',
                  description: 'Creators and operators share what actually works.',
                },
                {
                  icon: <MessageCircle className="w-5 h-5 text-accent-purple" />,
                  title: 'Live Q&A',
                  description: 'Get your questions answered in real-time by the EchoMe team.',
                },
                {
                  icon: <Video className="w-5 h-5 text-accent-pink" />,
                  title: 'Best Practices',
                  description: 'Workflows and techniques for getting better results.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/15 to-accent-purple/10 rounded-xl flex items-center justify-center mb-3">
                    {item.icon}
                  </div>
                  <h4 className="font-bold text-foreground mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground font-light">{item.description}</p>
                </div>
              ))}
            </div>

            {/* Free Trial CTA */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-accent-purple/10 to-primary/10 border-2 border-primary/20 p-6 md:p-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-extrabold text-foreground">Try EchoMe Before the Call</h3>
                  </div>
                  <p className="text-muted-foreground text-sm max-w-lg">
                    2 free generations, no credit card. Try it before the call so you show up with real questions.
                  </p>
                </div>
                <a
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 whitespace-nowrap flex-shrink-0"
                >
                  Start Free
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Upcoming Sessions Pipeline */}
            {UPCOMING_SESSIONS.length > 1 && (
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">Upcoming Sessions</h3>
                <div className="space-y-3">
                  {UPCOMING_SESSIONS.slice(1).map((session) => {
                    const sessionDate = new Date(session.date);
                    const month = sessionDate.toLocaleDateString('en-US', { month: 'short' });
                    const day = sessionDate.getDate();
                    return (
                      <div
                        key={session.id}
                        className="flex items-start gap-4 p-5 bg-card/80 backdrop-blur-xl rounded-2xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        {/* Date Block */}
                        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-primary/10 to-accent-purple/10 rounded-xl flex flex-col items-center justify-center border border-primary/10">
                          <span className="text-xs font-semibold text-primary uppercase leading-none">{month}</span>
                          <span className="text-lg font-extrabold text-foreground leading-none mt-0.5">{day}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground mb-1 leading-snug">{session.title}</h4>
                          {session.guest && (
                            <p className="text-sm text-primary font-medium mb-1">
                              with {session.guest.name} - {session.guest.title}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-2">{session.description}</p>
                          <div className="flex gap-2 mt-2">
                            {session.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Sessions */}
            {PAST_SESSIONS.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">Past Sessions</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {PAST_SESSIONS.map((session) => (
                    <div
                      key={session.id}
                      className="p-5 bg-card/80 backdrop-blur-xl rounded-2xl border border-border shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-foreground">{session.title}</h4>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {new Date(session.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{session.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {session.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {session.recordingUrl && (
                          <a
                            href={session.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
                          >
                            Watch <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FAQ Tab ── */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-card/80 backdrop-blur-xl border-2 border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setFaqCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  faqCategory === 'all'
                    ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                    : 'bg-card/80 border border-border text-muted-foreground hover:text-primary hover:border-primary/30'
                }`}
              >
                All
              </button>
              {categories.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFaqCategory(key)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    faqCategory === key
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                      : 'bg-card/80 border border-border text-muted-foreground hover:text-primary hover:border-primary/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            {filteredFaqs.length > 0 ? (
              <FAQAccordion items={filteredFaqs} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-2">No questions match your search.</p>
                <button
                  onClick={() => {
                    setFaqSearch('');
                    setFaqCategory('all');
                  }}
                  className="text-primary font-semibold hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Still have questions CTA */}
            <div className="text-center mt-8 p-8 bg-gradient-to-r from-primary/5 to-accent-purple/5 rounded-2xl border border-primary/10">
              <h3 className="text-lg font-bold text-foreground mb-2">Still have questions?</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Join our weekly office hours for live help, or sign up and use the in-app chat.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setActiveTab('office-hours')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  <Video className="w-4 h-4" />
                  Office Hours
                </button>
                <a
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border-2 border-border text-foreground rounded-xl font-semibold hover:border-primary/30 hover:text-primary transition-all"
                >
                  Sign Up Free
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Add to Calendar Button ───────────────────────────────────────────

function AddToCalendarButton() {
  const handleAddToCalendar = () => {
    const title = 'EchoMe Office Hours';
    const description =
      'Weekly office hours with the EchoMe team. Live Q&A, guest speakers, and best practices.\\n\\nJoin: ' +
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
      className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
    >
      <Calendar className="w-4 h-4" />
      Add to Calendar
    </button>
  );
}
