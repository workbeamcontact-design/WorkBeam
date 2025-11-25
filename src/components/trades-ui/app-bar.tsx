import { ArrowLeft } from "lucide-react";
import { cn } from "../ui/utils";

interface AppBarProps {
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function AppBar({ title, onBack, actions, className }: AppBarProps) {
  return (
    <div className={cn(
      "flex items-center justify-between p-4 bg-white border-b border-gray-200",
      className
    )}>
      <div className="flex items-center gap-3">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} className="text-gray-900" />
          </button>
        )}
        <h1 className="trades-h2 text-gray-900">{title}</h1>
      </div>
      
      {actions && <div>{actions}</div>}
    </div>
  );
}