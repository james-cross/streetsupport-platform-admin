'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { hasPageAccess } from '@/lib/userService';

interface NavItem {
  href: string;
  label: string;
  page: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/organisations', label: 'Organisations', page: '/organisations' },
  { href: '/swep-banners', label: 'SWEP', page: '/swep-banners' },
  { href: '/users', label: 'Users', page: '/users' },
  { href: '/resources', label: 'Resources', page: '/resources' },
];

interface RoleBasedNavProps {
  className?: string;
  onItemClick?: () => void;
  isMobile?: boolean;
}

export default function RoleBasedNav({ className = '', onItemClick, isMobile = false }: RoleBasedNavProps) {
  const { data: session } = useSession();

  if (!session?.user?.authClaims) {
    return null;
  }

  const userAuthClaims = session.user.authClaims;

  // Filter nav items based on user permissions
  const allowedNavItems = NAV_ITEMS.filter(item => 
    hasPageAccess(userAuthClaims, item.page)
  );

  if (allowedNavItems.length === 0) {
    return null;
  }

  const baseItemClass = isMobile ? 'mobile-nav-link' : 'nav-link';

  return (
    <>
      {allowedNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${baseItemClass} ${className}`}
          onClick={onItemClick}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}
