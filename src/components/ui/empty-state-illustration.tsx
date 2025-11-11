interface EmptyStateIllustrationProps {
  type: 'clients' | 'jobs' | 'calendar';
  size?: number;
}

export function EmptyStateIllustration({ type, size = 120 }: EmptyStateIllustrationProps) {
  const renderClients = () => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Background circle */}
      <circle cx="60" cy="60" r="60" fill="#EFF6FF" />
      
      {/* Document/Client card */}
      <rect x="30" y="35" width="60" height="50" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="2" />
      
      {/* Person icon */}
      <circle cx="45" cy="50" r="6" fill="#0A84FF" />
      <path d="M35 70c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="#0A84FF" strokeWidth="2" fill="none" />
      
      {/* Text lines */}
      <rect x="55" y="45" width="25" height="3" rx="1.5" fill="#E5E7EB" />
      <rect x="55" y="52" width="20" height="3" rx="1.5" fill="#E5E7EB" />
      <rect x="55" y="59" width="15" height="3" rx="1.5" fill="#E5E7EB" />
      
      {/* Plus icon */}
      <circle cx="75" cy="75" r="12" fill="#0A84FF" />
      <path d="M70 75h10M75 70v10" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const renderJobs = () => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Background circle */}
      <circle cx="60" cy="60" r="60" fill="#EAF7EE" />
      
      {/* Toolbox */}
      <rect x="35" y="40" width="50" height="35" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="2" />
      <rect x="35" y="40" width="50" height="10" rx="4" fill="#16A34A" />
      
      {/* Tools */}
      <rect x="45" y="50" width="2" height="15" fill="#6B7280" />
      <rect x="50" y="52" width="8" height="2" fill="#6B7280" />
      <circle cx="65" cy="58" r="3" fill="none" stroke="#6B7280" strokeWidth="1.5" />
      
      {/* Plus icon */}
      <circle cx="75" cy="80" r="12" fill="#16A34A" />
      <path d="M70 80h10M75 75v10" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const renderCalendar = () => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Background circle */}
      <circle cx="60" cy="60" r="60" fill="#FFF7E6" />
      
      {/* Calendar */}
      <rect x="30" y="35" width="60" height="50" rx="6" fill="white" stroke="#E5E7EB" strokeWidth="2" />
      <rect x="30" y="35" width="60" height="15" rx="6" fill="#F59E0B" />
      
      {/* Calendar rings */}
      <rect x="42" y="30" width="3" height="15" rx="1.5" fill="#6B7280" />
      <rect x="75" y="30" width="3" height="15" rx="1.5" fill="#6B7280" />
      
      {/* Calendar grid */}
      <circle cx="45" cy="60" r="2" fill="#E5E7EB" />
      <circle cx="55" cy="60" r="2" fill="#E5E7EB" />
      <circle cx="65" cy="60" r="2" fill="#E5E7EB" />
      <circle cx="75" cy="60" r="2" fill="#E5E7EB" />
      <circle cx="45" cy="70" r="2" fill="#E5E7EB" />
      <circle cx="55" cy="70" r="2" fill="#F59E0B" />
      <circle cx="65" cy="70" r="2" fill="#E5E7EB" />
      
      {/* Plus icon */}
      <circle cx="80" cy="80" r="12" fill="#F59E0B" />
      <path d="M75 80h10M80 75v10" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  switch (type) {
    case 'jobs':
      return renderJobs();
    case 'calendar':
      return renderCalendar();
    default:
      return renderClients();
  }
}