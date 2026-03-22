'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthorization } from '@/hooks/useAuthorization';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getGuidesForUser } from '@/lib/guideUtils';
import { Download } from 'lucide-react';

export default function GuidePage() {
  const { isChecking, isAuthorized } = useAuthorization({
    requiredPage: '/guide',
    autoRedirect: true
  });

  const { data: session } = useSession();
  const [activeGuideIndex, setActiveGuideIndex] = useState(0);

  if (isChecking) {
    return <LoadingSpinner />;
  }

  if (!isAuthorized || !session?.user?.authClaims) {
    return null;
  }

  const guides = getGuidesForUser(session.user.authClaims);
  const activeGuide = guides[activeGuideIndex];

  return (
    <div className="min-h-screen bg-brand-q">
      <PageHeader
        title="Guide"
        actions={
          <a
            href={activeGuide.path}
            download
            className="btn-base btn-secondary btn-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        }
      />

      <div className="page-container section-spacing padding-top-zero">
        {guides.length > 1 && (
          <div className="flex gap-2 mb-6">
            {guides.map((guide, index) => (
              <button
                key={guide.path}
                onClick={() => setActiveGuideIndex(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  index === activeGuideIndex
                    ? 'bg-brand-a text-white'
                    : 'bg-white text-brand-l hover:bg-brand-i border border-brand-f'
                }`}
              >
                {guide.label}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-lg border border-brand-f overflow-hidden">
          <iframe
            src={activeGuide.path}
            className="w-full"
            style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}
            title={activeGuide.label}
          />
        </div>
      </div>
    </div>
  );
}
