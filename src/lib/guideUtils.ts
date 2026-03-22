import { ROLES } from '@/constants/roles';
import { UserAuthClaims } from '@/types/auth';

export interface GuideInfo {
  path: string;
  label: string;
}

export const GUIDE_PATHS = {
  ORGANISATION_ADMIN: '/guides/organisation-admin-guide.pdf',
  LOCATION_ADMIN: '/guides/location-admin-guide.pdf',
} as const;

export function getGuidesForUser(authClaims: UserAuthClaims): GuideInfo[] {
  const { roles } = authClaims;

  if (roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.SUPER_ADMIN_PLUS) || roles.includes(ROLES.VOLUNTEER_ADMIN)) {
    return [
      { path: GUIDE_PATHS.ORGANISATION_ADMIN, label: 'Organisation Admin Guide' },
      { path: GUIDE_PATHS.LOCATION_ADMIN, label: 'Location Admin Guide' },
    ];
  }

  if (roles.includes(ROLES.ORG_ADMIN)) {
    return [{ path: GUIDE_PATHS.ORGANISATION_ADMIN, label: 'Organisation Admin Guide' }];
  }

  return [{ path: GUIDE_PATHS.LOCATION_ADMIN, label: 'Location Admin Guide' }];
}
