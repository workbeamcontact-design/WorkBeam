# Clients

The **Clients** tab manages the complete customer lifecycle from initial contact through job completion, quotes, variations, invoicing, and payments.

## Overview

The Clients module is the core of WorkBeam's business operations, encompassing:
- Client contact management
- Job tracking and management
- Quote creation and approval
- Variation requests
- Invoice generation and payment tracking

---

## Main Screens

### 1. Clients List (`/components/screens/clients.tsx`)

**Purpose**: Directory of all clients with search and filtering

#### Features:
- **Search**: Real-time search by name, email, or phone
- **Sort options**: 
  - Alphabetical (A-Z)
  - Recent activity
  - Total value
- **Client cards** show:
  - Name
  - Phone number (tap to call)
  - Email (tap to email)
  - Total jobs count
  - Total value (£)
  - Last activity date

#### Actions:
- **Tap card**: Opens Client Detail
- **+ button (FAB)**: Opens New Client screen
- **Search icon**: Toggles search bar
- **Filter icon**: Opens sort/filter options

#### Empty State:
- Illustration with "No clients yet"
- "Add your first client to get started"
- "Add Client" button

---

### 2. Client Detail (`/components/screens/client-detail.tsx`)

**Purpose**: Complete view of client information and associated activities

#### Header Section:
- Client name
- Contact information (phone, email)
- Address
- Edit button (opens Edit Client)

#### Tabs:

##### **Overview Tab**:
- **Statistics**:
  - Total jobs
  - Active jobs  
  - Completed jobs
  - Total value
  - Outstanding balance

- **Contact Quick Actions**:
  - Call client (phone icon)
  - Email client (email icon)
  - WhatsApp client (if phone provided)

- **Recent Activity Feed**:
  - Last 10 interactions
  - Timestamps
  - Activity types (job created, quote sent, payment received, etc.)

##### **Jobs Tab**:
- List of all jobs for this client
- Filtered view with status badges
- Tap to open Job Detail
- "New Job" button

##### **Quotes Tab**:
- All quotes for this client
- Status indicators (pending, accepted, declined, expired)
- Values and dates
- Tap to open Quote Detail
- "New Quote" button

##### **Invoices Tab**:
- All invoices for this client
- Payment status (paid, partial, sent, overdue)
- Outstanding amounts
- Tap to open Invoice Detail
- "New Invoice" button

#### Actions:
- **Edit Client**: Opens Edit Client screen
- **Delete Client**: Confirmation dialog (only if no associated jobs)
- **New Job**: Quick create job for this client
- **New Quote**: Quick create quote for this client

---

### 3. New Client (`/components/screens/new-client.tsx`)

**Purpose**: Add new client to the system

#### Form Fields:
- **Name*** (required)
- **Phone Number*** (required)
  - Country code selector (defaults to UK +44)
  - Format validation
- **Email*** (required)
  - Email validation
- **Address** (optional)
  - Street
  - City
  - Postcode
- **Notes** (optional)
  - Free text area for additional information

#### Validation:
- Name: Minimum 2 characters
- Phone: Valid UK mobile (10-11 digits)
- Email: Valid email format
- All required fields must be filled

#### Actions:
- **Save**: Creates client and navigates to Client Detail
- **Cancel**: Returns to previous screen with confirmation if changes made

#### Features:
- Auto-save draft to local storage
- Duplicate detection (warns if name/phone exists)
- Phone formatting on blur

---

### 4. Edit Client (`/components/screens/edit-client.tsx`)

**Purpose**: Update existing client information

#### Same form as New Client but:
- Pre-populated with existing data
- "Update" button instead of "Save"
- Delete option available
- Shows last updated timestamp

#### Additional Actions:
- **Delete Client**: 
  - Only available if no associated jobs
  - Requires confirmation
  - Cascades to quotes/invoices if configured

---

## Jobs Management

### 5. Job List (`/components/screens/job-list.tsx`)

**Purpose**: View and filter all jobs across clients

#### Features:
- **Filter by status**:
  - All
  - Scheduled
  - In Progress
  - Completed
  - Cancelled

- **Sort options**:
  - Start date
  - Client name
  - Job value
  - Status

- **Job cards show**:
  - Client name
  - Job title
  - Status badge
  - Location
  - Start date
  - Value
  - Progress indicator

#### Actions:
- **Tap card**: Opens Job Detail
- **+ FAB**: Opens New Job
- **Filter toggle**: Shows filter options

---

### 6. Job Detail (`/components/screens/job-detail.tsx`)

**Purpose**: Complete job information and management

#### Information Displayed:
- **Header**:
  - Job title
  - Client name (tap to view client)
  - Status badge
  - Edit button

- **Details**:
  - Job type (Installation, Repair, Maintenance, Custom)
  - Location (full address)
  - Start date
  - End date (if completed)
  - Value (£)
  - Description/notes

- **Related Items**:
  - Associated quotes (list)
  - Associated variations (list)
  - Generated invoices (list)
  - Payment status

- **Progress Tracking**:
  - Status timeline
  - Key milestones
  - Completion percentage

#### Actions:
- **Edit Job**: Opens edit mode
- **Change Status**: 
  - Scheduled → In Progress → Completed
  - Can mark as Cancelled
- **Create Quote**: Generate quote for this job
- **Create Variation**: Add variation to job
- **Generate Invoice**: Create invoice from job
- **Add Notes**: Timestamped notes log

#### Status Flow:
```
Scheduled → In Progress → Completed
     ↓           ↓
  Cancelled   Cancelled
```

---

### 7. New Job (`/components/screens/new-job.tsx`)

**Purpose**: Create new job

#### Form Fields:
- **Client*** (required)
  - Dropdown of existing clients
  - "Add new client" option
- **Job Title*** (required)
- **Job Type*** (required)
  - Installation
  - Repair  
  - Maintenance
  - Renovation
  - Custom
- **Location*** (required)
  - Can use client address
  - Or enter custom location
- **Start Date*** (required)
  - Date picker
- **Estimated Value** (optional)
  - £ amount
- **Description** (optional)
  - Detailed job scope

#### Features:
- Auto-populate location from client address
- Estimated value helps with quote generation
- Description supports multi-line text
- Validation on all required fields

#### Actions:
- **Save**: Creates job and navigates to Job Detail
- **Save & Create Quote**: Creates job then opens Quote Builder
- **Cancel**: Discards changes with confirmation

---

## Quotes & Variations

### 8. Quote List (`/components/screens/quote-list.tsx`)

**Purpose**: View all quotes across all clients

#### Features:
- **Filter by status**:
  - All
  - Pending (awaiting client decision)
  - Accepted
  - Declined
  - Expired

- **Quote cards show**:
  - Quote number (Q-001, Q-002, etc.)
  - Client name
  - Job title
  - Total value
  - Status badge
  - Created date
  - Expiry date (if applicable)
  - Expiry warning (amber if <7 days)

#### Actions:
- **Tap card**: Opens Quote Detail
- **+ FAB**: Opens Quote Builder
- **Search**: Filter by client or quote number

---

### 9. Quote Builder (`/components/screens/quote-builder.tsx`)

**Purpose**: Create detailed quotes with line items

#### Form Sections:

##### **Basic Information**:
- **Client*** (required)
  - Select from dropdown
- **Job*** (optional but recommended)
  - Select existing job or create new
- **Quote Title*** (required)
- **Valid Until** (optional)
  - Date picker for expiry

##### **Line Items**:
Dynamic list of quote items, each with:
- **Description*** (required)
- **Quantity*** (required)
- **Unit Price*** (required, £)
- **Total** (auto-calculated: quantity × price)
- **Delete button**

Actions:
- **Add Item**: Adds new line item row
- **Remove Item**: Deletes line item
- **Reorder**: Drag to reorder (optional)

##### **Pricing**:
- **Subtotal**: Sum of all line items (auto-calculated)
- **VAT**: Percentage selector (0%, 5%, 20%)
- **VAT Amount**: Auto-calculated
- **Total**: Subtotal + VAT

##### **Additional Details**:
- **Terms & Conditions** (optional)
  - Multi-line text
  - Saved as template for future quotes
- **Notes** (optional)
  - Internal notes (not shown to client)
- **Payment Terms** (optional)
  - e.g., "50% deposit, 50% on completion"

#### Features:
- **Auto-save**: Drafts saved every 30 seconds
- **Templates**: Save common items for reuse
- **Calculations**: Real-time totals
- **Validation**: Ensures all required fields filled
- **Preview**: See client-facing view before sending

#### Actions:
- **Save Draft**: Saves quote without sending
- **Send to Client**: 
  - Generates unique approval link
  - Sends email with quote PDF
  - Status changes to "Pending"
- **Preview**: Opens Quote Preview screen
- **Cancel**: Discards with confirmation

---

### 10. Quote Detail (`/components/screens/quote-detail.tsx`)

**Purpose**: View and manage existing quote

#### Information Displayed:
- Quote number
- Client details
- Job details (if linked)
- All line items with pricing
- Subtotal, VAT, Total
- Status
- Created date
- Sent date (if sent)
- Accepted/Declined date (if decided)
- Expiry date
- Client decision notes (if provided)

#### Actions Based on Status:

**If Draft**:
- Edit quote
- Delete quote
- Send to client

**If Pending**:
- View approval status
- Resend to client
- Mark as accepted (manual)
- Mark as declined (manual)
- Edit (creates new version)
- Convert to invoice

**If Accepted**:
- Convert to invoice
- Create variation
- Download PDF
- View history

**If Declined**:
- View reason (if provided)
- Create revised quote
- Archive

**If Expired**:
- Extend expiry
- Create new quote
- Archive

#### Features:
- **Public approval link**: `https://yourdomain.com/public/quote-approval/:token`
- **Email preview**: Shows what client received
- **PDF download**: Professional quote PDF
- **WhatsApp sharing**: Share approval link via WhatsApp
- **Activity log**: All status changes and actions

---

### 11. Quote Preview (`/components/screens/quote-preview.tsx`)

**Purpose**: Client-facing view of quote before sending

Shows exactly what client will see:
- Your business logo and details (from Settings > Branding)
- Quote number and date
- Client details
- "Quote For" job/project title
- Itemized line items table
- Subtotal, VAT breakdown, Total
- Payment terms
- Terms & conditions
- Valid until date

#### Actions:
- **Back to Edit**: Return to Quote Builder
- **Send to Client**: Finalizes and sends
- **Download PDF**: Generate PDF for manual sharing

---

### 12. Variation Builder (`/components/screens/variation-builder.tsx`)

**Purpose**: Create change orders for existing jobs

#### Similar to Quote Builder but:
- **Linked to existing job*** (required)
- **Variation Number**: Auto-generated (V-001, V-002, etc.)
- **Reason for Variation**: Text field explaining change
- **Original Quote Reference**: Links to base quote
- **Impact**:
  - Additional cost (+£)
  - Cost reduction (-£)
  - Time extension (+days)

#### Line Items:
- Shows **original scope** (view-only)
- **Changed items** (highlighted)
- **New items** (marked as additions)
- **Removed items** (struck through)

#### Approval Flow:
Same as quotes:
1. Create variation
2. Send to client for approval
3. Client approves/declines via link
4. Update job value and scope accordingly

---

## Public Quote/Variation Approval

### 13. Quote Approval Page (`/components/screens/public/quote-approval.tsx`)

**Purpose**: Public-facing page for clients to approve quotes

**URL**: `/public/quote-approval/:token`

#### Client View:
- Business branding (logo, colors)
- Quote details (read-only)
- All line items
- Total amount
- Valid until date
- Terms & conditions

#### Client Actions:
- **Accept Quote**:
  - Click "Accept" button
  - Optional: Add acceptance notes
  - Confirmation message
  - Email sent to business owner
  - Status updates to "Accepted"

- **Decline Quote**:
  - Click "Decline" button
  - Required: Reason for declining
  - Confirmation message
  - Email sent to business owner
  - Status updates to "Declined"

#### Security:
- Unique token per quote (UUID)
- Token expires after quote expiry date
- No authentication required
- Read-only access (can't modify quote)

### 14. Variation Approval Page (`/components/screens/public/variation-approval.tsx`)

Same as Quote Approval but for variations:
- Shows original scope vs. new scope
- Highlights changes
- Client approves additional costs/time
- Updates linked job when approved

---

## Invoices

### 15. Invoice List (`/components/screens/invoice-list.tsx`)

**Purpose**: View all invoices and payment status

#### Features:
- **Filter by status**:
  - All
  - Draft
  - Sent
  - Paid
  - Partial (partially paid)
  - Overdue

- **Invoice cards show**:
  - Invoice number (INV-001, INV-002, etc.)
  - Client name
  - Job title
  - Total amount
  - Paid amount (if partial)
  - Outstanding amount
  - Due date
  - Status badge (color-coded)
  - Overdue warning (red if past due)

#### Actions:
- **Tap card**: Opens Invoice Detail
- **+ FAB**: Opens Generate Invoice screen
- **Filter**: Toggle status filters
- **Search**: Find by client or invoice number

---

### 16. Generate Invoice (`/components/screens/generate-invoice.tsx`)

**Purpose**: Create invoices from jobs/quotes

#### Form Sections:

##### **Basic Info**:
- **Client*** (required) - Select or auto-populate from job
- **Job** (optional) - Link to job
- **Invoice Number**: Auto-generated or custom
- **Invoice Date**: Defaults to today
- **Due Date**: Defaults to 30 days from invoice date
- **Payment Terms**: Text field (e.g., "Net 30")

##### **Line Items**:
Can:
- **Import from Quote**: Pulls all line items from accepted quote
- **Import from Job**: Uses job value
- **Manual Entry**: Add custom line items
  - Description
  - Quantity
  - Unit price
  - Total

##### **Pricing**:
- Subtotal (auto-calculated)
- VAT rate (0%, 5%, 20%)
- VAT amount
- **Total Amount**

##### **Payment Details**:
- **Bank Transfer Details**: 
  - Auto-populate from Settings > Bank Details
  - Account name, sort code, account number
  - Reference (auto-generated or custom)

- **Payment Instructions**: Custom text

##### **Additional**:
- **Notes**: Visible to client
- **Terms**: Payment terms and conditions
- **Template**: Choose invoice template (6 options)

#### Actions:
- **Save Draft**: Saves without sending
- **Save & Send**: 
  - Sends email to client
  - Attaches PDF invoice
  - Status changes to "Sent"
- **Preview**: View invoice before sending
- **Cancel**: Discard changes

---

### 17. Invoice Detail (`/components/screens/invoice-detail.tsx`)

**Purpose**: View and manage invoice

#### Information Displayed:
- Invoice number
- Client details
- Job details (if linked)
- Invoice date
- Due date
- Payment status
- All line items
- Subtotal, VAT, Total
- Amount paid (if partial)
- Outstanding balance
- Payment history (list of payments)
- Bank transfer details

#### Actions Based on Status:

**If Draft**:
- Edit invoice
- Delete invoice
- Send to client

**If Sent**:
- Mark as paid
- Record partial payment
- Send reminder
- Download PDF
- Share via WhatsApp/email
- Edit (creates new version)

**If Paid**:
- View payment details
- Download PDF
- Download receipt
- Void invoice (with reason)

**If Partial**:
- Record additional payment
- Send payment reminder
- View payment history
- Download PDF

**If Overdue**:
- Send overdue reminder
- Record payment
- Apply late fees (optional)
- Mark as written off

#### Features:
- **Public view link**: `https://yourdomain.com/public/invoice-view/:token`
- **PDF download**: Multiple template options
- **Email**: Send/resend invoice
- **WhatsApp**: Share invoice link
- **Payment reminder**: Auto or manual
- **Payment tracking**: Full history of payments

---

### 18. Invoice Templates (`/components/screens/invoice-templates.tsx`)

**Purpose**: Choose and preview invoice template styles

#### Available Templates:
1. **Classic**: Traditional layout, formal
2. **Modern**: Clean, minimal design
3. **Professional**: Corporate style
4. **Corporate**: Structured, detailed
5. **Creative**: Colorful, unique
6. **Minimal**: Simple, clean lines

Each template includes:
- Your business logo and branding
- Client "Bill To" section
- Itemized line items table
- Subtotal, VAT, Total
- Bank transfer section
- Payment terms
- Notes section

#### Preview Mode:
- Live preview with sample data
- Switch between templates
- See how your branding appears
- Select default template

#### Actions:
- **Select Template**: Sets as default for new invoices
- **Preview with Real Data**: Use actual invoice
- **Customize**: Adjust colors to match branding

---

### 19. Invoice Template Preview (`/components/screens/invoice-template-preview.tsx`)

**Purpose**: Full-screen preview of selected template with real data

Shows:
- A4 page layout (210mm × 297mm)
- Zoom controls
- Pan/scroll for detail viewing
- Page numbers (if multi-page)

Actions:
- **Download PDF**: Generate PDF of invoice
- **Print**: Browser print dialog
- **Share**: Email or WhatsApp
- **Edit**: Return to invoice edit

---

## Payment Management

### 20. Record Payment (`/components/screens/record-payment.tsx`)

**Purpose**: Quick payment recording for any invoice

#### Form Fields:
- **Invoice*** (required)
  - Dropdown of unpaid/partial invoices
  - Shows outstanding balance
- **Amount*** (required)
  - £ input
  - Validation: Cannot exceed outstanding
- **Payment Date*** (required)
  - Date picker
  - Defaults to today
- **Payment Method*** (required)
  - Bank Transfer
  - Cash
  - Cheque
  - Card
  - Other
- **Reference** (optional)
  - Transaction ID, cheque number, etc.
- **Notes** (optional)

#### Features:
- **Auto-calculation**: Shows new outstanding balance
- **Full payment shortcut**: "Pay in full" button
- **Recent invoices**: Quick access to recent unpaid
- **Validation**: Prevents overpayment

#### Actions:
- **Record Payment**: 
  - Saves payment record
  - Updates invoice status (partial or paid)
  - Shows confirmation toast
  - Returns to previous screen
- **Cancel**: Discards entry

---

### 21. Payment Recorder (`/components/screens/payment-recorder.tsx`)

**Purpose**: Advanced payment recording with additional features

#### Extended Features:
- **Multiple payments**: Record several payments at once
- **Payment splitting**: Split payment across multiple invoices
- **Recurring payments**: Set up payment plans
- **Late fees**: Automatically calculate late fees
- **Payment reminders**: Schedule reminder emails

#### Same fields as Record Payment plus:
- **Allocate to Multiple Invoices**: Checkbox
  - If enabled, shows all unpaid invoices
  - Enter amount for each
  - Must total payment amount
- **Send Receipt**: Checkbox to email receipt to client

---

## Public Invoice View

### 22. Invoice View (Public) (`/components/screens/public/invoice-view.tsx`)

**Purpose**: Client-facing view of invoice

**URL**: `/public/invoice-view/:token`

#### Client View:
- Business branding
- Invoice details (read-only)
- All line items
- Total amount due
- Amount paid (if partial)
- Outstanding balance
- Due date
- Bank transfer details
- Payment instructions

#### Client Actions:
- **Download PDF**: Download invoice
- **Print**: Print invoice
- **Contact Business**: Email or phone link

#### Security:
- Unique token per invoice
- No authentication required
- Read-only access
- Token doesn't expire (for record keeping)

---

## Data Relationships

### Client → Jobs → Quotes/Invoices Flow:
```
Client
  └── Job(s)
       ├── Quote(s)
       │    └── Variation(s)
       │         └── Invoice
       └── Invoice(s)
```

### Key Relationships:
- **Client** has many **Jobs**
- **Job** has many **Quotes**
- **Quote** can have many **Variations**
- **Quote** or **Variation** can generate **Invoice**
- **Job** can have many **Invoices**
- **Invoice** has many **Payments**

---

## Search & Filtering

All list screens support:
- **Text search**: Name, email, phone, title
- **Status filtering**: Multi-select
- **Date range**: Filter by created/updated date
- **Value range**: Filter by amount
- **Sort options**: Multiple criteria

---

## Bulk Actions

Available on list screens:
- **Select multiple**: Checkbox mode
- **Bulk delete**: Delete selected (with confirmation)
- **Bulk status update**: Change status of multiple items
- **Bulk export**: Export selected as CSV

---

## Mobile Optimization

- **Swipe actions**: Swipe left on cards for quick actions (delete, edit)
- **Pull to refresh**: Refresh data by pulling down
- **Infinite scroll**: Load more items as you scroll
- **Touch-friendly**: 44pt minimum tap targets
- **Bottom sheet**: Forms slide up from bottom on mobile

---

## Permissions (Multi-User)

### Owner:
- Full access to all features
- Can delete clients, jobs, quotes, invoices
- Can void invoices

### Admin:
- Create/edit clients, jobs, quotes, invoices
- Record payments
- Cannot delete clients with history
- Cannot void invoices

### Member:
- View all clients, jobs, quotes, invoices
- Create quotes and jobs
- Cannot delete
- Cannot edit invoices
- Cannot record payments

---

## Related Documentation

- [HOME.md](./HOME.md) - Dashboard overview
- [CALENDAR.md](./CALENDAR.md) - Booking management
- [SETTINGS.md](./SETTINGS.md) - Business details, bank info, branding
