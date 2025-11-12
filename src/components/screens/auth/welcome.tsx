import { CheckCircle2 } from "lucide-react";
import { Button } from "../../ui/button";
import { WorkBeamLogo } from "../../ui/workbeam-logo";

interface WelcomeProps {
  onNavigate: (screen: 'login' | 'signup') => void;
}

export function Welcome({ onNavigate }: WelcomeProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ 
      background: 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)'
    }}>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 min-h-0">
        {/* Logo Container with subtle animation */}
        <div className="mb-8 animate-in fade-in duration-500">
          <WorkBeamLogo variant="light" width={180} />
        </div>
        
        {/* Tagline */}
        <h1 
          className="text-center mb-12 max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ 
            color: '#6B7280',
            fontSize: '15px',
            lineHeight: '1.5',
            letterSpacing: '-0.01em'
          }}
        >
          Professional job management for tradesmen
        </h1>

        {/* Features List - Modern Card Style */}
        <div className="w-full max-w-sm space-y-4 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {[
            'Manage clients & jobs',
            'Create quotes & invoices',
            'Track payments',
            'Schedule bookings'
          ].map((feature, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 hover:bg-white/80"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'backwards'
              }}
            >
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: '#0A84FF'
                }}
              >
                <CheckCircle2 size={14} strokeWidth={2.5} style={{ color: '#FFFFFF' }} />
              </div>
              <span 
                className="trades-body"
                style={{ 
                  color: '#374151',
                  fontSize: '15px',
                  fontWeight: '500',
                  letterSpacing: '-0.01em'
                }}
              >
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons - Fixed Bottom */}
      <div className="flex-shrink-0 px-8 pb-10 space-y-3 safe-area-bottom animate-in fade-in slide-in-from-bottom-6 duration-700">
        <Button
          onClick={() => onNavigate('signup')}
          className="w-full h-14 rounded-2xl transition-all duration-200 active:scale-[0.98]"
          style={{ 
            background: '#0A84FF',
            fontSize: '17px',
            fontWeight: '600',
            letterSpacing: '-0.01em',
            boxShadow: '0 2px 12px rgba(10, 132, 255, 0.25)'
          }}
        >
          Create Account
        </Button>
        
        <Button
          onClick={() => onNavigate('login')}
          variant="outline"
          className="w-full h-14 rounded-2xl transition-all duration-200 active:scale-[0.98]"
          style={{ 
            fontSize: '17px',
            fontWeight: '600',
            letterSpacing: '-0.01em',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderColor: 'rgba(229, 231, 235, 0.8)',
            borderWidth: '1.5px'
          }}
        >
          Sign In
        </Button>
        
        <p 
          className="text-center pt-3"
          style={{ 
            color: '#9CA3AF',
            lineHeight: '1.5',
            fontSize: '12px',
            letterSpacing: '-0.01em'
          }}
        >
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
