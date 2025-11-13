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
        "fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full",
        "shadow-lg hover:bg-blue-700 transition-colors",
        "flex items-center justify-center",
        className
      )}
    >
      <Plus size={24} />
    </button>
  );
}