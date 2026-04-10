export interface Activity {
  id: string | number;
  name: string;
  date: string;
  description: string;
  basePrice: number;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Booking {
  id: string | number;
  activityId: string | number;
  name: string;
  phone: string;
  count: number;
  isPaid: number;
  paidAmount: number;
  receivedBy: string;
  isFree: number;
  notes: string;
  createdAt: string;
}

export interface Cost {
  id: string | number;
  activityId?: string | number;
  item: string;
  amount: number;
  date: string;
  paidBy: string;
  type: 'activity' | 'general';
}

export interface Notification {
  id: string | number;
  title: string;
  message: string;
  type: 'new_booking' | 'upcoming_activity' | 'cost_alert';
  read: number;
  createdAt: string;
  userId: string | number;
}

export interface UserSettings {
  notifications: {
    newBooking: boolean;
    upcomingActivity: boolean;
    costAlert: boolean;
  };
  dashboardLayout: string[];
}

export interface FoundationalCost {
  id: string | number;
  item: string;
  amount: number;
  paidBy: string;
  source: string;
  date: string;
}

export interface StaffMember {
  id: string | number;
  username: string;
  displayName: string;
  role: 'admin' | 'manager';
  createdAt: string;
}
