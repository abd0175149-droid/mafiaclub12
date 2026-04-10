import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

type AuditAction = 'create' | 'update' | 'delete';

/**
 * Audit Trail Service [DI-02]
 * Logs all CRUD operations for accountability and debugging.
 * 
 * Collection: auditLog
 * Fields: userId, action, entity, entityId, details, timestamp
 */
export async function logAction(
  userId: string,
  action: AuditAction,
  entity: string,
  entityId: string,
  details?: Record<string, any>
) {
  try {
    await addDoc(collection(db, 'auditLog'), {
      userId,
      action,
      entity,
      entityId,
      details: details || {},
      timestamp: Timestamp.now(),
    });
  } catch (err) {
    // Audit logging should never break the main operation
    console.error('[AuditService] Failed to log action:', err);
  }
}

/**
 * Helper to log activity operations
 */
export const auditActivity = (userId: string, action: AuditAction, activityId: string, details?: Record<string, any>) =>
  logAction(userId, action, 'activities', activityId, details);

/**
 * Helper to log booking operations
 */
export const auditBooking = (userId: string, action: AuditAction, bookingId: string, details?: Record<string, any>) =>
  logAction(userId, action, 'bookings', bookingId, details);

/**
 * Helper to log cost operations
 */
export const auditCost = (userId: string, action: AuditAction, costId: string, details?: Record<string, any>) =>
  logAction(userId, action, 'costs', costId, details);

/**
 * Helper to log staff operations
 */
export const auditStaff = (userId: string, action: AuditAction, staffId: string, details?: Record<string, any>) =>
  logAction(userId, action, 'staff', staffId, details);
