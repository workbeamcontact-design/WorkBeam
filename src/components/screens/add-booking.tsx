import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Search, User, Plus, Clock, Calendar as CalendarIcon, MapPin, Camera, CheckSquare, DollarSign, ChevronDown, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useAutosave, AutosaveStatus } from '../../hooks/useAutosave';
import { bookingSchema, validate, formatValidationErrors } from '../../utils/validation.tsx';
import { sanitizeText } from '../../utils/sanitization';

import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { api } from '../../utils/api';

interface AddBookingProps {
  initialData?: {
    date?: string;
    time?: string;
    editMode?: boolean;
    bookingId?: string;
    endTime?: string;
    bookingType?: BookingType;
    clientType?: 'existing' | 'new';
    selectedClientId?: string | number;
    newClient?: {
      name: string;
      phone: string;
      address: string;
    };
    title?: string;
    notes?: string;
    isAllDay?: boolean;
    startAtStep2?: boolean;
  };
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
  onBookingCreated?: () => void;
}

type BookingType = 'survey' | 'installation' | 'repair' | 'inspection';

interface ClientSearchResult {
  id: string | number;
  name: string;
  phone: string;
  address: string;
  lastJobDate?: string;
  lifetimeValue?: string;
}

interface BookingFormData {
  // Step 1: Client
  clientType: 'existing' | 'new' | null;
  selectedClientId?: string | number;
  newClient?: {
    name: string;
    phone: string;
    address: string;
  };
  
  // Step 2: Type & When
  bookingType?: BookingType;
  date: Date;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  
  // Optional fields
  notes?: string;
  jobId?: number;
}

const bookingTypeColors = {
  survey: '#16A34A', // green
  installation: '#0A84FF', // blue
  repair: '#F59E0B', // orange
  inspection: '#A855F7' // purple
};

// Helper functions
const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const hour12 = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
};

const generateTimeOptions = () => {
  const times = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 22 && minute > 0) break;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      times.push({
        value: timeString,
        label: formatTime(timeString)
      });
    }
  }
  return times;
};

const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startTotalMinutes = hours * 60 + minutes;
  const endTotalMinutes = startTotalMinutes + durationMinutes;
  const endHours = Math.floor(endTotalMinutes / 60);
  const endMins = endTotalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
};

const timeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatDateForAPI = (date: Date): string => {
  // Use local timezone to avoid date shifting issues
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function AddBooking({ initialData, onNavigate, onBack, onBookingCreated }: AddBookingProps) {

  const [step, setStep] = useState<1 | 2>(initialData?.startAtStep2 ? 2 : 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [clients, setClients] = useState<ClientSearchResult[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [creatingBooking, setCreatingBooking] = useState(false);
  
  const [formData, setFormData] = useState<BookingFormData>({
    clientType: initialData?.clientType || null,
    selectedClientId: initialData?.selectedClientId,
    newClient: initialData?.newClient,
    bookingType: initialData?.bookingType,
    date: initialData?.date ? new Date(initialData.date) : new Date(),
    startTime: initialData?.time || '09:00',
    endTime: initialData?.endTime || (initialData?.time ? calculateEndTime(initialData.time, 60) : '10:00'),
    isAllDay: initialData?.isAllDay || false,
    notes: initialData?.notes
  });

  // Autosave configuration
  const autosave = useAutosave(formData, {
    delay: 3000,
    onSave: async (data) => {
      // Silent save to localStorage only
      console.log('Booking draft saved');
    },
    storageKey: 'add-booking-draft',
    enabled: !!(formData.clientType && formData.bookingType) // Only save if user has selected client and type
  });

  // Load clients on mount
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true);
        const clientsData = await api.getClients();
        
        const transformedClients: ClientSearchResult[] = clientsData.map((client: any) => ({
          id: client.id,
          name: client.name || 'Unknown Client',
          phone: client.phone || '',
          address: client.address || '',
          lastJobDate: client.lastJobDate,
          lifetimeValue: client.lifetimeValue
        }));
        
        setClients(transformedClients);
      } catch (error) {
        console.error('Failed to load clients:', error);
        setClients([]);
        toast.error('Failed to load clients');
      } finally {
        setLoadingClients(false);
      }
    };

    loadClients();
  }, []);

  const timeOptions = generateTimeOptions();

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.phone.includes(searchTerm) ||
      client.address.toLowerCase().includes(searchLower)
    );
  });

  const selectedClient = formData.selectedClientId 
    ? clients.find(c => c.id === formData.selectedClientId)
    : null;

  const handleClose = () => {
    onBack();
  };

  // Helper function to format booking time display
  const formatBookingTime = (booking: any) => {
    if (booking.isAllDay) {
      return 'All day';
    }
    if (booking.startTime && booking.endTime) {
      return `${booking.startTime} - ${booking.endTime}`;
    }
    return booking.startTime || booking.time || '';
  };

  const handleStep1Continue = () => {
    // Validate step 1
    if (!formData.clientType) {
      toast.error("Please select a client type");
      return;
    }
    
    if (formData.clientType === 'existing' && !formData.selectedClientId) {
      toast.error("Please select a client");
      return;
    }
    
    if (formData.clientType === 'new') {
      const { name, phone } = formData.newClient || {};
      if (!name || !phone) {
        toast.error("Name and phone required");
        return;
      }
    }
    
    setStep(2);
  };

  const handleAllDayToggle = (checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        isAllDay: true,
        startTime: '06:00',
        endTime: '22:00'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        isAllDay: false,
        startTime: '09:00',
        endTime: '10:00'
      }));
    }
  };

  const handleStartTimeChange = (time: string) => {
    setFormData(prev => {
      const newStartTime = time;
      let newEndTime = prev.endTime;
      
      // If new start time is after current end time, adjust end time
      if (timeToMinutes(newStartTime) >= timeToMinutes(prev.endTime)) {
        newEndTime = calculateEndTime(newStartTime, 60);
      }
      
      return {
        ...prev,
        startTime: newStartTime,
        endTime: newEndTime
      };
    });
    setShowStartTimePicker(false);
  };

  const handleEndTimeChange = (time: string) => {
    setFormData(prev => {
      if (timeToMinutes(time) <= timeToMinutes(prev.startTime)) {
        toast.error("End time must be after start time");
        return prev;
      }
      
      return {
        ...prev,
        endTime: time
      };
    });
    setShowEndTimePicker(false);
  };

  const handleCreateBooking = async () => {
    // Only set clientId for existing clients, not for new leads
    const clientId = formData.clientType === 'existing' ? formData.selectedClientId : null;

    // Prepare booking data
    const isExistingClient = formData.clientType === 'existing' && selectedClient;
    const isNewLead = formData.clientType === 'new';
    const bookingTypeTitle = formData.bookingType?.charAt(0).toUpperCase() + formData.bookingType?.slice(1) || '';
    
    const bookingData = {
      clientId: clientId?.toString(),
      clientName: isExistingClient ? selectedClient.name : formData.newClient?.name || 'New Lead',
      clientPhone: isExistingClient ? selectedClient.phone : formData.newClient?.phone || '',
      title: isExistingClient 
        ? `${bookingTypeTitle} - ${selectedClient.name}`
        : `${bookingTypeTitle} - ${formData.newClient?.name || 'New Lead'}`,
      date: formatDateForAPI(formData.date),
      startTime: formData.isAllDay ? '06:00' : formData.startTime,
      endTime: formData.isAllDay ? '22:00' : formData.endTime,
      type: formData.bookingType,
      address: isExistingClient ? selectedClient.address : formData.newClient?.address || '',
      notes: sanitizeText(formData.notes || '', 2000),
      isAllDay: formData.isAllDay,
      isLead: isNewLead
    };

    // Validate with schema
    const validation = validate(bookingSchema, bookingData);
    
    if (!validation.success) {
      const errorMessages = formatValidationErrors(validation.errors!);
      toast.error(errorMessages[0] || "Please check your input");
      console.log('Validation errors:', validation.errors);
      return;
    }

    try {
      setCreatingBooking(true);

      console.log('📅 Creating booking with date:', {
        selectedDate: formData.date,
        localDisplay: formData.date.toLocaleDateString('en-GB'),
        apiFormat: bookingData.date,
        oldISOMethod: formData.date.toISOString().split('T')[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      let result;
      
      if (initialData?.editMode && initialData?.bookingId) {
        // Update existing booking
        result = await api.updateBooking(initialData.bookingId, bookingData);
        
        if (result) {
          toast.success("Booking updated successfully");
          
          if (onBookingCreated) {
            onBookingCreated();
          }
          
          handleClose();
        } else {
          throw new Error("Failed to update booking");
        }
      } else {
        // Create new booking with validated data
        result = await api.createBooking(validation.data!);
        
        if (result) {
          // Clear autosave draft on success
          autosave.clearDraft();
          
          toast.success(
            isNewLead 
              ? "Booking created for new lead" 
              : "Booking created successfully!"
          );
          
          if (onBookingCreated) {
            onBookingCreated();
          }
          
          handleClose();
        } else {
          throw new Error("Failed to create booking");
        }
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error("Failed to create booking");
    } finally {
      setCreatingBooking(false);
    }
  };

  const calculateDuration = (): string => {
    const startMinutes = timeToMinutes(formData.startTime);
    const endMinutes = timeToMinutes(formData.endTime);
    const durationMinutes = endMinutes - startMinutes;
    
    if (durationMinutes >= 60) {
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      if (mins === 0) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      } else {
        return `${hours}h ${mins}m`;
      }
    } else {
      return `${durationMinutes} minutes`;
    }
  };

  const renderStep1 = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scroll_area">
        <div className="p-4 pb-32">
          {/* Hero Section */}
          <div className="text-center mb-8 pt-4">
            <h2 className="trades-h1 mb-2" style={{ color: 'var(--ink)' }}>
              {initialData?.editMode ? 'Select Client' : 'Who is this booking for?'}
            </h2>
            <p className="trades-body" style={{ color: 'var(--muted)' }}>
              {initialData?.editMode ? 'Update client information' : 'Find an existing client or create a new lead'}
            </p>
          </div>

          {/* Search Field with Icon */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
              <Input
                placeholder="Search by name, phone, or address..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value) {
                    setFormData(prev => ({ ...prev, clientType: 'existing' }));
                  }
                }}
                className="h-14 pl-12 trades-body bg-surface border-border rounded-xl"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchTerm && (
            <div className="space-y-3 max-h-64 overflow-y-auto scroll_area mb-6">
              {loadingClients ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="trades-body text-muted">Loading clients...</p>
                </div>
              ) : filteredClients.length > 0 ? (
                filteredClients.map(client => (
                  <div
                    key={client.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.selectedClientId === client.id 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-border bg-surface hover:border-blue-200 hover:shadow-sm'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, selectedClientId: client.id, clientType: 'existing' }))}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            formData.selectedClientId === client.id ? 'bg-blue-600' : 'bg-gray-200'
                          }`}>
                            <User size={20} className={formData.selectedClientId === client.id ? 'text-white' : 'text-gray-500'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="trades-label font-semibold truncate" style={{ color: 'var(--ink)' }}>
                              {client.name}
                            </div>
                            <div className="trades-caption text-muted">
                              {client.phone}
                            </div>
                          </div>
                        </div>
                        {client.address && (
                          <div className="trades-caption text-muted mt-2 flex items-start gap-1">
                            <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{client.address}</span>
                          </div>
                        )}
                        {client.lastJobDate && (
                          <div className="flex gap-3 mt-2 pt-2 border-t border-border">
                            <span className="trades-caption text-muted">
                              Last: {client.lastJobDate}
                            </span>
                            {client.lifetimeValue && (
                              <span className="trades-caption text-muted">
                                Value: {client.lifetimeValue}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {formData.selectedClientId === client.id && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-2">
                          <CheckSquare size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="text-gray-400" />
                  </div>
                  <p className="trades-body mb-1 text-ink">
                    No clients found
                  </p>
                  <p className="trades-caption text-muted mb-6">
                    No matches for "{searchTerm}"
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm(''); // Clear search
                      setFormData(prev => ({ 
                        ...prev, 
                        clientType: 'new',
                        newClient: { 
                          name: searchTerm,
                          phone: '',
                          address: ''
                        } 
                      }));
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl trades-body font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Create New Lead
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Create New Lead Button or New Lead Form */}
          {!searchTerm && formData.clientType !== 'new' && (
            <div className="mb-6">
              {/* Create New Lead Button */}
              <button
                className="w-full p-5 rounded-xl border-2 border-dashed border-border hover:border-blue-600 hover:bg-blue-50 transition-all text-left group"
                onClick={() => setFormData(prev => ({ ...prev, clientType: 'new' }))}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                    <Plus className="text-blue-600 group-hover:text-white transition-colors" size={24} />
                  </div>
                  <div>
                    <div className="trades-label font-semibold text-ink mb-0.5">
                      Create New Lead
                    </div>
                    <div className="trades-caption text-muted">
                      Add a new client to your list
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* New Lead Form - Shows when clientType is 'new' regardless of search */}
          {formData.clientType === 'new' && (
            <div className="mb-6">
              {/* New Lead Form */}
              <div className="space-y-4 p-5 rounded-xl bg-surface border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <User size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="trades-label font-semibold text-ink">
                      New Lead Details
                    </h4>
                    <p className="trades-caption text-muted">
                      Fill in the required information
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="trades-label text-ink mb-2 block">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Client or company name"
                    value={formData.newClient?.name || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newClient: { ...prev.newClient, name: e.target.value } as any
                    }))}
                    className="h-12"
                  />
                </div>
                
                <div>
                  <Label className="trades-label text-ink mb-2 block">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Phone number"
                    type="tel"
                    value={formData.newClient?.phone || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newClient: { ...prev.newClient, phone: e.target.value } as any
                    }))}
                    className="h-12"
                  />
                </div>
                
                <div>
                  <Label className="trades-label text-ink mb-2 block">
                    Address <span className="trades-caption text-muted">(Optional)</span>
                  </Label>
                  <Textarea
                    placeholder="Full address"
                    value={formData.newClient?.address || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      newClient: { ...prev.newClient, address: e.target.value } as any
                    }))}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <button
          onClick={handleStep1Continue}
          disabled={!formData.clientType || 
            (formData.clientType === 'existing' && !formData.selectedClientId) ||
            (formData.clientType === 'new' && (!formData.newClient?.name?.trim() || !formData.newClient?.phone?.trim()))
          }
          className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
          style={{
            backgroundColor: '#0A84FF',
            color: 'white',
            height: '56px',
            borderRadius: '12px',
            minHeight: '44px'
          }}
        >
          <span className="trades-body">Continue to Booking Details</span>
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scroll_area">
        <div className="space-y-6 p-4 pb-52">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="trades-h2 mb-2" style={{ color: 'var(--ink)' }}>
              {initialData?.editMode ? 'Edit Booking Details' : 'Booking Details'}
            </h3>
            <p className="trades-body" style={{ color: 'var(--muted)' }}>
              {initialData?.editMode ? 'Update the booking information below' : 'Set the type, date and time for this booking'}
            </p>
          </div>

          {/* Selected Client Summary */}
          <div 
            className="p-3 rounded-lg border"
            style={{ 
              backgroundColor: 'var(--surface-alt)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="trades-label" style={{ color: 'var(--ink)', fontWeight: '600' }}>
              {formData.clientType === 'existing' && selectedClient ? selectedClient.name : formData.newClient?.name}
            </div>
            <div className="trades-caption" style={{ color: 'var(--muted)' }}>
              {formData.clientType === 'existing' ? 'Existing client' : 'New lead'}
            </div>
          </div>

          {/* Booking Type Selector */}
          <div>
            <Label className="trades-label mb-3 block">Booking Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {(['survey', 'installation', 'repair', 'inspection'] as BookingType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setFormData(prev => ({ ...prev, bookingType: type }))}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    formData.bookingType === type ? 'border-primary' : 'border-border'
                  }`}
                  style={{
                    backgroundColor: formData.bookingType === type ? 'rgba(10, 132, 255, 0.05)' : 'var(--surface)',
                    borderColor: formData.bookingType === type ? 'var(--primary)' : 'var(--border)'
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: bookingTypeColors[type] }}
                  />
                  <div className="trades-label font-medium" style={{ color: 'var(--ink)' }}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <Label className="trades-label mb-2 block">Date</Label>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <div
                  className="w-full h-12 px-3 py-2 bg-surface border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between trades-body"
                  onClick={() => setShowDatePicker(true)}
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ color: 'var(--ink)' }}>
                      {formData.date.toLocaleDateString('en-GB', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                    </span>
                  </div>
                  <ChevronDown size={16} style={{ color: 'var(--muted)' }} />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => {
                    if (date) {
                      console.log('📅 Date selected:', {
                        originalDate: date,
                        localString: date.toLocaleDateString('en-GB'),
                        apiFormat: formatDateForAPI(date),
                        isoString: date.toISOString(),
                        isoSplit: date.toISOString().split('T')[0]
                      });
                      setFormData(prev => ({ ...prev, date }));
                      setShowDatePicker(false);
                    }
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <div>
              <Label className="trades-label" style={{ color: 'var(--ink)' }}>All Day</Label>
              <p className="trades-caption" style={{ color: 'var(--muted)' }}>6:00 AM - 10:00 PM</p>
            </div>
            <Switch
              checked={formData.isAllDay}
              onCheckedChange={handleAllDayToggle}
            />
          </div>

          {/* Time Pickers - COMPACT POPOVER STYLE */}
          {!formData.isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              {/* Start Time */}
              <div>
                <Label className="trades-label mb-2 block">Start Time</Label>
                <Popover open={showStartTimePicker} onOpenChange={setShowStartTimePicker}>
                  <PopoverTrigger asChild>
                    <div className="w-full h-12 px-3 py-2 bg-surface border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between trades-body">
                      <div className="flex items-center gap-2">
                        <Clock size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ color: 'var(--ink)' }}>
                          {formatTime(formData.startTime)}
                        </span>
                      </div>
                      <ChevronDown size={16} style={{ color: 'var(--muted)' }} />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-0" align="start" sideOffset={4}>
                    <div className="max-h-48 overflow-y-auto scroll_area">
                      {timeOptions.map(time => (
                        <button
                          key={time.value}
                          onClick={() => handleStartTimeChange(time.value)}
                          className={`w-full px-3 py-2.5 text-left hover:bg-surface-alt trades-label transition-colors ${
                            formData.startTime === time.value ? 'bg-blue-50 text-primary font-medium' : ''
                          }`}
                          style={{ 
                            color: formData.startTime === time.value ? 'var(--primary)' : 'var(--ink)'
                          }}
                        >
                          {time.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Time */}
              <div>
                <Label className="trades-label mb-2 block">End Time</Label>
                <Popover open={showEndTimePicker} onOpenChange={setShowEndTimePicker}>
                  <PopoverTrigger asChild>
                    <div className="w-full h-12 px-3 py-2 bg-surface border border-border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between trades-body">
                      <div className="flex items-center gap-2">
                        <Clock size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ color: 'var(--ink)' }}>
                          {formatTime(formData.endTime)}
                        </span>
                      </div>
                      <ChevronDown size={16} style={{ color: 'var(--muted)' }} />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-0" align="start" sideOffset={4}>
                    <div className="max-h-48 overflow-y-auto scroll_area">
                      {timeOptions.map(time => (
                        <button
                          key={time.value}
                          onClick={() => handleEndTimeChange(time.value)}
                          className={`w-full px-3 py-2.5 text-left hover:bg-surface-alt trades-label transition-colors ${
                            formData.endTime === time.value ? 'bg-blue-50 text-primary font-medium' : ''
                          }`}
                          style={{ 
                            color: formData.endTime === time.value ? 'var(--primary)' : 'var(--ink)'
                          }}
                        >
                          {time.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Duration Display */}
          {!formData.isAllDay && (
            <div className="text-center">
              <p className="trades-caption" style={{ color: 'var(--muted)' }}>
                Duration: {calculateDuration()}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="trades-label mb-2 block">Notes (Optional)</Label>
            <Textarea
              placeholder="Add any special instructions or notes for this booking..."
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <div className="flex gap-3">
          {!initialData?.startAtStep2 && (
            <button
              onClick={() => initialData?.startAtStep2 ? onBack() : setStep(1)}
              disabled={creatingBooking}
              className="flex-1 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              style={{
                backgroundColor: '#F9FAFB',
                color: '#111827',
                height: '56px',
                borderRadius: '12px',
                border: '2px solid #E5E7EB',
                minHeight: '44px'
              }}
            >
              <span className="trades-body">Back</span>
            </button>
          )}
          <button
            onClick={handleCreateBooking}
            disabled={creatingBooking || !formData.bookingType}
            className={`flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 ${!initialData?.startAtStep2 ? 'flex-1' : 'w-full'}`}
            style={{
              backgroundColor: '#0A84FF',
              color: 'white',
              height: '56px',
              borderRadius: '12px',
              minHeight: '44px'
            }}
          >
            {creatingBooking ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="trades-body">{initialData?.editMode ? 'Updating...' : 'Creating...'}</span>
              </>
            ) : (
              <span className="trades-body">{initialData?.editMode ? 'Update' : 'Create'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Main Booking Screen */}
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" onClick={handleClose} className="p-2 -ml-2">
              <ChevronLeft size={20} />
            </Button>
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>
              {initialData?.editMode ? 'Edit Booking' : 'New Booking'}
            </h1>
          </div>
          
          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={`h-1.5 rounded-full transition-all ${step === 1 ? 'w-8 bg-blue-600' : 'w-1.5 bg-gray-300'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step === 2 ? 'w-8 bg-blue-600' : 'w-1.5 bg-gray-300'}`} />
          </div>
        </div>

        {/* Content */}
        {step === 1 ? renderStep1() : renderStep2()}
      </div>
    </>
  );
}