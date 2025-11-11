# Home / Dashboard

The **Home** tab is the central hub of WorkBeam, providing an at-a-glance overview of your business operations and quick access to key features.

## Overview

**File**: `/components/screens/dashboard-clean.tsx`

The dashboard is designed for quick decision-making, showing:
- Business performance metrics
- Recent activity across all modules
- Important alerts and notifications
- Quick action buttons for common tasks

## Main Sections

### 1. **Top Stats Row**
Four key metrics displayed at the top:

#### Active Jobs
- **Shows**: Count of jobs with status `in-progress` or `scheduled`
- **Icon**: Briefcase icon with blue background
- **Click**: Navigates to Job List filtered to active jobs
- **Purpose**: Quick view of current workload

#### Pending Quotes
- **Shows**: Count of quotes with status `pending`
- **Icon**: ClipboardList icon with amber background
- **Click**: Navigates to Quote List filtered to pending
- **Purpose**: Track quotes awaiting client decision

#### Unpaid Invoices
- **Shows**: Count of invoices with status `sent` or `overdue`
- **Icon**: FileText icon with red background
- **Click**: Navigates to Invoice List filtered to unpaid
- **Purpose**: Monitor outstanding payments

#### This Month Revenue
- **Shows**: Total revenue from payments this month (£ format)
- **Calculation**: Sums all invoices marked as `paid` or `partial` this calendar month
- **Icon**: TrendingUp icon with green background
- **Click**: Navigates to Business Analytics
- **Purpose**: Track monthly income performance

### 2. **Quick Actions Section**
Four primary action buttons for common workflows:

#### New Client
- **Button**: Blue button with Users icon
- **Action**: Opens New Client screen
- **Purpose**: Quick client onboarding

#### New Job
- **Button**: Blue button with Briefcase icon  
- **Action**: Opens New Job screen
- **Purpose**: Start new project immediately

#### Create Quote
- **Button**: Blue button with FileText icon
- **Action**: Opens Quote Builder
- **Purpose**: Generate quote for client

#### Record Payment
- **Button**: Blue button with DollarSign icon
- **Action**: Opens Payment Recorder
- **Purpose**: Log incoming payments quickly

### 3. **Recent Jobs**
Displays the 5 most recently updated jobs:

#### Job Card Information:
- **Client name** (with Building2 icon)
- **Job title** (clickable)
- **Status badge** (color-coded: blue/green/yellow/red)
- **Job type** (e.g., "Installation", "Repair")
- **Location** (with MapPin icon)
- **Phone** (with Phone icon, clickable for call)
- **Value** (total job value in £)
- **Arrow icon** for navigation

#### Actions:
- **Tap card**: Opens Job Detail screen
- **Tap phone**: Initiates phone call (mobile)

#### Empty State:
- Shows illustration with message "No jobs yet"
- "Get started by creating your first job" prompt
- "New Job" button

### 4. **Upcoming Bookings**
Shows next 5 calendar bookings chronologically:

#### Booking Card Information:
- **Date & time** (formatted: "Mon, 15 Jan • 09:00")
- **Client name**
- **Job title**
- **Location**
- **Duration** (calculated from start/end time)
- **Arrow icon** for navigation

#### Actions:
- **Tap card**: Opens Booking Detail screen

#### Empty State:
- Shows calendar illustration
- "No upcoming bookings"
- "Add Booking" button

### 5. **Recent Quotes**
Displays 3 most recent quotes:

#### Quote Card Information:
- **Quote number** (e.g., "Q-001")
- **Client name**
- **Status badge** (pending/accepted/declined/expired)
- **Total value** (£ format)
- **Created date** (relative: "2 days ago")
- **Expiry warning** (if approaching expiration)
- **View icon**

#### Actions:
- **Tap card**: Opens Quote Detail screen
- **View all**: Navigates to Quote List

#### Empty State:
- Shows document illustration
- "No quotes created yet"
- "Create Quote" button

### 6. **Revenue Overview Widget**
Monthly revenue trend (when sufficient data exists):

#### Shows:
- **Current month revenue** (large number)
- **Comparison to last month** (percentage change)
- **Trend indicator** (↑ green or ↓ red)
- **Simple bar chart** (last 6 months)

#### Data Source:
- Calculates from invoice payment dates
- Only counts fully paid or partially paid invoices
- Groups by calendar month
- Uses `paidAtISO` or `paidAt` fields

### 7. **Alerts & Notifications**
Priority alerts shown at top of screen:

#### Types:
- **Overdue invoices** (red alert)
- **Expiring quotes** (amber warning)
- **Incomplete profile** (blue info)
- **Team invitations pending** (purple info)

#### Actions:
- **Tap alert**: Navigates to relevant screen
- **Dismiss**: Removes from view (session-only)

## Data Loading

### Initial Load:
```typescript
Promise.all([
  api.getClients(),
  api.getJobs(), 
  api.getInvoices(),
  api.getBookings(),
  api.getQuotes(),
  api.getPayments()
])
```

### Refresh Triggers:
- On app launch
- After creating/editing any entity
- Pull-to-refresh gesture (mobile)
- When `refreshKey` prop changes

### Loading State:
- Shows skeleton loaders for each section
- Maintains layout structure
- Prevents content jump

### Error Handling:
- Displays error message with retry button
- Falls back to cached data if available
- Logs errors for debugging

## Calculations & Logic

### Active Jobs Count:
```typescript
jobs.filter(job => 
  job.status === 'in-progress' || 
  job.status === 'scheduled'
).length
```

### Pending Quotes Count:
```typescript
quotes.filter(quote => 
  quote.status === 'pending'
).length
```

### Unpaid Invoices Count:
```typescript
invoices.filter(invoice => 
  invoice.status === 'sent' || 
  invoice.status === 'overdue'
).length
```

### This Month Revenue:
```typescript
const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

invoices
  .filter(invoice => {
    if (invoice.status !== 'paid' && invoice.status !== 'partial') return false;
    const paymentDate = getPaymentDate(invoice);
    if (!paymentDate) return false;
    return paymentDate.getMonth() === currentMonth && 
           paymentDate.getFullYear() === currentYear;
  })
  .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
```

## Navigation Flow

From Dashboard, users can navigate to:

- **New Client** → `/new-client`
- **New Job** → `/new-job`
- **Create Quote** → `/quote-builder`
- **Record Payment** → `/payment-recorder`
- **Job Detail** → `/job-detail/:jobId`
- **Booking Detail** → `/booking-detail/:bookingId`
- **Quote Detail** → `/quote-detail/:quoteId`
- **Job List** → `/job-list` (filtered)
- **Quote List** → `/quote-list`
- **Invoice List** → `/invoice-list` (filtered)
- **Business Analytics** → `/business-analytics`

## Mobile Optimization

- **Scroll behavior**: Smooth scrolling with overscroll containment
- **Touch targets**: Minimum 44x44pt for tap areas
- **Spacing**: 8pt grid system throughout
- **Typography**: Trades-specific font scale
- **Bottom nav clearance**: 80px padding-bottom to clear navigation bar

## Performance

### Optimization Strategies:
- Parallel data fetching (Promise.all)
- Memoized calculations (useMemo)
- Virtualized lists for large datasets
- Lazy loading of images
- Cached API responses

### Metrics Tracked:
- Initial load time
- Time to interactive
- Data fetch duration
- Render performance

## Accessibility

- Semantic HTML structure
- ARIA labels for icon-only buttons
- Keyboard navigation support
- Screen reader friendly
- Color contrast AA compliant
- Focus indicators on interactive elements

## Multi-User Features

### Activity Attribution:
- Shows who created each entity (jobs, quotes, invoices)
- Displays last updated by member name
- Activity log accessible from Settings

### Permissions:
- All roles can view dashboard
- Members see all organization data
- Role-based action buttons (some restricted to Admin/Owner)

## Related Screens

The dashboard integrates data from all main modules:
- See [CLIENTS.md](./CLIENTS.md) for client, job, quote, invoice details
- See [CALENDAR.md](./CALENDAR.md) for booking information
- See [SETTINGS.md](./SETTINGS.md) for business analytics and team features

## Future Enhancements

Potential dashboard improvements:
- Customizable widget layout
- Additional chart types
- Filters for date ranges
- Export dashboard as PDF report
- Push notifications integration
- Real-time updates via WebSocket
