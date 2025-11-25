import { ArrowLeft, Search, Plus, Calendar, User, FileText, Clock, Briefcase } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { EmptyStateIllustration } from "../ui/empty-state-illustration";
import { api } from "../../utils/api";
import { toast } from "sonner@2.0.3";
import { LoadingWrapper, ListSkeleton } from "../ui/loading-states";

interface QuoteListProps {
  filter?: { type: string; title: string } | null;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
  clientId?: string;
  clientName?: string;
}

interface Quote {
  id: string;
  title: string;
  clientId: string;
  clientName?: string;
  status: string;
  total?: number;
  createdAt: string;
  updatedAt?: string;
  validUntil?: string;
  items?: any[];
}

interface Client {
  id: string;
  name: string;
  address?: string;
}

type FilterType = 'all' | 'draft' | 'sent' | 'approved' | 'rejected';

export function QuoteList({ filter, onNavigate, onBack, clientId, clientName }: QuoteListProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Derived state
  const safeFilter = filter || { type: 'all', title: 'All Quotes' };
  const isClientSpecific = !!clientId;

  useEffect(() => {
    loadQuotesAndClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuotesAndClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [quotesData, clientsData, jobsData] = await Promise.all([
        api.getQuotes(),
        api.getClients(),
        api.getJobs()
      ]);

      // Filter by client if clientId is provided
      let filteredQuotes = quotesData || [];
      
      if (clientId) {
        console.log('📋 Filtering quotes for client:', clientId, clientName);
        console.log('📊 Total quotes before filter:', filteredQuotes.length);
        
        filteredQuotes = filteredQuotes.filter((quote: any) => {
          const quoteClientId = quote.clientId || quote.client_id;
          const matches = String(quoteClientId) === String(clientId);
          
          if (matches) {
            console.log('✅ Match found:', quote.title, 'for client', quoteClientId);
          }
          
          return matches;
        });
        
        console.log('📊 Filtered quotes count:', filteredQuotes.length);
      }

      // Enrich quotes with client names
      const enrichedQuotes = filteredQuotes.map((quote: any) => {
        const client = clientsData?.find((c: any) => c.id === quote.clientId);
        return {
          ...quote,
          clientName: client?.name || clientName || 'Unknown Client',
        };
      });

      // Sort quotes by creation date (newest first)
      const sortedQuotes = enrichedQuotes.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setQuotes(sortedQuotes);
      setClients(clientsData || []);
      setJobs(jobsData || []);
    } catch (err) {
      console.error('Failed to load quotes:', err);
      setError('Failed to load quotes');
      toast.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  // Filter configuration - Only essential workflow statuses
  const filterConfig = {
    all: { label: "All quotes", count: quotes.length },
    draft: { 
      label: "Draft", 
      count: quotes.filter(q => q.status === 'draft').length 
    },
    sent: { 
      label: "Sent", 
      count: quotes.filter(q => q.status === 'sent').length 
    },
    approved: { 
      label: "Approved", 
      count: quotes.filter(q => q.status === 'approved').length 
    },
    rejected: { 
      label: "Rejected", 
      count: quotes.filter(q => q.status === 'rejected').length 
    }
  };

  // Filtered and searched quotes
  const filteredQuotes = useMemo(() => {
    let filtered = quotes;

    // Apply filter from props first (if coming from dashboard)
    if (safeFilter.type !== 'all') {
      switch (safeFilter.type) {
        case 'recent':
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          filtered = filtered.filter(quote => new Date(quote.createdAt) >= thirtyDaysAgo);
          break;
        case 'pending':
          filtered = filtered.filter(quote => quote.status === 'pending');
          break;
        case 'approved':
          filtered = filtered.filter(quote => quote.status === 'approved');
          break;
      }
    }

    // Apply active filter
    switch (activeFilter) {
      case 'draft':
        filtered = filtered.filter(q => q.status === 'draft');
        break;
      case 'sent':
        filtered = filtered.filter(q => q.status === 'sent');
        break;
      case 'approved':
        filtered = filtered.filter(q => q.status === 'approved');
        break;
      case 'rejected':
        filtered = filtered.filter(q => q.status === 'rejected');
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(quote => 
        quote.title?.toLowerCase().includes(query) ||
        quote.clientName?.toLowerCase().includes(query)
      );
    }

    // Sort by newest first
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotes, activeFilter, searchQuery, safeFilter.type]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setActiveFilter('all');
  };

  const hasActiveFilters = searchQuery.trim() || activeFilter !== 'all';

  if (error) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="header bg-white p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>{safeFilter.title}</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-red-600" />
            </div>
            <h3 className="trades-h2 mb-2" style={{ color: 'var(--ink)' }}>Unable to Load Quotes</h3>
            <p className="trades-body mb-4" style={{ color: 'var(--muted)' }}>{error}</p>
            <Button onClick={loadQuotesAndClients} className="gap-2">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <LoadingWrapper isLoading={loading} fallback={<ListSkeleton count={8} />}>
        {/* Header */}
        <div className="header bg-white p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>
              {isClientSpecific ? `${clientName} - Quotes` : safeFilter.title}
            </h1>
            <p className="trades-caption text-gray-600">
              {filteredQuotes.length} quote{filteredQuotes.length !== 1 ? 's' : ''}
              {isClientSpecific && ` for ${clientName}`}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={isClientSpecific ? `Search ${clientName}'s quotes...` : "Search quotes or clients..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-0 trades-body placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="filter_bar flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(filterConfig) as FilterType[]).map((filter) => {
            const config = filterConfig[filter];
            const isActive = activeFilter === filter;
            
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg trades-label font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {config.label} ({config.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Quotes List */}
      <div className="flex-1 overflow-y-auto pb-24">
        {filteredQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <EmptyStateIllustration className="w-24 h-24 mb-6 text-gray-300" />
            <h3 className="trades-h2 mb-2" style={{ color: 'var(--ink)' }}>
              {hasActiveFilters ? 'No Quotes Match Your Filters' : 'No Quotes Yet'}
            </h3>
            <p className="trades-body mb-6" style={{ color: 'var(--muted)' }}>
              {hasActiveFilters 
                ? 'Try adjusting your search or filter criteria to find quotes.'
                : 'Create your first quote to get started with professional quotations.'
              }
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button onClick={() => onNavigate('quote-builder')} className="gap-2">
                <Plus size={16} />
                Create First Quote
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredQuotes.map((quote) => {
              const quoteValue = quote.total || 0;
              // Check if this quote has been converted to a job
              // Support both quoteId (server) and originalQuoteId (local storage)
              const convertedToJob = jobs.some(job => job.originalQuoteId === quote.id || job.quoteId === quote.id);
              
              return (
                <div
                  key={quote.id}
                  onClick={() => onNavigate('quote-detail', quote)}
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="trades-body font-medium truncate" style={{ color: 'var(--ink)' }}>
                          {quote.title || 'Untitled Quote'}
                        </h3>
                        {convertedToJob && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 rounded-full flex-shrink-0">
                            <Briefcase size={12} className="text-blue-600" />
                            <span className="trades-caption text-blue-700">Converted</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <User size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="trades-caption text-gray-600 truncate">{quote.clientName}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="trades-caption text-gray-600">
                          {formatDate(quote.createdAt)}
                        </span>
                      </div>

                      {quote.validUntil && (
                        <div className="flex items-center gap-2 mt-2">
                          <Clock size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="trades-caption text-gray-600">
                            Valid until {formatDate(quote.validUntil)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right ml-4 flex-shrink-0">
                      {quoteValue > 0 && (
                        <div className="trades-body font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          {formatCurrency(quoteValue)}
                        </div>
                      )}
                      {!convertedToJob && (
                        <Badge className={`text-xs ${getStatusColor(quote.status)}`}>
                          {getStatusLabel(quote.status)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {quote.items && quote.items.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="trades-caption text-gray-600">
                        {quote.items.length} item{quote.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </LoadingWrapper>
    </div>
  );
}
