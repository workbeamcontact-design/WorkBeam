import { cn } from "./utils";

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center overflow-x-hidden">
      <div className={cn(
        "w-full max-w-[390px] min-h-screen bg-white relative shadow-xl overflow-hidden",
        className
      )}>
        {children}
      </div>
    </div>
  );
}