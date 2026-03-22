'use client';

import { useSession } from 'next-auth/react';
import { useAuthorization } from '@/hooks/useAuthorization';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getGuidesForUser } from '@/lib/guideUtils';
import { ExternalLink, Download } from 'lucide-react';

export default function GuidePage() {
  const { isChecking, isAuthorized } = useAuthorization({
    requiredPage: '/guide',
    autoRedirect: true
  });

  const { data: session } = useSession();

  if (isChecking) {
    return <LoadingSpinner />;
  }

  if (!isAuthorized || !session?.user?.authClaims) {
    return null;
  }

  const guides = getGuidesForUser(session.user.authClaims);

  return (
    <div className="min-h-screen bg-brand-q">
      <PageHeader title="Guide" />

      <div className="page-container section-spacing padding-top-zero">
        <div className={`grid gap-6 ${guides.length > 1 ? 'sm:grid-cols-2' : 'max-w-lg'}`}>
          {guides.map((guide) => (
            <div
              key={guide.path}
              className="bg-white rounded-lg border border-brand-f p-6 flex flex-col gap-4"
            >
              <h2 className="text-lg font-semibold text-brand-l">{guide.label}</h2>
              <p className="text-sm text-brand-f">
                Step-by-step guide to using the content management system.
              </p>
              <div className="flex gap-3 mt-auto">
                <a
                  href={guide.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-base btn-primary btn-sm flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Guide
                </a>
                <a
                  href={guide.path}
                  download
                  className="btn-base btn-secondary btn-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
