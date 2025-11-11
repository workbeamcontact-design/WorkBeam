/**
 * Activity Log Screen
 * 
 * Shows team activity and audit trail (Phase 4b Step 4)
 * Displays who created/updated resources with timestamps
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Clock, FileText, Users, Receipt, FileCheck, Calendar as CalendarIcon, Filter, TrendingUp } from 'lucide-react';
import { useAuth } from '../../utils/auth-context';
import { useOrganizationContext } from '../../utils/organization-context';
import { api } from '../../utils/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAppStore } from '../../hooks/useAppStore';

interface ActivityItem {
  id: string;
  type: 'client' | 'job' | 'invoice' | 'quote' | 'payment';
  action: 'created' | 'updated';
  resource_name: string;
  user_name: string;
  user_id: string;
  timestamp: string;
  details?: string;
}

export default function ActivityLog() {
  const { navigate } = useAppStore();
  const { user } = useAuth();
  const { members } = useOrganizationContext();
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'client' | 'job' | 'invoice' | 'quote' | 'payment'>('all');
  const [userFilter, setUserFilter] = useState<'all' | string>('all');

  useEffect(() => {
    loadActivities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      // Fetch all resources with multi-user data
      const [clients, jobs, invoices, quotes, payments] = await Promise.all([
        api.getClients(),
        api.getJobs(),
        api.getInvoices(),
        api.getQuotes(),
        api.getPayments(),
      ]);

      // Aggregate activities
      const activityList: ActivityItem[] = [];

      // Process clients
      clients?.forEach((client: any) => {
        if (client.created_by_name && client.created_at) {
          activityList.push({
            id: `client-create-${client.id}`,
            type: 'client',
            action: 'created',
            resource_name: client.name,
            user_name: client.created_by_name,
            user_id: client.created_by_user_id,
            timestamp: client.created_at,
          });
        }
        if (client.updated_by_name && client.updated_at && 
            client.updated_by_user_id !== client.created_by_user_id) {
          activityList.push({
            id: `client-update-${client.id}`,
            type: 'client',
            action: 'updated',
            resource_name: client.name,
            user_name: client.updated_by_name,
            user_id: client.updated_by_user_id,
            timestamp: client.updated_at,
          });
        }
      });

      // Process jobs
      jobs?.forEach((job: any) => {
        if (job.created_by_name && job.created_at) {
          activityList.push({
            id: `job-create-${job.id}`,
            type: 'job',
            action: 'created',
            resource_name: job.title,
            user_name: job.created_by_name,
            user_id: job.created_by_user_id,
            timestamp: job.created_at,
            details: job.clientName || undefined,
          });
        }
        if (job.updated_by_name && job.updated_at && 
            job.updated_by_user_id !== job.created_by_user_id) {
          activityList.push({
            id: `job-update-${job.id}`,
            type: 'job',
            action: 'updated',
            resource_name: job.title,
            user_name: job.updated_by_name,
            user_id: job.updated_by_user_id,
            timestamp: job.updated_at,
            details: job.clientName || undefined,
          });
        }
      });

      // Process invoices
      invoices?.forEach((invoice: any) => {
        if (invoice.created_by_name && invoice.created_at) {
          activityList.push({
            id: `invoice-create-${invoice.id}`,
            type: 'invoice',
            action: 'created',
            resource_name: invoice.number || `Invoice #${invoice.id.slice(-6)}`,
            user_name: invoice.created_by_name,
            user_id: invoice.created_by_user_id,
            timestamp: invoice.created_at,
            details: invoice.clientName || undefined,
          });
        }
        if (invoice.updated_by_name && invoice.updated_at && 
            invoice.updated_by_user_id !== invoice.created_by_user_id) {
          activityList.push({
            id: `invoice-update-${invoice.id}`,
            type: 'invoice',
            action: 'updated',
            resource_name: invoice.number || `Invoice #${invoice.id.slice(-6)}`,
            user_name: invoice.updated_by_name,
            user_id: invoice.updated_by_user_id,
            timestamp: invoice.updated_at,
            details: invoice.clientName || undefined,
          });
        }
      });

      // Process quotes
      quotes?.forEach((quote: any) => {
        if (quote.created_by_name && quote.created_at) {
          activityList.push({
            id: `quote-create-${quote.id}`,
            type: 'quote',
            action: 'created',
            resource_name: quote.title || quote.number,
            user_name: quote.created_by_name,
            user_id: quote.created_by_user_id,
            timestamp: quote.created_at,
            details: quote.clientName || undefined,
          });
        }
        if (quote.updated_by_name && quote.updated_at && 
            quote.updated_by_user_id !== quote.created_by_user_id) {
          activityList.push({
            id: `quote-update-${quote.id}`,
            type: 'quote',
            action: 'updated',
            resource_name: quote.title || quote.number,
            user_name: quote.updated_by_name,
            user_id: quote.updated_by_user_id,
            timestamp: quote.updated_at,
            details: quote.clientName || undefined,
          });
        }
      });

      // Process payments
      payments?.forEach((payment: any) => {
        if (payment.created_by_name && payment.created_at) {
          activityList.push({
            id: `payment-create-${payment.id}`,
            type: 'payment',
            action: 'created',
            resource_name: `£${payment.amount?.toFixed(2) || '0.00'}`,
            user_name: payment.created_by_name,
            user_id: payment.created_by_user_id,
            timestamp: payment.created_at,
            details: payment.method || undefined,
          });
        }
      });

      // Sort by timestamp (most recent first)
      activityList.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(activityList);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <Users className="w-4 h-4" />;
      case 'job':
        return <FileText className="w-4 h-4" />;
      case 'invoice':
        return <Receipt className="w-4 h-4" />;
      case 'quote':
        return <FileCheck className="w-4 h-4" />;
      case 'payment':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'bg-blue-100 text-blue-700';
      case 'job':
        return 'bg-purple-100 text-purple-700';
      case 'invoice':
        return 'bg-green-100 text-green-700';
      case 'quote':
        return 'bg-orange-100 text-orange-700';
      case 'payment':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const typeMatch = filter === 'all' || activity.type === filter;
    const userMatch = userFilter === 'all' || activity.user_id === userFilter;
    return typeMatch && userMatch;
  });

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups: Record<string, ActivityItem[]>, activity) => {
    const date = new Date(activity.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(activity);
    return groups;
  }, {});

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-surface border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('team-management')}
            className="h-8 w-8 p-0"
          >
            ←
          </Button>
          <div>
            <h1 className="trades-h2">Activity Log</h1>
            <p className="trades-caption text-muted">
              {filteredActivities.length} activities
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                {filter === 'all' ? 'All Types' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter('all')}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('client')}>
                Clients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('job')}>
                Jobs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('invoice')}>
                Invoices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('quote')}>
                Quotes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('payment')}>
                Payments
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Filter */}
          {members.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  {userFilter === 'all' ? 'All Users' : members.find(m => m.user_id === userFilter)?.name || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setUserFilter('all')}>
                  All Users
                </DropdownMenuItem>
                {members.map(member => (
                  <DropdownMenuItem key={member.user_id} onClick={() => setUserFilter(member.user_id)}>
                    {member.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <CalendarIcon className="w-12 h-12 text-muted mb-4" />
            <p className="trades-body text-muted mb-2">No activity yet</p>
            <p className="trades-caption text-muted text-center">
              Team activity will appear here as members create and update resources
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.entries(groupedActivities).map(([date, items]) => (
              <div key={date}>
                <h3 className="trades-label text-muted mb-3">{date}</h3>
                <div className="space-y-2">
                  {items.map(activity => (
                    <Card key={activity.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="trades-body">
                              <span className="font-medium">{activity.user_name}</span>
                              {' '}
                              <span className="text-muted">{activity.action}</span>
                              {' '}
                              <span className="capitalize">{activity.type}</span>
                            </p>
                            <Badge variant="secondary" className="ml-auto shrink-0">
                              {activity.type}
                            </Badge>
                          </div>
                          <p className="trades-body text-ink truncate">{activity.resource_name}</p>
                          {activity.details && (
                            <p className="trades-caption text-muted truncate">{activity.details}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-muted" />
                            <p className="trades-caption text-muted">
                              {formatDate(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
