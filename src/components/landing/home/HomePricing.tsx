'use client';

import { useState } from 'react';
import { Check, Mail } from 'lucide-react';

/*
 * Homepage pricing. Restyled 2026-10 to match the new homepage; prices, plan
 * links and the Echo Teams per-voice math are unchanged from the old inline
 * block in HomeContent. Legacy EchoTeams Duo/Pro/Agency cards stay retired
 * from advertising; their Stripe products remain for the one grandfathered
 * customer on Duo.
 */

type Plan = {
  name: string;
  blurb: string;
  features: string[];
  featured?: boolean;
};

function Features({ items, featured }: { items: string[]; featured?: boolean }) {
  return (
    <ul className={`m-0 flex list-none flex-col gap-2.5 border-t p-0 pt-5 ${featured ? 'border-white/15' : 'border-home-ink/10'}`}>
      {items.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5 text-[15px] leading-snug">
          <Check className={`mt-0.5 h-4 w-4 flex-none ${featured ? 'text-home-signal' : 'text-home-ink'}`} aria-hidden="true" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ plan, children }: { plan: Plan; children: React.ReactNode }) {
  return (
    <div
      className={`flex flex-col gap-6 rounded-[24px] p-6 ${
        plan.featured ? 'bg-home-stage text-home-paper' : 'border border-home-ink/10 bg-white/50 text-home-ink'
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="m-0 font-grotesk text-2xl font-bold tracking-[-0.02em]">{plan.name}</h3>
          {plan.featured && <span className="text-sm font-semibold text-home-signal">Most popular</span>}
        </div>
        <p className={`m-0 text-[15px] leading-snug lg:min-h-[2.75em] ${plan.featured ? 'text-home-stage-muted' : 'text-home-muted'}`}>{plan.blurb}</p>
      </div>
      {children}
      <Features items={plan.features} featured={plan.featured} />
    </div>
  );
}

function Price({ amount, period, featured }: { amount: string; period?: string; featured?: boolean }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="font-grotesk text-[44px] font-bold leading-none tracking-[-0.03em]">{amount}</span>
      {period && <span className={featured ? 'text-home-stage-muted' : 'text-home-muted'}>{period}</span>}
    </div>
  );
}

const cta = 'block rounded-full px-5 py-3.5 text-center text-[15px] font-semibold transition-opacity hover:opacity-85';

export function HomePricing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  // Echo Teams card uses a per-voice selector. State default = 2 (plan minimum).
  const [echoTeamsVoices, setEchoTeamsVoices] = useState<number>(2);
  const monthly = billingPeriod === 'monthly';
  const per = monthly ? '/mo' : '/yr';
  const twoMonthsFree = (featured?: boolean) =>
    !monthly && <p className={`m-0 -mt-4 text-sm font-semibold ${featured ? 'text-home-signal' : 'text-home-ink'}`}>2 months free</p>;

  return (
    <section id="pricing" className="bg-home-paper text-home-ink">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-10 px-4 py-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex max-w-[720px] flex-col gap-4">
            <h2 className="m-0 font-grotesk text-[clamp(44px,6vw,88px)] font-bold leading-[0.92] tracking-[-0.045em]">Pricing</h2>
            <p className="m-0 text-[19px] leading-normal text-home-muted">
              Start with 5 free content kits. No credit card. Then pick the plan that fits how often you publish.
            </p>
          </div>
          <div role="group" aria-label="Billing period" className="flex rounded-full bg-home-ink/[0.06] p-1">
            {(['monthly', 'annual'] as const).map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={billingPeriod === period}
                onClick={() => setBillingPeriod(period)}
                className={`min-h-11 cursor-pointer rounded-full px-5 text-[15px] font-semibold transition-colors ${
                  billingPeriod === period ? 'bg-home-ink text-home-paper' : 'text-home-ink hover:bg-home-ink/5'
                }`}
              >
                {period === 'monthly' ? 'Monthly' : 'Annual, save 17%'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card
            plan={{
              name: 'Free',
              blurb: 'See if it gets your voice right',
              features: ['5 free content kits to try it out', 'Your voice, learning from what you publish', 'Clips, captions, carousels, and posts'],
            }}
          >
            <Price amount="$0" period="forever" />
            <a href="/auth/signup" className={`${cta} border border-home-ink/20 text-home-ink`}>
              Start Free
            </a>
          </Card>

          <Card
            plan={{
              name: 'Echo',
              blurb: 'For creators with a body of work to draw from',
              features: [
                'Your voice profile, learning continuously',
                'Reads YouTube, Instagram, blog, email, voice notes, PDFs',
                'Creator Radar, track what your audience watches',
                'Built-in teleprompter for talking-head video',
                'Auto-post to Instagram, LinkedIn & Facebook',
                'Content calendar with scheduled posting',
                'Learns how you talk to clients from your sent email',
              ],
            }}
          >
            <Price amount={`$${monthly ? '37' : '370'}`} period={per} />
            {twoMonthsFree()}
            <a href="/auth/signup?plan=echo" className={`${cta} bg-home-ink text-home-paper`}>
              Try Echo Free
            </a>
          </Card>

          <Card
            plan={{
              name: 'Echo Studio',
              blurb: 'For creators who publish frequently and take their output seriously',
              featured: true,
              features: [
                'Deep voice matching with thumbs feedback',
                '5 hours of video a month',
                'Creator Radar with deeper insights',
                'Built-in teleprompter for talking-head video',
                'Priority processing',
              ],
            }}
          >
            <Price amount={`$${monthly ? '87' : '870'}`} period={per} featured />
            {twoMonthsFree(true)}
            <a href="/auth/signup?plan=echo-studio" className={`${cta} bg-home-signal text-home-ink`}>
              Try Studio Free
            </a>
          </Card>

          <Card
            plan={{
              name: 'Echo Teams',
              blurb: 'For agencies and teams managing multiple voices',
              features: [
                'Per-voice scaling, pay only for what you use',
                'A voice profile for every team member',
                'Shared usage pool across voices',
                'Auto-post to Instagram, LinkedIn & Facebook',
                'Built-in teleprompter for talking-head video',
                'Priority processing + Priority support',
              ],
            }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-[15px]">
                <span className="text-home-muted">Voices</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEchoTeamsVoices((v) => Math.max(2, v - 1))}
                    disabled={echoTeamsVoices <= 2}
                    className="h-9 w-9 cursor-pointer rounded-full border border-home-ink/20 text-lg font-semibold disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Decrease voice count"
                  >
                    -
                  </button>
                  <span className="min-w-[2.5rem] text-center font-grotesk text-lg font-bold tabular-nums">{echoTeamsVoices}</span>
                  <button
                    type="button"
                    onClick={() => setEchoTeamsVoices((v) => v + 1)}
                    className="h-9 w-9 cursor-pointer rounded-full border border-home-ink/20 text-lg font-semibold"
                    aria-label="Increase voice count"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-home-muted">2 min</span>
              </div>
              <Price amount={`$${(monthly ? 47 : 470) * echoTeamsVoices}`} period={per} />
              <p className="m-0 text-sm text-home-muted">
                ${monthly ? 47 : 470}/voice × {echoTeamsVoices} voices
              </p>
            </div>
            {twoMonthsFree()}
            <a href={`/auth/signup?plan=echo-teams&voices=${echoTeamsVoices}`} className={`${cta} bg-home-ink text-home-paper`}>
              Try Echo Teams Free
            </a>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-5 rounded-[24px] bg-home-ink/[0.05] px-6 py-6">
          <div className="flex flex-col gap-1">
            <h3 className="m-0 font-grotesk text-xl font-bold">Need enterprise features?</h3>
            <p className="m-0 text-[15px] text-home-muted">API access, team collaboration, white-label options, and custom integrations.</p>
          </div>
          <a href="mailto:enterprise@tryechome.com" className={`${cta} inline-flex items-center gap-2 bg-home-ink text-home-paper`}>
            <Mail className="h-4 w-4" aria-hidden="true" />
            Contact Sales
          </a>
        </div>
      </div>
    </section>
  );
}
