'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PasswordResetPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const message = searchParams.get('message');

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-8 text-center">
        {success ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Updated</h1>
            <p className="text-gray-600 mb-6">
              {message || 'Your password has been set. You can now sign in with your new password.'}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset</h1>
            <p className="text-gray-600 mb-6">
              {message || 'If you need to reset your password, please use the sign in page.'}
            </p>
          </>
        )}
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-base btn-primary">Go to Home</Link>
          <Link href="/api/auth/signin/auth0" className="btn-base btn-secondary">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
