/**
 * Notification Integration Service
 * Integrates notification system with payment updates and business events
 * Ensures notifications stay synchronized with payment status changes
 */

import { api } from './api';
import { initializeOverdueNotifications, triggerOverdueCheck } from './overdue-notification-service';
import { toast } from 'sonner@2.0.3';

/**
 * Initialize comprehensive notification system
 */
export async function initializeNotificationSystem(): Promise<void> {
  try {
    console.log('🔔 Initializing notification system...');
    
    // Initialize overdue notifications with timeout protection
    const initPromise = initializeOverdueNotifications();
    const timeoutPromise = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('Notification init timeout')), 3000)
    );
    
    await Promise.race([initPromise, timeoutPromise]);
    console.log('✅ Notification system initialized successfully');
    
  } catch (error) {
    console.warn('⚠️ Failed to initialize notification system:', error.message);
    // Don't throw - app should still work without notifications
  }
}

/**
 * Trigger notification checks after financial events
 */
export async function triggerFinancialNotificationCheck(eventType: string, context?: any): Promise<void> {
  try {
    console.log(`🔔 Triggering notification check for event: ${eventType}`, context);
    
    // Add timeout protection for overdue checks
    const overduePromise = triggerOverdueCheck();
    const timeoutPromise = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('Overdue check timeout')), 2000)
    );
    
    await Promise.race([overduePromise, timeoutPromise]);
    
    // Log successful check
    console.log(`✅ Notification check completed for ${eventType}`);
    
  } catch (error) {
    console.warn(`⚠️ Notification check failed for ${eventType}:`, error.message);
    // Don't throw - this shouldn't break the user flow
  }
}

/**
 * Handle payment recording events
 */
export function handlePaymentRecorded(paymentData: {
  invoiceId: string;
  amount: number;
  clientName?: string;
  invoiceNumber?: string;
}): void {
  try {
    console.log('💰 Payment recorded, updating notifications...', paymentData);
    
    // Clear any existing overdue notifications for this invoice
    const notificationKey = `overdue_notification_${paymentData.invoiceId}`;
    localStorage.removeItem(notificationKey);
    
    // Show success notification
    toast.success('Payment recorded successfully', {
      description: paymentData.clientName 
        ? `Payment from ${paymentData.clientName} has been recorded`
        : 'Payment has been recorded and notifications updated',
      duration: 4000,
    });
    
    // Trigger notification check to update overdue status
    setTimeout(() => {
      triggerFinancialNotificationCheck('payment_recorded', paymentData);
    }, 1000);
    
  } catch (error) {
    console.warn('⚠️ Error handling payment notification update:', error);
  }
}

/**
 * Handle invoice status changes
 */
export function handleInvoiceStatusChange(invoiceData: {
  id: string;
  status: string;
  clientName?: string;
  number?: string;
}): void {
  try {
    console.log('📄 Invoice status changed, updating notifications...', invoiceData);
    
    // If invoice is now paid, clear overdue notifications
    if (invoiceData.status === 'paid') {
      const notificationKey = `overdue_notification_${invoiceData.id}`;
      localStorage.removeItem(notificationKey);
      console.log(`🔔 Cleared overdue notification for paid invoice ${invoiceData.number}`);
    }
    
    // Trigger notification check
    setTimeout(() => {
      triggerFinancialNotificationCheck('invoice_status_change', invoiceData);
    }, 1000);
    
  } catch (error) {
    console.warn('⚠️ Error handling invoice status notification update:', error);
  }
}

/**
 * Handle job completion events
 */
export function handleJobCompleted(jobData: {
  id: string;
  title: string;
  clientName?: string;
}): void {
  try {
    console.log('✅ Job completed, checking for notification updates...', jobData);
    
    // Show completion notification
    toast.success('Job completed successfully', {
      description: `${jobData.title} has been marked as completed`,
      duration: 4000,
    });
    
    // Trigger notification check in case there are related invoices
    setTimeout(() => {
      triggerFinancialNotificationCheck('job_completed', jobData);
    }, 1500);
    
  } catch (error) {
    console.warn('⚠️ Error handling job completion notification:', error);
  }
}

/**
 * Handle client data changes
 */
export function handleClientUpdated(clientData: {
  id: string;
  name: string;
  previousName?: string;
}): void {
  try {
    console.log('👤 Client updated, refreshing notifications...', clientData);
    
    // If client name changed, we need to refresh notifications to show updated name
    if (clientData.previousName && clientData.previousName !== clientData.name) {
      console.log(`🔄 Client name changed from "${clientData.previousName}" to "${clientData.name}"`);
      
      // Trigger notification refresh
      setTimeout(() => {
        triggerFinancialNotificationCheck('client_updated', clientData);
      }, 1000);
    }
    
  } catch (error) {
    console.warn('⚠️ Error handling client update notification:', error);
  }
}

/**
 * Test notification system (for development/debugging)
 */
export async function testNotificationSystem(): Promise<void> {
  try {
    console.log('🧪 Testing notification system...');
    
    // Check if notification preferences are accessible
    const preferences = await api.getNotificationPreferences();
    console.log('📋 Notification preferences:', preferences?.data);
    
    // Test overdue check
    await triggerOverdueCheck();
    
    // Show test notification
    toast.info('Notification system test completed', {
      description: 'Check console for detailed logs',
      duration: 3000,
    });
    
    console.log('✅ Notification system test completed');
    
  } catch (error) {
    console.error('❌ Notification system test failed:', error);
    toast.error('Notification system test failed', {
      description: error.message,
      duration: 5000,
    });
  }
}

/**
 * Get notification system status
 */
export function getNotificationSystemStatus(): {
  initialized: boolean;
  lastCheck: number | null;
  preferences: any | null;
} {
  return {
    initialized: true, // Will be updated by actual system
    lastCheck: Date.now(), // Will be updated by actual system
    preferences: null // Will be loaded from API
  };
}