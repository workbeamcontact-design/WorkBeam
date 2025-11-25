/**
 * Overdue Invoice Notification Service
 * Lightweight service to check for overdue invoices and send notifications
 */

import { api } from './api';
import { toast } from 'sonner@2.0.3';

interface OverdueInvoice {
  id: string;
  number: string;
  clientName: string;
  total: number;
  dueDate: string;
  daysPastDue: number;
}

let lastCheckTimestamp = 0;
let notificationInterval: number | null = null;
const CHECK_INTERVAL = 15 * 60 * 1000; // Check every 15 minutes

/**
 * Check for overdue invoices and show notifications if needed
 */
export async function checkOverdueInvoices(): Promise<void> {
  try {
    // Throttle checks to avoid excessive API calls
    const now = Date.now();
    if (now - lastCheckTimestamp < CHECK_INTERVAL) {
      return;
    }
    lastCheckTimestamp = now;

    // Get notification preferences with timeout
    const prefsResult = await Promise.race([
      api.getNotificationPreferences().catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    ]);
    const preferences = prefsResult?.data;
    
    // Skip if preferences couldn't be loaded or push notifications are disabled
    if (!preferences?.push_payment_overdue) {
      return;
    }

    // Check if we're in quiet hours
    if (isQuietHours(preferences)) {
      return;
    }

    // Get overdue invoices with timeout
    const overdueInvoices = await Promise.race([
      getOverdueInvoices(preferences).catch(() => []),
      new Promise<OverdueInvoice[]>((resolve) => setTimeout(() => resolve([]), 3000))
    ]);
    
    // Send notifications for invoices that need them
    if (Array.isArray(overdueInvoices)) {
      for (const invoice of overdueInvoices) {
        if (shouldSendNotification(invoice, preferences)) {
          sendOverdueNotification(invoice);
          // Mark that we sent a notification (in a real app, you'd update the invoice record)
          console.log(`📧 Overdue notification sent for invoice ${invoice.number}`);
        }
      }
    }

  } catch (error) {
    // Silently handle errors - don't show error toasts for background checks
    if (error?.message !== 'Timeout') {
      console.warn('⚠️ Error checking overdue invoices:', error?.message || error);
    }
  }
}

/**
 * Get all overdue invoices based on preferences
 */
async function getOverdueInvoices(preferences: any): Promise<OverdueInvoice[]> {
  try {
    // Race against timeout to prevent hanging
    const dataPromise = Promise.all([
      api.getInvoices().catch(() => []),
      api.getClients().catch(() => [])
    ]);
    
    const timeoutPromise = new Promise<[any[], any[]]>((resolve) => 
      setTimeout(() => resolve([[], []]), 2000)
    );
    
    const [invoices, clients] = await Promise.race([dataPromise, timeoutPromise]);

    // Return empty if we got no data
    if (!invoices || invoices.length === 0) {
      return [];
    }

    const now = new Date();
    const gracePeriod = preferences?.overdue_grace_period || 0;
    const overdueInvoices: OverdueInvoice[] = [];

    for (const invoice of invoices) {
      // Skip paid invoices or invoices without due dates
      if (invoice.status === 'paid' || !invoice.dueDate) {
        continue;
      }

      // Calculate days past due
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only include if past grace period
      if (daysPastDue > gracePeriod) {
        // Find client name
        const client = clients.find(c => c.id === invoice.clientId);
        
        overdueInvoices.push({
          id: invoice.id,
          number: invoice.number || 'DRAFT',
          clientName: client?.name || 'Unknown Client',
          total: invoice.total || 0,
          dueDate: invoice.dueDate,
          daysPastDue
        });
      }
    }

    return overdueInvoices;
  } catch (error) {
    // Silently handle errors for background checks
    console.warn('⚠️ Error getting overdue invoices:', error?.message || error);
    return [];
  }
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(preferences: any): boolean {
  if (!preferences?.quiet_hours_enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = (preferences.quiet_hours_start || '22:00').split(':').map(Number);
  const [endHour, endMin] = (preferences.quiet_hours_end || '08:00').split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}

/**
 * Check if we should send a notification for this invoice based on frequency
 */
function shouldSendNotification(invoice: OverdueInvoice, preferences: any): boolean {
  // For now, we'll use localStorage to track when notifications were last sent
  // In a real app, this would be stored in the database with the invoice
  const lastSentKey = `overdue_notification_${invoice.id}`;
  const lastSent = localStorage.getItem(lastSentKey);
  
  if (!lastSent) {
    // Never sent a notification for this invoice
    return true;
  }

  const lastSentDate = new Date(lastSent);
  const now = new Date();
  const daysSinceLastNotification = Math.floor((now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24));

  const frequency = preferences?.overdue_reminder_frequency || 'daily';
  
  switch (frequency) {
    case 'daily':
      return daysSinceLastNotification >= 1;
    case 'every_3_days':
      return daysSinceLastNotification >= 3;
    case 'weekly':
      return daysSinceLastNotification >= 7;
    default:
      return false;
  }
}

/**
 * Send an overdue notification
 */
function sendOverdueNotification(invoice: OverdueInvoice): void {
  const amount = new Intl.NumberFormat('en-GB', { 
    style: 'currency', 
    currency: 'GBP' 
  }).format(invoice.total);

  const message = `💰 Payment Overdue: Invoice ${invoice.number} for ${invoice.clientName} is ${invoice.daysPastDue} days overdue (${amount}). Consider following up with your client.`;

  // Show toast notification
  toast.error(message, {
    duration: 8000, // Show for 8 seconds
    action: {
      label: 'View Invoice',
      onClick: () => {
        // This would navigate to the invoice detail - for now just log
        console.log(`Navigate to invoice ${invoice.id}`);
      }
    }
  });

  // Record that we sent this notification
  const lastSentKey = `overdue_notification_${invoice.id}`;
  localStorage.setItem(lastSentKey, new Date().toISOString());

  // Log for debugging
  console.log(`🔔 Overdue notification: ${invoice.clientName} - ${invoice.number} - ${invoice.daysPastDue} days overdue`);
}

/**
 * Initialize the overdue notification service
 * Call this when the app starts or when navigating to main screens
 */
export function initializeOverdueNotifications(): void {
  // Clear any existing interval to prevent duplicates
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }

  // Check immediately (but throttled)
  checkOverdueInvoices();

  // Set up periodic checking (every 15 minutes when app is active)
  notificationInterval = setInterval(() => {
    // Only check if the document is visible (user is actively using the app)
    if (!document.hidden) {
      checkOverdueInvoices();
    }
  }, CHECK_INTERVAL);

  console.log('🔔 Overdue notification service initialized');
}

/**
 * Manually trigger an overdue check (useful for testing or immediate checks)
 */
export function triggerOverdueCheck(): void {
  lastCheckTimestamp = 0; // Reset throttle
  checkOverdueInvoices();
}