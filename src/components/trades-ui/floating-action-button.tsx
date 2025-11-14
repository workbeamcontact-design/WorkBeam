import { Plus } from "lucide-react";
import { cn } from "../ui/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
}

export function FloatingActionButton({ onClick, className }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute bottom-20 right-4 bg-blue-600 text-white rounded-full",
        "shadow-lg hover:bg-blue-700 transition-colors",
        "flex items-center justify-center z-40",
        className
      )}
      style={{
        // Responsive sizing: 56px at 390px (iPhone 16) → 62px at 430px (Pro Max)
        width: 'clamp(45px, 14.4vw, 70px)',
        height: 'clamp(45px, 14.4vw, 70px)'
      }}
    >
      <Plus style={{ width: 'clamp(20px, 5.6vw, 28px)', height: 'clamp(20px, 5.6vw, 28px)' }} />
    </button>
  );
}