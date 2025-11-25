import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwipableWeekHeaderProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onWeekChange: (date: Date) => void;
}

interface WeekData {
  weekOffset: number; // -1, 0, +1
  startDate: Date;
  days: {
    date: Date;
    dayName: string;
    dayNumber: number;
    isSelected: boolean;
    isToday: boolean;
  }[];
  rangeLabel: string;
}

export function SwipableWeekHeader({ selectedDate, onDateSelect, onWeekChange }: SwipableWeekHeaderProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Get Monday of the week for a given date
  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff));
  };

  // Generate week data for a given offset from selected date
  const generateWeekData = useCallback((offset: number): WeekData => {
    const baseMonday = getMondayOfWeek(selectedDate);
    const weekMonday = new Date(baseMonday);
    weekMonday.setDate(baseMonday.getDate() + (offset * 7));
    
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekMonday);
      date.setDate(weekMonday.getDate() + i);
      
      days.push({
        date,
        dayName: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isSelected: date.toDateString() === selectedDate.toDateString(),
        isToday: date.toDateString() === today.toDateString()
      });
    }

    // Generate range label
    const firstDay = days[0];
    const lastDay = days[6];
    let rangeLabel: string;
    
    if (firstDay.date.getMonth() === lastDay.date.getMonth()) {
      rangeLabel = `Mon ${firstDay.dayNumber} – Sun ${lastDay.dayNumber} ${firstDay.date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
    } else {
      const firstMonth = firstDay.date.toLocaleDateString('en-GB', { month: 'short' });
      const lastMonth = lastDay.date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      rangeLabel = `Mon ${firstDay.dayNumber} ${firstMonth} – Sun ${lastDay.dayNumber} ${lastMonth}`;
    }

    return {
      weekOffset: offset,
      startDate: weekMonday,
      days,
      rangeLabel
    };
  }, [selectedDate]);

  // Get the three weeks: previous, current, next
  const weeks = [
    generateWeekData(currentWeekOffset - 1), // Previous week
    generateWeekData(currentWeekOffset),     // Current week
    generateWeekData(currentWeekOffset + 1)  // Next week
  ];

  const currentWeek = weeks[1]; // Current week is always index 1

  // Handle touch/mouse start
  const handleStart = (clientX: number) => {
    if (isTransitioning) return;
    
    startX.current = clientX;
    currentX.current = clientX;
    isDragging.current = true;
  };

  // Handle touch/mouse move
  const handleMove = (clientX: number) => {
    if (!isDragging.current || isTransitioning) return;
    
    currentX.current = clientX;
    const deltaX = currentX.current - startX.current;
    
    // Apply transform for drag feedback
    if (containerRef.current) {
      containerRef.current.style.transform = `translateX(${deltaX * 0.3}px)`;
    }
  };

  // Handle touch/mouse end
  const handleEnd = () => {
    if (!isDragging.current || isTransitioning) return;
    
    const deltaX = currentX.current - startX.current;
    const threshold = 50; // Minimum swipe distance
    
    if (containerRef.current) {
      containerRef.current.style.transform = 'translateX(0px)';
    }
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swiped right - go to previous week
        handleWeekChange(-1);
      } else {
        // Swiped left - go to next week
        handleWeekChange(1);
      }
    }
    
    isDragging.current = false;
  };

  // Handle week change
  const handleWeekChange = (direction: number) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setCurrentWeekOffset(prev => prev + direction);
    
    // Calculate new selected date maintaining same day of week
    const newWeekMonday = new Date(currentWeek.startDate);
    newWeekMonday.setDate(newWeekMonday.getDate() + (direction * 7));
    
    // Find which day index was selected (0-6)
    const selectedDayIndex = currentWeek.days.findIndex(day => day.isSelected);
    const newSelectedDate = new Date(newWeekMonday);
    newSelectedDate.setDate(newWeekMonday.getDate() + (selectedDayIndex >= 0 ? selectedDayIndex : 0));
    
    // Call callbacks
    onDateSelect(newSelectedDate);
    onWeekChange(newSelectedDate);
    
    // Reset transition state
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleEnd();
  };

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX);
  }, []);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, []);

  // Add/remove mouse event listeners
  useEffect(() => {
    if (isDragging.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="week_header flex flex-col gap-4">
      {/* Week Range Row */}
      <div className="week_range_row flex items-center justify-between">
        <button 
          onClick={() => handleWeekChange(-1)}
          className="p-1 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
          style={{ minWidth: '32px', minHeight: '32px' }}
          disabled={isTransitioning}
        >
          <ChevronLeft size={16} style={{ color: '#6B7280', opacity: '0.6' }} />
        </button>
        <span className="trades-body text-center flex-1" style={{ color: '#111827' }}>
          {currentWeek.rangeLabel}
        </span>
        <button 
          onClick={() => handleWeekChange(1)}
          className="p-1 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
          style={{ minWidth: '32px', minHeight: '32px' }}
          disabled={isTransitioning}
        >
          <ChevronRight size={16} style={{ color: '#6B7280', opacity: '0.6' }} />
        </button>
      </div>

      {/* Week Strip Container */}
      <div 
        ref={containerRef}
        className="week_strip_container select-none"
        style={{ 
          padding: '0 16px',
          cursor: isDragging.current ? 'grabbing' : 'grab',
          transition: isTransitioning ? 'transform 300ms ease-out' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="week_strip flex gap-2">
          {currentWeek.days.map((day, index) => (
            <button
              key={`${day.date.toISOString()}-${index}`}
              onClick={() => onDateSelect(day.date)}
              className="flex-1 flex flex-col items-center justify-center trades-caption transition-all"
              style={{
                backgroundColor: day.isSelected ? '#0A84FF' : '#FFFFFF',
                color: day.isSelected ? '#FFFFFF' : day.isToday ? '#0A84FF' : '#111827',
                border: day.isSelected ? 'none' : `1px solid ${day.isToday ? '#0A84FF' : '#E5E7EB'}`,
                height: '44px',
                borderRadius: '22px',
                minWidth: '44px'
              }}
            >
              <span style={{ fontSize: '11px' }}>{day.dayName}</span>
              <span className="trades-label" style={{ fontWeight: '500', fontSize: '13px' }}>
                {day.dayNumber}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}