import { HTTP_METHODS } from '@/constants/httpMethods';
import { ROLES, BaseRole } from '@/constants/roles';

// Re-export for backward compatibility
export type UserRole = BaseRole;

export type HttpMethod = keyof typeof HTTP_METHODS | '*';

export interface ApiEndpointPermission {
  path: string;
  methods: HttpMethod[];
  params?: {
    [key: string]: string | string[];
  };
}

export interface RolePermissions {
  pages: string[];

  apiEndpoints: ApiEndpointPermission[];
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [ROLES.SUPER_ADMIN_PLUS]: {
    pages: ['*'],
    apiEndpoints: [{ path: '*', methods: ['*'] }]
  },
  [ROLES.SUPER_ADMIN]: {
    pages: ['*'],
    apiEndpoints: [
      { path: '/api/cities', methods: ['*'] },
      { path: '/api/organisations', methods: [HTTP_METHODS.GET, HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.PATCH] },
      { path: '/api/services', methods: ['*'] },
      { path: '/api/accommodations', methods: ['*'] },
      { path: '/api/faqs', methods: ['*'] },
      { path: '/api/banners', methods: ['*'] },
      { path: '/api/location-logos', methods: ['*'] },
      { path: '/api/swep-banners', methods: ['*'] },
      { path: '/api/resources', methods: ['*'] },
      { path: '/api/users', methods: ['*'] },
      { path: '/api/service-categories', methods: ['*'] },
    ]
  },
  [ROLES.CITY_ADMIN]: {
    pages: ['/cities', '/organisations', '/advice', '/banners', '/location-logos', '/swep-banners', '/users'],
    apiEndpoints: [
      { path: '/api/cities', methods: ['*'] },
      { path: '/api/organisations', methods: ['*'] },
      { path: '/api/services', methods: ['*'] },
      { path: '/api/accommodations', methods: ['*'] },
      { path: '/api/faqs', methods: ['*'] },
      { path: '/api/banners', methods: ['*'] },
      { path: '/api/location-logos', methods: ['*'] },
      { path: '/api/swep-banners', methods: ['*'] },
      { path: '/api/users', methods: ['*'] },
      { path: '/api/service-categories', methods: [HTTP_METHODS.GET] },
    ]
  },
  [ROLES.VOLUNTEER_ADMIN]: {
    pages: ['/cities', '/organisations', '/advice', '/banners', '/location-logos', '/swep-banners', '/resources'],
    apiEndpoints: [
      { path: '/api/cities', methods: [HTTP_METHODS.GET] },
      { path: '/api/organisations', methods: [HTTP_METHODS.GET, HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.PATCH] },
      { path: '/api/services', methods: [HTTP_METHODS.GET, HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.PATCH] },
      { path: '/api/accommodations', methods: [HTTP_METHODS.GET, HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.PATCH] },
      { path: '/api/faqs', methods: [HTTP_METHODS.GET, HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.PATCH] },
      { path: '/api/banners', methods: [HTTP_METHODS.GET, HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.PATCH] },
      { path: '/api/location-logos', methods: [HTTP_METHODS.GET, HTTP_METHODS.POST, HTTP_METHODS.PUT, HTTP_METHODS.PATCH] },
      { path: '/api/swep-banners', methods: [HTTP_METHODS.GET, HTTP_METHODS.PUT, HTTP_METHODS.PATCH] },
      { path: '/api/resources', methods: [HTTP_METHODS.GET, HTTP_METHODS.PUT] },
      { path: '/api/users', methods: [HTTP_METHODS.POST] },
      { path: '/api/service-categories', methods: [HTTP_METHODS.GET] },
    ]
  },
  [ROLES.ORG_ADMIN]: {
    pages: ['/organisations'],
    apiEndpoints: [
      { path: '/api/cities', methods: [HTTP_METHODS.GET] },
      { path: '/api/organisations', methods: ['*'] },
      { path: '/api/services', methods: ['*'] },
      { path: '/api/accommodations', methods: ['*'] },
      { path: '/api/users', methods: [HTTP_METHODS.POST] },
      { path: '/api/service-categories', methods: [HTTP_METHODS.GET] },
    ]
  },
  [ROLES.SWEP_ADMIN]: {
    pages: ['/swep-banners'],
    apiEndpoints: [
      { path: '/api/cities', methods: [HTTP_METHODS.GET] },
      { path: '/api/swep-banners', methods: ['*'] }
    ]
  }
};

export interface UserAuthClaims {
  roles: UserRole[];
  specificClaims: string[]; // e.g., "CityAdminFor:birmingham", "AdminFor:org-slug", "SwepAdminFor:birmingham"
}

export interface ExtendedUser {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  authClaims: UserAuthClaims;
  auth0Id: string;
}
