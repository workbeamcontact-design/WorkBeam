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
        // Responsive sizing: scales with viewport width
        "w-[13vw] h-[13vw] min-w-[56px] min-h-[56px] max-w-[64px] max-h-[64px]",
        className
      )}
    >
      <Plus className="w-[5.5vw] h-[5.5vw] min-w-[24px] min-h-[24px] max-w-[28px] max-h-[28px]" />
    </button>
  );
}