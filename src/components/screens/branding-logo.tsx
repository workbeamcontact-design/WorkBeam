import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, X, Palette, Eye, Check } from 'lucide-react';
import { sanitizeText } from '../../utils/sanitization';
import { Button } from '../ui/button';
import { useAutosave } from '../../hooks/useAutosave';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { A4FitWrapper } from '../ui/a4-fit-wrapper';
import { InvoiceA4Page } from '../ui/invoice-a4-page';
import { TemplateRenderer } from '../ui/invoice-templates/template-renderer';
import { ScreenLayout, SaveFooter } from '../ui/screen-layout';
import { useBranding } from '../../utils/branding-context';
import { api } from '../../utils/api';
import { toast } from 'sonner@2.0.3';

interface BrandingLogoProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

// Main preset colors - 4 per section
const PRIMARY_PRESET_COLORS = [
  '#0A84FF', // WorkBeam Blue
  '#1565C0', // Deep Blue
  '#2E7D32', // Green
  '#C62828', // Red
];

const SECONDARY_PRESET_COLORS = [
  '#42A5F5', // Light Blue
  '#66BB6A', // Light Green
  '#FFA726', // Orange
  '#AB47BC', // Purple
];

// Comprehensive color palette for "More Colors" dialog - All unique colors
const ALL_COLORS = [
  // Blues
  '#0A84FF', '#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#42A5F5', '#64B5F6', '#90CAF9',
  // Greens
  '#1B5E20', '#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7',
  // Reds/Pinks
  '#B71C1C', '#C62828', '#D32F2F', '#E53935', '#F44336', '#EF5350', '#E57373', '#EF9A9A',
  // Oranges
  '#E65100', '#EF6C00', '#F57C00', '#FB8C00', '#FF9800', '#FFA726', '#FFB74D', '#FFCC80',
  // Purples
  '#4A148C', '#6A1B9A', '#7B1FA2', '#8E24AA', '#9C27B0', '#AB47BC', '#BA68C8', '#CE93D8',
  // Teals/Cyans
  '#006064', '#00838F', '#0097A7', '#00ACC1', '#00BCD4', '#26C6DA', '#4DD0E1', '#80DEEA',
  // Grays
  '#212121', '#424242', '#616161', '#757575', '#9E9E9E', '#BDBDBD', '#E0E0E0', '#EEEEEE',
  // Browns
  '#3E2723', '#4E342E', '#5D4037', '#6D4C41', '#795548', '#8D6E63', '#A1887F', '#BCAAA4',
  // Deep & Rich Colors (completely unique)
  '#1A237E', '#311B92', '#880E4F', '#BF360C', '#F57F17', '#827717', '#558B2F', '#FF6F00',
];

export function BrandingLogo({ onNavigate, onBack }: BrandingLogoProps) {
  const { 
    branding, 
    setBranding, 
    saveBranding, 
    resetBranding,
    refreshBranding,
    loading, 
    saving, 
    hasUnsavedChanges
  } = useBranding();
  
  // Separate refs for both file inputs to handle all cases
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [extractingColors, setExtractingColors] = useState(false);
  const [extractedPalettes, setExtractedPalettes] = useState<Array<{primary: string, secondary: string}>>([]);
  const [colorPickerOpen, setColorPickerOpen] = useState<'primary' | 'secondary' | null>(null);
  const [tempColor, setTempColor] = useState<string>('');
  const [moreColorsOpen, setMoreColorsOpen] = useState<'primary' | 'secondary' | null>(null);
  
  // Track component mount state to prevent updates after unmount
  const isMountedRef = useRef(true);

  // Load branding on mount - only once
  useEffect(() => {
    isMountedRef.current = true;
    
    // Call refresh on mount
    const loadData = async () => {
      try {
        await refreshBranding();
      } catch (error) {
        console.error('❌ [BRANDING-LOGO] Failed to load branding:', error);
        // Component will use default branding from context - no need to do anything
      }
    };
    
    loadData();
    
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const autosave = useAutosave(branding, {
    delay: 3000,
    onSave: async (data) => { /* Draft saved */ },
    storageKey: 'branding-draft',
    enabled: hasUnsavedChanges
  });

  const validateHexColor = (color: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  // Comprehensive file upload handler with proper error handling
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    console.log('📤 [BRANDING-LOGO] handleFileSelect called, file:', file?.name);
    
    if (!file) {
      console.log('⚠️ [BRANDING-LOGO] No file selected');
      return;
    }

    try {
      setUploadingLogo(true);
      
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        console.error('❌ [BRANDING-LOGO] Invalid file type:', file.type);
        toast.error('Please select PNG, JPG, SVG, or WebP');
        return;
      }
      
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        console.error('❌ [BRANDING-LOGO] File too large:', file.size);
        toast.error('File must be less than 5MB');
        return;
      }

      // Validate filename
      const sanitizedName = sanitizeText(file.name, 255);
      if (sanitizedName !== file.name) {
        console.error('❌ [BRANDING-LOGO] Invalid filename:', file.name);
        toast.error('Invalid filename');
        return;
      }

      console.log('✅ [BRANDING-LOGO] File validation passed, uploading...');
      toast.success('Uploading logo...');
      
      // Upload file and get data URL
      const url = await api.uploadBrandingFile(file, 'logo');
      console.log('✅ [BRANDING-LOGO] Upload complete, url length:', url?.length);
      
      if (!isMountedRef.current) {
        console.log('⚠️ [BRANDING-LOGO] Component unmounted, aborting');
        return;
      }
      
      // Update branding context with new logo
      const updatedBranding = { ...branding, logo_url: url };
      setBranding(updatedBranding);
      
      // Auto-save to persist immediately
      try {
        console.log('💾 [BRANDING-LOGO] Auto-saving logo...');
        const saved = await api.updateBranding(updatedBranding);
        
        if (!isMountedRef.current) {
          return;
        }
        
        if (saved) {
          console.log('✅ [BRANDING-LOGO] Logo saved successfully');
          
          // Broadcast update to all components
          try {
            const safeDetail = {
              logo_url: saved.logo_url ? String(saved.logo_url) : undefined,
              primary_color: String(saved.primary_color),
              accent_color: String(saved.accent_color),
              neutral_color: String(saved.neutral_color),
              invoice_use_brand_colors: Boolean(saved.invoice_use_brand_colors),
              invoice_logo_position: String(saved.invoice_logo_position),
              selected_template: saved.selected_template ? String(saved.selected_template) : null
            };
            
            const event = new CustomEvent('branding-updated', { detail: safeDetail });
            window.dispatchEvent(event);
          } catch (error) {
            console.error('⚠️ [BRANDING-LOGO] Failed to broadcast update:', error);
          }
          
          toast.success('Logo uploaded and saved!');
        } else {
          console.warn('⚠️ [BRANDING-LOGO] Save returned no data');
          toast.success('Logo uploaded');
        }
      } catch (saveError) {
        console.error('❌ [BRANDING-LOGO] Auto-save failed:', saveError);
        toast.success('Logo uploaded (please save changes)');
      }
    } catch (error) {
      console.error('❌ [BRANDING-LOGO] Upload failed:', error);
      if (isMountedRef.current) {
        toast.error('Upload failed');
      }
    } finally {
      if (isMountedRef.current) {
        setUploadingLogo(false);
      }
      // Reset input value to allow re-uploading same file
      event.target.value = '';
      console.log('🔄 [BRANDING-LOGO] File input reset');
    }
  }, [branding, setBranding]);

  const handleRemoveLogo = async () => {
    try {
      console.log('🗑️ [BRANDING-LOGO] Removing logo...');
      
      // Reset both file inputs
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
        console.log('🔄 [BRANDING-LOGO] Upload input cleared');
      }
      if (replaceInputRef.current) {
        replaceInputRef.current.value = '';
        console.log('🔄 [BRANDING-LOGO] Replace input cleared');
      }
      
      // Update local state immediately for instant UI feedback
      setBranding(prev => ({ ...prev, logo_url: null as any }));
      console.log('✅ [BRANDING-LOGO] Local state updated to null');
      
      // Save to backend - use null to explicitly remove
      await saveBranding({ logo_url: null as any });
      console.log('✅ [BRANDING-LOGO] Logo deletion saved to backend');
      
      // Force refresh to ensure state is synced
      await refreshBranding();
      console.log('✅ [BRANDING-LOGO] Branding refreshed after deletion');
      
      if (isMountedRef.current) {
        toast.success('Logo removed');
      }
    } catch (error) {
      console.error('❌ [BRANDING-LOGO] Failed to remove logo:', error);
      if (isMountedRef.current) {
        toast.error('Failed to remove logo');
        // Refresh to restore state on error
        await refreshBranding();
      }
    }
  };

  const handleColorSelect = (color: string, type: 'primary' | 'accent') => {
    if (!validateHexColor(color)) {
      console.warn('⚠️ [BRANDING-LOGO] Invalid hex color:', color);
      return;
    }
    
    const colorKey = type === 'primary' ? 'primary_color' : 'accent_color';
    setBranding(prev => ({
      ...prev,
      [colorKey]: String(color)
    }));
    toast.success('Color updated');
  };

  const handleDirectColorChange = (type: 'primary' | 'secondary', color: string) => {
    if (!validateHexColor(color)) {
      return;
    }
    
    const colorKey = type === 'primary' ? 'primary_color' : 'accent_color';
    setBranding(prev => ({
      ...prev,
      [colorKey]: String(color)
    }));
  };

  const handleMoreColorsSelect = (color: string) => {
    if (!moreColorsOpen || !validateHexColor(color)) {
      return;
    }
    
    const colorKey = moreColorsOpen === 'primary' ? 'primary_color' : 'accent_color';
    setBranding(prev => ({
      ...prev,
      [colorKey]: String(color)
    }));
    toast.success('Color updated');
    setMoreColorsOpen(null);
  };

  const extractColorsFromLogo = async () => {
    if (!branding.logo_url) {
      toast.error('Please upload a logo first');
      return;
    }

    try {
      setExtractingColors(true);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = branding.logo_url!;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData) throw new Error('Could not analyze image');

      const colorCounts: { [key: string]: number } = {};
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 128 || (r > 240 && g > 240 && b > 240) || (r < 30 && g < 30 && b < 30)) continue;

        const roundedR = Math.round(r / 16) * 16;
        const roundedG = Math.round(g / 16) * 16;
        const roundedB = Math.round(b / 16) * 16;
        
        const hex = `#${roundedR.toString(16).padStart(2, '0')}${roundedG.toString(16).padStart(2, '0')}${roundedB.toString(16).padStart(2, '0')}`;
        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      }

      const sortedColors = Object.entries(colorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6)
        .map(([color]) => color);

      if (sortedColors.length < 2) {
        setExtractedPalettes([
          { primary: '#1565C0', secondary: '#42A5F5' },
          { primary: '#2E7D32', secondary: '#66BB6A' },
          { primary: '#6A1B9A', secondary: '#AB47BC' }
        ]);
      } else {
        const palettes = [];
        for (let i = 0; i < Math.min(3, sortedColors.length - 1); i++) {
          palettes.push({
            primary: sortedColors[i],
            secondary: sortedColors[i + 1] || sortedColors[0]
          });
        }
        setExtractedPalettes(palettes);
      }
      
      toast.success('Colors extracted from logo');
    } catch (error) {
      console.error('❌ [BRANDING-LOGO] Color extraction failed:', error);
      setExtractedPalettes([
        { primary: '#1565C0', secondary: '#42A5F5' },
        { primary: '#2E7D32', secondary: '#66BB6A' },
        { primary: '#6A1B9A', secondary: '#AB47BC' }
      ]);
      toast.success('Generated color palettes');
    } finally {
      setExtractingColors(false);
    }
  };

  const applyExtractedPalette = (palette: {primary: string, secondary: string}) => {
    setBranding(prev => ({
      ...prev,
      primary_color: String(palette.primary),
      accent_color: String(palette.secondary)
    }));
    setExtractedPalettes([]);
    toast.success('Color palette applied');
  };

  const sampleInvoiceData = {
    invoice_number: 'INV-2024-001',
    issue_date: '15/01/2024',
    due_date: '14/02/2024',
    client: {
      id: 'sample-client',
      name: 'John Smith',
      email: 'john.smith@email.com',
      address: '456 Client Road\nManchester M2 2BB'
    },
    business: {
      name: 'Premier Trade Services',
      address: '123 Trade Street\nManchester M1 1AA\nUnited Kingdom',
      phone: '0161 123 4567',
      email: 'info@premiertrade.co.uk'
    },
    line_items: [
      { id: '1', description: 'Labour - Kitchen fitting', quantity: 5, rate: 350, amount: 1750 },
      { id: '2', description: 'Kitchen units', quantity: 1, rate: 2500, amount: 2500 },
      { id: '3', description: 'Worktop installation', quantity: 1, rate: 450, amount: 450 }
    ],
    subtotal: 4700,
    vat_rate: 20,
    vat_amount: 940,
    total: 5640,
    status: 'draft'
  };

  // Check if logo exists (handle both null and undefined)
  const hasLogo = branding.logo_url != null && branding.logo_url !== '';

  // Show loading only if actually loading AND branding data is truly empty (initial load)
  // Once we have data (even defaults), we should render the UI
  if (loading && !branding.primary_color) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 bg-white border-b border-border">
          <h1 className="trades-h1 text-ink">Loading...</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="trades-body text-muted">Loading branding settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScreenLayout
      title="Branding & Logo"
      subtitle="Customize your logo and brand colors for invoices and quotes"
      onBack={onBack}
      footer={
        <SaveFooter
          onSave={saveBranding}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
          saveText="Save Changes"
        />
      }
    >
      <div className="px-4 pt-4 space-y-4">
          
          {/* ========== LOGO UPLOAD SECTION ========== */}
          <Card className="p-4">
            <h2 className="trades-h2 text-ink mb-4">Business Logo</h2>
            
            <div className="mb-6">
              <Label className="trades-label text-ink mb-2 block">Upload your logo</Label>
              <p className="trades-caption text-muted mb-3">
                PNG or SVG format recommended, transparent background preferred
              </p>
              
              {hasLogo ? (
                /* Logo already uploaded - show preview with replace/remove */
                <div key="logo-preview" className="bg-white border border-border rounded-lg p-6 flex items-center justify-center min-h-[120px] relative group">
                  <img 
                    src={branding.logo_url} 
                    alt="Business Logo" 
                    className="max-h-20 max-w-full object-contain" 
                  />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    {/* Replace - styled file input */}
                    <label className="inline-flex items-center justify-center rounded-md border border-input bg-white/90 backdrop-blur-sm px-3 h-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                      Replace
                      <input
                        ref={replaceInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                        onChange={handleFileSelect}
                        disabled={uploadingLogo}
                        style={{ display: 'none' }}
                        aria-label="Replace logo"
                      />
                    </label>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline" 
                      onClick={handleRemoveLogo}
                      className="bg-white/90 backdrop-blur-sm"
                      disabled={uploadingLogo}
                      aria-label="Remove logo"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ) : (
                /* No logo - show upload area */
                <label key="logo-upload" className="block cursor-pointer">
                  <div className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center transition-all hover:border-primary hover:bg-blue-50/50">
                    <Upload size={32} className="mx-auto mb-3 text-primary" />
                    <p className="trades-body text-ink mb-2 font-medium">
                      {uploadingLogo ? 'Uploading...' : 'Upload your business logo'}
                    </p>
                    <p className="trades-caption text-muted">Click to browse files</p>
                    <p className="trades-caption text-muted mt-2">Max 5MB • PNG, JPG, SVG, WebP</p>
                  </div>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleFileSelect}
                    disabled={uploadingLogo}
                    style={{ display: 'none' }}
                    aria-label="Upload logo"
                  />
                </label>
              )}
              
              {uploadingLogo && (
                <div className="mt-3 flex items-center gap-2 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="trades-caption">Uploading logo...</span>
                </div>
              )}
            </div>

            {hasLogo && (
              <div className="flex items-center gap-3 p-4 bg-surface-alt rounded-lg">
                <Palette size={20} className="text-primary" />
                <div className="flex-1">
                  <p className="trades-body text-ink">Extract colors from logo</p>
                  <p className="trades-caption text-muted">Automatically generate color palettes</p>
                </div>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={extractColorsFromLogo}
                  disabled={extractingColors}
                >
                  {extractingColors ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                      Extracting...
                    </>
                  ) : (
                    'Extract'
                  )}
                </Button>
              </div>
            )}
          </Card>

          {extractedPalettes.length > 0 && (
            <Card className="p-4">
              <h3 className="trades-body font-medium text-ink mb-4">Suggested Color Palettes</h3>
              <div className="space-y-3">
                {extractedPalettes.map((palette, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: palette.primary }}></div>
                      <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: palette.secondary }}></div>
                    </div>
                    <div className="flex-1">
                      <p className="trades-label text-ink">Palette {index + 1}</p>
                      <p className="trades-caption text-muted">Primary & Secondary</p>
                    </div>
                    <Button type="button" size="sm" onClick={() => applyExtractedPalette(palette)}>Apply</Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setExtractedPalettes([])} className="w-full">
                  Close
                </Button>
              </div>
            </Card>
          )}

          {/* ========== BRAND COLORS SECTION ========== */}
          <Card className="p-4">
            <h2 className="trades-h2 text-ink mb-4">Brand Colors</h2>
            
            <div className="space-y-6">
              {/* Primary Color */}
              <div>
                <Label className="trades-label text-ink mb-2 block">Primary Color</Label>
                <p className="trades-caption text-muted mb-3">Used for buttons, headers, and main accents</p>
                
                {/* 4 Preset colors + More button */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {PRIMARY_PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color, 'primary')}
                      className={`w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                        branding.primary_color === color ? 'border-gray-900 scale-105' : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select primary color ${color}`}
                    >
                      {branding.primary_color === color && <Check size={18} className="text-white drop-shadow-sm" />}
                    </button>
                  ))}
                </div>

                {/* More Colors Button */}
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setMoreColorsOpen('primary')}
                  className="w-full mb-4"
                >
                  <Palette size={16} className="mr-2" />
                  More Colors
                </Button>
                
                {/* Custom color input */}
                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    {/* Color preview with native color picker */}
                    <label className="block cursor-pointer">
                      <div
                        className="w-14 h-14 rounded-lg transition-all hover:scale-105 hover:shadow-lg border-2 border-gray-200 hover:border-gray-400"
                        style={{ backgroundColor: branding.primary_color }}
                        title="Click to pick color"
                      />
                      <input
                        type="color"
                        value={branding.primary_color}
                        onChange={(e) => handleDirectColorChange('primary', e.target.value)}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <div className="flex-1">
                      <Input
                        value={branding.primary_color.toUpperCase()}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^#([0-9A-Fa-f]{0,6})$/.test(value)) {
                            setBranding(prev => ({ ...prev, primary_color: String(value) }));
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value && !validateHexColor(value)) {
                            toast.error('Invalid hex color');
                            setBranding(prev => ({ ...prev, primary_color: '#0A84FF' }));
                          }
                        }}
                        placeholder="#0A84FF"
                        className="font-mono"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <p className="trades-caption text-muted">Click color square to open picker, or enter hex code</p>
                </div>
              </div>

              {/* Secondary Color */}
              <div>
                <Label className="trades-label text-ink mb-2 block">Secondary Color</Label>
                <p className="trades-caption text-muted mb-3">Used for backgrounds, borders, and table sections</p>
                
                {/* 4 Preset colors + More button */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {SECONDARY_PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color, 'accent')}
                      className={`w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                        branding.accent_color === color ? 'border-gray-900 scale-105' : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select secondary color ${color}`}
                    >
                      {branding.accent_color === color && <Check size={18} className="text-white drop-shadow-sm" />}
                    </button>
                  ))}
                </div>

                {/* More Colors Button */}
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setMoreColorsOpen('secondary')}
                  className="w-full mb-4"
                >
                  <Palette size={16} className="mr-2" />
                  More Colors
                </Button>
                
                {/* Custom color input */}
                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    {/* Color preview with native color picker */}
                    <label className="block cursor-pointer">
                      <div
                        className="w-14 h-14 rounded-lg transition-all hover:scale-105 hover:shadow-lg border-2 border-gray-200 hover:border-gray-400"
                        style={{ backgroundColor: branding.accent_color }}
                        title="Click to pick color"
                      />
                      <input
                        type="color"
                        value={branding.accent_color}
                        onChange={(e) => handleDirectColorChange('secondary', e.target.value)}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <div className="flex-1">
                      <Input
                        value={branding.accent_color.toUpperCase()}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^#([0-9A-Fa-f]{0,6})$/.test(value)) {
                            setBranding(prev => ({ ...prev, accent_color: String(value) }));
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value && !validateHexColor(value)) {
                            toast.error('Invalid hex color');
                            setBranding(prev => ({ ...prev, accent_color: '#16A34A' }));
                          }
                        }}
                        placeholder="#16A34A"
                        className="font-mono"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <p className="trades-caption text-muted">Click color square to open picker, or enter hex code</p>
                </div>
              </div>
            </div>
          </Card>

          {/* ========== MORE COLORS DIALOG ========== */}
          <Dialog open={moreColorsOpen !== null} onOpenChange={(open) => !open && setMoreColorsOpen(null)}>
            <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Choose {moreColorsOpen === 'primary' ? 'Primary' : 'Secondary'} Color
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-8 gap-2 p-4">
                {ALL_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleMoreColorsSelect(color)}
                    className="w-full aspect-square rounded-md border-2 border-gray-200 hover:border-gray-400 hover:scale-110 transition-all"
                    style={{ backgroundColor: color }}
                    title={color}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setMoreColorsOpen(null)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ========== PREVIEW SECTION ========== */}
          <Card className="p-4">
            <h2 className="trades-h2 text-ink mb-4">Preview</h2>
            <p className="trades-caption text-muted mb-4">
              See how your branding looks on invoices and quotes
            </p>
            <div className="border border-border rounded-lg overflow-hidden bg-gray-50 p-4">
              <div className="w-full flex justify-center" style={{ height: '379px' }}>
                <div className="transform scale-[0.45] origin-top">
                  <InvoiceA4Page>
                    <TemplateRenderer
                      templateId={branding.selected_template || 'classic'}
                      document={sampleInvoiceData}
                      documentType="invoice"
                      branding={branding}
                      preview={true}
                    />
                  </InvoiceA4Page>
                </div>
              </div>
            </div>
          </Card>
      </div>
    </ScreenLayout>
  );
}
