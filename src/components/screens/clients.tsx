import { Plus, Search, Phone, MessageCircle, MapPin, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { EmptyStateIllustration } from "../ui/empty-state-illustration";
import { WhatsAppIcon } from "../ui/whatsapp-icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel, AlertDialogAction } from "../ui/alert-dialog";
import { toast } from "sonner@2.0.3";
import { api } from "../../utils/api";
import { LoadingWrapper, ClientListSkeleton } from "../ui/loading-states";
import { useOptimisticUpdate } from "../../hooks/useOptimisticUpdate";
import { useAuth } from "../../utils/auth-context";

// Types
interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  lastJob?: string;
  lastDate?: string;
  outstanding?: number;
  lifetimeValue?: number;
  jobCount?: number;
  daysSinceLastJob?: number;
  isOverdue?: boolean;
}

type FilterType = 'all' | 'outstanding' | 'overdue' | 'high-value' | 'recent' | 'repeat-clients' | 'zero-balance';

interface ClientsProps {
  onNavigate: (screen: string, data?: any) => void;
}

export function Clients({ onNavigate }: ClientsProps) {
  const { user, sessionReady } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Optimistic updates for better UX
  const { optimisticDelete } = useOptimisticUpdate();

  // Load clients when user is authenticated AND session is ready
  useEffect(() => {
    if (user && sessionReady) {
      console.log('👥 Clients: User and session ready - loading data');
      loadClients();
    } else if (user && !sessionReady) {
      console.log('⏳ Clients: User authenticated but session not ready yet...');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionReady]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ FIX: Fetch ALL data in parallel ONCE (not per client!)
      // Performance: 10 clients = 30 calls → 4 calls (87% reduction)
      // Performance: 50 clients = 150 calls → 4 calls (97% reduction)
      const [clientsData, allJobs, allInvoices, allPayments] = await Promise.all([
        api.getClients(),
        api.getJobs(),      // Fetch ONCE for all clients
        api.getInvoices(),  // Fetch ONCE for all clients
        api.getPayments()   // Fetch ONCE for all clients
      ]);
      
      console.log('📊 Loaded data for client enrichment:', {
        clients: clientsData.length,
        jobs: allJobs.length,
        invoices: allInvoices.length,
        payments: allPayments?.length || 0
      });
      
      // Enrich client data with computed fields using already-fetched data
      const enrichedClients = clientsData.map((client: Client) => {
        // Filter data for this specific client
        const clientJobs = allJobs.filter((job: any) => job.clientId === client.id);
        const clientInvoices = allInvoices.filter((inv: any) => inv.clientId === client.id);
        const clientPayments = (allPayments || []).filter((payment: any) => payment.clientId === client.id);
        
        // Calculate client metrics accounting for partial payments
        const totalInvoiced = clientInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
        const totalPaid = clientPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        const outstanding = Math.max(0, totalInvoiced - totalPaid);
        
        const lifetimeValue = totalInvoiced;
        
        const lastJob = clientJobs.length > 0 ? clientJobs[clientJobs.length - 1] : null;
        const lastDate = lastJob ? new Date(lastJob.createdAt).toLocaleDateString('en-GB') : '';
        
        const daysSinceLastJob = lastJob 
          ? Math.floor((Date.now() - new Date(lastJob.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        return {
          ...client,
          lastJob: lastJob?.title || '',
          lastDate,
          outstanding,
          lifetimeValue,
          jobCount: clientJobs.length,
          daysSinceLastJob,
          isOverdue: outstanding > 0 && daysSinceLastJob > 30
        };
      });
      
      setClients(enrichedClients);
    } catch (err) {
      console.error('Failed to load clients:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  // Filter configuration
  const filterConfig = {
    all: { label: "All clients", count: clients.length },
    outstanding: { 
      label: "Outstanding", 
      count: clients.filter(c => (c.outstanding || 0) > 0).length 
    },
    overdue: { 
      label: "Overdue", 
      count: clients.filter(c => c.isOverdue).length 
    },
    "high-value": { 
      label: "High value", 
      count: clients.filter(c => (c.lifetimeValue || 0) > 1000).length 
    },
    recent: { 
      label: "Recent", 
      count: clients.filter(c => (c.daysSinceLastJob || 0) <= 7).length 
    },
    "repeat-clients": { 
      label: "Repeat clients", 
      count: clients.filter(c => (c.jobCount || 0) > 1).length 
    },
    "zero-balance": { 
      label: "Zero balance", 
      count: clients.filter(c => (c.outstanding || 0) === 0).length 
    }
  };

  // Filtered and searched clients
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Apply filter
    switch (activeFilter) {
      case 'outstanding':
        filtered = filtered.filter(c => (c.outstanding || 0) > 0);
        break;
      case 'overdue':
        filtered = filtered.filter(c => c.isOverdue);
        break;
      case 'high-value':
        filtered = filtered.filter(c => (c.lifetimeValue || 0) > 1000);
        break;
      case 'recent':
        filtered = filtered.filter(c => (c.daysSinceLastJob || 0) <= 7);
        break;
      case 'repeat-clients':
        filtered = filtered.filter(c => (c.jobCount || 0) > 1);
        break;
      case 'zero-balance':
        filtered = filtered.filter(c => (c.outstanding || 0) === 0);
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(query) ||
        client.phone.includes(query) ||
        client.address.toLowerCase().includes(query) ||
        (client.lastJob || '').toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [clients, activeFilter, searchQuery]);

  // Handlers
  const handleClientSelect = useCallback((client: Client) => {
    if (client && client.id) {
      console.log('📍 Navigating to client detail:', {
        id: client.id,
        name: client.name,
        hasPhone: !!client.phone,
        hasAddress: !!client.address,
        allFields: Object.keys(client),
        sample: client
      });
      onNavigate('client-detail', client);
    } else {
      console.error('❌ Cannot navigate to client detail: client data missing or invalid', {
        hasClient: !!client,
        clientId: client?.id,
        fullClient: client
      });
      toast.error('Client data unavailable');
    }
  }, [onNavigate]);

  const handleAddClient = useCallback(() => {
    onNavigate('new-client');
  }, [onNavigate]);

  const handleEditClient = useCallback((client: Client, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the client detail navigation
    onNavigate('edit-client', client);
  }, [onNavigate]);

  const handleDeleteClient = useCallback(async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the client detail navigation
    
    // Optimistic delete - instant UI update
    await optimisticDelete(
      client.id,
      (id) => {
        // Store previous state for rollback
        const previousClients = clients;
        // Immediately remove from UI
        setClients(prev => prev.filter(c => c.id !== id));
        setClientToDelete(null);
        return previousClients;
      },
      async (id) => {
        const success = await api.deleteClient(id);
        if (!success) {
          throw new Error('Failed to delete client');
        }
      }
    );
  }, [clients, optimisticDelete]);

  if (loading) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="header bg-white p-4 border-b border-gray-200">
          <h1 className="trades-h1 mb-4" style={{ color: 'var(--ink)' }}>Clients</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="trades-body text-gray-600">Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="header bg-white p-4 border-b border-gray-200">
          <h1 className="trades-h1 mb-4" style={{ color: 'var(--ink)' }}>Clients</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="trades-body text-red-600 mb-4">{error}</p>
            <button
              onClick={loadClients}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl trades-body hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="header bg-white p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Clients</h1>
            <button
              onClick={handleAddClient}
              className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors"
              aria-label="Add client"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <EmptyStateIllustration className="w-32 h-32 mx-auto mb-6 text-gray-300" />
            <h2 className="trades-h2 mb-3" style={{ color: 'var(--ink)' }}>No clients yet</h2>
            <p className="trades-body mb-6" style={{ color: 'var(--muted)' }}>
              Add your first client to start managing jobs and invoices
            </p>
            <button
              onClick={handleAddClient}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl trades-body hover:bg-blue-700 transition-colors"
            >
              Add First Client
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="header bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Clients</h1>
          <button
            onClick={handleAddClient}
            className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors"
            aria-label="Add client"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
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

      <LoadingWrapper isLoading={loading} type="list">
        {/* Client List */}
        <div className="content_scroll flex-1 overflow-y-auto pb-24">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="trades-body" style={{ color: 'var(--muted)' }}>
              No clients match your search criteria
            </p>
          </div>
        ) : (
          <div className="client_list p-4 space-y-3">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => handleClientSelect(client)}
                className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
              >
                {/* Client Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="trades-body font-medium mb-1" style={{ color: 'var(--ink)' }}>
                      {client.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Phone size={14} className="text-gray-400" />
                      <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                        {client.phone || 'No phone'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                        {client.address || 'No address'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions Section */}
                  <div className="flex gap-2 ml-3">
                    {/* Quick Actions */}
                    {client.phone && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${client.phone}`, '_self');
                          }}
                          className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors"
                          aria-label="Call client"
                        >
                          <Phone size={16} />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/${client.phone.replace(/\s/g, '')}`, '_blank');
                          }}
                          className="w-9 h-9 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors"
                          aria-label="WhatsApp client"
                        >
                          <WhatsAppIcon size={16} color="#16a34a" />
                        </button>
                      </>
                    )}
                    
                    {/* Three-dot menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="w-9 h-9 bg-gray-50 text-gray-500 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors opacity-60 hover:opacity-100"
                          aria-label="Client options"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={(e) => handleEditClient(client, e)}
                          className="cursor-pointer"
                        >
                          <Edit2 size={16} className="mr-2" />
                          Edit Client
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientToDelete(client);
                          }}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Delete Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Client Stats */}
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <div className="trades-label font-medium" style={{ color: 'var(--ink)' }}>
                      {client.jobCount || 0}
                    </div>
                    <div className="trades-caption" style={{ color: 'var(--muted)' }}>Jobs</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="trades-label font-medium" style={{ color: 'var(--ink)' }}>
                      £{(client.lifetimeValue || 0).toFixed(0)}
                    </div>
                    <div className="trades-caption" style={{ color: 'var(--muted)' }}>Value</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`trades-label font-medium ${
                      (client.outstanding || 0) > 0 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      £{(client.outstanding || 0).toFixed(0)}
                    </div>
                    <div className="trades-caption" style={{ color: 'var(--muted)' }}>Due</div>
                  </div>
                </div>

                {/* Last Job Info */}
                {client.lastJob && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="trades-caption" style={{ color: 'var(--muted)' }}>
                      Last job: {client.lastJob} • {client.lastDate}
                    </div>
                  </div>
                )}

                {/* Status Indicators */}
                {(client.isOverdue || (client.outstanding || 0) > 0) && (
                  <div className="flex gap-2 mt-3">
                    {client.isOverdue && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded trades-caption font-medium">
                        Overdue
                      </span>
                    )}
                    {(client.outstanding || 0) > 0 && !client.isOverdue && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded trades-caption font-medium">
                        Outstanding
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </LoadingWrapper>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {clientToDelete?.name}? This will permanently delete the client and all associated jobs, quotes, invoices, and bookings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                if (clientToDelete) {
                  handleDeleteClient(clientToDelete, e);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}