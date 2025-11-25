import { User, Clock } from "lucide-react";

interface AttributionDisplayProps {
  createdByName?: string;
  createdAt?: string;
  updatedByName?: string;
  updatedAt?: string;
  className?: string;
}

/**
 * Displays creator and updater attribution for multi-user collaboration
 * Shows who created/updated a resource and when
 * Only displays if multi-user data is available (Phase 4b)
 */
export function AttributionDisplay({
  createdByName,
  createdAt,
  updatedByName,
  updatedAt,
  className = ""
}: AttributionDisplayProps) {
  // Don't render if no multi-user data is available
  if (!createdByName && !createdAt) {
    return null;
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Less than 24 hours ago
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          if (diffMins === 0) {
            return 'Just now';
          }
          return `${diffMins}m ago`;
        }
        return `${diffHours}h ago`;
      }
      
      // Less than 7 days ago
      if (diffDays < 7) {
        return `${diffDays}d ago`;
      }
      
      // Otherwise show full date
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  const showUpdater = updatedByName && 
    updatedByName !== createdByName && 
    updatedAt && 
    updatedAt !== createdAt;

  return (
    <div className={`flex flex-col gap-1 text-xs text-gray-500 ${className}`}>
      {createdByName && (
        <div className="flex items-center gap-1.5">
          <User size={12} className="text-gray-400" />
          <span>
            Created by <span className="font-medium text-gray-600">{createdByName}</span>
            {createdAt && <span className="ml-1">• {formatDate(createdAt)}</span>}
          </span>
        </div>
      )}
      
      {showUpdater && (
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-gray-400" />
          <span>
            Updated by <span className="font-medium text-gray-600">{updatedByName}</span>
            {updatedAt && <span className="ml-1">• {formatDate(updatedAt)}</span>}
          </span>
        </div>
      )}
    </div>
  );
}
