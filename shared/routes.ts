import { z } from 'zod';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  dashboard: {
    stats: { method: 'GET' as const, path: '/api/dashboard/stats' as const, responses: { 200: z.any() } },
    recentActivity: { method: 'GET' as const, path: '/api/dashboard/recent-activity' as const, responses: { 200: z.any() } },
  },
  userProfiles: {
    list: { method: 'GET' as const, path: '/api/user-profiles' as const, responses: { 200: z.any() } },
    get: { method: 'GET' as const, path: '/api/user-profiles/:id' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/user-profiles' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/user-profiles/:id' as const, input: z.any(), responses: { 200: z.any() } },
  },
  companies: {
    list: { method: 'GET' as const, path: '/api/companies' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/companies' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/companies/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/companies/:id' as const, responses: { 204: z.void() } },
  },
  departments: {
    list: { method: 'GET' as const, path: '/api/departments' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/departments' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/departments/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/departments/:id' as const, responses: { 204: z.void() } },
  },
  designations: {
    list: { method: 'GET' as const, path: '/api/designations' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/designations' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/designations/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/designations/:id' as const, responses: { 204: z.void() } },
  },
  categories: {
    list: { method: 'GET' as const, path: '/api/categories' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/categories' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/categories/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/categories/:id' as const, responses: { 204: z.void() } },
  },
  vendors: {
    list: { method: 'GET' as const, path: '/api/vendors' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/vendors' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/vendors/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/vendors/:id' as const, responses: { 204: z.void() } },
  },
  sites: {
    list: { method: 'GET' as const, path: '/api/sites' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/sites' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/sites/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/sites/:id' as const, responses: { 204: z.void() } },
  },
  buildings: {
    list: { method: 'GET' as const, path: '/api/buildings' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/buildings' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/buildings/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/buildings/:id' as const, responses: { 204: z.void() } },
  },
  floors: {
    list: { method: 'GET' as const, path: '/api/floors' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/floors' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/floors/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/floors/:id' as const, responses: { 204: z.void() } },
  },
  zones: {
    list: { method: 'GET' as const, path: '/api/zones' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/zones' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/zones/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/zones/:id' as const, responses: { 204: z.void() } },
  },
  doors: {
    list: { method: 'GET' as const, path: '/api/doors' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/doors' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/doors/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/doors/:id' as const, responses: { 204: z.void() } },
  },
  devices: {
    list: { method: 'GET' as const, path: '/api/devices' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/devices' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/devices/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/devices/:id' as const, responses: { 204: z.void() } },
  },
  people: {
    list: { method: 'GET' as const, path: '/api/people' as const, responses: { 200: z.any() } },
    get: { method: 'GET' as const, path: '/api/people/:id' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/people' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/people/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/people/:id' as const, responses: { 204: z.void() } },
  },
  credentials: {
    list: { method: 'GET' as const, path: '/api/credentials' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/credentials' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/credentials/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/credentials/:id' as const, responses: { 204: z.void() } },
  },
  accessCards: {
    list: { method: 'GET' as const, path: '/api/access-cards' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/access-cards' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/access-cards/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/access-cards/:id' as const, responses: { 204: z.void() } },
  },
  shifts: {
    list: { method: 'GET' as const, path: '/api/shifts' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/shifts' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/shifts/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/shifts/:id' as const, responses: { 204: z.void() } },
  },
  shiftAssignments: {
    list: { method: 'GET' as const, path: '/api/shift-assignments' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/shift-assignments' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/shift-assignments/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/shift-assignments/:id' as const, responses: { 204: z.void() } },
  },
  holidays: {
    list: { method: 'GET' as const, path: '/api/holidays' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/holidays' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/holidays/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/holidays/:id' as const, responses: { 204: z.void() } },
  },
  accessLevels: {
    list: { method: 'GET' as const, path: '/api/access-levels' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/access-levels' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/access-levels/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/access-levels/:id' as const, responses: { 204: z.void() } },
  },
  accessRules: {
    list: { method: 'GET' as const, path: '/api/access-rules' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/access-rules' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/access-rules/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/access-rules/:id' as const, responses: { 204: z.void() } },
  },
  personAccess: {
    list: { method: 'GET' as const, path: '/api/person-access' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/person-access' as const, input: z.any(), responses: { 201: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/person-access/:id' as const, responses: { 204: z.void() } },
  },
  visitors: {
    list: { method: 'GET' as const, path: '/api/visitors' as const, responses: { 200: z.any() } },
    get: { method: 'GET' as const, path: '/api/visitors/:id' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/visitors' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/visitors/:id' as const, input: z.any(), responses: { 200: z.any() } },
    delete: { method: 'DELETE' as const, path: '/api/visitors/:id' as const, responses: { 204: z.void() } },
  },
  visits: {
    list: { method: 'GET' as const, path: '/api/visits' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/visits' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/visits/:id' as const, input: z.any(), responses: { 200: z.any() } },
    checkIn: { method: 'POST' as const, path: '/api/visits/:id/check-in' as const, responses: { 200: z.any() } },
    checkOut: { method: 'POST' as const, path: '/api/visits/:id/check-out' as const, responses: { 200: z.any() } },
  },
  attendance: {
    list: { method: 'GET' as const, path: '/api/attendance' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/attendance' as const, input: z.any(), responses: { 201: z.any() } },
    update: { method: 'PUT' as const, path: '/api/attendance/:id' as const, input: z.any(), responses: { 200: z.any() } },
    summary: { method: 'GET' as const, path: '/api/attendance/summary' as const, responses: { 200: z.any() } },
  },
  accessLogs: {
    list: { method: 'GET' as const, path: '/api/access-logs' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/access-logs' as const, input: z.any(), responses: { 201: z.any() } },
  },
  alerts: {
    list: { method: 'GET' as const, path: '/api/alerts' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/alerts' as const, input: z.any(), responses: { 201: z.any() } },
    acknowledge: { method: 'PUT' as const, path: '/api/alerts/:id/acknowledge' as const, responses: { 200: z.any() } },
    resolve: { method: 'PUT' as const, path: '/api/alerts/:id/resolve' as const, responses: { 200: z.any() } },
  },
  exceptions: {
    list: { method: 'GET' as const, path: '/api/exceptions' as const, responses: { 200: z.any() } },
    create: { method: 'POST' as const, path: '/api/exceptions' as const, input: z.any(), responses: { 201: z.any() } },
    approve: { method: 'PUT' as const, path: '/api/exceptions/:id/approve' as const, responses: { 200: z.any() } },
    reject: { method: 'PUT' as const, path: '/api/exceptions/:id/reject' as const, input: z.any(), responses: { 200: z.any() } },
  },
  systemSettings: {
    list: { method: 'GET' as const, path: '/api/system-settings' as const, responses: { 200: z.any() } },
    upsert: { method: 'POST' as const, path: '/api/system-settings' as const, input: z.any(), responses: { 200: z.any() } },
    testConnection: { method: 'POST' as const, path: '/api/system-settings/test-connection' as const, input: z.any(), responses: { 200: z.any() } },
  },
};

// export function buildUrl(path: string, params?: Record<string, string | number>): string {
//   let url = path;
//   if (params) {
//     Object.entries(params).forEach(([key, value]) => {
//       if (url.includes(`:${key}`)) {
//         url = url.replace(`:${key}`, String(value));
//       }
//     });
//   }
//   return url;
// }
export function buildUrl(path: string, params?: Record<string, any>): string {
  let url = path;
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;

      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      } else {
        // Agar path mein :key nahi hai, toh use Query String mein daalein
        queryParams.append(key, String(value));
      }
    });
  }

  const queryString = queryParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}