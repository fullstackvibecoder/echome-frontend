'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'missing'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!email || !token) {
      setStatus('missing');
      setMessage('Invalid unsubscribe link.');
      return;
    }

    const unsubscribe = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/email/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
        );
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error || 'Something went wrong.');
        }
      } catch {
        setStatus('error');
        setMessage('Could not reach the server. Please try again later.');
      }
    };

    unsubscribe();
  }, [email, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <Link href="/" className="text-2xl font-bold text-gray-900">EchoMe</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {status === 'loading' && (
            <p className="text-gray-500">Processing your request...</p>
          )}

          {status === 'success' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-3">You're unsubscribed</h1>
              <p className="text-gray-600 mb-6">
                You won't receive marketing emails from us anymore. You'll still get transactional emails (password resets, billing receipts, etc.).
              </p>
              <p className="text-sm text-gray-400">
                Changed your mind? Reply to any previous email or{' '}
                <a
                  href={`${API_BASE_URL}/email/resubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`}
                  className="text-cyan-600 hover:underline"
                >
                  click here to resubscribe
                </a>.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-3">Something went wrong</h1>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-400">
                If this keeps happening, reply to any email from us and say "unsubscribe" — we'll handle it manually.
              </p>
            </>
          )}

          {status === 'missing' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-3">Invalid link</h1>
              <p className="text-gray-600">
                This unsubscribe link appears to be incomplete. If you received this from an EchoMe email, try clicking the link again or reply to the email with "unsubscribe".
              </p>
            </>
          )}
        </div>

        <div className="mt-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition">
            Back to EchoMe
          </Link>
        </div>
      </div>
    </div>
  );
}
