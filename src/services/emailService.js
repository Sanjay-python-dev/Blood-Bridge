/**
 * BloodBridge Transactional Email Service
 *
 * CRITICAL SECURITY MANDATES:
 * 1. Resend API Key is NEVER stored or referenced on the client side.
 * 2. All email operations route strictly through the secure server / Firebase Cloud Functions.
 * 3. Client code only sends the recipient email address and receives delivery confirmation.
 */

import { functions, isFirebaseConfigured } from '../lib/firebaseClient';
import { httpsCallable } from 'firebase/functions';

/**
 * Check server configuration status safely.
 * Returns boolean whether RESEND_API_KEY is configured on the backend without revealing the key.
 */
export async function getEmailConfigStatus() {
  try {
    const res = await fetch('/api/email/config-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not check email config status:', err);
  }

  return {
    success: false,
    isKeyConfigured: false,
    sender: 'BloodBridge <onboarding@resend.dev>',
    service: 'Resend Transactional Email Engine',
  };
}

/**
 * Dispatch test email to a recipient address through the secure backend / Firebase Cloud Functions.
 *
 * @param {string} recipientEmail - Target email address
 * @returns {Promise<{ success: boolean, message: string, id?: string, error?: string }>}
 */
export async function sendTestEmail(recipientEmail) {
  const cleanEmail = typeof recipientEmail === 'string' ? recipientEmail.trim() : '';

  if (!cleanEmail) {
    throw new Error('Please enter a recipient email address.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('Please enter a valid email address format (e.g. name@domain.com).');
  }

  // Strategy 1: If Firebase Functions is configured and connected, attempt Firebase Callable Function
  if (isFirebaseConfigured() && functions) {
    try {
      const sendCallable = httpsCallable(functions, 'sendTestEmail');
      const response = await sendCallable({ email: cleanEmail });
      if (response?.data) {
        return response.data;
      }
    } catch (fbErr) {
      // If function is not yet deployed to Firebase cloud or local emulator isn't mapped,
      // gracefully fall through to Vite / Express server backend endpoint
      console.info('Firebase Cloud Functions direct call fell back to local server endpoint:', fbErr.message);
    }
  }

  // Strategy 2: Call secure backend API endpoint (/api/send-test-email)
  const res = await fetch('/api/send-test-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: cleanEmail }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    const errMsg = data.error || data.message || `Server returned error (${res.status})`;
    throw new Error(errMsg);
  }

  return data;
}
