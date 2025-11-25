import { Building, CreditCard, FileText, Bell, ChevronRight, Palette, User as UserIcon, Zap, Users } from "lucide-react";
import { ScreenLayout } from "../ui/screen-layout";
import { useAuth } from "../../utils/auth-context";
import { useOrganizationContext } from "../../utils/organization-context";
import { usePermissions } from "../../hooks/usePermissions";

interface SettingsProps {
  onNavigate: (screen: string, data?: any) => void;
}

export function Settings({ onNavigate }: SettingsProps) {
  const { user } = useAuth();
  const { organization } = useOrganizationContext();
  const permissions = usePermissions();
  
  // Show team section if multi-user plan
  const showTeamSection = organization && organization.max_seats > 1 && permissions.canViewMembers;
  
  const settingsGroups = [
    {
      title: "Account",
      iconColor: '#10B981',
      iconBg: '#D1FAE5',
      items: [
        {
          id: "profile-edit",
          label: "Profile",
          description: "Email, password, and account",
          helper: "Manage your email address and password",
          icon: UserIcon
        },
        {
          id: "subscription",
          label: "Subscription",
          description: "Manage your plan and billing",
          helper: "View your current plan and manage billing",
          icon: Zap
        }
      ]
    },
    // Team section - conditionally included
    ...(showTeamSection ? [{
      title: "Team",
      iconColor: '#0A84FF',
      iconBg: '#EFF6FF',
      items: [
        {
          id: "team-management",
          label: "Team Members",
          description: organization 
            ? `${organization.current_seats} of ${organization.max_seats} seats used`
            : "Manage your team members",
          helper: "Invite and manage your team members",
          icon: Users
        }
      ]
    }] : []),
    {
      title: "Business",
      iconColor: '#0A84FF',
      iconBg: '#EFF6FF',
      items: [
        {
          id: "branding-logo",
          label: "Branding & Logo",
          description: "Company logo and colors",
          helper: "Upload your company logo and set brand colors",
          icon: Palette
        },
        {
          id: "business-details",
          label: "Business Details",
          description: "Company name, contact info",
          helper: "Set your business name, address and contact details",
          icon: Building
        },
        {
          id: "bank-details", 
          label: "Bank Details",
          description: "Account details for invoices",
          helper: "Bank account information for client payments",
          icon: CreditCard
        }
      ]
    },

    {
      title: "Invoice Settings",
      iconColor: '#F59E0B',
      iconBg: '#FFF7E6',
      items: [
        {
          id: "invoice-templates",
          label: "Invoice Templates",
          description: "Choose your invoice design",
          helper: "Select from professional invoice templates",
          icon: FileText
        }
      ]
    },
    {
      title: "Notifications",
      iconColor: '#A855F7',
      iconBg: '#F3E8FF',
      items: [
        {
          id: "notifications-settings",
          label: "Notifications",
          description: "Push alerts and email summaries",
          helper: "Manage how you receive updates about quotes, payments, and schedules",
          icon: Bell
        }
      ]
    }
  ];

  return (
    <ScreenLayout title="Settings" showNavSpacing={true}>
      <div className="px-4 pt-4 space-y-6">
          {settingsGroups.map((group, groupIndex) => (
            <div key={group.title} style={{ marginBottom: groupIndex < settingsGroups.length - 1 ? '24px' : '0' }}>
              {/* Section Title */}
              <h2 className="trades-h2 mb-4 px-1" style={{ color: '#111827' }}>{group.title}</h2>
              
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                {group.items.map((item, index) => (
                  <div key={item.id}>
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-3 p-3 min-h-[44px] hover:bg-gray-50 transition-colors text-left ${
                        index < group.items.length - 1 ? 'border-b' : ''
                      }`}
                      style={{ borderColor: index < group.items.length - 1 ? '#E5E7EB' : 'transparent' }}
                    >
                      {/* Colored Icon */}
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: group.iconBg }}
                      >
                        <item.icon size={20} style={{ color: group.iconColor }} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="trades-body font-medium" style={{ color: '#111827' }}>{item.label}</p>
                            </div>
                            <p className="trades-caption" style={{ color: '#6B7280' }}>{item.description}</p>
                            
                            {/* Helper text under each item */}
                            <p className="trades-caption mt-1" style={{ color: '#6B7280' }}>
                              {item.helper}
                            </p>
                          </div>
                          
                          {/* Right Chevron */}
                          <ChevronRight size={16} className="flex-shrink-0 ml-2" style={{ color: '#6B7280' }} />
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* App Info */}
          <div className="bg-white rounded-xl p-3 border shadow-sm text-center mt-8" style={{ borderColor: '#E5E7EB' }}>
            <p className="trades-body font-medium mb-1" style={{ color: '#111827' }}>WorkBeam</p>
            <p className="trades-caption" style={{ color: '#6B7280' }}>Version 1.0.0</p>
            <p className="trades-caption mt-2" style={{ color: '#6B7280' }}>
              Built for professional tradesmen
            </p>
          </div>
        </div>
    </ScreenLayout>
  );
}
