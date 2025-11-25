/**
 * Currency Input Utilities
 * Enforces 2 decimal places for all currency/price inputs
 */

/**
 * Formats a number value to maximum 2 decimal places
 * @param value - The input value (string or number)
 * @returns Formatted number with max 2 decimal places
 */
export const formatCurrencyInput = (value: string | number): number => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return 0;
  }
  
  // Round to 2 decimal places
  return Math.round(numValue * 100) / 100;
};

/**
 * Validates and formats input onChange for currency fields
 * Prevents entering more than 2 decimal places
 * @param value - The raw input value
 * @returns Validated and formatted value as string
 */
export const validateCurrencyInput = (value: string): string => {
  // Remove any non-numeric characters except decimal point
  let cleaned = value.replace(/[^\d.]/g, '');
  
  // Only allow one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit to 2 decimal places
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + '.' + parts[1].substring(0, 2);
  }
  
  return cleaned;
};

/**
 * Input props for currency fields
 * Use with Input component: {...getCurrencyInputProps()}
 */
export const getCurrencyInputProps = () => ({
  type: "number",
  step: "0.01",
  min: "0",
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent 'e', '+', '-' in number inputs
    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
      e.preventDefault();
    }
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    // Format to 2 decimal places on blur
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      e.target.value = value.toFixed(2);
    }
  }
});
