/**
 * Template-based PDF Generation utility for quotes and invoices
 * Uses the actual invoice template components for perfect consistency
 * Generates proper PDF files for professional document sharing
 * 
 * FIXED: Now uses the exact same approach as the working quote system
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { TemplateRenderer } from '../components/ui/invoice-templates/template-renderer';
import { BrandingProvider } from './branding-context';
import { api } from './api';
import { generateFileName, formatClientName, formatJobTitle } from './document-naming';
import { toast } from 'sonner@2.0.3';

// Import jsPDF for actual PDF generation (same as quote system)
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Gets the business details and branding settings (copied from working quote system)
 */
async function getBusinessAndBrandingData() {
  try {
    // Add timeout protection to API calls
    const businessPromise = api.getBusinessDetails();
    const brandingPromise = api.getBranding();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Business data fetch timeout')), 5000)
    );
    
    const [businessDetails, branding] = await Promise.race([
      Promise.all([businessPromise, brandingPromise]),
      timeoutPromise
    ]) as [any, any];

    const companyName = businessDetails?.companyName || 'Your Business';
    
    let businessAddress = '123 Trade Street, Manchester, M1 1AA';
    if (businessDetails?.registeredAddress) {
      const address = businessDetails.tradingAddressDifferent 
        ? businessDetails.tradingAddress 
        : businessDetails.registeredAddress;
        
      if (address) {
        const parts = [
          address.line1,
          address.line2,
          address.city,
          address.postcode,
          address.country !== 'United Kingdom' ? address.country : ''
        ].filter(Boolean);
        
        businessAddress = parts.join(', ');
      }
    }
    
    let businessPhone = '0161 123 4567';
    if (businessDetails?.phoneCountryCode && businessDetails?.phoneNumber) {
      businessPhone = `${businessDetails.phoneCountryCode} ${businessDetails.phoneNumber}`;
    }

    return {
      businessDetails: {
        name: companyName,
        address: businessAddress,
        phone: businessPhone,
        email: businessDetails?.email || 'info@yourbusiness.co.uk'
      },
      branding: {
        logo_url: branding?.logo_url,
        primary_color: branding?.primary_color || '#0A84FF',
        secondary_color: branding?.accent_color || '#16A34A', // Use accent_color as secondary
        business_name: companyName,
        invoice_use_brand_colors: branding?.invoice_use_brand_colors || false,
        invoice_logo_position: branding?.invoice_logo_position || 'left'
      },
      selectedTemplate: branding?.selected_template || 'classic'
    };
  } catch (error) {
    // Silently use defaults - this is expected when business details haven't been set up yet
    // Only log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.debug('Using default business data (business details not yet configured)');
    }
    return {
      businessDetails: {
        name: 'Your Business',
        address: '123 Trade Street, Manchester, M1 1AA',
        phone: '0161 123 4567',
        email: 'info@yourbusiness.co.uk'
      },
      branding: {
        primary_color: '#0A84FF',
        secondary_color: '#16A34A',
        business_name: 'Your Business',
        invoice_use_brand_colors: false,
        invoice_logo_position: 'left'
      },
      selectedTemplate: 'classic'
    };
  }
}

/**
 * Creates an actual PDF file using jsPDF and html2canvas (copied from working quote system)
 */
async function createActualPDF(htmlElement: HTMLElement, filename: string, brandingData?: any): Promise<Blob> {
  try {
    // Force light mode and override problematic colors before capturing
    const originalClasses = htmlElement.className;
    htmlElement.classList.remove('dark');
    
    // Use the same approach as the working quote system
    const primaryColor = brandingData?.invoice_use_brand_colors ? brandingData?.primary_color || '#0A84FF' : '#0A84FF';
    
    // Create style override for PDF generation (exact same as quote system)
    const styleOverride = document.createElement('style');
    styleOverride.textContent = `
      /* CRITICAL: Force RGB/HEX colors ONLY - jsPDF cannot parse oklch() */
      :root, * {
        --background: rgb(255, 255, 255) !important;
        --foreground: rgb(17, 24, 39) !important;
        --card: rgb(255, 255, 255) !important;
        --card-foreground: rgb(17, 24, 39) !important;
        --popover: rgb(255, 255, 255) !important;
        --popover-foreground: rgb(17, 24, 39) !important;
        --primary: ${primaryColor} !important;
        --primary-foreground: rgb(255, 255, 255) !important;
        --secondary: rgb(249, 250, 251) !important;
        --secondary-foreground: rgb(17, 24, 39) !important;
        --muted: rgb(107, 114, 128) !important;
        --muted-foreground: rgb(107, 114, 128) !important;
        --accent: rgb(249, 250, 251) !important;
        --accent-foreground: rgb(17, 24, 39) !important;
        --destructive: rgb(220, 38, 38) !important;
        --destructive-foreground: rgb(255, 255, 255) !important;
        --border: rgb(229, 231, 235) !important;
        --input: transparent !important;
        --ring: ${primaryColor} !important;
        --chart-1: ${primaryColor} !important;
        --chart-2: rgb(22, 163, 74) !important;
        --chart-3: rgb(245, 158, 11) !important;
        --chart-4: rgb(220, 38, 38) !important;
        --chart-5: rgb(107, 114, 128) !important;
        --sidebar: rgb(255, 255, 255) !important;
        --sidebar-foreground: rgb(17, 24, 39) !important;
        --sidebar-primary: ${primaryColor} !important;
        --sidebar-primary-foreground: rgb(255, 255, 255) !important;
        --sidebar-accent: rgb(249, 250, 251) !important;
        --sidebar-accent-foreground: rgb(17, 24, 39) !important;
        --sidebar-border: rgb(229, 231, 235) !important;
        --sidebar-ring: ${primaryColor} !important;
        
        /* Tailwind v4 color format override - force RGB */
        --color-primary: ${primaryColor} !important;
        --color-primary-foreground: rgb(255, 255, 255) !important;
        --color-background: rgb(255, 255, 255) !important;
        --color-foreground: rgb(17, 24, 39) !important;
        --color-border: rgb(229, 231, 235) !important;
        --color-muted: rgb(107, 114, 128) !important;
        --color-muted-foreground: rgb(107, 114, 128) !important;
      }
      
      /* Override any oklch values with standard colors */
      .dark * {
        background-color: rgb(255, 255, 255) !important;
        color: rgb(17, 24, 39) !important;
      }
      
      /* Ensure text colors are readable - FIXED: Don't override inline styles */
      .text-gray-900, .text-foreground {
        color: #111827 !important;
      }
      
      .text-gray-700 {
        color: #374151 !important;
      }
      
      .text-gray-600 {
        color: #4B5563 !important;
      }
      
      .text-gray-500, .text-muted-foreground {
        color: #6B7280 !important;
      }
      
      .bg-white, .bg-card {
        background-color: #ffffff !important;
      }
      
      .bg-gray-50, .bg-secondary {
        background-color: #F9FAFB !important;
      }
      
      .border, .border-border {
        border-color: #E5E7EB !important;
      }

      /* Fix description column text wrapping in PDF */
      table td, table th {
        word-wrap: break-word !important;
        word-break: normal !important;
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
      }
      
      /* Specific fixes for description column (first column) */
      table td:first-child, table th:first-child {
        word-wrap: break-word !important;
        word-break: break-word !important;
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        hyphens: auto !important;
        max-width: none !important;
        min-width: 0 !important;
      }
      
      /* Remove any line clamps that might truncate text */
      .line-clamp-1, .line-clamp-2, .line-clamp-3 {
        display: block !important;
        -webkit-line-clamp: unset !important;
        -webkit-box-orient: unset !important;
        overflow: visible !important;
        white-space: normal !important;
        word-wrap: break-word !important;
      }
    `;
    
    document.head.appendChild(styleOverride);

    // Get the actual rendered height of the container
    const actualHeight = htmlElement.scrollHeight || htmlElement.offsetHeight;
    const containerWidth = 595; // A4 width

    // Configure html2canvas for dynamic height rendering with timeout
    const canvas = await Promise.race([
      html2canvas(htmlElement, {
        scale: 3, // High quality for crisp text in PDFs
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: containerWidth,
        height: actualHeight, // Use actual content height
        windowWidth: containerWidth,
        windowHeight: actualHeight,
        logging: false, // Disable logging to avoid console spam
      onclone: (clonedDoc) => {
        // Ensure the cloned document doesn't have dark mode
        const clonedBody = clonedDoc.body;
        clonedBody.classList.remove('dark');
        
        // Force light background on all elements and strip oklch colors
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el: any) => {
          if (el.classList) {
            el.classList.remove('dark');
          }
          
          // CRITICAL FIX: Strip any oklch() color values from computed styles
          // Use clonedDoc.defaultView instead of window to avoid cross-origin errors
          if (el.style && clonedDoc.defaultView) {
            try {
              const computedStyle = clonedDoc.defaultView.getComputedStyle(el);
              ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 
               'borderBottomColor', 'borderLeftColor', 'fill', 'stroke'].forEach(prop => {
                const value = computedStyle.getPropertyValue(prop);
                if (value && value.includes('oklch')) {
                  // Replace oklch with fallback color
                  if (prop === 'color') el.style[prop] = 'rgb(17, 24, 39)';
                  else if (prop === 'backgroundColor') el.style[prop] = 'rgb(255, 255, 255)';
                  else if (prop.includes('border')) el.style[prop] = 'rgb(229, 231, 235)';
                }
              });
            } catch (e) {
              // Silently ignore cross-origin errors
              console.debug('Could not read computed style:', e);
            }
          }
        });

        // Force proper text wrapping for table cells to fix description cutoff
        const tableCells = clonedDoc.querySelectorAll('table td, table th');
        tableCells.forEach((cell: any) => {
          cell.style.wordWrap = 'break-word';
          cell.style.whiteSpace = 'normal';
          cell.style.overflow = 'visible';
          cell.style.textOverflow = 'clip';
        });

        // Remove any line-clamp classes that might truncate descriptions
        const lineClampElements = clonedDoc.querySelectorAll('.line-clamp-1, .line-clamp-2, .line-clamp-3');
        lineClampElements.forEach((el: any) => {
          el.classList.remove('line-clamp-1', 'line-clamp-2', 'line-clamp-3');
          el.style.display = 'block';
          el.style.webkitLineClamp = 'unset';
          el.style.webkitBoxOrient = 'unset';
          el.style.overflow = 'visible';
          el.style.whiteSpace = 'normal';
          el.style.wordWrap = 'break-word';
        });
      }
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('PDF generation timeout')), 10000)
    )
  ]);

    // Clean up style override
    document.head.removeChild(styleOverride);
    htmlElement.className = originalClasses;

    // Create PDF with dynamic height support (same as quote system)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    // Calculate dimensions to fit content properly
    const pdfWidth = 595; // A4 width in points
    const pdfHeight = 842; // A4 height in points
    
    // Scale the content to fit the page width while maintaining aspect ratio
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add some tolerance to prevent unnecessary page breaks due to minor overflow
    const pageHeightTolerance = 150; // Increased tolerance to 150pt to prevent unnecessary page breaks
    
    console.log('PDF Generation Debug:', {
      canvasHeight: canvas.height,
      canvasWidth: canvas.width,
      imgHeight,
      pdfHeight,
      tolerance: pageHeightTolerance,
      totalAllowed: pdfHeight + pageHeightTolerance,
      willCreateMultiplePages: imgHeight > (pdfHeight + pageHeightTolerance)
    });
    
    // If content is significantly longer than one page, create multiple pages
    if (imgHeight > (pdfHeight + pageHeightTolerance)) {
      // Calculate how many pages we need
      const pages = Math.ceil(imgHeight / pdfHeight);
      
      for (let page = 0; page < pages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        // Calculate the portion of the image for this page
        const sourceY = (page * pdfHeight * canvas.width) / imgWidth;
        const sourceHeight = Math.min((pdfHeight * canvas.width) / imgWidth, canvas.height - sourceY);
        
        // Create a canvas for this page
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        
        // Draw the portion of the original canvas for this page
        pageCtx?.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
        
        const pageImgData = pageCanvas.toDataURL('image/png');
        const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
        
        pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, pageImgHeight);
      }
    } else {
      // Single page - add normally (fit to page even if slightly larger)
      const imgData = canvas.toDataURL('image/png');
      const finalHeight = Math.min(imgHeight, pdfHeight); // Ensure it doesn't exceed page height
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, finalHeight);
    }

    // Return as blob
    return pdf.output('blob');
    
  } catch (error) {
    console.error('Failed to create PDF with jsPDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

/**
 * Generates a PDF using the selected template and document data (FIXED VERSION)
 */
export async function generateTemplatePDF(
  templateId: string,
  documentData: any,
  documentType: 'invoice' | 'quote',
  branding: any,
  bankDetails?: any
): Promise<Blob> {
  try {
    // Load business details and branding exactly like the working quote system
    const { businessDetails, branding: brandingData, selectedTemplate } = await getBusinessAndBrandingData();

    // Calculate dynamic height based on number of line items - OPTIMIZED FOR SINGLE PAGE
    const baseHeight = 842; // Base A4 height
    const numberOfItems = documentData.line_items?.length || 0;
    
    // Force single page for typical documents (up to 20 items with ultra-compressed CSS)
    let dynamicHeight;
    if (numberOfItems <= 20) {
      dynamicHeight = 842; // Force standard A4 height to encourage single page
    } else {
      // Only allow dynamic height for extremely large documents
      const itemHeight = 35; // Reduced from 40 due to ultra-compressed spacing
      const additionalHeight = Math.max(0, (numberOfItems - 20) * itemHeight);
      dynamicHeight = baseHeight + additionalHeight;
    }

    // Create a hidden container for rendering the template (same as quote system)
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '595px'; // A4 width in CSS pixels
    container.style.height = `${dynamicHeight}px`; // Dynamic height
    container.style.backgroundColor = 'white';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.overflow = 'visible'; // Allow content to flow beyond container
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    container.style.color = '#111827';
    container.classList.remove('dark'); // Ensure no dark mode
    document.body.appendChild(container);

    // Create React root and render the template
    return new Promise((resolve, reject) => {
      try {
        const root = createRoot(container);
        
        // Render using the EXACT same approach as the working quote system
        root.render(
          <BrandingProvider>
            <div style={{
              width: '595px',
              minHeight: `${dynamicHeight}px`, // Dynamic minimum height
              backgroundColor: 'white',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '12px',
              lineHeight: '1.4',
              color: '#111827',
              overflow: 'visible' // Allow content to flow
            }} className="pdf-optimized">
              <TemplateRenderer
                templateId={templateId}
                document={documentData}
                documentType={documentType}
                branding={{
                  logo_url: brandingData?.logo_url,
                  primary_color: brandingData?.primary_color || '#0A84FF',
                  secondary_color: brandingData?.secondary_color || '#16A34A',
                  business_name: brandingData?.business_name,
                  invoice_use_brand_colors: brandingData?.invoice_use_brand_colors || false,
                  invoice_logo_position: brandingData?.invoice_logo_position || 'left'
                }}
                logoPosition={brandingData?.invoice_logo_position || 'left'}
                preview={true} // CRITICAL: Use preview={true} like the working quote system
                bankDetails={bankDetails}
              />
            </div>
          </BrandingProvider>
        );

        // Add timeout protection for PDF generation
        const renderTimeout = setTimeout(() => {
          console.error('PDF generation timed out after 15 seconds');
          
          // Cleanup on timeout
          try {
            root.unmount();
            if (document.body.contains(container)) {
              document.body.removeChild(container);
            }
          } catch (cleanupError) {
            console.warn('Cleanup error on timeout:', cleanupError);
          }
          
          reject(new Error('PDF generation timed out after 15 seconds'));
        }, 15000);

        // Wait for React to render completely, then create the actual PDF
        setTimeout(async () => {
          try {
            // Create actual PDF using jsPDF with timeout protection
            const pdfBlob = await Promise.race([
              createActualPDF(container, `${documentType === 'invoice' ? 'Invoice' : 'Quote'}-${documentData.invoice_number || documentData.number}`, brandingData),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('PDF creation timed out')), 10000)
              )
            ]);
            
            // Clear the timeout
            clearTimeout(renderTimeout);
            
            // Cleanup React components
            root.unmount();
            document.body.removeChild(container);
            
            resolve(pdfBlob);
            
          } catch (pdfError) {
            console.error('PDF generation failed:', pdfError);
            
            // Clear the timeout
            clearTimeout(renderTimeout);
            
            // Cleanup
            try {
              root.unmount();
              if (document.body.contains(container)) {
                document.body.removeChild(container);
              }
            } catch (cleanupError) {
              console.warn('Cleanup error:', cleanupError);
            }
            
            reject(pdfError);
          }
        }, 1500); // Reduced wait time for faster response
        
      } catch (error) {
        console.error('React rendering failed:', error);
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        reject(error);
      }
    });

  } catch (error) {
    console.error('Failed to generate PDF with template:', error);
    throw new Error('Failed to generate PDF with template');
  }
}

/**
 * Downloads a document PDF using the selected template
 * NOTE: For invoices with WhatsApp, use downloadInvoiceWithTemplateAndOpenWhatsApp instead
 */
export async function downloadTemplatePDF(
  templateId: string,
  documentData: any,
  documentType: 'invoice' | 'quote',
  branding: any,
  bankDetails?: any
): Promise<void> {
  const loadingToast = toast.loading(`Generating ${documentType}...`);
  
  try {
    // Generate the actual PDF blob using jsPDF (same as quote system)
    const pdfBlob = await generateTemplatePDF(templateId, documentData, documentType, branding, bankDetails);
    
    // Create download link and trigger download
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate professional filename using unified naming system
    const documentNumber = documentData.invoice_number || documentData.number || 'DRAFT';
    const clientName = formatClientName(documentData.client);
    const jobTitle = documentData.job || documentData.title;
    
    // Determine invoice type from document metadata if available
    let invoiceType: 'deposit' | 'remaining' | 'selected' | 'custom' | undefined;
    if (documentType === 'invoice' && documentData.invoiceType) {
      invoiceType = documentData.invoiceType;
    } else if (documentType === 'invoice') {
      // Try to infer type from document content or filename patterns
      const description = documentData.notes || documentData.description || '';
      if (description.toLowerCase().includes('deposit')) {
        invoiceType = 'deposit';
      } else if (description.toLowerCase().includes('remaining') || description.toLowerCase().includes('balance')) {
        invoiceType = 'remaining';
      }
    }
    
    const fileName = generateFileName(documentType, {
      documentNumber,
      clientName,
      jobTitle,
      date: new Date().toISOString().split('T')[0].replace(/-/g, '_'),
      invoiceType
    });
    
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    console.log('📄 Downloaded PDF with filename:', fileName);
    
    toast.dismiss(loadingToast);
    toast.success(`${documentType === 'invoice' ? 'Invoice' : 'Quote'} downloaded, redirecting to WhatsApp`);
    
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    toast.dismiss(loadingToast);
    toast.error(`Failed to download ${documentType}`);
    throw error;
  }
}

/**
 * Downloads an invoice PDF and opens WhatsApp with a pre-filled message
 */
export async function downloadInvoiceWithTemplateAndOpenWhatsApp(
  invoiceData: any,
  clientData: any,
  branding: any,
  bankDetails?: any,
  whatsappPhone?: string
): Promise<void> {
  try {
    // Download the PDF first with timeout protection
    await Promise.race([
      downloadTemplatePDF(
        branding?.selected_template || 'classic',
        invoiceData,
        'invoice',
        branding,
        bankDetails
      ),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('PDF download timed out after 20 seconds')), 20000)
      )
    ]);
    
    // Open WhatsApp with message if phone provided
    if (whatsappPhone) {
      // Determine invoice type for WhatsApp message using comprehensive detection
      const isDepositInvoice = 
        // Primary detection methods (from template data)
        invoiceData.is_deposit_invoice === true ||
        invoiceData.billType === 'deposit' || 
        invoiceData.isDepositInvoice === true ||
        invoiceData.type === 'deposit' || 
        // Additional detection via amount comparison
        (invoiceData.deposit_amount && invoiceData.remaining_balance) ||
        // Text-based detection
        invoiceData.description?.toLowerCase().includes('deposit') ||
        invoiceData.notes?.toLowerCase().includes('deposit') ||
        invoiceData.payment_terms?.toLowerCase().includes('deposit') ||
        (invoiceData.invoice_number && invoiceData.invoice_number.toLowerCase().includes('deposit')) ||
        // Fallback: Check line items
        invoiceData.line_items?.some((item: any) => 
          item.description?.toLowerCase().includes('deposit')
        );
      
      const invoiceType = isDepositInvoice ? 'Deposit Invoice' : 'Invoice';
      
      // Debug logging for deposit detection
      console.log('🔍 WhatsApp deposit detection:', {
        isDepositInvoice,
        is_deposit_invoice: invoiceData.is_deposit_invoice,
        billType: invoiceData.billType,
        deposit_amount: invoiceData.deposit_amount,
        remaining_balance: invoiceData.remaining_balance,
        detectedAs: invoiceType
      });
      
      const formattedTotal = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(invoiceData.total);
      const formattedIssueDate = invoiceData.issue_date ? new Date(invoiceData.issue_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const formattedDueDate = invoiceData.due_date ? new Date(invoiceData.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      
      let message = `Hi ${clientData.name.split(' ')[0]},\n\n`;
      message += `Your ${invoiceType.toLowerCase()} is ready for ${invoiceData.job || 'your recent project'}.\n\n`;
      message += `*INVOICE DETAILS*\n`;
      message += `Invoice Number: ${invoiceData.invoice_number}\n`;
      if (formattedIssueDate) {
        message += `Issue Date: ${formattedIssueDate}\n`;
      }
      message += `\n*AMOUNT DUE*\n`;
      message += `${formattedTotal}\n\n`;
      if (formattedDueDate) {
        message += `*DUE DATE*\n`;
        message += `${formattedDueDate}\n\n`;
      }
      
      // Add deposit-specific information
      if (isDepositInvoice && invoiceData.remaining_balance) {
        const formattedRemaining = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(invoiceData.remaining_balance);
        message += `*PROJECT BREAKDOWN*\n`;
        message += `Deposit Due: ${formattedTotal}\n`;
        message += `Remaining Balance: ${formattedRemaining}\n\n`;
      }
      
      message += `────────────────\n\n`;
      message += `Please see the attached invoice PDF for full details.\n\n`;
      message += `Let me know if you have any questions!\n\n`;
      message += `Thanks`;
      
      const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
      
      // Small delay to allow download to start
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 500);
    }
    
  } catch (error) {
    console.error('Failed to generate invoice with template and open WhatsApp:', error);
    throw error;
  }
}

/**
 * Legacy function - generates a quote PDF using the exact same template as invoices
 */
export async function generateQuoteWithTemplate(
  quote: any,
  client: any
): Promise<Blob> {
  try {
    // Convert quote data to template format
    const templateData = {
      id: quote.id,
      number: quote.number,
      title: quote.title,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      status: 'quote',
      client: {
        id: 'quote-client',
        name: client?.name || 'Unknown Client',
        email: client?.email || '',
        phone: client?.phone || '',
        address: client?.address || ''
      },
      business: {
        name: 'Your Business',
        address: '',
        phone: '',
        email: ''
      },
      line_items: (quote.lineItems || []).map((item: any, index: number) => ({
        id: `quote-item-${index}`,
        description: item.description,
        quantity: item.qty,
        rate: item.price,
        amount: item.total
      })),
      subtotal: quote.subtotal,
      vat_amount: quote.vatAmount || 0,
      total: quote.total,
      notes: quote.notes,
      quote_title: quote.title,
      quote_valid_until: quote.validUntil,
      quote_created_at: quote.createdAt
    };

    return generateTemplatePDF('classic', templateData, 'quote', {}, undefined);
    
  } catch (error) {
    console.error('Failed to generate quote with template:', error);
    throw error;
  }
}

/**
 * Downloads a quote PDF using the selected invoice template
 * NOTE: Toast messages are handled by the calling component
 */
export async function downloadQuotePDFWithTemplate(
  quote: any,
  client: any
): Promise<void> {
  try {
    const pdfBlob = await generateQuoteWithTemplate(quote, client);
    
    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate professional filename using unified naming system
    const documentNumber = quote.number || 'DRAFT';
    const clientName = formatClientName(client);
    const jobTitle = formatJobTitle(quote);
    
    const fileName = generateFileName('quote', {
      documentNumber,
      clientName,
      jobTitle,
      date: new Date().toISOString().split('T')[0].replace(/-/g, '_')
    });
    
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    console.log('📄 Downloaded quote PDF with filename:', fileName);
    
  } catch (error) {
    console.error('Failed to download quote PDF:', error);
    throw error;
  }
}

/**
 * Downloads a quote PDF and opens WhatsApp with a pre-filled message
 */
export async function downloadQuoteWithTemplateAndOpenWhatsApp(
  quote: any,
  client: any,
  whatsappPhone?: string
): Promise<void> {
  try {
    // Download the PDF first
    await downloadQuotePDFWithTemplate(quote, client);
    
    // Open WhatsApp with message if phone provided
    if (whatsappPhone) {
      const formattedTotal = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(quote.total);
      const validUntilDate = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      
      let message = `Hi ${client.name.split(' ')[0]},\n\n`;
      message += `I've prepared a quote for your upcoming project.\n\n`;
      message += `*QUOTE DETAILS*\n`;
      message += `Project: ${quote.title}\n`;
      message += `Quote Number: ${quote.number}\n\n`;
      message += `*TOTAL COST*\n`;
      message += `${formattedTotal}\n\n`;
      if (validUntilDate) {
        message += `*VALID UNTIL*\n`;
        message += `${validUntilDate}\n\n`;
      }
      message += `────────────────\n\n`;
      message += `Please see the attached quote PDF for full details.\n\n`;
      message += `Let me know if you have any questions or would like to proceed!\n\n`;
      message += `Thanks`;
      
      const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
      
      // Small delay to allow download to start
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 500);
    }
    
  } catch (error) {
    console.error('Failed to generate quote with template and open WhatsApp:', error);
    throw error;
  }
}