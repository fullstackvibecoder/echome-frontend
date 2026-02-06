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
      a: "Yes! You earn 20% on every payment your referral makes — not just the first one. As long as they stay subscribed, you keep earning."
    },
    {
      q: "What if someone I refer upgrades their plan?",
      a: "You earn 20% of whatever they pay. If they upgrade from Echo ($29) to Echo Pro ($99), your commission increases too."
    },
    {
      q: "Can I promote EchoMe on social media?",
      a: "Absolutely. We provide video scripts, social post templates, and email swipe copy. Use whatever works for your audience."
    },
    {
      q: "What about enterprise referrals?",
      a: "Enterprise deals (custom integrations starting at $10K) earn 10-15% commission plus 20% on the managed service ($297/mo). Email partnerships@tryechome.com with enterprise leads."
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1C1C1E]">
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
            className="px-5 py-2 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Join Program
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 bg-[#00D4FF]/10 text-[#0099CC] rounded-full text-sm font-medium mb-6">
            Affiliate Program
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Earn <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">20% Recurring</span> Sharing a Tool You Love
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Recommend EchoMe to creators, marketers, and businesses. Get paid every month they stay subscribed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://echo.affonso.io"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Become an Affiliate
            </a>
            <a
              href="#how-it-works"
              className="px-8 py-4 border-2 border-gray-300 rounded-xl font-bold text-lg hover:border-[#00D4FF] hover:text-[#00D4FF] transition-all"
            >
              Learn More
            </a>
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
            Earn 20% of every payment your referrals make. Not just the first month — every month they stay subscribed.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { plan: 'Echo', price: 29, commission: 5.80, features: ['2 hours video/mo', '5 clips per video', '1 Knowledge Base'] },
              { plan: 'Echo Studio', price: 49, commission: 9.80, features: ['5 hours video/mo', '10 clips per video', '3 Knowledge Bases'], popular: true },
              { plan: 'Echo Pro', price: 99, commission: 19.80, features: ['Unlimited video', '15 clips per video', 'Unlimited KBs'] },
            ].map((tier) => (
              <div
                key={tier.plan}
                className={`relative p-6 rounded-2xl border-2 ${
                  tier.popular
                    ? 'border-[#00D4FF] bg-gradient-to-b from-[#00D4FF]/5 to-transparent'
                    : 'border-gray-200'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#00D4FF] text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{tier.plan}</h3>
                <p className="text-gray-500 text-sm mb-4">${tier.price}/month</p>
                <div className="mb-4">
                  <span className="text-4xl font-extrabold text-[#00D4FF]">${tier.commission}</span>
                  <span className="text-gray-500">/mo per referral</span>
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-[#00D4FF]">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-gradient-to-r from-[#B794F6]/10 to-[#FF6B9D]/10 rounded-2xl border border-[#B794F6]/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-1">Enterprise Referrals</h3>
                <p className="text-gray-600">
                  Know a company that needs custom integrations? Earn 10-15% on contracts starting at $10K, plus 20% on $297/mo managed service.
                </p>
              </div>
              <a
                href="mailto:partnerships@tryechome.com?subject=Enterprise Referral"
                className="px-6 py-3 bg-[#B794F6] text-white rounded-lg font-semibold whitespace-nowrap hover:bg-[#a17de8] transition-colors"
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
                title: "7-Day Free Trial",
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
              { step: "4", title: "Get Paid", desc: "Earn 20% of every subscription, every month" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-[#00D4FF] to-[#B794F6] rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
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
              { title: "Monthly Payouts", desc: "PayPal, Wise, or crypto — your choice", icon: "💰" },
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
      <section className="py-20 px-6 bg-gradient-to-br from-[#1C1C1E] via-[#2a2a2c] to-[#1C1C1E] text-white">
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
            className="inline-block px-10 py-4 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-[#00D4FF]/25 hover:scale-105 transition-all"
          >
            Become an Affiliate — It&apos;s Free
          </a>
          <p className="text-white/50 text-sm mt-4">
            Already an affiliate? <a href="https://echo.affonso.io" target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] hover:underline">Log in to your dashboard</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-[#1C1C1E] text-white/60 text-sm">
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
