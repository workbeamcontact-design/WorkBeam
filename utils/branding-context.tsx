import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';
import { toast } from 'sonner@2.0.3';

export interface BrandingData {
  logo_url?: string;
  logo_dark_url?: string;
  icon_url?: string;
  primary_color: string;
  accent_color: string;
  secondary_color?: string; // Alias for accent_color for template compatibility
  neutral_color: string;
  invoice_use_brand_colors: boolean;
  invoice_logo_position: 'left' | 'right';
  selected_template: string | null;
}

export interface TemplateSupport {
  logoPositions: ('left' | 'right')[];
  brandColors: boolean;
  darkMode: boolean;
}

// Template compatibility matrix
export const TEMPLATE_SUPPORT: Record<string, TemplateSupport> = {
  classic: {
    logoPositions: ['left', 'right'],
    brandColors: true,
    darkMode: false
  },
  modern: {
    logoPositions: ['left'],
    brandColors: true,
    darkMode: true
  },
  minimal: {
    logoPositions: ['left', 'right'],
    brandColors: true,
    darkMode: false
  },
  corporate: {
    logoPositions: ['left', 'right'],
    brandColors: true,
    darkMode: false
  },
  creative: {
    logoPositions: ['left'],
    brandColors: true,
    darkMode: true
  },
  professional: {
    logoPositions: ['left', 'right'],
    brandColors: true,
    darkMode: false
  }
};

interface BrandingContextType {
  branding: BrandingData;
  setBranding: React.Dispatch<React.SetStateAction<BrandingData>>;
  saveBranding: (updatesToSave?: Partial<BrandingData>) => Promise<void>;
  resetBranding: () => void;
  refreshBranding: () => Promise<void>;
  loading: boolean;
  saving: boolean;
  hasUnsavedChanges: boolean;
  getTemplateSupport: (templateName: string | null) => TemplateSupport;
  isPositionSupported: (templateName: string | null, position: 'left' | 'right') => boolean;
  validateBrandingForTemplate: (templateName: string | null) => string[];
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const defaultBranding: BrandingData = {
  primary_color: '#0A84FF',
  accent_color: '#16A34A',
  neutral_color: '#6B7280',
  invoice_use_brand_colors: true,
  invoice_logo_position: 'left',
  selected_template: 'classic' // Default to classic for display purposes
};

export function BrandingProvider({ children, initialBranding }: { 
  children: React.ReactNode;
  initialBranding?: BrandingData;
}) {
  const [branding, setBranding] = useState<BrandingData>(initialBranding || defaultBranding);
  const [originalBranding, setOriginalBranding] = useState<BrandingData>(initialBranding || defaultBranding);
  const [loading, setLoading] = useState(!initialBranding); // Don't load if initial data provided
  const [saving, setSaving] = useState(false);

  // Load branding data on mount
  useEffect(() => {
    // Skip loading if initial branding is provided (for PDF generation)
    if (!initialBranding) {
      loadBranding();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBranding]);

  // Refresh branding when app comes back into focus or becomes visible
  // This ensures previews always show the latest branding even if changed elsewhere
  useEffect(() => {
    if (initialBranding) return; // Skip for PDF generation contexts
    
    const handleVisibilityChange = () => {
      try {
        if (!document.hidden) {
          // Check if there are unsaved changes before refreshing
          try {
            const hasChanges = JSON.stringify(branding) !== JSON.stringify(originalBranding);
            if (hasChanges) {
              return;
            }
          } catch {
            // Serialization failed, skip check
          }
          loadBranding();
        }
      } catch (error) {
        // Silently ignore cross-origin errors
      }
    };
    
    const handleFocus = () => {
      try {
        // Check if there are unsaved changes before refreshing
        try {
          const hasChanges = JSON.stringify(branding) !== JSON.stringify(originalBranding);
          if (hasChanges) {
            return;
          }
        } catch {
          // Serialization failed, skip check
        }
        loadBranding();
      } catch (error) {
        // Silently ignore cross-origin errors
      }
    };
    
    // Listen for branding updates from other parts of the app
    const handleBrandingUpdated = (event: Event) => {
      try {
        const customEvent = event as CustomEvent;
        if (!customEvent.detail || typeof customEvent.detail !== 'object') {
          return;
        }
        
        const updatedBranding = customEvent.detail;
        
        // Create completely new plain object to avoid any reference issues
        const mergedData: BrandingData = {
          primary_color: String(updatedBranding.primary_color || defaultBranding.primary_color),
          accent_color: String(updatedBranding.accent_color || defaultBranding.accent_color),
          neutral_color: String(updatedBranding.neutral_color || defaultBranding.neutral_color),
          invoice_use_brand_colors: Boolean(updatedBranding.invoice_use_brand_colors ?? defaultBranding.invoice_use_brand_colors),
          invoice_logo_position: (updatedBranding.invoice_logo_position === 'center' ? 'left' : updatedBranding.invoice_logo_position) || defaultBranding.invoice_logo_position,
          selected_template: updatedBranding.selected_template !== undefined ? updatedBranding.selected_template : defaultBranding.selected_template,
          logo_url: updatedBranding.logo_url || undefined,
          logo_dark_url: updatedBranding.logo_dark_url || undefined,
          icon_url: updatedBranding.icon_url || undefined
        };
        
        setBranding(mergedData);
        setOriginalBranding(mergedData);
      } catch (error) {
        // Silently ignore cross-origin and serialization errors
      }
    };
    
    try {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('branding-updated', handleBrandingUpdated);
    } catch {
      // Event listener setup failed, continue without it
    }
    
    return () => {
      try {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('branding-updated', handleBrandingUpdated);
      } catch {
        // Cleanup failed, ignore
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBranding, branding, originalBranding]);

  const loadBranding = async () => {
    try {
      setLoading(true);
      
      // Add timeout protection at the context level
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Branding load timeout')), 8000); // 8 second timeout
      });
      
      const dataPromise = api.getBranding();
      
      const data = await Promise.race([dataPromise, timeoutPromise]).catch(error => {
        console.warn('⚠️ [BRANDING-CONTEXT] Load timeout or error, using defaults:', error);
        return null;
      });
      
      if (data) {
        // Create completely new plain object to avoid any reference issues
        const mergedData: BrandingData = {
          primary_color: String(data.primary_color || defaultBranding.primary_color),
          accent_color: String(data.accent_color || defaultBranding.accent_color),
          neutral_color: String(data.neutral_color || defaultBranding.neutral_color),
          invoice_use_brand_colors: Boolean(data.invoice_use_brand_colors ?? defaultBranding.invoice_use_brand_colors),
          invoice_logo_position: (data.invoice_logo_position === 'center' ? 'left' : data.invoice_logo_position) || defaultBranding.invoice_logo_position,
          selected_template: data.selected_template !== undefined ? data.selected_template : defaultBranding.selected_template,
          logo_url: data.logo_url || undefined,
          logo_dark_url: data.logo_dark_url || undefined,
          icon_url: data.icon_url || undefined
        };
        
        setBranding(mergedData);
        setOriginalBranding(mergedData);
      } else {
        // No data returned - use defaults
        console.log('ℹ️ [BRANDING-CONTEXT] No branding data, using defaults');
        setBranding(defaultBranding);
        setOriginalBranding(defaultBranding);
      }
    } catch (error) {
      // Don't show error toast on initial load, fallback to defaults
      console.warn('⚠️ [BRANDING-CONTEXT] Failed to load branding, using defaults:', error);
      setBranding(defaultBranding);
      setOriginalBranding(defaultBranding);
    } finally {
      // Always clear loading state
      setLoading(false);
    }
  };

  const saveBranding = async (updatesToSave?: Partial<BrandingData>) => {
    try {
      // Safe logging that won't trigger cross-origin errors
      try {
        console.log('💾 [BRANDING-CONTEXT] saveBranding called with logo_url:', 
          updatesToSave && 'logo_url' in updatesToSave ? updatesToSave.logo_url : 'not provided'
        );
      } catch (e) {
        // Ignore logging errors in iframe environment
      }
      
      setSaving(true);
      
      // Create completely new plain object to avoid reference issues
      // Explicitly handle undefined values to allow removal
      const dataToSave = updatesToSave ? { ...branding, ...updatesToSave } : branding;
      
      try {
        console.log('💾 [BRANDING-CONTEXT] After initial merge, dataToSave.logo_url:', dataToSave.logo_url);
      } catch (e) {
        // Ignore logging errors
      }
      
      // If updatesToSave explicitly sets a property to null/undefined, preserve that
      // Keep null values when sending to API (JSON.stringify preserves null but removes undefined)
      if (updatesToSave) {
        if ('logo_url' in updatesToSave) {
          try {
            console.log('💾 [BRANDING-CONTEXT] Explicitly setting logo_url to:', updatesToSave.logo_url);
          } catch (e) {
            // Ignore logging errors
          }
          dataToSave.logo_url = updatesToSave.logo_url;
        }
        if ('logo_dark_url' in updatesToSave) {
          dataToSave.logo_dark_url = updatesToSave.logo_dark_url;
        }
        if ('icon_url' in updatesToSave) {
          dataToSave.icon_url = updatesToSave.icon_url;
        }
      }
      
      try {
        console.log('💾 [BRANDING-CONTEXT] Final dataToSave.logo_url before API call:', dataToSave.logo_url);
      } catch (e) {
        // Ignore logging errors
      }
      
      // Always save with 'left' position (position option removed from UI)
      const brandingToSave: BrandingData = {
        primary_color: String(dataToSave.primary_color),
        accent_color: String(dataToSave.accent_color),
        neutral_color: String(dataToSave.neutral_color),
        invoice_use_brand_colors: Boolean(dataToSave.invoice_use_brand_colors),
        invoice_logo_position: 'left' as const,
        selected_template: dataToSave.selected_template,
        logo_url: dataToSave.logo_url,
        logo_dark_url: dataToSave.logo_dark_url,
        icon_url: dataToSave.icon_url
      };
      
      const updatedBranding = await api.updateBranding(brandingToSave);
      
      if (updatedBranding) {
        // Create completely new plain object for state
        // Convert null to undefined for internal state management
        const newBrandingState: BrandingData = {
          primary_color: String(updatedBranding.primary_color),
          accent_color: String(updatedBranding.accent_color),
          neutral_color: String(updatedBranding.neutral_color),
          invoice_use_brand_colors: Boolean(updatedBranding.invoice_use_brand_colors),
          invoice_logo_position: updatedBranding.invoice_logo_position,
          selected_template: updatedBranding.selected_template,
          logo_url: updatedBranding.logo_url === null ? undefined : updatedBranding.logo_url,
          logo_dark_url: updatedBranding.logo_dark_url === null ? undefined : updatedBranding.logo_dark_url,
          icon_url: updatedBranding.icon_url === null ? undefined : updatedBranding.icon_url
        };
        
        setOriginalBranding(newBrandingState);
        setBranding(newBrandingState);
        
        // Emit a custom event - create completely new plain object for detail
        try {
          const safeDetail = {
            logo_url: updatedBranding.logo_url ? String(updatedBranding.logo_url) : undefined,
            primary_color: String(updatedBranding.primary_color),
            accent_color: String(updatedBranding.accent_color),
            neutral_color: String(updatedBranding.neutral_color),
            invoice_use_brand_colors: Boolean(updatedBranding.invoice_use_brand_colors),
            invoice_logo_position: String(updatedBranding.invoice_logo_position),
            selected_template: updatedBranding.selected_template ? String(updatedBranding.selected_template) : null
          };
          
          // Double-wrap in try-catch for maximum safety
          try {
            const event = new CustomEvent('branding-updated', { detail: safeDetail });
            window.dispatchEvent(event);
          } catch {
            // Event creation or dispatch failed, ignore
          }
        } catch {
          // Event preparation failed, ignore
        }
        
        toast.success('Branding settings saved successfully');
      } else {
        toast.error('Failed to save branding: No data returned');
      }
    } catch (error) {
      toast.error('Failed to save branding settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error; // Re-throw so caller can handle
    } finally {
      setSaving(false);
    }
  };

  const getTemplateSupport = (templateName: string | null): TemplateSupport => {
    return TEMPLATE_SUPPORT[templateName || 'classic'] || TEMPLATE_SUPPORT.classic;
  };

  const isPositionSupported = (templateName: string | null, position: 'left' | 'right'): boolean => {
    const support = getTemplateSupport(templateName);
    return support.logoPositions.includes(position);
  };

  const validateBrandingForTemplate = (templateName: string | null): string[] => {
    const issues: string[] = [];
    const support = getTemplateSupport(templateName);
    
    if (!support.logoPositions.includes(branding.invoice_logo_position)) {
      issues.push(`Logo position "${branding.invoice_logo_position}" not supported. Available: ${support.logoPositions.join(', ')}`);
    }
    
    if (!support.brandColors && branding.invoice_use_brand_colors) {
      issues.push('Brand colors not supported by this template');
    }
    
    if (!support.darkMode && branding.logo_dark_url) {
      issues.push('Dark mode logo not supported by this template');
    }
    
    return issues;
  };

  const resetBranding = () => {
    setBranding(originalBranding);
  };

  // Create enhanced branding object with secondary_color alias for context consumers
  const enhancedBranding = {
    ...branding,
    secondary_color: branding.accent_color // Template compatibility alias
  };

  // For change detection, only compare the core fields that actually get saved
  // Exclude the secondary_color alias since it's just a computed field
  const getCoreFields = (brandingObj: any) => {
    const { secondary_color, ...core } = brandingObj;
    return core;
  };

  const hasUnsavedChanges = JSON.stringify(getCoreFields(branding)) !== JSON.stringify(getCoreFields(originalBranding));

  return (
    <BrandingContext.Provider value={{
      branding: enhancedBranding,
      setBranding,
      saveBranding,
      resetBranding,
      refreshBranding: loadBranding, // Expose loadBranding as refreshBranding
      loading,
      saving,
      hasUnsavedChanges,
      getTemplateSupport,
      isPositionSupported,
      validateBrandingForTemplate
    }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}