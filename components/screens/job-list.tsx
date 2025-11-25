import { ArrowLeft, Search, Plus, Calendar, User, MapPin, Clock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { StatusBadge } from "../trades-ui/status-badge";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { EmptyStateIllustration } from "../ui/empty-state-illustration";
import { api } from "../../utils/api";
import { toast } from "sonner@2.0.3";
import { LoadingWrapper, ListSkeleton } from "../ui/loading-states";

interface JobListProps {
  filter?: { type: string; title: string } | null;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
  clientId?: string;
  clientName?: string;
}

interface Job {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  clientName?: string;
  status: string;
  value?: number;
  estimatedValue?: number;
  total?: number;
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
  address?: string;
}

interface Client {
  id: string;
  name: string;
  address?: string;
}

type FilterType = 'all' | 'scheduled' | 'quote_approved' | 'in_progress' | 'completed';

export function JobList({ filter, onNavigate, onBack, clientId, clientName }: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Derived state
  const safeFilter = filter || { type: 'all', title: 'All Jobs' };
  const isClientSpecific = !!clientId;

  useEffect(() => {
    loadJobsAndClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadJobsAndClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [jobsData, clientsData] = await Promise.all([
        api.getJobs(),
        api.getClients()
      ]);

      // Filter by client if clientId is provided
      let filteredJobs = jobsData || [];
      
      if (clientId) {
        console.log('📋 Filtering jobs for client:', clientId, clientName);
        console.log('📊 Total jobs before filter:', filteredJobs.length);
        
        filteredJobs = filteredJobs.filter((job: any) => {
          const jobClientId = job.clientId || job.client_id;
          const matches = String(jobClientId) === String(clientId);
          
          if (matches) {
            console.log('✅ Match found:', job.title, 'for client', jobClientId);
          }
          
          return matches;
        });
        
        console.log('📊 Filtered jobs count:', filteredJobs.length);
      }

      // Enrich jobs with client names
      const enrichedJobs = filteredJobs.map((job: any) => {
        const client = clientsData?.find((c: any) => c.id === job.clientId);
        return {
          ...job,
          clientName: client?.name || clientName || 'Unknown Client',
          address: client?.address || job.address
        };
      });

      // Sort jobs by creation date (newest first)
      const sortedJobs = enrichedJobs.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setJobs(sortedJobs);
      setClients(clientsData || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      setError('Failed to load jobs');
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  // Filter configuration - Only essential workflow statuses
  const filterConfig = {
    all: { label: "All jobs", count: jobs.length },
    scheduled: { 
      label: "Scheduled", 
      count: jobs.filter(j => j.status === 'scheduled').length 
    },
    quote_approved: { 
      label: "Quote approved", 
      count: jobs.filter(j => j.status === 'quote_approved').length 
    },
    in_progress: { 
      label: "In progress", 
      count: jobs.filter(j => j.status === 'in_progress').length 
    },
    completed: { 
      label: "Completed", 
      count: jobs.filter(j => j.status === 'completed').length 
    }
  };

  // Filtered and searched jobs
  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    // Apply filter from props first (if coming from dashboard)
    if (safeFilter.type !== 'all') {
      switch (safeFilter.type) {
        case 'recent':
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          filtered = filtered.filter(job => new Date(job.createdAt) >= thirtyDaysAgo);
          break;
        case 'active':
          filtered = filtered.filter(job => ['quote_pending', 'quote_approved', 'in_progress'].includes(job.status));
          break;
        case 'completed':
          filtered = filtered.filter(job => job.status === 'completed');
          break;
      }
    }

    // Apply active filter
    switch (activeFilter) {
      case 'scheduled':
        filtered = filtered.filter(j => j.status === 'scheduled');
        break;
      case 'quote_approved':
        filtered = filtered.filter(j => j.status === 'quote_approved');
        break;
      case 'in_progress':
        filtered = filtered.filter(j => j.status === 'in_progress');
        break;
      case 'completed':
        filtered = filtered.filter(j => j.status === 'completed');
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job => 
        job.title?.toLowerCase().includes(query) ||
        job.clientName?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.address?.toLowerCase().includes(query)
      );
    }

    // Sort by newest first
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [jobs, activeFilter, searchQuery, safeFilter.type]);

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
      case 'quote_pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'quote_approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'on_hold': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'quote_pending': return 'Quote Pending';
      case 'quote_approved': return 'Quote Approved';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'on_hold': return 'On Hold';
      case 'cancelled': return 'Cancelled';
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
            <h3 className="trades-h2 mb-2" style={{ color: 'var(--ink)' }}>Unable to Load Jobs</h3>
            <p className="trades-body mb-4" style={{ color: 'var(--muted)' }}>{error}</p>
            <Button onClick={loadJobsAndClients} className="gap-2">
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
              {isClientSpecific ? `${clientName} - Jobs` : safeFilter.title}
            </h1>
            <p className="trades-caption text-gray-600">
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
              {isClientSpecific && ` for ${clientName}`}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={isClientSpecific ? `Search ${clientName}'s jobs...` : "Search jobs, clients, or addresses..."}
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

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto pb-24">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <EmptyStateIllustration className="w-24 h-24 mb-6 text-gray-300" />
            <h3 className="trades-h2 mb-2" style={{ color: 'var(--ink)' }}>
              {hasActiveFilters ? 'No Jobs Match Your Filters' : 'No Jobs Yet'}
            </h3>
            <p className="trades-body mb-6" style={{ color: 'var(--muted)' }}>
              {hasActiveFilters 
                ? 'Try adjusting your search or filter criteria to find jobs.'
                : 'Create your first job to get started with project management.'
              }
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button onClick={() => onNavigate('clients')} className="gap-2">
                <Plus size={16} />
                Create First Job
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredJobs.map((job) => {
              const jobValue = job.estimatedValue || job.value || job.total || 0;
              
              return (
                <div
                  key={job.id}
                  onClick={() => onNavigate('job-detail', job)}
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="trades-body font-medium mb-1 truncate" style={{ color: 'var(--ink)' }}>
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <User size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="trades-caption text-gray-600 truncate">{job.clientName}</span>
                      </div>
                      
                      {job.address && (
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="trades-caption text-gray-600 truncate">{job.address}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="trades-caption text-gray-600">
                          {formatDate(job.createdAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4 flex-shrink-0">
                      {jobValue > 0 && (
                        <div className="trades-body font-medium mb-2" style={{ color: 'var(--ink)' }}>
                          {formatCurrency(jobValue)}
                        </div>
                      )}
                      <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  {job.description && (
                    <p className="trades-caption text-gray-600 line-clamp-2 mt-2">
                      {job.description}
                    </p>
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