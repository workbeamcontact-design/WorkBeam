import { cn } from "./utils";

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className={cn(
      "w-full max-w-sm h-screen bg-white relative mx-auto",
      "md:max-w-[390px] md:h-[844px] md:border md:border-gray-300 md:rounded-[24px] md:shadow-xl",
      className
    )}>
      {children}
    </div>
  );
}