import { cn } from "../ui/utils";

interface StatusBadgeProps {
  status: "awaiting" | "approved" | "overdue" | "paid" | "confirmed";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "awaiting":
        return {
          backgroundColor: '#FFF7E6',
          color: '#F59E0B',
          borderColor: '#F59E0B'
        };
      case "approved":
      case "confirmed":
      case "paid":
      case "scheduled":
        return {
          backgroundColor: '#EAF7EE',
          color: '#16A34A',
          borderColor: '#16A34A'
        };
      case "overdue":
        return {
          backgroundColor: '#FDECEC',
          color: '#DC2626',
          borderColor: '#DC2626'
        };
      default:
        return {
          backgroundColor: '#F9FAFB',
          color: '#6B7280',
          borderColor: '#E5E7EB'
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "awaiting":
        return "Awaiting";
      case "approved":
        return "Approved";
      case "overdue":
        return "Overdue";
      case "paid":
        return "Paid";
      case "confirmed":
        return "Confirmed";
      case "scheduled":
        return "Scheduled";
      default:
        return status;
    }
  };

  const styles = getStatusStyles(status);

  return (
    <div
      className={cn("inline-flex items-center px-2 py-1 rounded-full border", className)}
      style={styles}
    >
      <span className="trades-caption font-medium capitalize">
        {getStatusText(status)}
      </span>
    </div>
  );
}