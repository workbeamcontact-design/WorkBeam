/**
 * Accessibility helper functions and utilities
 * Provides common accessibility patterns and aria label generators
 */

// Common aria labels for button types
export const AriaLabels = {
  // Navigation
  back: 'Go back to previous screen',
  close: 'Close dialog',
  menu: 'Open navigation menu',
  search: 'Search',
  filter: 'Open filter options',
  
  // Actions
  edit: (item: string) => `Edit ${item}`,
  delete: (item: string) => `Delete ${item}`,
  view: (item: string) => `View ${item} details`,
  add: (item: string) => `Add new ${item}`,
  save: 'Save changes',
  cancel: 'Cancel action',
  
  // Status changes
  approve: (item: string) => `Approve ${item}`,
  reject: (item: string) => `Reject ${item}`,
  complete: (item: string) => `Mark ${item} as complete`,
  
  // Financial
  recordPayment: (invoice: string) => `Record payment for ${invoice}`,
  generateInvoice: (job: string) => `Generate invoice for ${job}`,
  downloadPdf: (document: string) => `Download ${document} as PDF`,
  sendWhatsApp: (contact: string) => `Send ${contact} via WhatsApp`,
  
  // Client actions
  callClient: (name: string) => `Call ${name}`,
  messageClient: (name: string) => `Send message to ${name}`,
  emailClient: (name: string) => `Send email to ${name}`,
  
  // Common icons without text
  calendar: 'Calendar',
  clock: 'Time',
  location: 'Location',
  phone: 'Phone',
  email: 'Email',
  settings: 'Settings',
  notifications: 'Notifications',
  profile: 'User profile'
};

// Generate dynamic aria labels
export const generateAriaLabel = {
  listItem: (index: number, total: number, item: string) => 
    `${item}, item ${index + 1} of ${total}`,
    
  progressIndicator: (current: number, total: number, description: string) =>
    `${description}, step ${current} of ${total}`,
    
  statusBadge: (status: string, item: string) =>
    `${item} status: ${status}`,
    
  moneyAmount: (amount: number, currency = '£') =>
    `Amount: ${currency}${amount.toFixed(2)}`,
    
  dateRange: (start: string, end: string) =>
    `Date range from ${start} to ${end}`,
    
  sortButton: (column: string, direction?: 'asc' | 'desc') =>
    `Sort by ${column}${direction ? ` in ${direction}ending order` : ''}`,
    
  expandButton: (isExpanded: boolean, item: string) =>
    `${isExpanded ? 'Collapse' : 'Expand'} ${item}`,
    
  toggleButton: (isOn: boolean, feature: string) =>
    `${isOn ? 'Disable' : 'Enable'} ${feature}`
};

// Accessibility state helpers
export const AccessibilityState = {
  setExpanded: (element: HTMLElement, expanded: boolean) => {
    element.setAttribute('aria-expanded', expanded.toString());
  },
  
  setPressed: (element: HTMLElement, pressed: boolean) => {
    element.setAttribute('aria-pressed', pressed.toString());
  },
  
  setSelected: (element: HTMLElement, selected: boolean) => {
    element.setAttribute('aria-selected', selected.toString());
  },
  
  setCurrent: (element: HTMLElement, current: boolean | string) => {
    if (typeof current === 'boolean') {
      if (current) {
        element.setAttribute('aria-current', 'true');
      } else {
        element.removeAttribute('aria-current');
      }
    } else {
      element.setAttribute('aria-current', current);
    }
  },
  
  setLabel: (element: HTMLElement, label: string) => {
    element.setAttribute('aria-label', label);
  },
  
  setDescription: (element: HTMLElement, description: string) => {
    // Create or update description element
    let descId = element.getAttribute('aria-describedby');
    if (!descId) {
      descId = `desc-${Math.random().toString(36).substr(2, 9)}`;
      element.setAttribute('aria-describedby', descId);
    }
    
    let descElement = document.getElementById(descId);
    if (!descElement) {
      descElement = document.createElement('div');
      descElement.id = descId;
      descElement.className = 'sr-only';
      document.body.appendChild(descElement);
    }
    
    descElement.textContent = description;
  }
};

// Common accessibility patterns
export const AccessibilityPatterns = {
  // Make a button announce its action clearly
  announceableButton: (element: HTMLButtonElement, action: string) => {
    if (!element.getAttribute('aria-label') && !element.textContent?.trim()) {
      element.setAttribute('aria-label', action);
    }
  },
  
  // Create a dismissible alert
  createAlert: (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const alert = document.createElement('div');
    alert.setAttribute('role', 'alert');
    alert.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    alert.className = `sr-only alert-${type}`;
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(alert);
    }, 1000);
  },
  
  // Create skip link
  createSkipLink: (target: string, text: string) => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${target}`;
    skipLink.textContent = text;
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-white focus:px-3 focus:py-2 focus:rounded';
    
    return skipLink;
  },
  
  // Ensure form fields have proper labels
  ensureFormFieldLabel: (input: HTMLInputElement) => {
    const id = input.id || `input-${Math.random().toString(36).substr(2, 9)}`;
    input.id = id;
    
    // Check for existing label
    let label = document.querySelector(`label[for="${id}"]`);
    if (!label && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
      // Create label from placeholder or name
      const labelText = input.placeholder || input.name || input.type;
      if (labelText) {
        input.setAttribute('aria-label', labelText);
      }
    }
  }
};

// Auto-fix common accessibility issues
export const autoFixAccessibility = () => {
  // Fix buttons without accessible names
  document.querySelectorAll('button').forEach((button) => {
    if (!button.getAttribute('aria-label') && 
        !button.getAttribute('aria-labelledby') && 
        !button.textContent?.trim()) {
      
      // Try to infer purpose from context
      const iconElement = button.querySelector('svg, i, [class*="icon"]');
      if (iconElement) {
        // Common icon patterns - get className as string
        const classNames = iconElement.className.toString();
        if (classNames.includes('close') || classNames.includes('x')) {
          button.setAttribute('aria-label', AriaLabels.close);
        } else if (classNames.includes('menu') || classNames.includes('hamburger')) {
          button.setAttribute('aria-label', AriaLabels.menu);
        } else if (classNames.includes('search')) {
          button.setAttribute('aria-label', AriaLabels.search);
        } else if (classNames.includes('back') || classNames.includes('arrow-left')) {
          button.setAttribute('aria-label', AriaLabels.back);
        } else {
          button.setAttribute('aria-label', 'Button');
        }
      } else {
        button.setAttribute('aria-label', 'Button');
      }
    }
  });
  
  // Fix form fields without labels
  document.querySelectorAll('input, textarea, select').forEach((field) => {
    AccessibilityPatterns.ensureFormFieldLabel(field as HTMLInputElement);
  });
  
  // Fix images without alt text
  document.querySelectorAll('img:not([alt])').forEach((img) => {
    (img as HTMLImageElement).alt = 'Image';
  });
  
  console.log('♿ Auto-fixed common accessibility issues');
};

// Initialize accessibility helpers
export const initializeAccessibilityHelpers = () => {
  // Auto-fix on DOM changes
  const observer = new MutationObserver((mutations) => {
    let shouldAutoFix = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if new interactive elements were added
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'BUTTON' || 
                element.querySelector('button, input, img')) {
              shouldAutoFix = true;
            }
          }
        });
      }
    });
    
    if (shouldAutoFix) {
      // Debounce auto-fix
      clearTimeout((window as any).accessibilityFixTimeout);
      (window as any).accessibilityFixTimeout = setTimeout(autoFixAccessibility, 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Initial auto-fix - run immediately and again after load
  autoFixAccessibility();
  setTimeout(autoFixAccessibility, 100);
  setTimeout(autoFixAccessibility, 1000);
  
  console.log('♿ Accessibility helpers initialized');
};