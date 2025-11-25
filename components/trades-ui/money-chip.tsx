import { cn } from "../ui/utils";

interface MoneyChipProps {
  amount: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MoneyChip({ amount, selected = false, onClick, className }: MoneyChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-xl border trades-label transition-colors",
        selected 
          ? "bg-blue-600 text-white border-blue-600" 
          : "bg-white text-gray-900 border-gray-300 hover:border-blue-300",
        className
      )}
    >
      £{amount}
    </button>
  );
}