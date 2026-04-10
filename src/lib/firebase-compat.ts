/**
 * Firebase Compatibility Layer — replaces firebase/firestore calls with REST API
 * This allows Dashboard.tsx to work with minimal changes
 */
import { apiGet, apiPost, apiPut, apiDelete } from './api';

// Fake db reference
export const db = {} as any;
export const auth = { currentUser: null } as any;

export enum OperationType {
  CREATE = 'create', UPDATE = 'update', DELETE = 'delete',
  LIST = 'list', GET = 'get', WRITE = 'write',
}

export function handleFirestoreError(error: unknown, _op: OperationType, _path: string | null) {
  console.error('API Error:', error);
  throw error;
}

// Timestamp compatibility
export const Timestamp = {
  now: () => new Date().toISOString(),
  fromDate: (d: Date) => d.toISOString(),
};

// These are no-ops — data loading is done via REST in Dashboard
export function collection(_db: any, name: string) { return name; }
export function doc(_db: any, col: string, id: string | number) { return { col, id: String(id) }; }
export function query(...args: any[]) { return args; }
export function where(..._args: any[]) { return {}; }
export function orderBy(..._args: any[]) { return {}; }
export function onSnapshot() { return () => {}; }
export function getDocs(..._args: any[]) { return Promise.resolve({ empty: true, docs: [] }); }

// CRUD wrappers that call the REST API
export async function addDoc(collectionRef: any, data: any) {
  const col = typeof collectionRef === 'string' ? collectionRef : collectionRef;
  const endpoint = mapCollection(col);
  return apiPost(endpoint, cleanData(data));
}

export async function updateDoc(docRef: any, data: any) {
  const endpoint = mapCollection(docRef.col);
  return apiPut(`${endpoint}/${docRef.id}`, cleanData(data));
}

export async function deleteDoc(docRef: any) {
  const endpoint = mapCollection(docRef.col);
  return apiDelete(`${endpoint}/${docRef.id}`);
}

export async function setDoc(docRef: any, data: any, _opts?: any) {
  const endpoint = mapCollection(docRef.col);
  return apiPut(`${endpoint}/${docRef.id}`, cleanData(data));
}

export function writeBatch(_db: any) {
  const ops: Array<() => Promise<any>> = [];
  return {
    delete: (ref: any) => ops.push(() => deleteDoc(ref)),
    update: (ref: any, data: any) => ops.push(() => updateDoc(ref, data)),
    commit: () => Promise.all(ops.map(fn => fn())),
  };
}

function mapCollection(col: string): string {
  const map: Record<string, string> = {
    activities: '/activities',
    bookings: '/bookings',
    costs: '/costs',
    foundationalCosts: '/foundational',
    staff: '/staff',
    notifications: '/notifications',
    userSettings: '/settings',
    users: '/settings',
  };
  return map[col] || `/${col}`;
}

function cleanData(data: any) {
  const clean = { ...data };
  // Convert ISO strings that look like Timestamp
  for (const [k, v] of Object.entries(clean)) {
    if (v && typeof v === 'object' && 'seconds' in (v as any)) {
      clean[k] = new Date((v as any).seconds * 1000).toISOString();
    }
  }
  delete clean.createdAt; // server handles this
  return clean;
}

// Notification service compatibility
export async function createNotification(_userId: string, _title: string, _msg: string, _type: string) {
  // Notifications are created server-side automatically
}

export async function notifyAllAdmins(_title: string, _msg: string, _type: string, _excludeId: string) {
  // Notifications are created server-side automatically
}

// Firebase Auth compatibility (no-ops)
export async function updatePassword(_user: any, _password: string) {
  // Not supported in local mode - use staff management
}

export async function updateProfile(_user: any, _data: any) {
  // Not supported in local mode
}
