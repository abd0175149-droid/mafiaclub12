import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserSettings } from '../types';

export const createNotification = async (userId: string, title: string, message: string, type: 'new_booking' | 'upcoming_activity' | 'cost_alert') => {
  // Check user settings before creating
  const settingsRef = doc(db, 'userSettings', userId);
  const snapshot = await getDoc(settingsRef);
  
  let shouldNotify = true;
  if (snapshot.exists()) {
    const settings = snapshot.data() as UserSettings;
    if (type === 'new_booking' && !settings.notifications.newBooking) shouldNotify = false;
    if (type === 'upcoming_activity' && !settings.notifications.upcomingActivity) shouldNotify = false;
    if (type === 'cost_alert' && !settings.notifications.costAlert) shouldNotify = false;
  }

  if (shouldNotify) {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: Timestamp.now()
    });
  }
};

/**
 * Notify all users (admins/managers) about an event [BL-09]
 * @param excludeUserId - ID of the user who triggered the action (don't self-notify)
 */
export const notifyAllAdmins = async (
  title: string, 
  message: string, 
  type: 'new_booking' | 'upcoming_activity' | 'cost_alert',
  excludeUserId?: string
) => {
  const usersSnap = await getDocs(collection(db, 'users'));
  
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    // Don't notify the user who triggered the action
    if (userId === excludeUserId) continue;
    
    await createNotification(userId, title, message, type);
  }
};
