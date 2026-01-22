'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Settings, Mail } from 'lucide-react';

export default function PrivacyContent() {
  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-stone-600 hover:text-[#00D4FF] transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        <div className="mb-12">
          <h1 className="bg-gradient-to-r from-[#00D4FF] to-[#0099CC] bg-clip-text text-transparentxl md:text-5xl font-medium text-[#1C1C1E] mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-stone-600">
            How we protect and handle your data
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Effective Date */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-[#1C1C1E]">
                  Effective Date
                </h2>
                <p className="text-sm text-stone-600">January 15, 2025</p>
              </div>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              EchoMe Inc. (&ldquo;EchoMe,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to
              protecting your privacy. This Privacy Policy explains how we
              collect, use, store, and share your data when you use our
              platform and services.
            </p>
            <p className="text-stone-700 leading-relaxed">
              By using EchoMe, you agree to the terms outlined here.
            </p>
          </div>

          {/* What We Collect */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                1. What We Collect
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              We collect the following categories of data:
            </p>

            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-2">
                  A. Account Data
                </h3>
                <ul className="text-stone-700 text-sm space-y-1">
                  <li>• Name, email, social handles, login provider</li>
                  <li>• Subscription status and plan info</li>
                </ul>
              </div>

              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-2">
                  B. Imported Content
                </h3>
                <ul className="text-stone-700 text-sm space-y-1">
                  <li>
                    • Social media posts, captions, and metadata (with your
                    consent via OAuth)
                  </li>
                  <li>• Uploaded files (video, audio, text)</li>
                  <li>
                    • User-provided tags, prompt inputs, and form responses
                  </li>
                </ul>
              </div>

              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-2">
                  C. Usage Data
                </h3>
                <ul className="text-stone-700 text-sm space-y-1">
                  <li>• Prompt history, feature usage</li>
                  <li>• Device, browser, and session metadata</li>
                </ul>
              </div>

              <div className="pl-4 border-l-2 border-[#00D4FF]">
                <h3 className="text-base font-medium text-stone-800 mb-2">
                  D. Payment Data
                </h3>
                <ul className="text-stone-700 text-sm space-y-1">
                  <li>
                    • Processed via a third-party service (we don&apos;t store card
                    details)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* How We Use Your Data */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                2. How We Use Your Data
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              We use your data to:
            </p>
            <ul className="text-stone-700 text-sm space-y-2 pl-4">
              <li>• Build Your Echo</li>
              <li>• Generate content (e.g., blogs, threads, clips)</li>
              <li>• Provide account access and customer support</li>
              <li>• Improve product functionality and user experience</li>
              <li>• Communicate updates, changes, or promotions</li>
              <li>• Ensure platform integrity and security</li>
            </ul>
          </div>

          {/* How We Store Your Data */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                3. How We Store Your Data
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              Your data is stored securely using third-party services (e.g.
              AWS, Supabase, Pinecone) located in the U.S., Canada, and the
              EU. By using EchoMe, you consent to the transfer and processing
              of your data in these jurisdictions.
            </p>
            <p className="text-stone-700 leading-relaxed">
              We encrypt all data in transit and at rest and restrict access
              through role-based permissions.
            </p>
          </div>

          {/* How Long We Keep Your Data */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              4. How Long We Keep Your Data
            </h2>
            <p className="text-stone-700 leading-relaxed">
              We retain user data while your account is active and for up to
              24 months after inactivity, unless you request deletion sooner.
              You may delete your account at any time, which will trigger
              permanent deletion of all user-specific content and metadata.
            </p>
          </div>

          {/* Your Rights */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                5. Your Rights
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="text-stone-700 text-sm space-y-2 pl-4 mb-4">
              <li>• Access or download your data</li>
              <li>• Correct or update inaccurate information</li>
              <li>• Request deletion of your account and associated data</li>
              <li>• Withdraw consent for future data processing</li>
            </ul>
            <p className="text-stone-700 leading-relaxed">
              To make any such request, email us at{' '}
              <a
                href="mailto:privacy@tryechome.com"
                className="text-[#00D4FF] hover:underline font-medium"
              >
                privacy@tryechome.com
              </a>
            </p>
          </div>

          {/* Third-Party Access */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              6. Third-Party Access
            </h2>
            <p className="text-stone-700 leading-relaxed mb-4">
              We use trusted services to deliver EchoMe:
            </p>
            <ul className="text-stone-700 text-sm space-y-2 pl-4 mb-4">
              <li>• Authentication (e.g. Supabase, Clerk)</li>
              <li>• Storage (e.g. AWS, S3)</li>
              <li>• Vector storage (e.g. Pinecone)</li>
              <li>• LLMs (e.g. OpenAI, Anthropic)</li>
              <li>• Analytics & CRM (e.g. Plausible, HubSpot)</li>
            </ul>
            <p className="text-stone-700 leading-relaxed">
              These vendors only access your data as needed to deliver their
              services. Each is contractually obligated to maintain
              confidentiality and security.
            </p>
          </div>

          {/* Use of Data for Model Training */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              7. Use of Data for Model Training & Product Development
            </h2>
            <p className="text-stone-700 leading-relaxed mb-4">
              We may use anonymized, de-identified user data to:
            </p>
            <ul className="text-stone-700 text-sm space-y-1 pl-4 mb-4">
              <li>• Improve our AI prompts, workflows, and templates</li>
              <li>• Train custom models (not publicly available LLMs)</li>
              <li>• Conduct aggregated usage analytics</li>
            </ul>
            <p className="text-stone-700 leading-relaxed mb-4">
              We do not sell, share, or publish your identifiable content
              without permission.
            </p>
            <p className="text-stone-700 leading-relaxed">
              You can opt out of anonymized data use by contacting{' '}
              <a
                href="mailto:privacy@tryechome.com"
                className="text-[#00D4FF] hover:underline font-medium"
              >
                privacy@tryechome.com
              </a>
            </p>
          </div>

          {/* Cookies & Tracking */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              8. Cookies & Tracking
            </h2>
            <p className="text-stone-700 leading-relaxed">
              We use first-party cookies to manage sessions and measure basic
              usage. We do not use invasive tracking or third-party ads.
            </p>
          </div>

          {/* Children's Privacy */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              9. Children&apos;s Privacy
            </h2>
            <p className="text-stone-700 leading-relaxed">
              EchoMe is not intended for users under 18. We do not knowingly
              collect data from children. If you believe we&apos;ve collected data
              from a minor, contact us for immediate deletion.
            </p>
          </div>

          {/* Changes to This Policy */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              10. Changes to This Policy
            </h2>
            <p className="text-stone-700 leading-relaxed">
              We may update this Privacy Policy. When we do, we&apos;ll post the
              updated version here and notify you via email or the app.
            </p>
          </div>

          {/* Governing Law */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              11. Governing Law
            </h2>
            <p className="text-stone-700 leading-relaxed">
              This policy is governed by the laws of The Commonwealth of The
              Bahamas. Disputes will be resolved via private discussion,
              followed by third-party mediation or arbitration as needed.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                12. Contact
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              Questions? Contact our Privacy Team at:
            </p>
            <a
              href="mailto:privacy@tryechome.com"
              className="text-lg font-medium text-[#00D4FF] hover:underline"
            >
              privacy@tryechome.com
            </a>
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-16"></div>
      </div>
    </div>
  );
}
