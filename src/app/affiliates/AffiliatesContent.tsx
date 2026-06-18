'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function AffiliatesContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I get paid?",
      a: "Payouts are processed through Affonso. You can receive payments via PayPal, Wise, or cryptocurrency (Bitcoin, USDT). Minimum payout threshold is $50."
    },
    {
      q: "When do I get paid?",
      a: "Commissions are paid monthly, typically within the first week of each month for the previous month's earnings."
    },
    {
      q: "How long does the cookie last?",
      a: "30 days. If someone clicks your link and signs up within 30 days, you get credit for the referral."
    },
    {
      q: "Do I earn on renewals?",
      a: "Yes! You earn 25% on every payment your referral makes - not just the first one. As long as they stay subscribed, you keep earning."
    },
    {
      q: "What if someone I refer upgrades their plan?",
      a: "You earn 25% of whatever they pay. If they upgrade from Echo ($37) to Echo Studio ($87) or Echo Teams ($47/voice), your commission increases too."
    },
    {
      q: "Can I promote EchoMe on social media?",
      a: "Absolutely. We provide video scripts, social post templates, and email swipe copy. Use whatever works for your audience."
    },
    {
      q: "What about enterprise referrals?",
      a: "Enterprise deals (custom integrations and managed setups) earn custom commission. Email partnerships@tryechome.com with enterprise leads and we'll take it from there."
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/media/echome-logo.svg" alt="EchoMe" width={32} height={32} />
            <span className="text-xl font-bold">EchoMe</span>
          </Link>
          <a
            href="https://echo.affonso.io"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 bg-gradient-to-r from-accent to-primary-dark text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Join Program
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-gradient-to-br from-accent/10 to-accent-purple/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-br from-accent-purple/10 to-accent-pink/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left relative z-10">
              <div className="inline-block px-4 py-1.5 bg-accent/10 text-primary-dark rounded-full text-sm font-medium mb-6">
                Affiliate Program
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
                Earn <span className="bg-gradient-to-r from-accent to-accent-purple bg-clip-text text-transparent">25% Recurring</span> Sharing a Tool You Love
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Send people who take their content seriously. Get paid every month they stay.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a
                  href="https://echo.affonso.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-gradient-to-r from-accent to-primary-dark text-white rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  Become an Affiliate
                </a>
                <a
                  href="#how-it-works"
                  className="px-8 py-4 border-2 border-gray-300 rounded-xl font-bold text-lg hover:border-accent hover:text-accent transition-all"
                >
                  Learn More
                </a>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* Glow effect behind mascot */}
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent-purple rounded-full blur-3xl opacity-20 scale-75 pointer-events-none" />
                <Image
                  src="/media/echo-mascot.svg"
                  alt="Echo - Your AI Content Assistant"
                  width={320}
                  height={320}
                  className="relative z-10 drop-shadow-2xl"
                />
                {/* Floating commission badges */}
                <div className="absolute -top-4 -right-4 px-4 py-2 bg-white rounded-xl shadow-lg border border-gray-100 animate-bounce">
                  <span className="text-2xl font-bold text-accent">25%</span>
                  <span className="text-sm text-gray-500 block">recurring</span>
                </div>
                <div className="absolute -bottom-2 -left-4 px-3 py-1.5 bg-gradient-to-r from-accent to-accent-purple text-white rounded-lg text-sm font-semibold shadow-lg">
                  Paid monthly
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Structure */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Simple, Generous Commissions
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Earn 25% of every payment your referrals make. Not just the first month - every month they stay subscribed.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { plan: 'Echo', price: 37, commission: 9.25, features: ['Voice profile, learning continuously', 'Reads YouTube, IG, blog, email, voice notes, PDFs', 'Creator Radar'] },
              { plan: 'Echo Studio', price: 87, commission: 21.75, features: ['Deep voice matching with feedback', 'Reads your full email history', 'Priority processing'], popular: true },
              { plan: 'Echo Teams', price: 47, perVoice: true, commission: 11.75, features: ['Per-voice scaling, 2-voice minimum', 'Per-voice knowledge bases', 'Shared usage pool, priority support'] },
            ].map((tier) => (
              <div
                key={tier.plan}
                className={`relative p-6 rounded-2xl border-2 ${
                  tier.popular
                    ? 'border-accent bg-gradient-to-b from-accent/5 to-transparent'
                    : 'border-gray-200'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{tier.plan}</h3>
                <p className="text-gray-500 text-sm mb-4">${tier.price}{tier.perVoice ? '/voice/mo' : '/month'}</p>
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-accent">${tier.commission}</span>
                  <span className="text-gray-500">{tier.perVoice ? '/mo per voice' : '/mo per referral'}</span>
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-accent">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-gradient-to-r from-accent-purple/10 to-accent-pink/10 rounded-2xl border border-accent-purple/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-1">Enterprise Referrals</h3>
                <p className="text-gray-600">
                  Know a company that needs custom integrations or a managed setup? We pay custom commission on enterprise referrals. Send us the lead and we'll handle the rest.
                </p>
              </div>
              <a
                href="mailto:partnerships@tryechome.com?subject=Enterprise Referral"
                className="px-6 py-3 bg-accent-purple text-white rounded-lg font-semibold whitespace-nowrap hover:bg-[#a17de8] transition-colors"
              >
                Submit Lead
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why EchoMe Converts */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Why EchoMe Converts
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            You&apos;re not pushing some random SaaS. EchoMe solves a real problem people actually have.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "The Problem is Real",
                desc: "Every creator and marketer struggles with content. They know they need to post consistently. They've tried AI tools. But everything sounds generic and robotic.",
                icon: "😤"
              },
              {
                title: "The Solution is Obvious",
                desc: "EchoMe learns YOUR voice first, then creates content. It's the only AI tool that sounds like the person using it. The difference is immediately noticeable.",
                icon: "💡"
              },
              {
                title: "Try 5 Free Content Kits",
                desc: "No credit card required. People can try it risk-free. Most users convert because once they see their voice captured, they don't want to go back.",
                icon: "🎁"
              },
              {
                title: "Sticky Product",
                desc: "Once someone trains their voice profile, they're invested. Churn is low because switching means starting over. Your recurring commissions stay recurring.",
                icon: "🔒"
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="text-4xl">{item.icon}</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Sign Up", desc: "Create your free affiliate account in 2 minutes" },
              { step: "2", title: "Get Your Link", desc: "Grab your unique referral link from the dashboard" },
              { step: "3", title: "Share", desc: "Promote to your audience via content, email, or DMs" },
              { step: "4", title: "Get Paid", desc: "Earn 25% of every subscription, every month" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-accent to-accent-purple rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            What You Get
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Real-Time Dashboard", desc: "Track clicks, signups, and commissions as they happen", icon: "📊" },
              { title: "30-Day Cookie", desc: "Get credit for referrals up to 30 days after they click", icon: "🍪" },
              { title: "Video Scripts", desc: "Ready-to-use scripts for TikTok, Reels, and YouTube", icon: "🎬" },
              { title: "Email Templates", desc: "Swipe copy for newsletters and cold outreach", icon: "📧" },
              { title: "Social Posts", desc: "LinkedIn, Twitter, and Instagram templates", icon: "📱" },
              { title: "Monthly Payouts", desc: "PayPal, Wise, or crypto - your choice", icon: "💰" },
            ].map((item, i) => (
              <div key={i} className="p-6 bg-white rounded-xl border border-gray-200">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 text-left font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  {faq.q}
                  <span className={`transform transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-gray-600">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-background via-card to-background text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            Join hundreds of affiliates already earning recurring income by sharing EchoMe.
          </p>
          <a
            href="https://echo.affonso.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-10 py-4 bg-gradient-to-r from-accent to-primary-dark text-white rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-accent/25 hover:scale-105 transition-all"
          >
            Become an Affiliate - It&apos;s Free
          </a>
          <p className="text-white/50 text-sm mt-4">
            Already an affiliate? <a href="https://echo.affonso.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Log in to your dashboard</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-background text-white/60 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/media/echome-logo.svg" alt="EchoMe" width={24} height={24} />
            <span>© 2025–2026 EchoMe. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
