# WorkBeam

**Professional job management app for tradesmen**

WorkBeam is a complete mobile-first web application designed specifically for tradespeople to manage their business operations, from quotes to invoices, client management, and team collaboration.

## 🎯 Overview

WorkBeam helps tradesmen run their business efficiently with:
- Client & job management
- Quote & variation builder
- Invoice generation with multiple templates
- Payment tracking
- Calendar & booking system
- Multi-user team management
- Business analytics
- Mobile-first design (390×844 iPhone optimized)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Stripe account (for subscriptions)
- Resend account (for emails)

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend (Supabase Edge Functions)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_URL=your_db_connection_string

# External Services
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
RESEND_API_KEY=your_resend_api_key

# App Configuration
APP_URL=https://your-domain.com
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy Supabase functions
cd supabase/functions
supabase functions deploy server
```

## 📱 Application Structure

WorkBeam is organized into 4 main sections:

### 1. **Home / Dashboard**
Central hub showing overview of business, recent activity, and quick actions.
[📖 View Documentation](./docs/HOME.md)

### 2. **Clients**
Complete client lifecycle management including jobs, quotes, variations, and invoices.
[📖 View Documentation](./docs/CLIENTS.md)

### 3. **Calendar**
Booking management and schedule visualization.
[📖 View Documentation](./docs/CALENDAR.md)

### 4. **Settings**
Business configuration, team management, subscriptions, and user profile.
[📖 View Documentation](./docs/SETTINGS.md)

## 🔐 Authentication & Multi-User

WorkBeam supports:
- Email/password authentication
- Organization-based multi-user access
- Role-based permissions (Owner, Admin, Member)
- Team invitations via email
- Activity tracking & audit logs

## 💳 Subscription Plans

- **1 User**: £24/month
- **3 Users**: £35/month  
- **6 Users**: £49/month

All plans include 14-day free trial.

## 🏗️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (Edge Functions, Auth, Storage)
- **Database**: Supabase KV Store
- **Payments**: Stripe
- **Email**: Resend
- **UI Components**: Shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **PDF Generation**: Custom generators

## 📂 Project Structure

```
/components
  /screens       - Main application screens
  /ui            - Reusable UI components
  /trades-ui     - Custom WorkBeam components
  /layout        - Layout wrappers
/supabase
  /functions
    /server      - Backend API endpoints
/utils           - Helper functions & contexts
/hooks           - Custom React hooks
/styles          - Global CSS & Tailwind config
/docs            - Documentation
/test            - Test suites
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "multi-user"
```

96 tests covering:
- Authentication flows
- Data isolation
- Multi-user scenarios
- Validation
- Autosave functionality
- Organization management

## 📖 Documentation

- [Home/Dashboard](./docs/HOME.md) - Dashboard features
- [Clients](./docs/CLIENTS.md) - Client & job management
- [Calendar](./docs/CALENDAR.md) - Booking system
- [Settings](./docs/SETTINGS.md) - Configuration & team

## 🚢 Deployment

### Vercel (Recommended for Web)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod

# Configure environment variables in Vercel dashboard
```

### Supabase Edge Functions

```bash
cd supabase/functions
supabase functions deploy server

# Set environment variables
supabase secrets set STRIPE_SECRET_KEY=your_key
supabase secrets set RESEND_API_KEY=your_key
supabase secrets set APP_URL=https://your-domain.com
```

## 🔧 Configuration

### Invoice Templates
6 professional templates available:
- Classic
- Modern
- Professional
- Corporate
- Creative
- Minimal

### Branding
Upload custom logo and set brand colors in Settings > Branding.

### Bank Details
Configure bank transfer information in Settings > Bank Details.

## 🌍 Localization

- Currency: £ (GBP)
- Date format: dd/mm/yyyy
- Optimized for UK tradespeople

## 📱 Mobile Support

- Designed for iPhone (390×844)
- Responsive for all mobile devices
- PWA-ready (Add to Home Screen)
- Touch-optimized interactions
- 8pt spacing grid for thumb-friendly UI

## 🔒 Security

- Row-level security (organization isolation)
- Encrypted sensitive data
- Secure API endpoints
- GDPR compliant data handling
- Role-based access control

## 🐛 Troubleshooting

For issues or questions, refer to the detailed documentation in the `/docs` folder.

## 📝 License

Proprietary - All rights reserved

## 🤝 Support

For issues or questions, refer to the detailed documentation in the `/docs` folder.

---

**WorkBeam** - Built for tradesmen, by people who understand the trades.
