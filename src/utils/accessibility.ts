/**
 * Accessibility utilities and enhancements for WorkBeam
 * Provides keyboard navigation, screen reader support, and focus management
 */

// Keyboard navigation utilities
export const KeyboardNavigation = {
  // Trap focus within a container
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Focus first element
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },

  // Add skip links for keyboard users
  addSkipLinks: () => {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-white focus:px-3 focus:py-2 focus:rounded';
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  },

  // Handle escape key globally
  handleEscape: (callback: () => void) => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }
};

// Screen reader utilities
export const ScreenReader = {
  // Announce message to screen readers
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Clean up after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Create visually hidden text for screen readers
  createHiddenText: (text: string): HTMLSpanElement => {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    return span;
  },

  // Update page title for navigation
  updatePageTitle: (title: string) => {
    document.title = `${title} - WorkBeam`;
    
    // Announce page change to screen readers
    ScreenReader.announce(`Navigated to ${title}`, 'polite');
  }
};

// Focus management utilities
export const FocusManager = {
  // Store and restore focus
  saveFocus: (): (() => void) => {
    const activeElement = document.activeElement as HTMLElement;
    
    return () => {
      if (activeElement && typeof activeElement.focus === 'function') {
        activeElement.focus();
      }
    };
  },

  // Focus first focusable element in container
  focusFirst: (container: HTMLElement) => {
    const focusable = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    
    focusable?.focus();
  },

  // Create focus trap for modals/dialogs
  createFocusTrap: (container: HTMLElement) => {
    const previousFocus = document.activeElement as HTMLElement;
    
    const cleanup = KeyboardNavigation.trapFocus(container);
    
    return () => {
      cleanup();
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
    };
  }
};

// Color contrast utilities
export const ColorContrast = {
  // Check if color contrast meets WCAG guidelines
  checkContrast: (foreground: string, background: string): {
    ratio: number;
    aa: boolean;
    aaa: boolean;
  } => {
    // Simplified contrast calculation
    // In a real implementation, you'd use a proper color contrast library
    const getLuminance = (color: string): number => {
      // This is a simplified version - use a proper color library in production
      const rgb = parseInt(color.replace('#', ''), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return {
      ratio,
      aa: ratio >= 4.5,
      aaa: ratio >= 7
    };
  }
};

// ARIA utilities
export const AriaUtils = {
  // Set ARIA expanded state
  setExpanded: (element: HTMLElement, expanded: boolean) => {
    element.setAttribute('aria-expanded', expanded.toString());
  },

  // Set ARIA pressed state for toggle buttons
  setPressed: (element: HTMLElement, pressed: boolean) => {
    element.setAttribute('aria-pressed', pressed.toString());
  },

  // Create unique ID for ARIA relationships
  createId: (prefix: string = 'aria'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Associate label with control
  associateLabel: (control: HTMLElement, label: HTMLElement) => {
    const id = AriaUtils.createId('label');
    label.id = id;
    control.setAttribute('aria-labelledby', id);
  },

  // Associate description with control
  associateDescription: (control: HTMLElement, description: HTMLElement) => {
    const id = AriaUtils.createId('desc');
    description.id = id;
    control.setAttribute('aria-describedby', id);
  }
};

// Touch and gesture accessibility
export const TouchAccessibility = {
  // Ensure touch targets are at least 44px
  checkTouchTargets: (): Array<{tagName: string; id: string | null; className: string | null; width: number; height: number}> => {
    const targets = document.querySelectorAll('button, a, input, select, textarea');
    const smallTargets: Array<{tagName: string; id: string | null; className: string | null; width: number; height: number}> = [];

    targets.forEach((target) => {
      const element = target as HTMLElement;
      
      // Skip screen reader only elements and hidden elements
      if (element.classList.contains('sr-only') || 
          element.offsetWidth === 0 || 
          element.offsetHeight === 0 ||
          window.getComputedStyle(element).display === 'none' ||
          window.getComputedStyle(element).visibility === 'hidden') {
        return;
      }

      const rect = target.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        // Store safe representation instead of DOM element
        smallTargets.push({
          tagName: target.tagName,
          id: element.id || null,
          className: element.className || null,
          width: rect.width,
          height: rect.height
        });
      }
    });

    if (smallTargets.length > 0) {
      console.warn(`Found ${smallTargets.length} interactive touch targets smaller than 44px:`, {
        count: smallTargets.length,
        targets: smallTargets.map(t => `${t.tagName}${t.id ? '#' + t.id : ''}${t.className ? '.' + t.className.split(' ')[0] : ''} (${t.width}x${t.height}px)`)
      });
    }

    return smallTargets;
  },

  // Add touch feedback
  addTouchFeedback: (element: HTMLElement) => {
    element.style.transition = 'transform 0.1s ease';
    
    const handleTouchStart = () => {
      element.style.transform = 'scale(0.95)';
    };
    
    const handleTouchEnd = () => {
      element.style.transform = 'scale(1)';
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }
};

// Accessibility audit utilities
export const AccessibilityAudit = {
  // Run basic accessibility audit
  runAudit: (): {
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for images without alt text
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      errors.push(`${images.length} images missing alt text`);
    }

    // Check for buttons without accessible names
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach((button) => {
      if (!button.textContent?.trim()) {
        warnings.push('Button without accessible name found');
      }
    });

    // Check for form inputs without labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    inputs.forEach((input) => {
      const id = input.getAttribute('id');
      if (!id || !document.querySelector(`label[for="${id}"]`)) {
        warnings.push('Form input without proper label found');
      }
    });

    // Check for small touch targets
    const smallTargets = TouchAccessibility.checkTouchTargets();
    if (smallTargets.length > 0) {
      suggestions.push(`${smallTargets.length} touch targets could be larger`);
    }

    // Check for heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      warnings.push('No headings found for page structure');
    }

    return { errors, warnings, suggestions };
  }
};

// Initialize accessibility features
export const initializeAccessibility = () => {
  // Add skip links
  KeyboardNavigation.addSkipLinks();

  // Add global keyboard handlers
  document.addEventListener('keydown', (e) => {
    // Global shortcut: Alt + M to go to main navigation
    if (e.altKey && e.key === 'm') {
      const nav = document.querySelector('[role="navigation"]') as HTMLElement;
      if (nav) {
        FocusManager.focusFirst(nav);
        e.preventDefault();
      }
    }
  });

  // Announce dynamic content changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if significant content was added
        const addedText = Array.from(mutation.addedNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent)
          .join(' ')
          .trim();

        if (addedText.length > 50) {
          ScreenReader.announce('Content updated', 'polite');
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Run initial accessibility audit in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      const audit = AccessibilityAudit.runAudit();
      if (audit.errors.length > 0) {
        console.warn('♿ Accessibility errors:', audit.errors);
      }
      if (audit.warnings.length > 0) {
        console.warn('♿ Accessibility warnings:', audit.warnings);
      }
      if (audit.suggestions.length > 0) {
        console.info('♿ Accessibility suggestions:', audit.suggestions);
      }
    }, 2000);
  }

  console.log('♿ Accessibility features initialized');
};

// Expose accessibility utilities in development
if (process.env.NODE_ENV === 'development') {
  (window as any).accessibility = {
    KeyboardNavigation,
    ScreenReader,
    FocusManager,
    ColorContrast,
    AriaUtils,
    TouchAccessibility,
    AccessibilityAudit
  };
}