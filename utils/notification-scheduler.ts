/**
 * Notification Scheduler Utility
 * Handles timing logic for overdue payment and calendar reminders
 */

import { api } from './api';

export interface NotificationPreferences {
  push_payment_overdue: boolean;
  push_calendar_reminders: boolean;
  push_daily_summary: boolean;
  email_payment_overdue: boolean;
  email_calendar_reminders: boolean;
  email_weekly_summary: boolean;
  email_monthly_report: boolean;
  overdue_reminder_frequency: 'daily' | 'every_3_days' | 'weekly';
  overdue_grace_period: number;
  calendar_reminder_times: string[];
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface OverdueInvoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  total: number;
  daysPastDue: number;
  lastReminderSent?: string;
}

export interface UpcomingBooking {
  id: string;
  title: string;
  clientName?: string;
  date: string;
  startTime: string;
  address?: string;
  remindersSent: string[]; // Array of reminder types already sent
}

/**
 * Check for overdue invoices that need reminders
 */
export async function checkOverdueInvoices(): Promise<OverdueInvoice[]> {
  try {
    const [invoices, clients] = await Promise.all([
      api.getInvoices(),
      api.getClients()
    ]);
    
    const now = new Date();
    const overdueInvoices: OverdueInvoice[] = [];
    
    // Get notification preferences
    const prefsResult = await api.getNotificationPreferences();
    const prefs = prefsResult?.data || {};
    const gracePeriod = prefs.overdue_grace_period || 3;
    
    for (const invoice of invoices) {
      // Skip paid invoices
      if (invoice.status === 'paid') continue;
      
      // Skip invoices without due dates
      if (!invoice.dueDate) continue;
      
      const dueDate = new Date(invoice.dueDate);
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only include if past grace period
      if (daysPastDue > gracePeriod) {
        // Find client name
        const client = clients.find(c => c.id === invoice.clientId);
        
        overdueInvoices.push({
          id: invoice.id,
          number: invoice.number || 'DRAFT',
          clientId: invoice.clientId,
          clientName: client?.name || 'Unknown Client',
          dueDate: invoice.dueDate,
          total: invoice.total || 0,
          daysPastDue,
          lastReminderSent: invoice.lastReminderSent
        });
      }
    }
    
    return overdueInvoices;
  } catch (error) {
    console.error('Failed to check overdue invoices:', error);
    return [];
  }
}

/**
 * Check if an overdue invoice needs a reminder based on frequency settings
 */
export function shouldSendOverdueReminder(
  invoice: OverdueInvoice, 
  frequency: 'daily' | 'every_3_days' | 'weekly'
): boolean {
  // If no reminder was ever sent, send one
  if (!invoice.lastReminderSent) {
    return true;
  }
  
  const lastSent = new Date(invoice.lastReminderSent);
  const now = new Date();
  const daysSinceLastReminder = Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
  
  switch (frequency) {
    case 'daily':
      return daysSinceLastReminder >= 1;
    case 'every_3_days':
      return daysSinceLastReminder >= 3;
    case 'weekly':
      return daysSinceLastReminder >= 7;
    default:
      return false;
  }
}

/**
 * Check for upcoming bookings that need reminders
 */
export async function checkUpcomingBookings(): Promise<UpcomingBooking[]> {
  try {
    const [bookings, clients] = await Promise.all([
      api.getBookings(),
      api.getClients()
    ]);
    
    const now = new Date();
    const upcomingBookings: UpcomingBooking[] = [];
    
    for (const booking of bookings) {
      const bookingDateTime = new Date(`${booking.date}T${booking.startTime || '09:00'}`);
      
      // Only check bookings in the future
      if (bookingDateTime > now) {
        const client = clients.find(c => c.id === booking.clientId);
        
        upcomingBookings.push({
          id: booking.id,
          title: booking.title,
          clientName: client?.name,
          date: booking.date,
          startTime: booking.startTime,
          address: booking.address,
          remindersSent: booking.remindersSent || []
        });
      }
    }
    
    return upcomingBookings;
  } catch (error) {
    console.error('Failed to check upcoming bookings:', error);
    return [];
  }
}

/**
 * Check if a booking needs a specific reminder time
 */
export function shouldSendBookingReminder(
  booking: UpcomingBooking,
  reminderTime: string
): boolean {
  // Don't send if already sent
  if (booking.remindersSent.includes(reminderTime)) {
    return false;
  }
  
  const now = new Date();
  const bookingDateTime = new Date(`${booking.date}T${booking.startTime || '09:00'}`);
  const timeDiff = bookingDateTime.getTime() - now.getTime();
  
  // Convert time difference to minutes
  const minutesUntil = timeDiff / (1000 * 60);
  
  switch (reminderTime) {
    case '1_day':
      // Send if between 24 hours and 23 hours before
      return minutesUntil <= 24 * 60 && minutesUntil > 23 * 60;
    case '3_hours':
      // Send if between 3 hours and 2.5 hours before
      return minutesUntil <= 3 * 60 && minutesUntil > 2.5 * 60;
    case '1_hour':
      // Send if between 1 hour and 50 minutes before
      return minutesUntil <= 60 && minutesUntil > 50;
    case '30_minutes':
      // Send if between 30 and 25 minutes before
      return minutesUntil <= 30 && minutesUntil > 25;
    case '15_minutes':
      // Send if between 15 and 10 minutes before
      return minutesUntil <= 15 && minutesUntil > 10;
    default:
      return false;
  }
}

/**
 * Check if current time is within quiet hours
 */
export function isQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quiet_hours_enabled) {
    return false;
  }
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight
  
  const [startHour, startMin] = preferences.quiet_hours_start.split(':').map(Number);
  const [endHour, endMin] = preferences.quiet_hours_end.split(':').map(Number);
  
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
 * Format overdue payment notification message
 */
export function formatOverdueMessage(invoice: OverdueInvoice): string {
  const amount = new Intl.NumberFormat('en-GB', { 
    style: 'currency', 
    currency: 'GBP' 
  }).format(invoice.total);
  
  return `💰 Payment Overdue: Invoice ${invoice.number} for ${invoice.clientName} is ${invoice.daysPastDue} days overdue (${amount}). Consider following up with your client.`;
}

/**
 * Format calendar reminder notification message
 */
export function formatCalendarMessage(booking: UpcomingBooking, reminderTime: string): string {
  const timeLabels: Record<string, string> = {
    '1_day': 'tomorrow',
    '3_hours': 'in 3 hours',
    '1_hour': 'in 1 hour',
    '30_minutes': 'in 30 minutes',
    '15_minutes': 'in 15 minutes'
  };
  
  const timeLabel = timeLabels[reminderTime] || reminderTime;
  const clientPart = booking.clientName ? ` with ${booking.clientName}` : '';
  const addressPart = booking.address ? ` at ${booking.address}` : '';
  
  return `📅 Appointment Reminder: "${booking.title}"${clientPart} is ${timeLabel} (${booking.startTime})${addressPart}`;
}

/**
 * Main function to check and queue notifications
 * This would be called periodically (e.g., every 15 minutes) by a background process
 */
export async function checkAndQueueNotifications(): Promise<{
  overdueReminders: string[];
  calendarReminders: string[];
}> {
  const overdueReminders: string[] = [];
  const calendarReminders: string[] = [];
  
  try {
    // Get user preferences
    const prefsResult = await api.getNotificationPreferences();
    const preferences = prefsResult?.data;
    
    if (!preferences) {
      console.log('No notification preferences found');
      return { overdueReminders, calendarReminders };
    }
    
    // Check if we're in quiet hours
    if (isQuietHours(preferences)) {
      console.log('In quiet hours, skipping notifications');
      return { overdueReminders, calendarReminders };
    }
    
    // Check overdue payments
    if (preferences.push_payment_overdue || preferences.email_payment_overdue) {
      const overdueInvoices = await checkOverdueInvoices();
      
      for (const invoice of overdueInvoices) {
        if (shouldSendOverdueReminder(invoice, preferences.overdue_reminder_frequency)) {
          const message = formatOverdueMessage(invoice);
          overdueReminders.push(message);
          
          // Update last reminder sent timestamp
          // In a real implementation, you'd update the invoice record
          console.log(`Overdue reminder queued: ${message}`);
        }
      }
    }
    
    // Check calendar reminders
    if (preferences.push_calendar_reminders || preferences.email_calendar_reminders) {
      const upcomingBookings = await checkUpcomingBookings();
      
      for (const booking of upcomingBookings) {
        for (const reminderTime of preferences.calendar_reminder_times) {
          if (shouldSendBookingReminder(booking, reminderTime)) {
            const message = formatCalendarMessage(booking, reminderTime);
            calendarReminders.push(message);
            
            // Update reminders sent array
            // In a real implementation, you'd update the booking record
            console.log(`Calendar reminder queued: ${message}`);
          }
        }
      }
    }
    
    return { overdueReminders, calendarReminders };
  } catch (error) {
    console.error('Error checking notifications:', error);
    return { overdueReminders, calendarReminders };
  }
}

/**
 * Utility to parse due date from invoice terms text (backup method)
 * In case dueDate field is missing, this can extract days from terms
 */
export function extractDaysFromTerms(termsText: string): number | null {
  if (!termsText) return null;
  
  // Common patterns to look for
  const patterns = [
    /(\d+)\s*days?/i,
    /within\s*(\d+)\s*days?/i,
    /due\s*in\s*(\d+)\s*days?/i,
    /payment\s*.*?(\d+)\s*days?/i
  ];
  
  for (const pattern of patterns) {
    const match = termsText.match(pattern);
    if (match) {
      const days = parseInt(match[1]);
      if (days > 0 && days <= 365) { // Reasonable range
        return days;
      }
    }
  }
  
  return null;
}