# Settings

The **Settings** tab contains all business configuration, user preferences, team management, subscription, and administrative functions.

## Overview

Settings is organized into logical sections accessible from the main Settings screen (`/components/screens/settings.tsx`).

---

## Main Settings Screen

### Menu Structure:

#### **Business Section**:
1. Business Details
2. Bank Details  
3. Branding & Logo
4. Invoice Templates

#### **Team Section** (Multi-user):
5. Team Management
6. Activity Log

#### **Account Section**:
7. Profile
8. Subscription
9. Notifications

#### **Analytics**:
10. Business Analytics

#### **System**:
11. Sign Out

---

## Business Settings

### 1. Business Details (`/components/screens/business-details.tsx`)

**Purpose**: Configure company information shown on quotes, invoices, and communications

#### Form Fields:

##### **Company Information**:
- **Business Name*** (required)
  - Appears on all documents
  - Max 100 characters
- **Trading Name** (optional)
  - If different from business name
- **VAT Number** (optional)
  - Format: GB123456789
  - Validation: UK VAT format
- **Company Registration Number** (optional)
  - Companies House number

##### **Contact Details**:
- **Business Phone*** (required)
  - Country code selector
  - Format validation
- **Business Email*** (required)
  - Primary contact email
  - Used for client communications
- **Website** (optional)
  - Must include https://
  - Validation: Valid URL format

##### **Address**:
- **Street Address*** (required)
- **City*** (required)
- **Postcode*** (required)
  - UK postcode validation
- **County** (optional)

##### **Additional**:
- **Industry/Trade Type**:
  - Electrician
  - Plumber
  - Builder
  - Carpenter
  - Decorator
  - Landscaper
  - Roofer
  - Other (specify)

#### Features:
- **Auto-save**: Changes saved every 30 seconds
- **Validation**: Real-time field validation
- **Preview**: See how details appear on invoice
- **Incomplete warning**: Dashboard alert if required fields missing

#### Actions:
- **Save Changes**: Bottom-floating button
- **Preview on Invoice**: Opens sample invoice
- **Reset**: Revert to last saved (confirmation required)

---

### 2. Bank Details (`/components/screens/bank-details.tsx`)

**Purpose**: Configure bank transfer information for invoices

#### Form Fields:

##### **Bank Account**:
- **Account Holder Name*** (required)
  - Name on bank account
- **Bank Name*** (required)
  - Name of your bank
- **Sort Code*** (required)
  - Format: 12-34-56
  - Auto-formatting on input
  - Validation: 6 digits
- **Account Number*** (required)
  - Format: 12345678
  - Validation: 8 digits
- **IBAN** (optional)
  - For international transfers
  - Format: GB12 ABCD 1234 5678 9012 34

##### **Payment Reference**:
- **Default Reference Format**:
  - Options:
    - Invoice number (INV-001)
    - Client name + invoice number
    - Custom format
- **Custom Instructions**: Text for clients (e.g., "Please quote invoice number")

##### **Display Options**:
- **Show on Quotes**: Toggle (default: off)
- **Show on Invoices**: Toggle (default: on)
- **Show on Estimates**: Toggle (default: off)

#### Verification:
- **Not verified by default**: Can save without verification
- **Manual verification only**: No automated verification
- **Visual indicator**: Warning that details are unverified
- **User responsibility**: Business owner confirms accuracy

#### Security:
- **Encrypted storage**: Bank details encrypted at rest
- **Masked display**: Shows last 4 digits only (e.g., ****5678)
- **Edit requires re-entry**: Full details needed to change
- **Audit log**: Changes tracked in activity log

#### Actions:
- **Save Changes**: Floating button
- **Test on Invoice**: Generate test invoice to preview
- **Clear Details**: Remove bank info (confirmation required)

---

### 3. Branding & Logo (`/components/screens/branding-logo.tsx`)

**Purpose**: Customize visual identity on all customer-facing materials

#### Logo Upload:

##### **File Requirements**:
- **Format**: PNG, JPG, or SVG
- **Max size**: 2MB
- **Recommended**: 
  - Square or horizontal (1:1 or 2:1 ratio)
  - Transparent background (PNG)
  - Min 300×300px for quality
  - Max 2000×2000px

##### **Upload Process**:
1. Click "Upload Logo" button
2. Select file from device
3. Crop/resize preview
4. Adjust position
5. Save

##### **Logo Display**:
- **Preview**: Shows how logo appears on documents
- **Position options**: Left / Center / Right
- **Size adjustment**: Small / Medium / Large
- **Clear logo**: Remove and revert to default

#### Brand Colors:

##### **Primary Color**:
- Color picker
- Hex code input
- Defaults to WorkBeam blue (#0A84FF)
- Used for:
  - Buttons and accents
  - Quote/invoice headers
  - Status badges

##### **Secondary Color**:
- Optional
- Used for secondary elements
- Defaults to grey

##### **Text Color**:
- Auto-calculated for contrast
- Override option
- Ensures readability

#### Preview:
- **Live preview**: See changes in real-time
- **Sample documents**: 
  - Quote preview
  - Invoice preview
  - Email template preview
- **Switch between templates**: Test each invoice template

#### Actions:
- **Save Changes**: Apply branding
- **Reset to Default**: Revert to WorkBeam defaults
- **Download Logo**: Download uploaded logo file

---

### 4. Invoice Templates (`/components/screens/invoice-templates.tsx`)

**Purpose**: Select default invoice template style

#### Available Templates:

1. **Classic**:
   - Traditional layout
   - Formal appearance
   - Black and white with subtle blue accents
   - Best for: Conservative industries

2. **Modern**:
   - Clean, minimal design
   - Lots of white space
   - Sans-serif fonts
   - Best for: Contemporary businesses

3. **Professional**:
   - Structured layout
   - Clear sections
   - Corporate feel
   - Best for: B2B services

4. **Corporate**:
   - Detailed header
   - Multi-column layout
   - Comprehensive information
   - Best for: Large projects

5. **Creative**:
   - Colorful design
   - Unique layout
   - Eye-catching
   - Best for: Design-focused trades

6. **Minimal**:
   - Extremely simple
   - Essential info only
   - Ultra-clean
   - Best for: Simple invoicing

#### Features:
- **Preview each template**: Full-screen preview
- **Sample data**: Realistic preview content
- **Your branding**: Shows with your logo and colors
- **Select default**: Choose template for new invoices
- **Per-invoice override**: Can change template for individual invoices

#### Actions:
- **Select Template**: Set as default
- **Preview**: Full-screen A4 preview
- **Customize**: Adjust within template (colors, fonts)

---

## Team Management (Multi-User)

### 5. Team Management (`/components/screens/team-management.tsx`)

**Purpose**: Manage organization members, roles, and invitations

#### Organization Overview:

##### **Subscription Info**:
- **Current Plan**: 1 User / 3 Users / 6 Users
- **Monthly Cost**: £24 / £35 / £49
- **Seats Used**: e.g., "2 / 3 seats"
- **Available Seats**: Calculate remaining
- **Upgrade button**: Link to subscription screen if at capacity

##### **Your Organization**:
- **Organization Name**: Editable inline
- **Created Date**: When organization was set up
- **Owner**: Current owner name
- **Total Members**: Count of active members

#### Team Members List:

Each member card shows:
- **Name**: Member's full name
- **Email**: Contact email
- **Role Badge**: 
  - Owner (blue)
  - Admin (purple)
  - Member (grey)
- **Status**: Active / Invited
- **Joined Date**: When they accepted invitation
- **Last Active**: Last login/activity timestamp
- **Actions menu**: 3-dot menu for options

##### **Member Actions** (based on permissions):

**For Owner**:
- **Change Role**: 
  - Promote Member → Admin
  - Demote Admin → Member
  - Cannot change own role
- **Remove Member**: 
  - Confirmation required
  - Releases seat
  - Member loses access immediately
  - Cannot remove self

**For Admin**:
- **Change Role**: Member ↔ Admin only
- **Remove Member**: Members only (not other Admins)

**For Member**:
- **View only**: No actions available

#### Pending Invitations:

Shows all sent invitations not yet accepted:
- **Email**: Invited email address
- **Role**: Intended role
- **Invited By**: Team member who sent it
- **Sent Date**: When invitation was sent
- **Expires**: Expiry date (7 days default)
- **Actions**:
  - **Resend**: Send invitation email again
  - **Cancel**: Revoke invitation

#### Invite Team Member:

**Button**: Floating action button at bottom

**Form** (`/components/screens/invite-member.tsx`):
- **Email*** (required)
  - Email validation
  - Check if already member
  - Check if already invited
- **Role*** (required)
  - Admin: Can manage team, quotes, invoices
  - Member: Can view and create, limited editing
- **Personal Message** (optional)
  - Custom note in invitation email

**Process**:
1. Fill form
2. Click "Send Invitation"
3. Backend creates invitation record
4. Email sent via Resend API
5. Invitation appears in pending list
6. Email contains unique link: `/public/accept-invitation/:token`

**Validation**:
- **Seat availability**: Must have available seats
- **No duplicates**: Email not already member or invited
- **Valid email**: Proper email format

#### Invitation Email:

**Subject**: "{Your Name} invited you to join {Company} on WorkBeam"

**Content**:
- Personal greeting
- Invitation message
- Company name
- Your name (who invited them)
- Role they'll have
- "Accept Invitation" button (big, blue)
- Link expiry notice (7 days)
- WorkBeam branding

**Link**: `https://your-domain.com/invite/{unique-token}`

#### Seat Management:

- **Automatically enforced**: Cannot invite if no seats available
- **"No Seats Available" state**: 
  - Button disabled
  - Message: "Upgrade your plan to invite more members"
  - Link to subscription upgrade
- **Seat release**: When member removed, seat becomes available immediately

---

### 6. Activity Log (`/components/screens/activity-log.tsx`)

**Purpose**: Audit trail of all team member actions

#### Log Entries:

Each activity shows:
- **Timestamp**: When action occurred
- **Team Member**: Who performed action
- **Action Type**: What happened
- **Entity**: What was affected (client, job, quote, invoice)
- **Details**: Specifics of the change

#### Activity Types Tracked:

##### **Team Activities**:
- Team member invited
- Team member joined
- Team member removed
- Role changed
- Organization name updated

##### **Client Activities**:
- Client created
- Client updated
- Client deleted

##### **Job Activities**:
- Job created
- Job status changed
- Job updated
- Job deleted

##### **Quote Activities**:
- Quote created
- Quote sent to client
- Quote accepted by client
- Quote declined by client
- Quote expired

##### **Invoice Activities**:
- Invoice created
- Invoice sent
- Payment recorded
- Invoice voided
- Invoice updated

##### **Booking Activities**:
- Booking created
- Booking completed
- Booking cancelled
- Booking rescheduled

#### Filtering:

- **By team member**: Show one member's activities
- **By action type**: Filter to specific actions
- **By date range**: Select date range
- **By entity**: Show actions on specific client/job/etc.

#### Search:
- Free text search across all fields
- Search by entity name, member name, action type

#### Export:
- **CSV export**: Download activity log
- **Date range**: Select range to export
- **Filtered export**: Export only filtered results

#### Retention:
- **Storage**: All activities stored indefinitely
- **Performance**: Paginated (50 per page)
- **Archive**: Option to archive old entries (future)

---

## Account Settings

### 7. Profile (`/components/screens/profile-edit.tsx`)

**Purpose**: Personal user account settings

#### Personal Information:

##### **Basic Details**:
- **Full Name*** (required)
  - Your display name
  - Shown in activity log
  - Shown in team list
- **Email*** (required)
  - Account email (cannot change)
  - Primary login credential
- **Phone** (optional)
  - Personal contact number
  - Country code selector

##### **Profile Photo**:
- Upload photo (optional)
- Max 2MB, JPG/PNG
- Square crop
- Shown in team list and activity log

#### Account Security:

##### **Change Password**:
- **Current Password*** (required)
- **New Password*** (required)
  - Min 6 characters
  - Must be different from current
- **Confirm New Password*** (required)
  - Must match new password
- **Change Password button**
- Success/error toast notification

##### **Email Preferences**:
- **Receive notifications**: Toggle
  - Quote approvals
  - Payment received
  - New team member joined
  - Invoice overdue
- **Email frequency**: Daily digest / Instant

#### Danger Zone:

##### **Delete Account**:
- Red button
- **Restrictions**:
  - Only Owner can delete organization
  - Members/Admins must leave organization
- **Confirmation required**:
  - Type organization name to confirm
  - Cannot be undone warning
- **What gets deleted**:
  - All organization data (if Owner)
  - Your user account
  - All associated records

---

### 8. Subscription (`/components/screens/subscription.tsx`)

**Purpose**: Manage subscription plan and billing

#### Current Plan:

##### **Plan Details**:
- **Plan name**: 1 User / 3 Users / 6 Users
- **Price**: £24/month / £35/month / £49/month
- **Billing cycle**: Monthly
- **Next billing date**: e.g., "15 Feb 2024"
- **Seats**: Used / Total (e.g., "2 / 3")

##### **Trial Status** (if applicable):
- **Trial active**: "14 days free trial"
- **Days remaining**: "10 days left"
- **Trial end date**: When trial ends
- **No payment required yet**

#### Available Plans:

Three plan cards displayed:

##### **1 User Plan - £24/month**:
- 1 team member
- All features
- Unlimited clients
- Unlimited invoices
- 14-day free trial

##### **3 User Plan - £35/month** (Most Popular):
- 3 team members
- All features
- Unlimited clients
- Unlimited invoices  
- 14-day free trial
- **Badge**: "Most Popular"

##### **6 User Plan - £49/month**:
- 6 team members
- All features
- Unlimited clients
- Unlimited invoices
- 14-day free trial

#### Plan Actions:

**If on trial**:
- **Select Plan**: Start subscription (ends trial)
- Each plan shows "Start 14-day trial" button

**If subscribed**:
- **Upgrade**: Change to higher tier (immediate)
- **Downgrade**: Change to lower tier (next billing cycle)
- **Cancel**: End subscription (access until period end)

#### Stripe Integration:

##### **Payment Method**:
- **Card on file**: **** **** **** 1234 (if added)
- **Expiry**: MM/YY
- **Update Card**: Opens Stripe payment sheet
- **Add Card**: If no card on file

##### **Billing History**:
- List of past invoices
- Date, amount, status
- Download PDF invoice
- View invoice in Stripe portal

##### **Manage Billing**:
- Opens Stripe Customer Portal
- Update payment method
- View all invoices
- Update billing email
- Cancel subscription

#### Upgrade/Downgrade:

##### **Upgrade Process**:
1. Click "Upgrade" on desired plan
2. Stripe payment sheet opens
3. Enter card details (if not on file)
4. Confirm upgrade
5. **Immediate access**: Seats available instantly
6. **Prorated billing**: Charged difference for remaining period

##### **Downgrade Process**:
1. Click "Downgrade" on desired plan
2. Confirmation warning:
   - "Seats will reduce from X to Y"
   - "Change takes effect on [next billing date]"
   - "Current members remain until then"
3. Confirm downgrade
4. **Delayed change**: Change happens at next billing cycle
5. **Warning if over capacity**: Must remove members before downgrade

##### **Seat Reduction Handling**:
If downgrading would put you over seat limit:
- **Warning shown**: "You have X members but new plan allows Y"
- **Action required**: Remove members before downgrade processes
- **Grace period**: Until next billing date to comply
- **Blocked access**: If non-compliant, members locked out

#### Cancellation:

##### **Cancel Subscription**:
- **Button**: "Cancel Subscription" (greyed out, at bottom)
- **Confirmation modal**:
  - "Are you sure?"
  - Consequences explained
  - "Access until [end of billing period]"
  - "All data preserved for 30 days"
  - Type "CANCEL" to confirm
- **Result**:
  - Access continues until period end
  - No further billing
  - Data accessible for 30 days
  - Can reactivate within 30 days

#### Free Trial:

##### **Trial Details**:
- **Duration**: 14 days
- **No card required**: Can start trial without payment method
- **Full access**: All features available
- **Seats**: Based on selected plan (1, 3, or 6)

##### **Trial Expiry**:
- **7 days before**: Email reminder
- **3 days before**: Email reminder
- **1 day before**: Email reminder
- **On expiry**: 
  - App access blocked
  - Prompt to add payment method
  - Data preserved
  - Can reactivate anytime

---

### 9. Notifications Settings (`/components/screens/notifications-settings.tsx`)

**Purpose**: Configure notification preferences

#### Email Notifications:

##### **Business Events**:
- **New Quote Request**: Toggle
- **Quote Accepted**: Toggle
- **Quote Declined**: Toggle
- **Payment Received**: Toggle
- **Invoice Overdue**: Toggle (sends 1 day after due date)

##### **Team Events** (multi-user):
- **New Team Member Joined**: Toggle
- **Team Member Removed**: Toggle
- **Role Changed**: Toggle

##### **System Events**:
- **Weekly Summary**: Toggle (sent Monday mornings)
- **Monthly Report**: Toggle (sent 1st of month)

#### Push Notifications (future):
- Enable push notifications
- Configure per-event
- Requires native app

#### Reminder Settings:

##### **Quote Expiry Reminders**:
- **Days before expiry**: Slider (1-7 days)
- **Send to**: Email / Push / Both

##### **Invoice Overdue Reminders**:
- **Days after due date**: Slider (1-30 days)
- **Frequency**: Once / Weekly / Daily
- **Stop after**: X attempts

##### **Booking Reminders**:
- **Days before booking**: Slider (1-7 days)
- **Time of day**: Time picker

#### Quiet Hours:

- **Enable quiet hours**: Toggle
- **Start time**: e.g., 10:00 PM
- **End time**: e.g., 8:00 AM
- **Days**: Select days (default: all days)
- **Exceptions**: Urgent notifications still sent

---

## Analytics

### 10. Business Analytics (`/components/screens/business-analytics.tsx`)

**Purpose**: Insights into business performance

#### Overview Dashboard:

##### **Key Metrics** (top cards):
- **Total Revenue**: All-time earnings
- **This Month Revenue**: Current month
- **Outstanding**: Unpaid invoice total
- **Average Job Value**: Mean job value

#### Revenue Charts:

##### **Monthly Revenue Trend**:
- **Chart type**: Line or bar chart
- **Period**: Last 12 months
- **Data**: Revenue by month
- **Calculation**: Sum of paid invoices per month
- **Hover**: Show exact amount

##### **Revenue Breakdown**:
- **Chart type**: Pie chart
- **Categories**:
  - By client (top 5 + others)
  - By job type
  - By payment method
- **Percentages**: Show proportion

#### Job Analytics:

##### **Job Status Distribution**:
- **Chart type**: Donut chart
- **Categories**: Scheduled / In Progress / Completed / Cancelled
- **Count**: Number of jobs per status

##### **Job Timeline**:
- **Chart type**: Gantt chart or timeline
- **Shows**: All active jobs with duration
- **Color-coded**: By status
- **Interactive**: Click to view job

#### Invoice Analytics:

##### **Payment Status**:
- **Paid**: Count and total £
- **Partial**: Count and total £
- **Sent**: Count and total £
- **Overdue**: Count and total £ (highlighted in red)

##### **Average Payment Time**:
- Days between invoice sent and payment received
- Chart showing trend over time

##### **Top Clients by Revenue**:
- List of clients ranked by total paid
- Bar chart showing top 10

#### Quote Analytics:

##### **Acceptance Rate**:
- **Percentage**: Accepted / (Accepted + Declined)
- **Trend**: Over time
- **By client**: Acceptance rate per client

##### **Quote Value vs. Invoice Value**:
- Compare quoted amount to final invoiced amount
- Shows scope creep or variations

##### **Time to Decision**:
- Average days from quote sent to acceptance/decline

#### Time Period Selector:

- **This Week**: 7 days
- **This Month**: Current month
- **This Quarter**: Current quarter
- **This Year**: Current year
- **All Time**: Entire history
- **Custom Range**: Date range picker

#### Export Options:

- **Export as PDF**: Generate PDF report
- **Export as CSV**: Raw data export
- **Email Report**: Send report to email
- **Schedule**: Auto-send weekly/monthly (future)

#### Filters:

- **By client**: Show analytics for specific client
- **By team member**: Performance by member (multi-user)
- **By job type**: Filter to specific job categories
- **By status**: Include/exclude certain statuses

---

## System Actions

### 11. Sign Out

**Button**: Red button at bottom of Settings

#### Sign Out Process:
1. Click "Sign Out"
2. Confirmation modal:
   - "Are you sure you want to sign out?"
   - "Any unsaved changes will be lost"
3. Click "Sign Out" to confirm
4. **Actions**:
   - Clear session
   - Clear local storage (optional)
   - Navigate to Login screen
5. **Data preservation**: All saved data remains on server

#### Auto Sign Out:

- **Session expiry**: After 7 days of inactivity
- **Warning**: "Session expired, please sign in again"
- **Redirect**: To login screen
- **Data preserved**: No data loss

---

## Multi-User Permissions Summary

### Owner:
- ✅ All permissions
- ✅ Manage team (invite, remove, change roles)
- ✅ View activity log
- ✅ Manage subscription
- ✅ Edit business details, bank details, branding
- ✅ Delete organization

### Admin:
- ✅ Invite team members
- ✅ Remove members (not other admins)
- ✅ View activity log
- ✅ Edit business details, branding
- ❌ Cannot manage subscription
- ❌ Cannot edit bank details
- ❌ Cannot delete organization

### Member:
- ✅ Edit own profile
- ✅ View business details (read-only)
- ❌ Cannot invite team members
- ❌ Cannot view activity log
- ❌ Cannot edit business settings
- ❌ Cannot manage subscription

---

## Mobile Optimization

### Settings Navigation:
- **List view**: Vertical scrolling list
- **Grouped sections**: Clear visual separation
- **Icons**: Each setting has icon for quick recognition
- **Chevron indicators**: Shows sub-menus

### Forms:
- **Bottom sheet**: Forms slide up from bottom
- **Floating save button**: Always accessible
- **Auto-save**: Changes saved automatically where appropriate
- **Validation**: Inline error messages

---

## Data Management

### Autosave:
- Business Details: Every 30 seconds
- Bank Details: On blur
- Branding: Immediate
- Profile: On blur

### Validation:
- Real-time field validation
- Form-level validation on submit
- Server-side validation on save
- Clear error messages

### Loading States:
- Skeleton loaders for settings screens
- Save button shows spinner when saving
- Success toast on successful save
- Error toast on failure with retry option

---

## Related Documentation

- [HOME.md](./HOME.md) - Dashboard and quick access
- [CLIENTS.md](./CLIENTS.md) - Client and invoice branding
- [CALENDAR.md](./CALENDAR.md) - Booking and notification settings
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Login and security
- [MULTI_USER_ARCHITECTURE_EXPLANATION.md](./MULTI_USER_ARCHITECTURE_EXPLANATION.md) - Team system details
