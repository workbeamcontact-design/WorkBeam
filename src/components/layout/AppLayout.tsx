import React from 'react';
import { BottomNavigation } from '../trades-ui/bottom-navigation';
import { Toaster } from '../ui/sonner';
import { useAppStore } from '../../hooks/useAppStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main app layout component - handles overall app structure
 * Mobile frame is applied via CSS in globals.css - doesn't interfere with app layout
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { navigation, getActiveTab } = useAppStore();
  const currentTab = getActiveTab();

  // Hide bottom navigation for public screens
  const isPublicScreen = ['quote-approval', 'variation-approval'].includes(navigation.screen);

  return (
    <div className="relative h-full flex flex-col bg-white">
      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
      
      {/* Bottom navigation - hide for public screens */}
      {!isPublicScreen && (
        <BottomNavigation 
          activeTab={currentTab} 
          onTabChange={(tab) => {
            const { setTabScreen } = useAppStore.getState();
            setTabScreen(tab);
          }} 
        />
      )}
      <Toaster />
    </div>
  );
};