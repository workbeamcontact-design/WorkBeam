import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Phone, 
  MapPin, 
  Users, 
  CheckSquare,
  Edit3,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  Briefcase,
  Wrench,
  ClipboardCheck,
  ExternalLink
} from 'lucide-react';
import { WhatsAppIcon } from '../ui/whatsapp-icon';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { sendBookingReminder } from '../../utils/whatsapp-utils';
import { api } from '../../utils/api';

type BookingType = 'survey' | 'installation' | 'repair' | 'inspection';
type BookingStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

interface BookingDetailProps {
  booking: {
    id: number;
    type: BookingType;
    client: string;
    job: string;
    address: string;
    time: string;
    endTime: string;
    date: string;
    phone?: string;
    outstanding?: number;
    jobId?: number;
    clientId?: number;
    isLead?: boolean;
    notes?: string; // Add notes field
  } | null;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}



// Utility functions
const getBookingTypeConfig = (type: BookingType) => {
  const configs = {
    survey: { 
      color: '#16A34A', 
      bgColor: '#F0FDF4', 
      icon: ClipboardCheck, 
      label: 'Survey' 
    },
    installation: { 
      color: '#0A84FF', 
      bgColor: '#EFF6FF', 
      icon: Briefcase, 
      label: 'Installation' 
    },
    repair: { 
      color: '#F59E0B', 
      bgColor: '#FFFBEB', 
      icon: Wrench, 
      label: 'Repair' 
    },
    inspection: { 
      color: '#A855F7', 
      bgColor: '#FAF5FF', 
      icon: CheckSquare, 
      label: 'Inspection' 
    }
  };
  return configs[type];
};

const getStatusConfig = (status: BookingStatus) => {
  const configs = {
    scheduled: { color: '#0A84FF', bgColor: '#EFF6FF', label: 'Scheduled' },
    'in-progress': { color: '#F59E0B', bgColor: '#FFFBEB', label: 'In Progress' },
    completed: { color: '#16A34A', bgColor: '#F0FDF4', label: 'Completed' },
    cancelled: { color: '#DC2626', bgColor: '#FEF2F2', label: 'Cancelled' }
  };
  return configs[status];
};



// Quick notes component
const QuickNotes = ({ notes, onUpdate }: { notes: string; onUpdate: (notes: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentNotes, setCurrentNotes] = useState(notes);

  const handleSave = () => {
    onUpdate(currentNotes);
    setIsEditing(false);
    toast.success('Notes updated');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="trades-label font-semibold">Notes</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Edit3 size={14} />
        </Button>
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={currentNotes}
            onChange={(e) => setCurrentNotes(e.target.value)}
            placeholder="Add notes about this booking..."
            rows={3}
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm">Save</Button>
            <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="trades-body text-muted-foreground">
            {currentNotes || 'No notes added yet'}
          </p>
        </div>
      )}
    </div>
  );
};

// Convert to Client Modal
const ConvertToClientModal = ({ 
  isOpen, 
  onClose, 
  booking, 
  onNavigate 
}: {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onNavigate: (screen: string, data?: any) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: booking.clientName || booking.client || '',
    phone: booking.clientPhone || booking.phone || '',
    address: booking.address || '',
    notes: 'Converted from booking'
  });

  const handleCreateClient = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Validate form data
      if (!formData.name.trim() || !formData.phone.trim()) {
        toast.error('Name and phone are required');
        return;
      }

      // Create the client
      const newClient = await api.createClient({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        notes: formData.notes
      });

      if (!newClient?.id) {
        throw new Error('Failed to create client');
      }

      // Update the booking to link it to the new client
      const updatedBooking = await api.updateBooking(booking.id, {
        clientId: newClient.id,
        isLead: false,
        // Clear the lead-specific fields since we now have a client
        clientName: null,
        clientPhone: null
      });

      if (!updatedBooking) {
        throw new Error('Failed to update booking');
      }

      toast.success('Client created and booking updated successfully');
      onClose();
      
      // Navigate back to refresh the booking detail view
      onNavigate('booking-detail', { ...booking, ...updatedBooking });
      
    } catch (error) {
      console.error('Error converting to client:', error);
      toast.error('Failed to create client');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="trades-h2">Convert to Client</DialogTitle>
          <DialogDescription>
            Create a new client profile from this booking information.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="trades-label">Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="trades-label">Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="trades-label">Address</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1"
              rows={2}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreateClient} className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Client'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const BookingDetailRedesigned: React.FC<BookingDetailProps> = ({ 
  booking, 
  onNavigate, 
  onBack 
}) => {
  // Early return if booking is null/undefined
  if (!booking) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#F9FAFB' }}>
        <div className="sticky top-0 z-10 bg-white border-b" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center gap-3 p-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} style={{ color: '#111827' }} />
            </button>
            <h1 className="trades-h2" style={{ color: '#111827' }}>Booking Details</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="trades-body" style={{ color: '#6B7280' }}>Booking not found</p>
          </div>
        </div>
      </div>
    );
  }

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<BookingStatus>('scheduled');
  const [notes, setNotes] = useState(booking.notes || '');
  const [businessName, setBusinessName] = useState<string>('WorkBeam');

  // Fetch business name for WhatsApp messages
  useEffect(() => {
    const fetchBusinessName = async () => {
      try {
        const businessDetails = await api.getBusinessDetails();
        if (businessDetails?.legal_name || businessDetails?.trading_name || businessDetails?.companyName) {
          setBusinessName(
            businessDetails.legal_name || 
            businessDetails.trading_name || 
            businessDetails.companyName || 
            'WorkBeam'
          );
        }
      } catch (error) {
        console.warn('Failed to fetch business name, using default:', error);
      }
    };
    
    fetchBusinessName();
  }, []);
  
  const typeConfig = getBookingTypeConfig(booking.type);
  const statusConfig = getStatusConfig(currentStatus);

  const handleContactAction = (type: 'call' | 'whatsapp') => {
    if (!booking.phone) {
      toast.error('No phone number available');
      return;
    }
    
    switch (type) {
      case 'call':
        window.open(`tel:${booking.phone}`, '_self');
        break;
      case 'whatsapp':
        sendBookingReminder({
          client: booking.client,
          type: booking.type,
          date: booking.date,
          time: booking.time,
          endTime: booking.endTime,
          address: booking.address,
          job: booking.job,
          notes: booking.notes,
          isAllDay: false // We'll need to add this to the booking interface if needed
        }, booking.phone, businessName);
        break;
    }
  };

  const handlePrimaryAction = () => {
    if (booking.isLead) {
      setShowConvertModal(true);
    } else if (booking.clientId) {
      // If booking has a client, navigate to client profile
      onNavigate('client-detail', { id: booking.clientId });
    } else if (currentStatus === 'scheduled') {
      setCurrentStatus('in-progress');
      toast.success('Booking started');
    } else if (currentStatus === 'in-progress') {
      setCurrentStatus('completed');
      toast.success('Booking completed');
    }
  };

  const getPrimaryActionLabel = () => {
    if (booking.isLead) return 'Convert to Client';
    if (booking.clientId) return 'View Client Profile';
    if (currentStatus === 'scheduled') return 'Start Booking';
    if (currentStatus === 'in-progress') return 'Complete Booking';
    return 'View Job';
  };

  const handleDeleteBooking = async () => {
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      
      // Call API to delete the booking
      const response = await api.deleteBooking(booking.id);
      
      if (response && (response.success || response === true)) {
        toast.success('Booking deleted successfully');
        setShowDeleteDialog(false);
        onBack(); // Navigate back to previous screen
      } else {
        throw new Error('Failed to delete booking');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditBooking = () => {
    // Navigate to edit booking - go directly to step 2 with the booking details pre-filled
    onNavigate('add-booking', {
      editMode: true,
      bookingId: booking.id,
      startAtStep2: true, // Start at step 2 (booking details) instead of step 1 (client selection)
      date: booking.date,
      time: booking.startTime || booking.time,
      endTime: booking.endTime,
      bookingType: booking.type,
      clientType: booking.isLead ? 'new' : 'existing',
      selectedClientId: booking.clientId,
      newClient: booking.isLead ? {
        name: booking.clientName || booking.client,
        phone: booking.clientPhone || booking.phone,
        address: booking.address
      } : null,
      title: booking.title,
      notes: booking.notes,
      isAllDay: booking.isAllDay
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="trades-h2 text-gray-900">Booking Details</h1>
            <p className="trades-caption text-gray-500">
              {booking.date} • {booking.time}–{booking.endTime}
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal size={24} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => handleEditBooking()}>
              <Edit3 size={16} className="mr-2" />
              Edit Booking
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 size={16} className="mr-2" />
              Delete Booking
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sticky Client Details Card */}
      <div className="sticky top-0 z-10 bg-gray-50 p-4 pb-0">
        <Card className="shadow-md">
          <CardContent className="p-4">
            {/* Main Info */}
            <div className="flex items-start gap-3 mb-4">
              <div 
                className="flex items-center justify-center w-12 h-12 rounded-xl"
                style={{ backgroundColor: typeConfig.bgColor }}
              >
                <typeConfig.icon size={24} style={{ color: typeConfig.color }} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="trades-body font-semibold text-gray-900 truncate">
                    {booking.client}
                  </h2>
                  {!booking.isLead && (
                    <Badge variant="secondary" className="text-xs">Client</Badge>
                  )}
                </div>
                
                <p className="trades-body text-gray-600 mb-2 line-clamp-1">
                  {booking.job}
                </p>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    style={{ 
                      backgroundColor: typeConfig.bgColor, 
                      color: typeConfig.color,
                      border: 'none'
                    }}
                  >
                    {typeConfig.label}
                  </Badge>
                  
                  <Badge 
                    variant="secondary"
                    style={{ 
                      backgroundColor: statusConfig.bgColor, 
                      color: statusConfig.color,
                      border: 'none'
                    }}
                  >
                    {statusConfig.label}
                  </Badge>
                  
                  {booking.outstanding && (
                    <Badge variant="destructive" className="text-xs">
                      £{booking.outstanding} outstanding
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Actions - Following client detail pattern */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleContactAction('whatsapp')}
                className="flex flex-col items-center justify-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors"
              >
                <WhatsAppIcon size={20} />
                <span className="trades-caption">WhatsApp</span>
              </button>

              <button
                onClick={() => handleContactAction('call')}
                className="flex flex-col items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Phone size={20} />
                <span className="trades-caption">Call</span>
              </button>

              <button
                onClick={() => {
                  const query = encodeURIComponent(booking.address);
                  window.open(`https://maps.google.com/?q=${query}`, '_blank');
                }}
                className="flex flex-col items-center justify-center gap-2 bg-orange-50 text-orange-700 px-4 py-3 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <MapPin size={20} />
                <span className="trades-caption">Navigate</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 pt-4 space-y-4 pb-24">
        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="trades-label flex items-center gap-2">
              <MapPin size={16} />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="trades-body text-gray-700 mb-3">{booking.address}</p>
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={() => {
                  const query = encodeURIComponent(booking.address);
                  window.open(`https://maps.google.com/?q=${query}`, '_blank');
                }}
              >
                <MapPin size={16} className="mr-2" />
                Open in Maps
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Client Info */}
        {!booking.isLead && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="trades-label flex items-center gap-2">
                <Users size={16} />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="trades-caption text-red-600">Outstanding</div>
                  <div className="trades-label font-semibold text-red-700">
                    £{booking.outstanding || 0}
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigate('client-detail', { id: booking.clientId })}
              >
                <ExternalLink size={16} className="mr-2" />
                View Client Profile
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Notes */}
        <Card>
          <CardContent className="p-4">
            <QuickNotes notes={notes} onUpdate={setNotes} />
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-20 right-4 z-10">
        <Button
          onClick={handlePrimaryAction}
          className="w-14 h-14 rounded-full shadow-lg"
          style={{ backgroundColor: typeConfig.color }}
        >
          {booking.isLead ? (
            <Users size={24} />
          ) : currentStatus === 'scheduled' ? (
            <CheckSquare size={24} />
          ) : currentStatus === 'in-progress' ? (
            <CheckCircle2 size={24} />
          ) : (
            <ExternalLink size={24} />
          )}
        </Button>
      </div>

      {/* Convert Modal */}
      <ConvertToClientModal 
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        booking={booking}
        onNavigate={onNavigate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
              <br /><br />
              <strong>{booking.title || 'Booking'}</strong><br />
              {booking.clientName || booking.client} • {booking.date}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooking}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Booking'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};