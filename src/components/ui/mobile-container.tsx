import { cn } from "./utils";

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className={cn(
      "w-full max-w-[390px] h-screen bg-white relative mx-auto shadow-xl",
      className
    )}>
      {children}
    </div>
  );
}