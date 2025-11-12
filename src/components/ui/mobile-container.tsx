import { cn } from "./utils";

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className={cn(
      "w-full h-screen bg-white relative mx-auto",
      className
    )}>
      {children}
    </div>
  );
}