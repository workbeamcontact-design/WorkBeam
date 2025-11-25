import React from 'react';
import { formatCurrency } from '../hooks/use-invoice-data';

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  type?: 'labour' | 'materials' | 'other';
}

interface LineItemsTableProps {
  items: LineItem[];
  primaryColor: string;
  secondaryColor?: string;
  style?: 'classic' | 'modern' | 'minimal' | 'corporate' | 'creative' | 'professional';
  className?: string;
  isPage1?: boolean;
  showContinuation?: boolean;
}

export function LineItemsTable({ 
  items, 
  primaryColor, 
  secondaryColor, 
  style = 'classic',
  className = '',
  isPage1 = true,
  showContinuation = false
}: LineItemsTableProps) {
  const headerBgColor = secondaryColor || '#F9FAFB';
  const borderColor = '#E5E7EB';
  
  if (!items || items.length === 0) return null;
  
  return (
    <div className={className}>
      {/* Table continuation header for page 2+ */}
      {showContinuation && !isPage1 && (
        <div className="trades-caption text-gray-500 mb-2">
          Invoice continued from previous page
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden" style={{ borderColor }}>
        {/* Table Header */}
        <div 
          className="border-b"
          style={{ 
            backgroundColor: headerBgColor,
            borderBottomColor: borderColor 
          }}
        >
          <div className="grid grid-cols-12 gap-2 px-3 py-2">
            <div className="col-span-6 trades-label font-semibold text-gray-700">
              Item Description
            </div>
            <div className="col-span-2 trades-label font-semibold text-gray-700 text-center">
              Qty
            </div>
            <div className="col-span-2 trades-label font-semibold text-gray-700 text-right">
              Rate
            </div>
            <div className="col-span-2 trades-label font-semibold text-gray-700 text-right">
              Amount
            </div>
          </div>
        </div>
        
        {/* Table Body */}
        <div className="divide-y" style={{ borderColor }}>
          {items.map((item, index) => (
            <LineItemRow 
              key={item.id || index}
              item={item}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface LineItemRowProps {
  item: LineItem;
  index: number;
}

function LineItemRow({ item, index }: LineItemRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 px-3 py-2 break-inside-avoid">
      {/* Description - Blueprint: wraps up to 2 lines per row on page 1 */}
      <div className="col-span-6 trades-caption text-gray-700">
        <div className="break-words line-clamp-2 leading-tight">
          {item.description}
        </div>
        {/* Show type indicator for labour items */}
        {item.type === 'labour' && (
          <div className="trades-caption text-gray-500 mt-0.5 text-xs">
            (Labour)
          </div>
        )}
      </div>
      
      {/* Quantity */}
      <div className="col-span-2 trades-caption text-gray-700 text-center tabular-nums">
        {item.quantity}
      </div>
      
      {/* Rate */}
      <div className="col-span-2 trades-caption text-gray-700 text-right tabular-nums">
        {formatCurrency(item.rate || item.price || 0)}
      </div>
      
      {/* Amount - Blueprint: Totals column right-aligned */}
      <div className="col-span-2 trades-caption text-gray-700 text-right tabular-nums font-medium">
        {formatCurrency(item.amount || item.total || (item.quantity * (item.rate || item.price || 0)))}
      </div>
    </div>
  );
}

// Pagination helper - splits items into pages
export function paginateLineItems(
  items: LineItem[], 
  maxItemsPage1: number = 8, 
  maxItemsSubsequent: number = 15
): LineItem[][] {
  if (items.length <= maxItemsPage1) {
    return [items]; // All items fit on page 1
  }
  
  const pages: LineItem[][] = [];
  
  // Page 1
  pages.push(items.slice(0, maxItemsPage1));
  
  // Subsequent pages
  let remaining = items.slice(maxItemsPage1);
  while (remaining.length > 0) {
    pages.push(remaining.slice(0, maxItemsSubsequent));
    remaining = remaining.slice(maxItemsSubsequent);
  }
  
  return pages;
}