import { ChevronLeft, ChevronRight, MapPin, Briefcase } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { WhatsAppIcon } from "../ui/whatsapp-icon";
import { api } from "../../utils/api";
import { sendBookingReminder } from "../../utils/whatsapp-utils";
import { LoadingWrapper, CalendarSkeleton } from "../ui/loading-states";
import { useAuth } from "../../utils/auth-context";

interface CalendarProps {
  onNavigate: (screen: string, data?: any) => void;
  refreshKey?: number;
}

type BookingType = "survey" | "installation" | "repair" | "inspection";

interface Booking {
  id: number;
  client: string;
  job: string;
  address: string;
  time: string;
  endTime: string;
  type: BookingType;
  outstanding?: number;
  phone?: string;
  date: string; // Format: YYYY-MM-DD
  isAllDay?: boolean;
  jobId?: number; // Link to actual job if exists
  clientId?: number; // Link to client if exists
  isLead?: boolean; // True if this is a new lead, false if existing client
}

// Constants
const HOUR_HEIGHT = 88; // 88px per hour - optimized for address text clearance with action icons
const MIN_BOOKING_HEIGHT = 76; // Minimum height for Day view to align with grid (1 hour = 76px)

// Utility function to get booking type colors
const getBookingTypeColor = (type: BookingType): string => {
  switch (type) {
    case 'survey':
      return '#16A34A'; // green
    case 'installation':
      return '#0A84FF'; // blue
    case 'repair':
      return '#F59E0B'; // orange
    case 'inspection':
      return '#A855F7'; // purple
    default:
      return '#6B7280';
  }
};

const getBookingTypeBadgeBackground = (type: BookingType): string => {
  switch (type) {
    case 'survey':
      return 'rgba(22, 163, 74, 0.15)'; // green with 15% opacity
    case 'installation':
      return 'rgba(10, 132, 255, 0.15)'; // blue with 15% opacity
    case 'repair':
      return 'rgba(245, 158, 11, 0.15)'; // orange with 15% opacity
    case 'inspection':
      return 'rgba(168, 85, 247, 0.15)'; // purple with 15% opacity
    default:
      return 'rgba(107, 114, 128, 0.15)';
  }
};

// Booking data now loaded from API - no more mock data needed

// Calculate booking duration and adaptive density
const getBookingDuration = (booking: Booking) => {
  if (booking.isAllDay) return 480; // 8 hours
  if (!booking.time || !booking.endTime) return 120; // Default 2 hours
  
  const [startHour, startMin] = booking.time.split(':').map(Number);
  const [endHour, endMin] = booking.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes - startMinutes;
};

const getAdaptiveDensity = (heightPx: number): 'micro' | 'compact' | 'standard' => {
  if (heightPx < 80) return 'micro';      // < 1.25 hours - minimal content
  if (heightPx < 120) return 'compact';   // < 2 hours - reduced content  
  return 'standard';                      // 2+ hours - full content
};

// Unified BookingCard component with consistent structure and icon sizes
const BookingCard = ({ 
  booking, 
  onJobClick, 
  onMapsClick, 
  onWhatsAppClick,
  view = 'day'
}: {
  booking: Booking;
  onJobClick: (booking: Booking) => void;
  onMapsClick: (address: string) => void;
  onWhatsAppClick: (booking: Booking) => void;
  view?: 'day' | 'week' | 'allday';
}) => {
  const durationMinutes = getBookingDuration(booking);
  const cardHeightPx = Math.max(64, (durationMinutes / 60) * HOUR_HEIGHT);
  const adaptiveDensity = getAdaptiveDensity(cardHeightPx);
  const hasDebt = booking.outstanding && booking.outstanding > 0;
  
  return (
    <div
      className="booking_card cursor-pointer transition-shadow relative w-full h-full"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        border: '1px solid',
        borderRadius: '12px',
        padding: '12px',
        minHeight: view === 'week' ? '96px' : view === 'allday' ? '88px' : '64px', // All-day needs more height for content
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        position: 'relative',
        height: view === 'allday' ? 'auto' : '100%'
      }}
      onClick={() => onJobClick(booking)}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
      }}
    >
      {/* Left type spine - consistent 4px width */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          backgroundColor: getBookingTypeColor(booking.type),
          borderTopLeftRadius: '12px',
          borderBottomLeftRadius: '12px',
          zIndex: 0
        }}
      />
      
      {/* Content Area - always leave space for footer */}
      <div 
        className="content_area"
        style={{
          position: 'absolute',
          top: '12px',
          left: '16px', // 12px padding + 4px spine
          right: '12px',
          bottom: '48px' // Always reserve space for footer
        }}
      >
        {/* Top row: {start–end} • {Name} + optional debt pill */}
        <div className="top_row flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="trades-caption" style={{ color: 'var(--muted)' }}>
              {booking.isAllDay ? 'All day' : `${booking.time}–${booking.endTime}`}
            </span>
            <span className="trades-caption" style={{ color: 'var(--muted)' }}>•</span>
            <span className="trades-label truncate" style={{ color: 'var(--ink)', fontWeight: '600' }}>
              {booking.client}
            </span>
          </div>

        </div>

        {/* Second row: Address with maximum space */}
        <div className="second_row">
          <span className="trades-caption truncate block" style={{ color: 'var(--muted)' }}>
            {booking.address}
          </span>
        </div>
      </div>

      {/* Booking Type Badge - Bottom left */}
      <div 
        className="type_badge absolute left-0 flex items-center"
        style={{ 
          bottom: '2px', // Perfect positioning - not overlapping, not too low
          height: '32px',
          paddingLeft: '16px', // 12px padding + 4px spine
        }}
      >
        <div 
          className="flex items-center gap-1"
          style={{
            backgroundColor: getBookingTypeBadgeBackground(booking.type),
            borderRadius: '6px',
            paddingLeft: '6px',    // Reduced from 8px to 6px
            paddingRight: '6px',   // Reduced from 8px to 6px 
            paddingTop: '2px',     // Reduced to 2px for tighter spacing
            paddingBottom: '2px',  // Reduced to 2px for tighter spacing
            minHeight: '20px',     // Reduced from 24px to 20px
          }}
        >
          <div 
            className="rounded-full flex-shrink-0"
            style={{ 
              backgroundColor: getBookingTypeColor(booking.type),
              width: '8px',
              height: '8px'
            }}
          />
          <span 
            className="trades-caption"
            style={{ 
              color: getBookingTypeColor(booking.type),
              fontWeight: '600',
              textTransform: 'capitalize',
              fontSize: '12px',
              lineHeight: '16px'
            }}
          >
            {booking.type}
          </span>
        </div>
      </div>

      {/* Card Footer - Consistent icon bar with standardized 16px icons */}
      <div 
        className="card_footer absolute right-0 flex items-center justify-end gap-1"
        style={{ 
          bottom: '2px', // Perfect alignment with badge
          height: '32px', // Match badge height
          paddingRight: '8px',
        }}
      >
        {/* Job Icon (yellow) - Always 16px */}
        <div
          className="job_icon flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          style={{ 
            width: '32px',
            height: '32px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onJobClick(booking);
          }}
        >
          <Briefcase size={16} style={{ color: 'var(--warning)' }} />
        </div>
        
        {/* Map Icon (blue) - Always 16px */}
        <div
          className="map_icon flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          style={{ 
            width: '32px',
            height: '32px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onMapsClick(booking.address);
          }}
        >
          <MapPin size={16} style={{ color: 'var(--primary)' }} />
        </div>
        
        {/* WhatsApp Icon (green) - Always 16px */}
        <div
          className="whatsapp_icon flex items-center justify-center cursor-pointer hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          style={{ 
            width: '32px',
            height: '32px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onWhatsAppClick(booking);
          }}
        >
          <WhatsAppIcon size={16} color="#25D366" />
        </div>
      </div>
    </div>
  );
};

export function Calendar({ onNavigate, refreshKey }: CalendarProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"day" | "week">("day");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState<string>('WorkBeam');
  
  // Touch/swipe handling for date header
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Load bookings when user logs in or refreshKey changes
  useEffect(() => {
    if (user) {
      console.log('📅 Calendar: Loading data (user authenticated, refreshKey:', refreshKey, ')');
      loadBookings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, user]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      console.log('📅 Loading bookings from API...');
      
      // Load bookings, clients, and business details in parallel
      const [bookingsData, clientsData, businessDetails] = await Promise.all([
        api.getBookings(),
        api.getClients(),
        api.getBusinessDetails().catch(() => null) // Don't fail if business details unavailable
      ]);
      
      // Set business name for WhatsApp messages
      if (businessDetails?.legal_name || businessDetails?.trading_name || businessDetails?.companyName) {
        setBusinessName(
          businessDetails.legal_name || 
          businessDetails.trading_name || 
          businessDetails.companyName || 
          'WorkBeam'
        );
      }
      
      console.log(`📅 Loaded ${bookingsData.length} bookings and ${clientsData.length} clients`);
      
      // Create a map of client IDs to client data for efficient lookup
      const clientMap = new Map();
      clientsData.forEach(client => {
        clientMap.set(client.id, client);
      });
      
      // Transform API bookings to component format with client name resolution
      const transformedBookings = bookingsData
        .filter((booking: any) => booking && booking.date) // Filter out invalid bookings
        .map((booking: any) => {
          const client = clientMap.get(booking.clientId);
          
          return {
            ...booking,
            id: booking.id || Math.random().toString(36).substr(2, 9), // Ensure we have an ID
            type: booking.type || 'survey',
            time: booking.startTime || booking.time || '09:00',
            endTime: booking.endTime || '10:00',
            job: booking.title || booking.job || `${booking.type || 'Appointment'}`,
            client: client?.name || booking.clientName || 'Unknown Client',
            phone: client?.phone || booking.clientPhone || '',
            outstanding: booking.outstanding || 0,
            address: booking.address || client?.address || 'Address not specified',
            isAllDay: booking.isAllDay || false,
            jobId: booking.jobId || null,
            clientId: booking.clientId || null,
            isLead: booking.isLead || !booking.clientId, // Use explicit isLead flag or if no clientId
            date: booking.date // Ensure date is properly formatted
          };
        });
      
      console.log(`📅 Transformed bookings:`, transformedBookings.map(b => ({ 
        id: b.id, 
        client: b.client, 
        date: b.date, 
        time: b.time 
      })));
      
      setBookings(transformedBookings);
    } catch (error) {
      console.error('❌ Failed to load bookings:', error);
      // Fall back to empty array to prevent crashes
      setBookings([]);
      
      // Show user-friendly error message
      console.log('📅 Calendar is using empty data due to API error. This is normal in local mode.');
    } finally {
      setLoading(false);
    }
  };

  // Get current date info
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  // Generate week days for carousel (7 days centered on selected date)
  const getWeekDays = (centerDate: Date) => {
    const days = [];
    const startOfWeek = new Date(centerDate);
    const dayOfWeek = centerDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
    startOfWeek.setDate(centerDate.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      days.push({
        date: date.getDate(),
        day: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        isSelected: date.toDateString() === centerDate.toDateString(),
        isToday: date.toDateString() === today.toDateString(),
        fullDate: date
      });
    }
    
    return days;
  };

  const weekDays = getWeekDays(selectedDate);

  // Week range label
  const getWeekRangeLabel = () => {
    const startOfWeek = weekDays[0].fullDate;
    const endOfWeek = weekDays[6].fullDate;
    
    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
      return `${startOfWeek.getDate()}–${endOfWeek.getDate()} ${startOfWeek.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
    } else {
      const startMonth = startOfWeek.toLocaleDateString('en-GB', { month: 'short' });
      const endMonth = endOfWeek.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      return `${startOfWeek.getDate()} ${startMonth} – ${endOfWeek.getDate()} ${endMonth}`;
    }
  };

  // Filter bookings based on active filter
  const filterBookings = (bookings: Booking[]) => {
    switch (activeFilter) {
      case 'survey':
        return bookings.filter(b => b.type === 'survey');
      case 'installation':
        return bookings.filter(b => b.type === 'installation');
      case 'repair':
        return bookings.filter(b => b.type === 'repair');
      case 'inspection':
        return bookings.filter(b => b.type === 'inspection');
      default:
        return bookings;
    }
  };

  // Get bookings for selected date
  const selectedDateString = selectedDate.toISOString().split('T')[0];
  const selectedDayAllDayBookings = filterBookings(
    bookings.filter(booking => booking.date === selectedDateString && booking.isAllDay)
  );
  const selectedDayBookings = filterBookings(
    bookings.filter(booking => booking.date === selectedDateString && !booking.isAllDay)
  );

  // Group bookings by day for week view
  const getDayGroups = () => {
    // Get the current week range for week view
    const currentWeekDays = getWeekDays(selectedDate);
    const weekStartDate = currentWeekDays[0].fullDate;
    const weekEndDate = currentWeekDays[6].fullDate;
    
    // Get bookings for the current week
    const weekStartString = weekStartDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const weekEndString = weekEndDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const weekBookings = filterBookings(bookings).filter(booking => {
      return booking.date >= weekStartString && booking.date <= weekEndString;
    });
    
    const groups: { [key: string]: { dayLabel: string; bookings: Booking[]; isToday: boolean } } = {};
    
    weekBookings.forEach(booking => {
      const bookingDate = new Date(booking.date);
      const dayKey = booking.date;
      const dayLabel = bookingDate.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'short' 
      });
      
      if (!groups[dayKey]) {
        groups[dayKey] = {
          dayLabel,
          bookings: [],
          isToday: booking.date === todayString
        };
      }
      
      groups[dayKey].bookings.push(booking);
    });
    
    return Object.values(groups).sort((a, b) => {
      const dateA = a.bookings[0]?.date || '';
      const dateB = b.bookings[0]?.date || '';
      return dateA.localeCompare(dateB);
    });
  };

  const dayGroups = getDayGroups();

  // Hours for timeline (6 AM to 10 PM)
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  // Navigation handlers
  const handleDaySelect = (day: any) => {
    setSelectedDate(day.fullDate);
  };

  const handleWeekJump = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  // Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleWeekJump('next');
    } else if (isRightSwipe) {
      handleWeekJump('prev');
    }
  };

  const handleMonthJump = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  // Booking actions
  const handleJobClick = (booking: Booking) => {
    onNavigate("booking-detail", booking);
  };

  const handleMapsClick = (address: string) => {
    const query = encodeURIComponent(address);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  const handleWhatsAppClick = (booking: Booking) => {
    if (booking.phone) {
      sendBookingReminder({
        client: booking.client,
        type: booking.type,
        date: booking.date,
        time: booking.time,
        endTime: booking.endTime,
        address: booking.address,
        job: booking.job,
        notes: booking.notes,
        isAllDay: booking.isAllDay
      }, booking.phone, businessName);
    }
  };

  // Handle timeline click for new booking - precise time calculation
  const handleTimelineClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.booking_card')) return;
    
    const timelineRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickY = e.clientY - timelineRect.top;
    
    // Calculate exact time from click position
    const clickedMinutesFromStart = (clickY / HOUR_HEIGHT) * 60;
    const totalMinutes = (6 * 60) + clickedMinutesFromStart; // Add 6AM offset
    
    const clickedHour = Math.floor(totalMinutes / 60);
    const clickedMinutes = Math.round(totalMinutes % 60);
    
    // Round to nearest 15-minute interval for better UX
    const roundedMinutes = Math.round(clickedMinutes / 15) * 15;
    let finalHour = clickedHour;
    let finalMinutes = roundedMinutes;
    
    // Handle minute overflow
    if (finalMinutes >= 60) {
      finalHour += 1;
      finalMinutes = 0;
    }
    
    // Only allow clicks within business hours
    if (finalHour >= 6 && finalHour <= 22) {
      const timeString = `${finalHour.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
      onNavigate("add-booking", { 
        date: selectedDateString, 
        time: timeString 
      });
    }
  };

  // Current time position for clean time indicator
  const getCurrentTimeInfo = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Check if it's today
    const isToday = selectedDateString === todayString;
    
    // Only show during business hours (6AM-10PM) and on today
    if (!isToday || currentHour < 6 || currentHour >= 22) {
      return { isVisible: false, currentHour: null, top: 0 };
    }
    
    // Calculate exact position relative to 6AM start
    const currentTotalMinutes = currentHour * 60 + currentMinutes;
    const gridStartMinutes = 6 * 60; // 6AM
    const relativeMinutes = currentTotalMinutes - gridStartMinutes;
    const pixelPosition = (relativeMinutes / 60) * HOUR_HEIGHT;
    
    return {
      isVisible: true,
      currentHour,
      top: Math.round(pixelPosition + 12) // Add 12px to align with grid lines
    };
  };

  const currentTimeInfo = getCurrentTimeInfo();

  return (
    <div className="screen_root flex flex-col h-full" style={{ backgroundColor: 'var(--surface-alt)' }}>
      <LoadingWrapper isLoading={loading} fallback={<CalendarSkeleton />}>
        {/* Header */}
        <div className="header flex flex-col items-center w-full px-4 py-4">
        {/* Calendar Header */}
        <div className="calendar_header flex flex-col w-full">
          {/* Segmented Control */}
          <div 
            className="segmented_control flex rounded-lg p-1 w-full justify-center mb-4"
            style={{ backgroundColor: 'var(--border)' }}
          >
            <button
              onClick={() => setActiveTab("day")}
              className="flex-1 py-2 px-4 rounded-md trades-body transition-all flex items-center justify-center"
              style={{
                backgroundColor: activeTab === "day" ? 'var(--surface)' : 'transparent',
                color: activeTab === "day" ? 'var(--ink)' : 'var(--muted)',
                minHeight: '44px',
                fontWeight: activeTab === "day" ? '500' : '400'
              }}
            >
              Day
            </button>
            <button
              onClick={() => setActiveTab("week")}
              className="flex-1 py-2 px-4 rounded-md trades-body transition-all flex items-center justify-center"
              style={{
                backgroundColor: activeTab === "week" ? 'var(--surface)' : 'transparent',
                color: activeTab === "week" ? 'var(--ink)' : 'var(--muted)',
                minHeight: '44px',
                fontWeight: activeTab === "week" ? '500' : '400'
              }}
            >
              Week
            </button>
          </div>

          {/* Date/Week Header - Swipeable */}
          <div 
            className="date_week_header flex items-center w-full mb-4"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ position: 'relative' }}
          >
            <button 
              onClick={() => handleWeekJump('prev')}
              className="flex-shrink-0"
              style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronLeft size={20} style={{ color: 'var(--primary)' }} />
            </button>
            
            <div className="flex-1 flex items-center justify-center">
              <h2 className="trades-h2 text-center" style={{ color: 'var(--ink)' }}>
                {activeTab === "day" 
                  ? selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : getWeekRangeLabel()
                }
              </h2>
            </div>
            
            <button 
              onClick={() => handleWeekJump('next')}
              className="flex-shrink-0"
              style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronRight size={20} style={{ color: 'var(--primary)' }} />
            </button>
          </div>

          {/* Week Carousel for Day View */}
          {activeTab === "day" && (
            <div className="week_carousel flex justify-center gap-2 mb-4">
              {weekDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => handleDaySelect(day)}
                  className="day_chip flex flex-col items-center justify-center rounded-lg transition-all"
                  style={{
                    width: '44px',
                    height: '44px',
                    backgroundColor: day.isSelected ? 'var(--primary)' : day.isToday ? 'rgba(10, 132, 255, 0.1)' : 'var(--surface)',
                    color: day.isSelected ? 'var(--primary-foreground)' : day.isToday ? 'var(--primary)' : 'var(--muted)',
                    border: `1px solid ${day.isSelected ? 'var(--primary)' : day.isToday ? 'var(--primary)' : 'var(--border)'}`,
                    padding: '4px'
                  }}
                >
                  <span className="trades-caption" style={{ fontWeight: '500' }}>
                    {day.day}
                  </span>
                  <span className="trades-caption" style={{ fontWeight: '600' }}>
                    {day.date}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="filter_bar flex gap-2 overflow-x-auto w-full pb-2" style={{ minHeight: '44px' }}>
          {[
            { key: 'all', label: 'All', color: null },
            { key: 'survey', label: 'Survey', color: getBookingTypeColor('survey') },
            { key: 'installation', label: 'Install', color: getBookingTypeColor('installation') },
            { key: 'repair', label: 'Repair', color: getBookingTypeColor('repair') },
            { key: 'inspection', label: 'Inspect', color: getBookingTypeColor('inspection') }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className="flex-shrink-0 trades-label transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: activeFilter === filter.key ? 'var(--primary)' : 'var(--surface)',
                color: activeFilter === filter.key ? 'var(--primary-foreground)' : 'var(--muted)',
                border: `1px solid ${activeFilter === filter.key ? 'var(--primary)' : 'var(--border)'}`,
                height: '36px',
                borderRadius: '18px',
                padding: '0 12px',
                fontWeight: '500'
              }}
            >
              {filter.color && (
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: filter.color }}
                />
              )}
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Scroll */}
      <div className="content_scroll flex-1 overflow-y-auto" style={{ paddingBottom: '96px' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="trades-body" style={{ color: 'var(--muted)' }}>
              Loading calendar...
            </p>
          </div>
        ) : (
          <>
            {/* Day View Content */}
            {activeTab === "day" && (
              <div className="day_content px-4">
            {/* All-day Strip */}
            {selectedDayAllDayBookings.length > 0 && (
              <div className="all_day_strip flex flex-col" style={{ gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                {selectedDayAllDayBookings.map((booking) => (
                  <BookingCard 
                    key={booking.id} 
                    booking={booking} 
                    onJobClick={handleJobClick}
                    onMapsClick={handleMapsClick}
                    onWhatsAppClick={handleWhatsAppClick}
                    view="allday"
                  />
                ))}
              </div>
            )}

            {/* Timeline */}
            <div className="day_timeline" style={{ marginTop: '24px' }}>
              {selectedDayBookings.length > 0 || selectedDayAllDayBookings.length > 0 ? (
                <div 
                  className="timeline_wrapper relative cursor-pointer" 
                  style={{ 
                    height: `${17 * HOUR_HEIGHT}px`,
                    minHeight: `${17 * HOUR_HEIGHT}px`
                  }}
                  onClick={handleTimelineClick}
                >
                  {/* Hour Rail - Clean time labels with current hour highlight */}
                  <div 
                    className="hour_rail absolute left-0 top-0" 
                    style={{ width: '60px', height: '100%' }}
                  >
                    {hours.map((hour, index) => {
                      const isCurrentHour = currentTimeInfo.isVisible && currentTimeInfo.currentHour === hour;
                      
                      return (
                        <div
                          key={hour}
                          className="hour_label absolute"
                          style={{
                            top: `${index * HOUR_HEIGHT}px`,
                            height: `${HOUR_HEIGHT}px`,
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'flex-end',
                            paddingRight: '8px',
                            paddingTop: '4px'
                          }}
                        >
                          <span 
                            className="trades-caption"
                            style={{ 
                              color: isCurrentHour ? 'var(--error)' : 'var(--muted)',
                              fontWeight: isCurrentHour ? '600' : '400',
                              backgroundColor: 'transparent',
                              padding: '0',
                              borderRadius: '0',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {hour.toString().padStart(2, '0')}:00
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid Lines - Precisely aligned with time slots */}
                  <div 
                    className="grid_lines absolute" 
                    style={{ left: '60px', right: '0', height: '100%', zIndex: 0 }}
                  >
                    {hours.map((hour, index) => (
                      <div
                        key={hour}
                        className="grid_line absolute w-full"
                        style={{
                          top: `${index * HOUR_HEIGHT + 12}px`, // Align with text baseline (4px padding + ~8px to baseline)
                          height: '1px',
                          backgroundColor: 'var(--border)'
                        }}
                      />
                    ))}
                  </div>

                  {/* Current Time Indicator - Dot, line and "Now" label */}
                  {currentTimeInfo.isVisible && (
                    <div
                      className="current_time_indicator_group absolute"
                      style={{
                        left: '33px', // Adjust this value manually if needed
                        top: `${currentTimeInfo.top - 4}px`,
                        zIndex: 15
                      }}
                    >
                      {/* Red pulsing dot */}
                      <div
                        className="current_time_dot"
                        style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: 'var(--error)',
                          borderRadius: '50%',
                          boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.2)',
                          animation: 'pulse 2s infinite'
                        }}
                      />
                      
                      {/* Current time label aligned with middle of the dot */}
                      <div
                        className="current_time_label absolute"
                        style={{
                          left: '10px', // Exact 2px gap from dot (8px + 2px)
                          top: '-2px', // Align with middle of 8px dot (4px center - ~6px for text baseline)
                          color: 'var(--error)',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          fontSize: '10px', // Smaller than trades-caption (12px)
                          lineHeight: '12px',
                          animation: 'pulse 2s infinite' // Same pulsing animation as the dot
                        }}
                      >
                        {(() => {
                          const now = new Date();
                          const hours = now.getHours().toString().padStart(2, '0');
                          const minutes = now.getMinutes().toString().padStart(2, '0');
                          return `${hours}:${minutes}`;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Booking Cards - Properly aligned with time grid */}
                  <div 
                    className="bookings_canvas absolute overflow-hidden" 
                    style={{ left: '68px', right: '8px', height: '100%', zIndex: 10 }}
                  >
                    {selectedDayBookings.map(booking => {
                      const [startHour, startMin] = booking.time.split(':').map(Number);
                      const [endHour, endMin] = booking.endTime.split(':').map(Number);
                      
                      // Calculate precise positioning based on time grid
                      const startTotalMinutes = startHour * 60 + startMin;
                      const endTotalMinutes = endHour * 60 + endMin;
                      const durationMinutes = endTotalMinutes - startTotalMinutes;
                      
                      // Position relative to 6AM start (6AM = 360 minutes from midnight)
                      const gridStartMinutes = 6 * 60; // 6AM in minutes
                      const relativeStartMinutes = startTotalMinutes - gridStartMinutes;
                      
                      // Convert to pixel positions (76px per hour = 76px per 60 minutes)
                      // Add 12px offset to align with time labels (same as grid lines)
                      const top = (relativeStartMinutes / 60) * HOUR_HEIGHT + 12;
                      const calculatedHeight = (durationMinutes / 60) * HOUR_HEIGHT;
                      const height = Math.max(MIN_BOOKING_HEIGHT, calculatedHeight);
                      
                      return (
                        <div
                          key={booking.id}
                          className="booking_slot absolute w-full"
                          style={{
                            top: `${Math.max(12, top)}px`, // Ensure no positioning above first time label
                            height: `${height}px`,
                            paddingRight: '4px'
                          }}
                        >
                          <BookingCard 
                            booking={booking}
                            onJobClick={handleJobClick}
                            onMapsClick={handleMapsClick}
                            onWhatsAppClick={handleWhatsAppClick}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Empty state
                <div className="empty_day flex flex-col items-center justify-center py-16">
                  <p className="trades-body mb-4" style={{ color: 'var(--muted)' }}>
                    No bookings today
                  </p>
                  <button
                    onClick={() => onNavigate("add-booking", { date: selectedDateString })}
                    className="trades-label hover:underline"
                    style={{ color: 'var(--primary)' }}
                  >
                    + Add Booking
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

            {/* Week View */}
            {activeTab === "week" && (
              <div className="week_content px-4">
                {dayGroups.length > 0 ? (
                  <div className="flex flex-col" style={{ gap: '24px' }}>
                    {dayGroups.map((dayGroup, index) => (
                      <div key={index} className="week_day_group">
                        {/* Day header */}
                        <div 
                          className="flex items-center justify-between p-3 rounded-lg mb-3 sticky top-0 z-30"
                          style={{ 
                            backgroundColor: dayGroup.isToday ? 'rgba(10, 132, 255, 0.05)' : 'var(--surface)', 
                            border: `1px solid ${dayGroup.isToday ? 'var(--primary)' : 'var(--border)'}`,
                          }}
                        >
                          <div className="flex items-center" style={{ gap: '8px' }}>
                            <span 
                              className="trades-body"
                              style={{ 
                                color: dayGroup.isToday ? 'var(--primary)' : 'var(--ink)',
                                fontWeight: '600'
                              }}
                            >
                              {dayGroup.dayLabel}
                            </span>
                            {dayGroup.isToday && (
                              <span 
                                className="px-2 py-1 rounded-full trades-caption"
                                style={{
                                  backgroundColor: 'var(--primary)',
                                  color: 'var(--primary-foreground)',
                                  fontSize: '10px',
                                  fontWeight: '500'
                                }}
                              >
                                Today
                              </span>
                            )}
                          </div>
                          <div 
                            className="px-2 py-1 rounded-full trades-caption"
                            style={{
                              backgroundColor: 'var(--surface-alt)',
                              color: 'var(--muted)'
                            }}
                          >
                            {dayGroup.bookings.length}
                          </div>
                        </div>
                        
                        {/* Bookings */}
                        <div className="space-y-6">
                          {filterBookings(dayGroup.bookings).map(booking => (
                            <BookingCard 
                              key={booking.id} 
                              booking={booking}
                              onJobClick={handleJobClick}
                              onMapsClick={handleMapsClick}
                              onWhatsAppClick={handleWhatsAppClick}
                              view="week"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty_week flex flex-col items-center justify-center py-16">
                    <p className="trades-body mb-4" style={{ color: 'var(--muted)' }}>
                      No bookings this week
                    </p>
                    <button
                      onClick={() => onNavigate("add-booking", { date: selectedDateString })}
                      className="trades-label hover:underline"
                      style={{ color: 'var(--primary)' }}
                    >
                      + Add Booking
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button - True floating without container interference */}
        <button
          onClick={() => onNavigate("add-booking", { date: selectedDateString })}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
            boxShadow: '0 4px 12px rgba(10, 132, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <span className="trades-h2" style={{ marginTop: '-2px' }}>+</span>
        </button>
      </LoadingWrapper>
    </div>
  );
}