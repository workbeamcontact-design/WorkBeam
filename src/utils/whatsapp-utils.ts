/**
 * WhatsApp Messaging Utilities for WorkBeam
 * Generates professional messages for bookings and other interactions
 */

export interface BookingData {
  client: string;
  type: 'survey' | 'installation' | 'repair' | 'inspection';
  date: string;
  time: string;
  endTime?: string;
  address: string;
  job: string;
  notes?: string;
  isAllDay?: boolean;
}

/**
 * Formats time from 24h to 12h format
 */
const formatTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const isPM = hour24 >= 12;
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    return `${hour12}:${minutes}${isPM ? 'pm' : 'am'}`;
  } catch {
    return time;
  }
};

/**
 * Formats date to readable UK format
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  } catch {
    return dateString;
  }
};

/**
 * Generates a professional booking reminder message
 */
export const generateBookingReminderMessage = (booking: BookingData, businessName?: string): string => {
  const bookingTypeLabels = {
    survey: 'Survey',
    installation: 'Installation', 
    repair: 'Repair',
    inspection: 'Inspection'
  };

  const bookingType = bookingTypeLabels[booking.type] || 'Appointment';
  const formattedDate = formatDate(booking.date);
  const timeRange = booking.isAllDay 
    ? 'All day' 
    : `${formatTime(booking.time)}${booking.endTime ? ` - ${formatTime(booking.endTime)}` : ''}`;

  let message = `Hi ${booking.client.split(' ')[0]},\n\n`;
  message += `This is a reminder about your upcoming ${bookingType.toLowerCase()} appointment.\n\n`;
  message += `*DATE*\n`;
  message += `${formattedDate}\n\n`;
  message += `*TIME*\n`;
  message += `${timeRange}\n\n`;
  message += `*LOCATION*\n`;
  message += `${booking.address}\n\n`;
  message += `*JOB DETAILS*\n`;
  message += `${booking.job}\n\n`;
  message += `────────────────\n\n`;
  message += `Please let me know if you need to make any changes to this appointment.\n\n`;
  message += `Thanks,\n${businessName || 'WorkBeam'}`;

  return message;
};

/**
 * Generates a booking confirmation message
 */
export const generateBookingConfirmationMessage = (booking: BookingData, businessName?: string): string => {
  const bookingTypeLabels = {
    survey: 'Survey',
    installation: 'Installation', 
    repair: 'Repair',
    inspection: 'Inspection'
  };

  const bookingType = bookingTypeLabels[booking.type] || 'Appointment';
  const formattedDate = formatDate(booking.date);
  const timeRange = booking.isAllDay 
    ? 'All day' 
    : `${formatTime(booking.time)}${booking.endTime ? ` - ${formatTime(booking.endTime)}` : ''}`;

  let message = `Hi ${booking.client.split(' ')[0]},\n\n`;
  message += `Your ${bookingType.toLowerCase()} appointment has been confirmed!\n\n`;
  message += `*DATE*\n`;
  message += `${formattedDate}\n\n`;
  message += `*TIME*\n`;
  message += `${timeRange}\n\n`;
  message += `*LOCATION*\n`;
  message += `${booking.address}\n\n`;
  message += `*JOB DETAILS*\n`;
  message += `${booking.job}\n\n`;
  message += `────────────────\n\n`;
  message += `We look forward to seeing you. Please let me know if you have any questions.\n\n`;
  message += `Thanks,\n${businessName || 'WorkBeam'}`;

  return message;
};

/**
 * Opens WhatsApp with a pre-filled message
 * Uses api.whatsapp.com format for better reliability across platforms
 * and when no previous chat history exists
 */
export const openWhatsApp = (phone: string, message: string): void => {
  if (!phone) {
    console.error('No phone number provided for WhatsApp message');
    return;
  }
  
  // Remove all non-numeric characters except the leading +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // URL encode the message properly
  const encodedMessage = encodeURIComponent(message);
  
  // Use api.whatsapp.com instead of wa.me for better pre-fill reliability
  // This format works more consistently when there's no previous chat history
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
};

/**
 * Opens WhatsApp with a booking reminder message
 */
export const sendBookingReminder = (booking: BookingData, phone: string, businessName?: string): void => {
  const message = generateBookingReminderMessage(booking, businessName);
  openWhatsApp(phone, message);
};

/**
 * Opens WhatsApp with a booking confirmation message
 */
export const sendBookingConfirmation = (booking: BookingData, phone: string, businessName?: string): void => {
  const message = generateBookingConfirmationMessage(booking, businessName);
  openWhatsApp(phone, message);
};
