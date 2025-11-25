import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface CountryCodeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface CountryCode {
  code: string;
  country: string;
  flag: string;
  dialCode: string;
}

const countryCodes: CountryCode[] = [
  { code: 'GB', country: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'US', country: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'CA', country: 'Canada', flag: '🇨🇦', dialCode: '+1' },
  { code: 'AU', country: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: 'IE', country: 'Ireland', flag: '🇮🇪', dialCode: '+353' },
  { code: 'NZ', country: 'New Zealand', flag: '🇳🇿', dialCode: '+64' },
  { code: 'FR', country: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'DE', country: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'ES', country: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { code: 'IT', country: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { code: 'NL', country: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { code: 'BE', country: 'Belgium', flag: '🇧🇪', dialCode: '+32' },
  { code: 'CH', country: 'Switzerland', flag: '🇨🇭', dialCode: '+41' },
  { code: 'AT', country: 'Austria', flag: '🇦🇹', dialCode: '+43' },
  { code: 'SE', country: 'Sweden', flag: '🇸🇪', dialCode: '+46' },
  { code: 'NO', country: 'Norway', flag: '🇳🇴', dialCode: '+47' },
  { code: 'DK', country: 'Denmark', flag: '🇩🇰', dialCode: '+45' },
  { code: 'FI', country: 'Finland', flag: '🇫🇮', dialCode: '+358' },
  { code: 'PL', country: 'Poland', flag: '🇵🇱', dialCode: '+48' },
  { code: 'IN', country: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'PK', country: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { code: 'BD', country: 'Bangladesh', flag: '🇧🇩', dialCode: '+880' },
  { code: 'ZA', country: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: 'NG', country: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { code: 'GH', country: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
  { code: 'KE', country: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: 'EG', country: 'Egypt', flag: '🇪🇬', dialCode: '+20' },
  { code: 'CN', country: 'China', flag: '🇨🇳', dialCode: '+86' },
  { code: 'JP', country: 'Japan', flag: '🇯🇵', dialCode: '+81' },
  { code: 'KR', country: 'South Korea', flag: '🇰🇷', dialCode: '+82' },
  { code: 'SG', country: 'Singapore', flag: '🇸🇬', dialCode: '+65' },
  { code: 'MY', country: 'Malaysia', flag: '🇲🇾', dialCode: '+60' },
  { code: 'TH', country: 'Thailand', flag: '🇹🇭', dialCode: '+66' },
  { code: 'BR', country: 'Brazil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'MX', country: 'Mexico', flag: '🇲🇽', dialCode: '+52' },
  { code: 'AR', country: 'Argentina', flag: '🇦🇷', dialCode: '+54' },
];

export function CountryCodeSelect({ value, onValueChange, className }: CountryCodeSelectProps) {
  // Extract dial code from value (handle both old format "dialCode" and new format "dialCode-countryCode")
  const extractDialCode = (val: string) => {
    if (val.includes('-')) {
      return val.split('-')[0];
    }
    return val;
  };
  
  const dialCode = extractDialCode(value);
  const selectedCountry = countryCodes.find(country => country.dialCode === dialCode) || countryCodes[0];
  
  const handleValueChange = (newValue: string) => {
    const newDialCode = extractDialCode(newValue);
    onValueChange(newDialCode);
  };

  return (
    <Select value={`${selectedCountry.dialCode}-${selectedCountry.code}`} onValueChange={handleValueChange}>
      <SelectTrigger className={`w-full h-11 ${className}`}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="trades-body" style={{ color: 'var(--ink)' }}>
              {selectedCountry.dialCode}
            </span>
            <span className="trades-caption text-muted-foreground">
              {selectedCountry.country}
            </span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {countryCodes.map((country) => (
          <SelectItem key={country.code} value={`${country.dialCode}-${country.code}`}>
            <div className="flex items-center gap-2 w-full">
              <span className="text-lg">{country.flag}</span>
              <span className="trades-body font-medium" style={{ color: 'var(--ink)' }}>
                {country.dialCode}
              </span>
              <span className="trades-caption text-muted-foreground flex-1">
                {country.country}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function getCountryFromDialCode(dialCode: string): CountryCode | undefined {
  return countryCodes.find(country => country.dialCode === dialCode);
}

export function getDialCodeFromCountryCode(countryCode: string): string {
  const country = countryCodes.find(c => c.code === countryCode);
  return country?.dialCode || '+44'; // Default to UK
}