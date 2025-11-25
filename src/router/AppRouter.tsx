import React, { Suspense, memo } from 'react';
import { EnhancedErrorBoundary } from '../components/ui/enhanced-error-boundary';
import { useAppStore, Screen } from '../hooks/useAppStore';
import { useNavigationTracking } from '../hooks/usePerformanceTracking';

// Lazy load all screens for better performance
const Dashboard = React.lazy(() => import('../components/screens/dashboard-clean').then(m => ({ default: m.DashboardClean })));
const Clients = React.lazy(() => import('../components/screens/clients').then(m => ({ default: m.Clients })));
const Calendar = React.lazy(() => import('../components/screens/calendar').then(m => ({ default: m.Calendar })));
const Settings = React.lazy(() => import('../components/screens/settings').then(m => ({ default: m.Settings })));

// Secondary screens
const ClientDetail = React.lazy(() => import('../components/screens/client-detail').then(m => ({ default: m.ClientDetail })));
const JobDetail = React.lazy(() => import('../components/screens/job-detail').then(m => ({ default: m.JobDetail })));
const QuoteBuilder = React.lazy(() => import('../components/screens/quote-builder').then(m => ({ default: m.QuoteBuilder })));
const QuoteDetail = React.lazy(() => import('../components/screens/quote-detail').then(m => ({ default: m.QuoteDetail })));
const QuoteList = React.lazy(() => import('../components/screens/quote-list').then(m => ({ default: m.QuoteList })));
const VariationBuilder = React.lazy(() => import('../components/screens/variation-builder').then(m => ({ default: m.VariationBuilder })));
const PaymentRecorder = React.lazy(() => import('../components/screens/payment-recorder').then(m => ({ default: m.PaymentRecorder })));
const AddBooking = React.lazy(() => import('../components/screens/add-booking').then(m => ({ default: m.AddBooking })));
const JobList = React.lazy(() => import('../components/screens/job-list').then(m => ({ default: m.JobList })));
const NewClient = React.lazy(() => import('../components/screens/new-client').then(m => ({ default: m.NewClient })));
const EditClient = React.lazy(() => import('../components/screens/edit-client').then(m => ({ default: m.EditClient })));
const NewJob = React.lazy(() => import('../components/screens/new-job').then(m => ({ default: m.NewJob })));
const BookingDetail = React.lazy(() => import('../components/screens/booking-detail-redesigned').then(m => ({ default: m.BookingDetailRedesigned })));

// Invoice screens
const GenerateInvoice = React.lazy(() => import('../components/screens/generate-invoice').then(m => ({ default: m.GenerateInvoice })));
const InvoiceDetail = React.lazy(() => import('../components/screens/invoice-detail').then(m => ({ default: m.InvoiceDetail })));
const InvoiceList = React.lazy(() => import('../components/screens/invoice-list').then(m => ({ default: m.InvoiceList })));
const RecordPayment = React.lazy(() => import('../components/screens/record-payment').then(m => ({ default: m.RecordPayment })));

// Public screens
const QuoteApproval = React.lazy(() => import('../components/screens/public/quote-approval').then(m => ({ default: m.QuoteApproval })));
const VariationApproval = React.lazy(() => import('../components/screens/public/variation-approval').then(m => ({ default: m.VariationApproval })));

// Settings screens
const ProfileEdit = React.lazy(() => import('../components/screens/profile-edit').then(m => ({ default: m.ProfileEdit })));
const BrandingLogo = React.lazy(() => import('../components/screens/branding-logo').then(m => ({ default: m.BrandingLogo })));
const InvoiceTemplates = React.lazy(() => import('../components/screens/invoice-templates').then(m => ({ default: m.InvoiceTemplates })));
const InvoiceTemplatePreview = React.lazy(() => import('../components/screens/invoice-template-preview').then(m => ({ default: m.InvoiceTemplatePreview })));
const BusinessDetails = React.lazy(() => import('../components/screens/business-details').then(m => ({ default: m.BusinessDetails })));
const BankDetails = React.lazy(() => import('../components/screens/bank-details').then(m => ({ default: m.BankDetails })));
const NotificationsSettings = React.lazy(() => import('../components/screens/notifications-settings').then(m => ({ default: m.NotificationsSettings })));
const Subscription = React.lazy(() => import('../components/screens/subscription').then(m => ({ default: m.Subscription })));

// Analytics screens
const BusinessAnalytics = React.lazy(() => import('../components/screens/business-analytics').then(m => ({ default: m.BusinessAnalytics })));

// Team Management screens (Phase 3b + 4b)
const TeamManagement = React.lazy(() => import('../components/screens/team-management'));
const InviteMember = React.lazy(() => import('../components/screens/invite-member'));
const AcceptInvitation = React.lazy(() => import('../components/screens/public/accept-invitation'));
const ActivityLog = React.lazy(() => import('../components/screens/activity-log'));

/**
 * Loading fallback component
 */
const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full bg-gray-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="trades-caption text-gray-600">Loading...</p>
    </div>
  </div>
);

/**
 * Error fallback for data-dependent screens
 */
const ErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 text-center">
    <h2 className="trades-h2 text-gray-900 mb-4">Something went wrong</h2>
    <p className="trades-body text-gray-600 mb-6">
      We couldn't load this page. The data might be missing or invalid.
    </p>
    <button
      onClick={onRetry}
      className="bg-primary text-primary-foreground px-6 py-3 rounded-xl trades-body hover:bg-primary/90 transition-colors"
    >
      Go to Dashboard
    </button>
  </div>
);

/**
 * Stub screen for unimplemented features
 */
const StubScreen: React.FC<{ screen: string; onBack: () => void }> = ({ screen, onBack }) => (
  <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 text-center">
    <h2 className="trades-h2 text-gray-900 mb-4">
      {screen === 'stub-calling' && 'Calling...'}
      {screen === 'stub-whatsapp' && 'WhatsApp...'}
      {screen === 'stub-sms' && 'SMS...'}
      {screen === 'stub-maps' && 'Maps route'}
    </h2>
    <p className="trades-body text-gray-600 mb-6">
      This would open the native {screen.replace('stub-', '')} app.
    </p>
    <button
      onClick={onBack}
      className="bg-primary text-primary-foreground px-6 py-3 rounded-xl trades-body hover:bg-primary/90 transition-colors"
    >
      Go Back
    </button>
  </div>
);

/**
 * Main app router component
 */
export const AppRouter: React.FC = memo(() => {
  const { navigation, navigate, goBack, refreshCalendar, dashboardRefreshKey } = useAppStore();
  const { screen, data } = navigation;

  // Track navigation performance safely
  useNavigationTracking(screen);

  const handleNavigate = (newScreen: Screen, newData?: any) => {
    navigate(newScreen, newData);
  };

  const handleBack = () => {
    goBack();
  };

  const renderScreen = () => {
    // Helper to wrap screens that require data with error boundaries
    const renderWithErrorBoundary = (component: React.ReactNode) => (
      <EnhancedErrorBoundary
        fallback={<ErrorFallback onRetry={() => navigate('dashboard')} />}
      >
        {component}
      </EnhancedErrorBoundary>
    );

    switch (screen) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} refreshKey={dashboardRefreshKey} />;
        
      case 'clients':
        return <Clients onNavigate={handleNavigate} />;
        
      case 'calendar':
        return <Calendar onNavigate={handleNavigate} refreshKey={0} />;
        
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
        
      case 'business-analytics':
        return <BusinessAnalytics onNavigate={handleNavigate} onBack={handleBack} />;
        
      case 'client-detail':
        return renderWithErrorBoundary(
          <ClientDetail client={data} onNavigate={handleNavigate} onBack={handleBack} />
        );
        
      case 'job-detail':
        return renderWithErrorBoundary(
          <JobDetail job={data} onNavigate={handleNavigate} onBack={handleBack} />
        );

      case 'job-list':
        return <JobList 
          filter={data} 
          onNavigate={handleNavigate} 
          onBack={handleBack} 
          clientId={data?.clientId}
          clientName={data?.clientName}
        />;

      case 'quote-list':
        return <QuoteList 
          filter={data} 
          onNavigate={handleNavigate} 
          onBack={handleBack} 
          clientId={data?.clientId}
          clientName={data?.clientName}
        />;
        
      case 'quote-builder':
        return renderWithErrorBoundary(
          <QuoteBuilder job={data} onNavigate={handleNavigate} onBack={handleBack} />
        );
        
      case 'quote-detail':
        return renderWithErrorBoundary(
          <QuoteDetail quote={data} onNavigate={handleNavigate} onBack={handleBack} />
        );
        
      case 'variation-builder':
        return renderWithErrorBoundary(
          <VariationBuilder job={data} onNavigate={handleNavigate} onBack={handleBack} />
        );

      case 'quote-approval':
        return renderWithErrorBoundary(
          <QuoteApproval quote={data} onNavigate={handleNavigate} />
        );
        
      case 'variation-approval':
        return renderWithErrorBoundary(
          <VariationApproval variation={data} onNavigate={handleNavigate} />
        );
        
      case 'payment-recorder':
        return renderWithErrorBoundary(
          <PaymentRecorder job={data} onNavigate={handleNavigate} onBack={handleBack} />
        );

      case 'add-booking':
        return <AddBooking initialData={data} onNavigate={handleNavigate} onBack={handleBack} onBookingCreated={refreshCalendar} />;

      case 'new-client':
        return <NewClient onNavigate={handleNavigate} onBack={handleBack} />;

      case 'edit-client':
        return <EditClient client={data} onNavigate={handleNavigate} onBack={handleBack} />;

      case 'new-job':
        return <NewJob client={data} onNavigate={handleNavigate} onBack={handleBack} />;

      case 'booking-detail':
        return renderWithErrorBoundary(
          <BookingDetail booking={data} onNavigate={handleNavigate} onBack={handleBack} />
        );

      case 'generate-invoice':
        return renderWithErrorBoundary(
          <GenerateInvoice job={data} onNavigate={handleNavigate} onBack={handleBack} />
        );

      case 'invoice-detail':
        return renderWithErrorBoundary(
          <InvoiceDetail invoice={data} onNavigate={handleNavigate} onBack={handleBack} />
        );

      case 'invoice-list':
        return <InvoiceList 
          onNavigate={handleNavigate} 
          onBack={handleBack} 
          client={data?.client}
          clientId={data?.clientId}
          clientName={data?.clientName}
        />;

      case 'record-payment':
        return renderWithErrorBoundary(
          <RecordPayment invoice={data} onNavigate={handleNavigate} onBack={handleBack} />
        );

      case 'profile-edit':
        return <ProfileEdit onNavigate={handleNavigate} />;

      case 'branding-logo':
        return <BrandingLogo onNavigate={handleNavigate} onBack={handleBack} />;

      case 'invoice-templates':
        return <InvoiceTemplates onNavigate={handleNavigate} onBack={handleBack} />;

      case 'invoice-template-preview':
        return <InvoiceTemplatePreview template={data} onNavigate={handleNavigate} onBack={handleBack} />;

      case 'business-details':
        return <BusinessDetails onNavigate={handleNavigate} onBack={handleBack} />;

      case 'bank-details':
        return <BankDetails onNavigate={handleNavigate} onBack={handleBack} />;

      case 'notifications-settings':
        return <NotificationsSettings onNavigate={handleNavigate} onBack={handleBack} />;

      case 'subscription':
        return <Subscription onBack={handleBack} />;
      
      // Team Management (Phase 3b + 4b)
      case 'team-management':
        return <TeamManagement />;
      
      case 'invite-member':
        return <InviteMember />;
      
      case 'accept-invitation':
        return <AcceptInvitation token={data?.token || ''} />;
      
      case 'activity-log':
        return <ActivityLog />;

      case 'stub-calling':
      case 'stub-whatsapp':
      case 'stub-sms':
      case 'stub-maps':
        return <StubScreen screen={screen} onBack={handleBack} />;
        
      default:
        // Fallback for unimplemented screens
        return (
          <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 text-center">
            <h2 className="trades-h2 text-gray-900 mb-4">Coming Soon</h2>
            <p className="trades-body text-gray-600 mb-6">
              The "{screen}" screen is under development.
            </p>
            <button
              onClick={handleBack}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl trades-body hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </div>
        );
    }
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      <EnhancedErrorBoundary>
        {renderScreen()}
      </EnhancedErrorBoundary>
    </Suspense>
  );
});

AppRouter.displayName = 'AppRouter';