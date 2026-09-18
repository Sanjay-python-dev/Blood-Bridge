/**
 * BloodBridge Notification Center Service
 * 
 * Supports local simulated notifications, reactive in-app dispatching,
 * and persistent storage. Structured so backend push (FCM, SMS, Email)
 * can be plugged in seamlessly.
 */

const NOTIFICATIONS_STORAGE_KEY = 'bloodbridge_notifications_v1';

export const NOTIFICATION_TYPES = {
  NEW_DONATION_REQUEST: 'NEW_DONATION_REQUEST',
  EMERGENCY_REQUEST_NEARBY: 'EMERGENCY_REQUEST_NEARBY',
  DONATION_ELIGIBILITY_UPDATED: 'DONATION_ELIGIBILITY_UPDATED',
  HOSPITAL_REQUEST: 'HOSPITAL_REQUEST',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  REQUEST_DECLINED: 'REQUEST_DECLINED',
};

const initialMockNotifications = [
  {
    id: 'notif-1',
    type: NOTIFICATION_TYPES.NEW_DONATION_REQUEST,
    title: 'New Donation Request',
    message: 'Apollo Speciality Hospital Karur requested 2 units of O+ blood for patient Rajesh Kannan.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    read: false,
    targetRole: 'USER',
    actionLink: '/donor-dashboard?tab=requests',
    metadata: { patient: 'Rajesh Kannan', bloodGroup: 'O+', hospital: 'Apollo Speciality Hospital' },
  },
  {
    id: 'notif-2',
    type: NOTIFICATION_TYPES.DONATION_ELIGIBILITY_UPDATED,
    title: 'Eligibility Active',
    message: 'Your 90-day cooling interval is complete. You are now officially Eligible to Donate Now.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    read: false,
    targetRole: 'USER',
    actionLink: '/donor-dashboard',
    metadata: { status: 'Eligible to Donate Now' },
  },
  {
    id: 'notif-3',
    type: NOTIFICATION_TYPES.EMERGENCY_REQUEST_NEARBY,
    title: 'Emergency Alert in Karur',
    message: 'Critical need for B- blood at Government Medical College Hospital Karur.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    read: true,
    targetRole: 'USER',
    actionLink: '/find-blood?group=B-',
    metadata: { city: 'Karur', bloodGroup: 'B-' },
  },
  {
    id: 'notif-4',
    type: NOTIFICATION_TYPES.HOSPITAL_REQUEST,
    title: 'Hospital Verification Complete',
    message: 'Apollo Speciality Hospital Karur has verified your donation readiness badge.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    targetRole: 'USER',
    actionLink: '/donor-dashboard',
    metadata: {},
  }
];

export const getStoredNotifications = () => {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading notifications from localStorage:', e);
  }
  return initialMockNotifications;
};

export const saveStoredNotifications = (notifications) => {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('bloodbridge_notifications_updated', { detail: notifications }));
  } catch (e) {
    console.warn('Error storing notifications:', e);
  }
};

export const addNotification = (notif) => {
  const current = getStoredNotifications();
  const newEntry = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    read: false,
    targetRole: 'USER',
    ...notif,
  };
  const updated = [newEntry, ...current];
  saveStoredNotifications(updated);
  return newEntry;
};

export const markNotificationAsRead = (id) => {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveStoredNotifications(updated);
  return updated;
};

export const markAllNotificationsAsRead = () => {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveStoredNotifications(updated);
  return updated;
};

export const getUnreadNotificationCount = (role = 'USER') => {
  const current = getStoredNotifications();
  return current.filter((n) => !n.read && (n.targetRole === role || n.targetRole === 'ALL')).length;
};
