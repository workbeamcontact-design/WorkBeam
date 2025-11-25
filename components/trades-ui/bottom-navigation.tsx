import { Home, Users, Calendar, Settings } from "lucide-react";
import { cn } from "../ui/utils";

interface BottomNavigationProps {
  activeTab: "home" | "clients" | "calendar" | "settings";
  onTabChange: (tab: "home" | "clients" | "calendar" | "settings") => void;
  className?: string;
}

export function BottomNavigation({ activeTab, onTabChange, className }: BottomNavigationProps) {
  const tabs = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "clients" as const, icon: Users, label: "Clients" },
    { id: "calendar" as const, icon: Calendar, label: "Calendar" },
    { id: "settings" as const, icon: Settings, label: "Settings" }
  ];

  return (
    <div 
      className={cn(
        "flex items-center justify-around px-2 py-2 bg-white border-t border-gray-200",
        "fixed bottom-0 left-0 right-0 z-50",
        "safe-area-inset-bottom", // Handle iPhone notches and safe areas
        className
      )}
      style={{
        height: '68px',
        minHeight: '60px'
      }}
    >
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            "flex flex-col items-center gap-1 p-1 rounded-lg flex-1",
            "transition-colors max-w-[80px]",
            activeTab === id 
              ? "text-blue-600" 
              : "text-gray-600 hover:text-gray-900"
          )}
          style={{
            minWidth: '44px',
            minHeight: '44px'
          }}
        >
          <Icon size={22} />
          <span className="trades-caption truncate">{label}</span>
        </button>
      ))}
    </div>
  );
}