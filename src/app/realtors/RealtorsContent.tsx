'use client';

/**
 * Realtors Landing Page
 *
 * Dedicated page for real estate professionals to learn about EchoMe's
 * video content creation tools for property marketing.
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function RealtorsContent() {
  useEffect(() => {
    // Enhanced error handling for WebView integration issues
    const handleWebViewErrors = (event: ErrorEvent) => {
      if (event.error?.message?.includes('Java object is gone') ||
          event.error?.message?.includes('enableButtonsClickedMetaDataLogging')) {
        console.warn('WebView integration error detected - implementing graceful fallback');
        // Prevent the error from propagating to Sentry
        event.preventDefault();
        return false;
      }
    };

    // Add error listener
    window.addEventListener('error', handleWebViewErrors);

    // Add unhandled promise rejection handler
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Java object is gone') ||
          event.reason?.message?.includes('enableButtonsClickedMetaDataLogging')) {
        console.warn('WebView promise rejection detected - implementing graceful fallback');
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('unhandledrejection', handlePromiseRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleWebViewErrors);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
              Transform Your Property Listings
              <span className="block text-blue-200">with AI-Powered Video Content</span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-blue-100">
              Create compelling property tour videos, social media content, and marketing materials 
              that help listings stand out and sell faster. Purpose-built for real estate professionals.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/examples"
                className="inline-flex items-center px-8 py-3 border-2 border-white text-lg font-medium rounded-md text-white hover:bg-white hover:text-blue-600 transition-colors"
              >
                View Examples
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Built for Real Estate Success
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
              Everything you need to create professional property marketing content
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-md bg-blue-500 text-white mx-auto">
                🏠
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-900">Property Tour Videos</h3>
              <p className="mt-2 text-base text-gray-500">
                Transform raw property footage into engaging virtual tours with AI-generated narration and highlights
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-md bg-blue-500 text-white mx-auto">
                📱
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-900">Social Media Content</h3>
              <p className="mt-2 text-base text-gray-500">
                Generate platform-specific content for Instagram, Facebook, TikTok, and LinkedIn from one video
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-md bg-blue-500 text-white mx-auto">
                ✍️
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-900">Listing Descriptions</h3>
              <p className="mt-2 text-base text-gray-500">
                AI-crafted property descriptions that highlight key features and appeal to buyers
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-md bg-blue-500 text-white mx-auto">
                🎯
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-900">Market Insights</h3>
              <p className="mt-2 text-base text-gray-500">
                Include neighborhood highlights, market trends, and local amenities in your content
              </p>
            </div>

            {/* Feature 5 */}
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-md bg-blue-500 text-white mx-auto">
                ⚡
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-900">Quick Turnaround</h3>
              <p className="mt-2 text-base text-gray-500">
                From property video to complete marketing package in minutes, not hours
              </p>
            </div>

            {/* Feature 6 */}
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-md bg-blue-500 text-white mx-auto">
                🔧
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-900">Brand Customization</h3>
              <p className="mt-2 text-base text-gray-500">
                Add your branding, contact info, and custom messaging to all generated content
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Simple 3-Step Process
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-500 text-white text-xl font-bold mx-auto">
                1
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-900">Upload Property Video</h3>
              <p className="mt-2 text-base text-gray-500">
                Record a walkthrough or upload existing footage of the property
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-500 text-white text-xl font-bold mx-auto">
                2
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-900">AI Processing</h3>
              <p className="mt-2 text-base text-gray-500">
                Our AI analyzes the property, identifies key features, and creates optimized content
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-500 text-white text-xl font-bold mx-auto">
                3
              </div>
              <h3 className="mt-6 text-xl font-medium text-gray-900">Download & Share</h3>
              <p className="mt-2 text-base text-gray-500">
                Get your complete marketing package ready for MLS, social media, and websites
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to Transform Your Listings?
            </h2>
            <p className="mt-4 text-xl text-blue-100">
              Join real estate professionals who are already using EchoMe to sell properties faster
            </p>
            <div className="mt-8">
              <Link
                href="/auth/signup"
                className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}