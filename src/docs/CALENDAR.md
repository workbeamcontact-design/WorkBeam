# Calendar

The **Calendar** tab provides schedule visualization and booking management for jobs and appointments.

## Overview

**File**: `/components/screens/calendar.tsx`

The Calendar module helps you:
- Visualize your schedule at a glance
- Manage bookings and appointments
- Link bookings to jobs and clients
- Track time allocation
- Avoid scheduling conflicts

---

## Main Screen: Calendar View

### Display Modes

#### 1. Month View (Default)
**Layout**: Traditional calendar grid

##### Features:
- Current month displayed
- Previous/next month navigation
- Today highlighted
- Bookings shown as colored dots
- Multi-booking dates show count badge
- Tap date to see day's bookings

##### Visual Indicators:
- **Blue dots**: Scheduled bookings
- **Number badge**: Multiple bookings (e.g., "3")
- **Today**: Blue circle outline
- **Selected date**: Blue background
- **Past dates**: Greyed out text

##### Navigation:
- **< Previous**: Go to previous month
- **> Next**: Go to next month
- **Today button**: Jump to current month
- **Tap date**: Select date and show bookings

---

#### 2. Week View
**Layout**: 7-day horizontal scroll

##### Features:
- Shows current week (Mon-Sun)
- Swipe left/right to navigate weeks
- Time slots displayed vertically (7am-8pm)
- Bookings shown as blocks in time slots
- Collision detection for overlapping bookings

##### Time Slots:
- Hourly increments (7:00, 8:00, 9:00, etc.)
- 30-minute sub-divisions
- Booking blocks sized by duration
- Conflicts shown in red

##### Navigation:
- **Swipe left**: Next week
- **Swipe right**: Previous week
- **Today button**: Jump to current week
- **Tap booking**: Open booking detail

---

#### 3. Day View
**Layout**: Single day with detailed time breakdown

##### Features:
- Hour-by-hour schedule
- 15-minute precision
- All bookings for selected day
- Empty time slots visible
- Scroll through 24 hours

##### Display:
- **Morning** (6am-12pm): White background
- **Afternoon** (12pm-6pm): Light grey
- **Evening** (6pm-10pm): Darker grey
- Bookings overlay on timeline

---

### Booking Cards (in all views)

Each booking displays:

#### Minimal View (Month):
- Colored dot indicator
- Count if multiple bookings

#### Compact View (Week):
- Start time
- Client name
- Duration bar

#### Full View (Day/List):
- **Time**: Start time - End time
- **Client name**: Tap to view client
- **Job title**: Tap to view job
- **Location**: Address with map icon
- **Status**: Badge (scheduled/completed/cancelled)
- **Duration**: Calculated from start/end
- **Notes**: Preview (first 50 chars)

---

## Related Screens

### Add Booking (`/components/screens/add-booking.tsx`)

**Purpose**: Create new calendar booking

#### Form Fields:

##### **Basic Information**:
- **Client*** (required)
  - Dropdown of existing clients
  - "Add new client" quick option
- **Job** (optional but recommended)
  - Dropdown of client's jobs
  - "Create new job" quick option
- **Title*** (required)
  - Booking description (e.g., "Initial consultation", "Installation day 1")

##### **Date & Time**:
- **Date*** (required)
  - Date picker
  - Defaults to selected date from calendar
- **Start Time*** (required)
  - Time picker (15-min increments)
  - Defaults to next available hour
- **End Time*** (required)
  - Time picker
  - Validation: Must be after start time
- **Duration**: Auto-calculated and displayed

##### **Location**:
- **Use Client Address**: Toggle (auto-populates from client)
- **Custom Location**: Manual entry if toggle off
  - Street
  - City
  - Postcode

##### **Additional Details**:
- **Notes**: Free text for booking-specific information
- **Send Reminder**: Checkbox
  - If enabled, shows reminder time picker
  - Options: 1 day before, 2 days before, 1 week before

#### Conflict Detection:
- **Warning**: Shows amber warning if booking overlaps existing booking
- **Details**: Lists conflicting bookings
- **Override**: Can still save (not blocked)

#### Validation:
- All required fields must be filled
- End time must be after start time
- Date cannot be in the past (warning only, not blocked)

#### Actions:
- **Save**: Creates booking and returns to calendar
- **Save & Add Another**: Saves and keeps form open for next booking
- **Cancel**: Discards changes with confirmation

---

### Booking Detail (`/components/screens/booking-detail-redesigned.tsx`)

**Purpose**: View and manage existing booking

#### Information Displayed:

##### **Header**:
- Booking title
- Date and time range
- Status badge
- Edit button

##### **Details Section**:
- **Client**: 
  - Name (tap to view client)
  - Phone (tap to call)
  - Email (tap to email)
- **Job**: 
  - Job title (tap to view job)
  - Job status
  - Job value
- **Location**: 
  - Full address
  - Map icon (tap to open maps app)
- **Duration**: 
  - Calculated time
  - e.g., "2 hours 30 minutes"
- **Notes**: 
  - Full notes text
  - Editable inline

##### **Actions Section**:
Quick action buttons:
- **Call Client**: Initiates phone call
- **Get Directions**: Opens maps app with address
- **Email Client**: Opens email app
- **WhatsApp**: Opens WhatsApp chat (if phone provided)

##### **Status Management**:
- **Mark as Completed**: 
  - Changes status to completed
  - Records completion timestamp
  - Optional completion notes
- **Cancel Booking**:
  - Changes status to cancelled
  - Required: Cancellation reason
  - Optional: Notify client

##### **Related Items**:
- **Job details**: Link to full job if associated
- **Quote**: If booking relates to quote
- **Invoice**: If booking has been invoiced

#### Actions:
- **Edit**: Opens edit mode
- **Delete**: 
  - Confirmation required
  - Cannot delete if status is completed
- **Duplicate**: Create similar booking for different date
- **Convert to Job**: Create job from booking

---

## Calendar Features

### Filtering & Views

#### Filter Options:
- **All Bookings**: Default view
- **This Week**: Only current week bookings
- **This Month**: Only current month bookings
- **Upcoming**: Future bookings only
- **Past**: Historical bookings
- **By Status**:
  - Scheduled
  - Completed
  - Cancelled

#### Search:
- Search by client name
- Search by job title
- Search by location

---

### Visual Design

#### Color Coding:
Bookings can be color-coded by:
- **Client**: Each client gets consistent color
- **Job status**: 
  - Blue: Scheduled
  - Green: Completed
  - Red: Cancelled
  - Amber: In progress
- **Custom**: User can assign colors

#### Time Indicators:
- **Current time line**: Red line showing "now" in day/week view
- **Business hours highlight**: Shaded area for working hours (8am-6pm default)
- **Overlap warnings**: Yellow highlight for scheduling conflicts

---

### Navigation Controls

#### Header:
- **View toggle**: Month / Week / Day buttons
- **Today button**: Jump to current date/week
- **Date picker**: Tap month/year to open date picker
- **Add button**: Quick add booking

#### Week Header (in Week view):
- **Swipeable**: Gesture-based week navigation
- **Scrollable**: Horizontal scroll alternative
- **Current week indicator**: Highlighted

---

## Integration with Other Modules

### Client Integration:
- Bookings tied to clients
- View client's all bookings from Client Detail
- Auto-populate client contact info

### Job Integration:
- Link bookings to jobs
- Multiple bookings per job (e.g., "Day 1", "Day 2", "Final inspection")
- Job detail shows associated bookings
- Job status affects booking appearance

### Quote Integration:
- Create booking when quote accepted
- "Schedule installation" from quote
- Booking date can trigger quote expiry extension

### Invoice Integration:
- Track billable time from bookings
- Auto-populate invoice with booking hours
- Link invoice to bookings for that job

---

## Notifications & Reminders

### Booking Reminders:
- **Email reminders**: Sent to you (business owner)
- **Client reminders**: Sent to client (if enabled)
- **Timing**: Configurable (1 day, 2 days, 1 week before)
- **Content**: Booking details, location, contact info

### Overdue Notifications:
- **Past bookings**: Reminder to update status
- **Completion prompt**: "Did this booking happen?"
- **Status update**: Quick complete/cancel buttons

---

## Recurring Bookings

### Create Recurring:
- **Frequency options**:
  - Daily
  - Weekly (specify day)
  - Bi-weekly
  - Monthly (specify date)
  - Custom

- **End condition**:
  - After X occurrences
  - Until specific date
  - Never (ongoing)

### Manage Series:
- **Edit single**: Change one occurrence only
- **Edit series**: Change all future occurrences
- **Delete single**: Remove one occurrence
- **Delete series**: Cancel all future occurrences

---

## Conflict Management

### Conflict Detection:
Automatically detects:
- **Time overlap**: Booking times conflict
- **Double booking**: Same time, same day
- **Travel time conflicts**: Insufficient time between locations

### Conflict Resolution:
- **Warning shown**: Amber alert with details
- **Suggest alternatives**: Show nearby free time slots
- **Override option**: Can save anyway if intentional
- **Reschedule**: Quick reschedule to suggested time

---

## Mobile Features

### Gestures:
- **Swipe left/right**: Navigate weeks
- **Pinch to zoom**: Adjust time scale in day/week view
- **Long press**: Quick add booking at that time
- **Pull down**: Refresh data

### Touch Optimization:
- Minimum 44pt tap targets
- Large time slot areas
- Bottom sheet for forms
- Floating action button for quick add

---

## Data Sync

### Real-time Updates:
- Bookings sync across all team members
- Changes reflected immediately
- Conflict warnings update live

### Offline Support:
- View cached bookings when offline
- Create bookings offline (sync when online)
- Offline indicator shown

---

## Export & Sharing

### Export Options:
- **iCal format**: Import to Apple Calendar
- **Google Calendar sync**: Two-way sync (future feature)
- **PDF schedule**: Print weekly/monthly schedule
- **CSV export**: Data export for reporting

### Sharing:
- **Email schedule**: Send week/month view to team
- **Share booking**: Share specific booking details
- **Public link**: Client-facing booking confirmation page

---

## Analytics & Insights

### Time Tracking:
- Total hours booked this week/month
- Utilization rate (booked hours / available hours)
- Average booking duration
- Most common booking times

### Client Analytics:
- Bookings per client
- Repeat booking clients
- No-show rate by client

---

## Settings & Customization

### Calendar Settings:
Accessed from Settings > Calendar

#### Working Hours:
- **Start time**: Default 8:00 AM
- **End time**: Default 6:00 PM
- **Working days**: Select days (Mon-Sun)
- **Breaks**: Define lunch/break times

#### Display Preferences:
- **Default view**: Month / Week / Day
- **Week start**: Sunday / Monday
- **Time format**: 12-hour / 24-hour
- **Color scheme**: Client / Status / Custom

#### Booking Defaults:
- **Default duration**: e.g., 2 hours
- **Default reminder**: e.g., 1 day before
- **Auto-complete**: Auto-mark past bookings as completed

---

## Permissions (Multi-User)

### Owner:
- Full calendar access
- Create, edit, delete all bookings
- Manage calendar settings

### Admin:
- View all bookings
- Create and edit bookings
- Cannot delete bookings created by others

### Member:
- View all bookings
- Create bookings (assigned to self)
- Edit own bookings only
- Cannot delete any bookings

### Attribution:
Each booking shows:
- Created by: Team member name
- Last updated by: Team member name
- Assigned to: Responsible team member (future feature)

---

## Performance

### Optimization:
- **Lazy loading**: Only load visible month/week
- **Caching**: Cache bookings locally
- **Incremental loading**: Load as you scroll
- **Debounced search**: Reduce API calls

### Loading States:
- Skeleton calendar grid while loading
- Smooth transitions between views
- Instant response to tap/swipe

---

## Accessibility

- **Screen reader support**: Announces dates and bookings
- **Keyboard navigation**: Arrow keys to navigate dates
- **High contrast mode**: Enhanced visibility
- **Focus indicators**: Clear focus on selected elements
- **Date announcements**: "Today is Monday, January 15th"

---

## Future Enhancements

Potential calendar improvements:
- Google Calendar two-way sync
- Team member assignment per booking
- Booking templates
- Drag-and-drop rescheduling
- Color-coded by team member
- Availability sharing with clients
- Online booking portal for clients
- Time tracking integration
- Mileage tracking between bookings

---

## Related Documentation

- [HOME.md](./HOME.md) - Dashboard shows upcoming bookings
- [CLIENTS.md](./CLIENTS.md) - Client and job integration
- [SETTINGS.md](./SETTINGS.md) - Calendar settings configuration
