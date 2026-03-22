'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { X } from 'lucide-react';

const BANNER_DISMISSED_KEY = 'guide-banner-dismissed';

export function GuideBanner() {
  const { data: session } = useSession();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  if (!session?.user?.authClaims || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
      <div className="bg-brand-i border border-brand-a/20 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-brand-l">
          Our new content management system is here.{' '}
          <Link href="/guide" className="font-semibold text-brand-a hover:text-brand-b underline">
            Learn how to use it
          </Link>
        </p>
        <button
          onClick={handleDismiss}
          className="text-brand-f hover:text-brand-l transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
