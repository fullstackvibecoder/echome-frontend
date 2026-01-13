'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Settings,
  Mail,
  FileText,
} from 'lucide-react';

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-lg text-stone-600">
            Our terms and conditions for using EchoMe
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Effective Date */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-[#1C1C1E]">
                  Effective Date
                </h2>
                <p className="text-sm text-stone-600">[Insert Date]</p>
              </div>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              Welcome to EchoMe, a product owned and operated by EchoMe Inc.,
              a Bahamian-registered corporation. By accessing or using EchoMe
              (&ldquo;Platform,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by
              these Terms of Service (&ldquo;Terms&rdquo;).
            </p>
            <p className="text-stone-700 leading-relaxed">
              If you do not agree to these Terms, do not use the Platform.
            </p>
          </div>

          {/* Eligibility */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                1. Eligibility
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed">
              You must be at least 18 years old or the age of majority in your
              jurisdiction to use EchoMe. By using EchoMe, you confirm that
              you meet this requirement and that all information you provide
              is accurate and complete.
            </p>
          </div>

          {/* Description of Service */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                2. Description of Service
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              EchoMe is a personalized content automation platform that uses
              your past content, uploaded assets, and connected social
              accounts to generate AI-powered media in your voice and tone.
              You may use EchoMe to:
            </p>
            <ul className="text-stone-700 text-sm space-y-2 pl-4">
              <li>• Upload content (videos, audio, text)</li>
              <li>
                • Connect social accounts to import your historical posts
              </li>
              <li>• Build Your Echo</li>
              <li>
                • Generate content including blogs, carousels, clips,
                transcripts, and other formats
              </li>
            </ul>
          </div>

          {/* User Accounts */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                3. User Accounts
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              You must create an account to use EchoMe. You agree to maintain
              the confidentiality of your login credentials and are
              responsible for all activity under your account.
            </p>
            <p className="text-stone-700 leading-relaxed">
              You may connect third-party services (e.g. Instagram, TikTok,
              LinkedIn) via OAuth. You authorize EchoMe to access permitted
              data as described in our Privacy Policy.
            </p>
          </div>

          {/* Use of Imported Content */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                4. Use of Imported Content
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              When you connect a social platform, you explicitly authorize us
              to access, import, store, and process content from your accounts
              (e.g. captions, posts, timestamps) to generate personalized
              outputs. All imported data is used solely to power your EchoMe
              experience.
            </p>
            <p className="text-stone-700 leading-relaxed">
              You retain ownership of your imported and uploaded content. You
              grant us a limited license to use, copy, store, and transform it
              solely to provide the EchoMe service.
            </p>
          </div>

          {/* Generated Content */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              5. Generated Content
            </h2>
            <p className="text-stone-700 leading-relaxed mb-4">
              EchoMe generates content using third-party AI models (e.g.
              OpenAI, Anthropic). You are responsible for reviewing and
              editing any outputs before publishing. We do not guarantee
              factual accuracy, legality, or compliance of generated content.
            </p>
            <p className="text-stone-700 leading-relaxed">
              We do not claim ownership of content generated for your account.
            </p>
          </div>

          {/* User Responsibilities */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              6. User Responsibilities
            </h2>
            <p className="text-stone-700 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="text-stone-700 text-sm space-y-2 pl-4">
              <li>
                • Use EchoMe to create content that violates laws or infringes
                rights
              </li>
              <li>• Upload illegal, abusive, or harmful material</li>
              <li>
                • Misuse the service to generate impersonations,
                misinformation, or spam
              </li>
              <li>• Attempt to reverse engineer or misuse EchoMe systems</li>
            </ul>
          </div>

          {/* Subscription & Billing */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              7. Subscription & Billing
            </h2>
            <p className="text-stone-700 leading-relaxed mb-4">
              EchoMe is offered on a subscription basis with optional credit
              top-ups. Plans are billed monthly or annually. All fees are in
              [USD or CAD] and non-refundable, except where required by law.
            </p>
            <p className="text-stone-700 leading-relaxed">
              You may cancel anytime, but access will remain active until the
              end of your billing cycle.
            </p>
          </div>

          {/* Data Storage & Transfer */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              8. Data Storage & Transfer
            </h2>
            <p className="text-stone-700 leading-relaxed mb-4">
              Your data (including imported and generated content) may be
              stored on secure servers located outside your country of
              residence, including in the United States, Canada, and the EU.
              By using EchoMe, you consent to this international data transfer
              and storage.
            </p>
            <p className="text-stone-700 leading-relaxed mb-4">
              We implement industry-standard security but cannot guarantee
              absolute protection.
            </p>
            <div className="pl-4 border-l-2 border-[#00D4FF] mt-4">
              <h3 className="text-base font-medium text-stone-800 mb-2">
                8.A) Extended Use of Anonymized Data
              </h3>
              <p className="text-stone-700 text-sm leading-relaxed mb-2">
                By using EchoMe, you grant us a non-exclusive, worldwide,
                royalty-free license to use de-identified and anonymized
                versions of your uploaded, connected, or generated content for
                the following purposes:
              </p>
              <ul className="text-stone-700 text-sm space-y-1 mb-2">
                <li>• Improving our AI workflows, prompts, and models</li>
                <li>
                  • Training internal systems or custom models (not
                  third-party foundation models)
                </li>
                <li>• Performing aggregate-level research and analytics</li>
                <li>
                  • Developing derivative products, features, or services
                </li>
              </ul>
              <p className="text-stone-700 text-sm leading-relaxed mb-2">
                We will never use or share your identifiable content
                (including name, email, or linked social handles) for these
                purposes without your explicit consent.
              </p>
              <p className="text-stone-700 text-sm leading-relaxed">
                You may opt out of this extended use of your anonymized data
                by contacting{' '}
                <a
                  href="mailto:privacy@tryechome.com"
                  className="text-[#00D4FF] hover:underline font-medium"
                >
                  privacy@tryechome.com
                </a>
                . However, doing so may limit some platform functionality.
              </p>
            </div>
          </div>

          {/* Termination */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              9. Termination
            </h2>
            <p className="text-stone-700 leading-relaxed mb-4">
              We may suspend or terminate your account without notice if you
              breach these Terms, violate applicable law, or engage in
              behaviour harmful to EchoMe or other users.
            </p>
            <p className="text-stone-700 leading-relaxed">
              You may delete your account at any time. All associated data
              will be deleted in accordance with our Privacy Policy.
            </p>
          </div>

          {/* Disclaimer of Warranties */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              10. Disclaimer of Warranties
            </h2>
            <p className="text-stone-700 leading-relaxed">
              EchoMe is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We make no
              warranties regarding the accuracy, reliability, or fitness for a
              particular purpose of the service or generated content.
            </p>
          </div>

          {/* Limitation of Liability */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              11. Limitation of Liability
            </h2>
            <p className="text-stone-700 leading-relaxed">
              To the maximum extent permitted by law, EchoMe is not liable for
              indirect, incidental, or consequential damages arising out of
              your use of the Platform or reliance on generated content.
            </p>
          </div>

          {/* Modifications */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              12. Modifications
            </h2>
            <p className="text-stone-700 leading-relaxed">
              We may update these Terms from time to time. If we make material
              changes, we will notify you via the Platform or email. Continued
              use after updates constitutes your acceptance.
            </p>
          </div>

          {/* Governing Law */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <h2 className="text-xl font-medium text-[#1C1C1E] mb-4">
              13. Governing Law
            </h2>
            <p className="text-stone-700 leading-relaxed">
              These Terms are governed by the laws of The Commonwealth of The
              Bahamas. Any disputes will be resolved in accordance with the
              Dispute Resolution process outlined in our Privacy Policy.
            </p>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00D4FF] rounded-lg">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-medium text-[#1C1C1E]">
                14. Contact
              </h2>
            </div>
            <p className="text-stone-700 leading-relaxed mb-4">
              For questions or legal inquiries, contact us at:
            </p>
            <a
              href="mailto:legal@tryechome.com"
              className="text-lg font-medium text-[#00D4FF] hover:underline"
            >
              legal@tryechome.com
            </a>
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-16"></div>
      </div>
    </div>
  );
}
