import React from 'react';
import { MobileContainer } from '../ui/mobile-container';
import { BottomNavigation } from '../trades-ui/bottom-navigation';
import { Toaster } from '../ui/sonner';
import { useAppStore } from '../../hooks/useAppStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main app layout component - handles overall app structure
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { navigation, getActiveTab } = useAppStore();
  const currentTab = getActiveTab();

  // Hide bottom navigation for public screens
  const isPublicScreen = ['quote-approval', 'variation-approval'].includes(navigation.screen);

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center">
      <MobileContainer>
        <div className="relative h-full flex flex-col">
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
        </div>
        <Toaster />
      </MobileContainer>
    </div>
  );
};