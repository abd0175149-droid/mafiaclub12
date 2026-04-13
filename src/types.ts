export interface LocationOffer {
  id: string;
  description: string;
  price: number;       // السعر الإجمالي للعرض
  clubShare: number;   // حصة النادي
  venueShare: number;  // حصة المكان (ثابتة دائماً)
}

export interface Location {
  id: string | number;
  name: string;
  mapUrl?: string;
  offers: (LocationOffer | { description: string; price: number } | string)[];
  createdAt?: string;
}

export interface Activity {
  id: string | number;
  name: string;
  date: string;
  description: string;
  basePrice: number;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  locationId?: string | number | null;
  driveLink?: string;
  enabledOfferIds?: string[];
  isLocked?: boolean;
  createdAt: string;
}

export interface BookingOfferItem {
  offerId: string;
  offerName: string;
  quantity: number;
  unitPrice: number;   // سعر العرض الإجمالي
  clubShare: number;   // حصة النادي لكل وحدة
  venueShare: number;  // حصة المكان لكل وحدة
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
  offerItems?: BookingOfferItem[];
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
  type: 'new_booking' | 'upcoming_activity' | 'cost_alert' | 'financial' | 'new_location' | 'new_activity' | 'foundational_cost';
  read: number;
  createdAt: string;
  userId: string | number;
  targetId?: string;
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
  isProcessed?: number | boolean;
}

export interface StaffMember {
  id: string | number;
  username: string;
  displayName: string;
  role: 'admin' | 'manager' | 'location_owner';
  photoURL?: string | null;
  permissions?: string[] | string;
  createdAt: string;
  lastLogin?: string | null;
  isPartner?: number | boolean;
  locationId?: number | null;
}

// Helper: normalize legacy offer to LocationOffer
export function normalizeOffer(o: any, index: number): LocationOffer {
  if (typeof o === 'string') {
    return { id: `legacy-${index}`, description: o, price: 0, clubShare: 0, venueShare: 0 };
  }
  return {
    id: o.id || `offer-${index}`,
    description: o.description || '',
    price: o.price || 0,
    clubShare: o.clubShare ?? o.price ?? 0,
    venueShare: o.venueShare ?? 0,
  };
}
