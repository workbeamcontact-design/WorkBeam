import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, TrendingUp, Users, DollarSign, FileText, Download, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../../utils/api';
import { useAuth } from '../../utils/auth-context';

interface BusinessAnalyticsProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface AnalyticsData {
  clients: any[];
  jobs: any[];
  invoices: any[];
  bookings: any[];
  payments: any[];
}

type TimePeriod = '1M' | '3M' | '6M' | '1Y' | '2Y' | 'All';

export function BusinessAnalytics({ onNavigate, onBack }: BusinessAnalyticsProps) {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData>({ 
    clients: [], 
    jobs: [], 
    invoices: [], 
    bookings: [],
    payments: []
  });
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1M');

  // Load data when user logs in
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('📊 Business Analytics: Loading data (user authenticated)');
        
        const [clients, jobs, invoices, bookings, payments] = await Promise.all([
          api.getClients(),
          api.getJobs(),
          api.getInvoices(),
          api.getBookings(),
          api.getPayments()
        ]);
        
        console.log('📊 Analytics data loaded:', {
          clients: clients.length,
          jobs: jobs.length,
          invoices: invoices.length,
          payments: payments.length
        });
        
        setData({ clients, jobs, invoices, bookings, payments });
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Date utilities
  const getDateMonthsAgo = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  };

  const periodMonths = {
    '1M': 1,
    '3M': 3,
    '6M': 6,
    '1Y': 12,
    '2Y': 24,
    'All': 120 // 10 years - effectively all data
  };

  // Simplified payment date parsing
  const getPaymentDate = (invoice: any): Date | null => {
    // Priority 1: Use paidAtISO if available (most reliable)
    if (invoice.paidAtISO) {
      const date = new Date(invoice.paidAtISO);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Priority 2: Parse dd/mm/yyyy format from paidAt
    if (invoice.paidAt && typeof invoice.paidAt === 'string' && invoice.paidAt.includes('/')) {
      const parts = invoice.paidAt.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) return date;
      }
    }
    
    // Priority 3: Try direct date parsing of paidAt
    if (invoice.paidAt) {
      const date = new Date(invoice.paidAt);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Priority 4: Fallback to updatedAt for paid or partial invoices
    if ((invoice.status === 'paid' || invoice.status === 'partial') && invoice.updatedAt) {
      const date = new Date(invoice.updatedAt);
      if (!isNaN(date.getTime())) return date;
    }
    
    return null;
  };

  // SIMPLIFIED & OPTIMIZED ANALYTICS LOGIC  
  const analytics = useMemo(() => {
    try {
      if (!data.invoices || data.invoices.length === 0) {
        return {
          totalRevenue: 0,
          avgJobValue: 0,
          activeClients: 0,
          totalJobs: 0,
          paidInvoices: 0,
          newClientsThisPeriod: 0,
          totalOutstanding: 0,
          totalOverdue: 0,
          monthlyData: [],
          revenueGrowth: 0
        };
      }

    const now = new Date();
    const periodStart = getDateMonthsAgo(periodMonths[timePeriod]);
    
    // 💰 REVENUE CALCULATION USING PAYMENT RECORDS (not invoices)
    // This ensures partial payments are correctly included in revenue
    const allPayments = data.payments || [];
    
    // Parse payment date from payment record
    const getPaymentRecordDate = (payment: any): Date | null => {
      // Payment records have a 'date' field in ISO format
      if (payment.date) {
        const date = new Date(payment.date);
        if (!isNaN(date.getTime())) return date;
      }
      // Fallback to createdAt
      if (payment.createdAt) {
        const date = new Date(payment.createdAt);
        if (!isNaN(date.getTime())) return date;
      }
      return null;
    };
    
    // Filter payments by date period
    const paymentsInPeriod = allPayments.filter(payment => {
      const paymentDate = getPaymentRecordDate(payment);
      if (!paymentDate) return false;
      
      if (timePeriod === 'All') return true;
      
      // For 1M, only include payments from current month
      if (timePeriod === '1M') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const paymentMonth = paymentDate.getMonth();
        const paymentYear = paymentDate.getFullYear();
        
        return paymentMonth === currentMonth && paymentYear === currentYear;
      }
      
      // For other periods, use normal date range
      return paymentDate >= periodStart && paymentDate <= now;
    });
    
    // Calculate revenue from actual payment amounts (includes partial payments)
    const totalRevenue = paymentsInPeriod.reduce((sum, payment) => {
      return sum + (payment.amount || 0);
    }, 0);
    
    // Calculate job completion based on payment activity
    const jobsWithPaymentsInPeriod = new Set();
    const jobValueMap = new Map();
    
    // Build job value map from all payments for each job
    paymentsInPeriod.forEach(payment => {
      if (payment.jobId) {
        jobsWithPaymentsInPeriod.add(payment.jobId);
      }
    });
    
    // Calculate total value for each job (from all payments, not just this period)
    data.jobs.forEach(job => {
      const jobPayments = allPayments.filter(p => p.jobId === job.id);
      const jobTotalValue = jobPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      jobValueMap.set(job.id, jobTotalValue);
    });
    
    // Calculate average job value for jobs with payments in period
    const jobValuesInPeriod = Array.from(jobsWithPaymentsInPeriod).map(jobId => 
      jobValueMap.get(jobId) || 0
    );
    
    const avgJobValue = jobValuesInPeriod.length > 0 
      ? jobValuesInPeriod.reduce((sum, value) => sum + value, 0) / jobValuesInPeriod.length 
      : 0;
    
    // Active clients = clients with payments in period
    const activeClientsSet = new Set();
    paymentsInPeriod.forEach(payment => {
      // Get clientId from payment or lookup via invoice
      if (payment.clientId) {
        activeClientsSet.add(payment.clientId);
      } else if (payment.invoiceId) {
        const invoice = data.invoices.find(inv => inv.id === payment.invoiceId);
        if (invoice?.clientId) {
          activeClientsSet.add(invoice.clientId);
        }
      }
    });
    
    // Simple debug output for verification (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Analytics ${timePeriod}:`, {
        revenue: totalRevenue,
        jobsCompleted: jobsWithPaymentsInPeriod.size,
        avgJobValue: avgJobValue,
        activeClients: activeClientsSet.size,
        paymentsCount: paymentsInPeriod.length
      });
    }
    
    // Monthly breakdown for charts using payment records
    const monthlyData = [];
    const months = timePeriod === 'All' ? 12 : Math.min(periodMonths[timePeriod], 12);
    
    // Map all payments with their dates
    const allPaymentsWithDates = allPayments.map(payment => ({
      ...payment,
      paymentDate: getPaymentRecordDate(payment)
    })).filter(p => p.paymentDate);
    
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const targetMonth = monthDate.getMonth();
      const targetYear = monthDate.getFullYear();
      const monthName = monthDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      
      // Filter payments for this specific month
      const monthlyPayments = allPaymentsWithDates.filter(payment => 
        payment.paymentDate.getMonth() === targetMonth && 
        payment.paymentDate.getFullYear() === targetYear
      );
      
      // Calculate revenue from actual payment amounts
      const monthlyRevenue = monthlyPayments.reduce((sum, payment) => {
        return sum + (payment.amount || 0);
      }, 0);
      
      // Jobs and clients from monthly payments
      const jobsThisMonth = new Set(monthlyPayments.filter(p => p.jobId).map(p => p.jobId)).size;
      const clientsThisMonth = new Set();
      monthlyPayments.forEach(payment => {
        if (payment.clientId) {
          clientsThisMonth.add(payment.clientId);
        } else if (payment.invoiceId) {
          const invoice = data.invoices.find(inv => inv.id === payment.invoiceId);
          if (invoice?.clientId) {
            clientsThisMonth.add(invoice.clientId);
          }
        }
      });

      monthlyData.push({
        month: monthName,
        revenue: monthlyRevenue,
        jobs: jobsThisMonth,
        clients: clientsThisMonth.size
      });
    }



    // Growth calculations
    const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
    const previousMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue || 0;
    const revenueGrowth = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0;
    
    // New clients in period
    const newClientsInPeriod = data.clients.filter(client => {
      if (timePeriod === 'All') return true;
      if (!client.createdAt) return false;
      
      const createdDate = new Date(client.createdAt);
      return createdDate >= periodStart && createdDate <= now;
    }).length;
    
    // Outstanding amounts (current, not period-filtered) - account for partial payments
    const totalOutstanding = data.invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => {
        const invoiceTotal = inv.total || 0;
        const amountPaid = inv.amountPaid || 0;
        return sum + (invoiceTotal - amountPaid);
      }, 0);
      
    const totalOverdue = data.invoices
      .filter(inv => {
        if (inv.status === 'paid' || !inv.dueDate) return false;
        return new Date(inv.dueDate) < now;
      })
      .reduce((sum, inv) => {
        const invoiceTotal = inv.total || 0;
        const amountPaid = inv.amountPaid || 0;
        return sum + (invoiceTotal - amountPaid);
      }, 0);

    return {
      totalRevenue,
      avgJobValue,
      activeClients: activeClientsSet.size,
      totalJobs: jobsWithPaymentsInPeriod.size,
      paidInvoices: paymentsInPeriod.length,
      newClientsThisPeriod: newClientsInPeriod,
      totalOutstanding,
      totalOverdue,
      monthlyData,
      revenueGrowth
    };
    
    } catch (error) {
      console.error('Error calculating analytics:', error);
      return {
        totalRevenue: 0,
        avgJobValue: 0,
        activeClients: 0,
        totalJobs: 0,
        paidInvoices: 0,
        newClientsThisPeriod: 0,
        totalOutstanding: 0,
        totalOverdue: 0,
        monthlyData: [],
        revenueGrowth: 0
      };
    }
    



  }, [data, timePeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };



  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft size={20} />
          </Button>
          <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Business Analytics</h1>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="trades-body text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error boundary for data availability
  if (!data.clients && !data.jobs && !data.invoices) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft size={20} />
          </Button>
          <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Business Analytics</h1>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="trades-body text-gray-600 mb-4">No data available for analytics</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft size={20} />
            </Button>
            <div>
              <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Business Analytics</h1>
              <p className="trades-caption" style={{ color: 'var(--muted)' }}>
                Financial insights and performance metrics
              </p>
            </div>
          </div>
          
          <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
            <SelectTrigger className="w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1M">1M</SelectItem>
              <SelectItem value="3M">3M</SelectItem>
              <SelectItem value="6M">6M</SelectItem>
              <SelectItem value="1Y">1Y</SelectItem>
              <SelectItem value="2Y">2Y</SelectItem>
              <SelectItem value="All">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll_area p-4 space-y-6 pb-24">
        
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="trades-label flex items-center gap-2">
                <DollarSign size={16} className="text-green-600" />
                Revenue ({timePeriod})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="trades-h1 mb-1" style={{ color: 'var(--ink)' }}>
                {formatCurrency(analytics.totalRevenue)}
              </div>
              <div className="flex items-center gap-1">
                {analytics.revenueGrowth >= 0 ? (
                  <ArrowUp size={12} className="text-green-600" />
                ) : (
                  <ArrowDown size={12} className="text-red-600" />
                )}
                <span className={`trades-caption ${analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(analytics.revenueGrowth).toFixed(1)}% vs last month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="trades-label flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-600" />
                Avg Job Value ({timePeriod})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="trades-h1 mb-1" style={{ color: 'var(--ink)' }}>
                {formatCurrency(analytics.avgJobValue)}
              </div>
              <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                Per completed job
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="trades-label flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                Active Clients ({timePeriod})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="trades-h1 mb-1" style={{ color: 'var(--ink)' }}>
                {analytics.activeClients}
              </div>
              <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                {timePeriod === 'All' ? 'Total client base' : 'Made payments in period'}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="trades-label flex items-center gap-2">
                <FileText size={16} className="text-orange-600" />
                Jobs Completed ({timePeriod})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="trades-h1 mb-1" style={{ color: 'var(--ink)' }}>
                {analytics.totalJobs}
              </div>
              <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                Fully paid jobs
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="trades-h2">Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    stroke="#6B7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6B7280"
                    tickFormatter={(value) => `£${Math.round(value / 1000)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    labelStyle={{ color: '#111827' }}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0A84FF" 
                    strokeWidth={2}
                    dot={{ fill: '#0A84FF', r: 3 }}
                    activeDot={{ r: 5, stroke: '#0A84FF' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Client Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="trades-h2">Client Growth & Job Activity</CardTitle>
            <CardDescription>Monthly jobs and client acquisition over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    stroke="#6B7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6B7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="jobs" fill="#0A84FF" name="Jobs Completed" />
                  <Bar dataKey="clients" fill="#16A34A" name="New Clients" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview - Clean and Spacious */}
        <Card>
          <CardHeader>
            <CardTitle className="trades-h2">Financial Overview</CardTitle>
            <CardDescription>Revenue collection and outstanding amounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Collection Progress */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="trades-body font-medium" style={{ color: 'var(--ink)' }}>
                  Collection Progress
                </span>
                <span className="trades-label" style={{ color: 'var(--muted)' }}>
                  {((analytics.totalRevenue / (analytics.totalRevenue + analytics.totalOutstanding)) * 100).toFixed(1)}% collected
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(analytics.totalRevenue / (analytics.totalRevenue + analytics.totalOutstanding)) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="trades-label text-green-800 mb-1">Total Revenue</div>
                    <div className="trades-caption text-green-600">Money collected this period</div>
                  </div>
                  <div className="trades-h1 text-green-600 font-semibold">
                    {formatCurrency(analytics.totalRevenue)}
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="trades-label text-orange-800 mb-1">Outstanding</div>
                    <div className="trades-caption text-orange-600">Invoices awaiting payment</div>
                  </div>
                  <div className="trades-h1 text-orange-600 font-semibold">
                    {formatCurrency(analytics.totalOutstanding)}
                  </div>
                </div>
              </div>
              
              {analytics.totalOverdue > 0 && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="trades-label text-red-800 mb-1">Overdue</div>
                      <div className="trades-caption text-red-600">Past due date - needs attention</div>
                    </div>
                    <div className="trades-h1 text-red-600 font-semibold">
                      {formatCurrency(analytics.totalOverdue)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Performance - Spacious Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="trades-h1 mb-2" style={{ color: 'var(--primary)' }}>
                {analytics.totalJobs}
              </div>
              <div className="trades-label" style={{ color: 'var(--ink)' }}>Total Jobs</div>
              <div className="trades-caption mt-1" style={{ color: 'var(--muted)' }}>
                This period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="trades-h1 mb-2" style={{ color: 'var(--success)' }}>
                {analytics.totalJobs}
              </div>
              <div className="trades-label" style={{ color: 'var(--ink)' }}>Completed</div>
              <div className="trades-caption mt-1" style={{ color: 'var(--muted)' }}>
                Jobs completed in period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="trades-h1 mb-2" style={{ color: 'var(--primary)' }}>
                {analytics.activeClients}
              </div>
              <div className="trades-label" style={{ color: 'var(--ink)' }}>Active Clients</div>
              <div className="trades-caption mt-1" style={{ color: 'var(--muted)' }}>
                {timePeriod === 'All' ? 'Total client base' : 'With payments in period'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="trades-h1 mb-2" style={{ color: 'var(--success)' }}>
                {formatCurrency(analytics.avgJobValue)}
              </div>
              <div className="trades-label" style={{ color: 'var(--ink)' }}>Avg Job Value</div>
              <div className="trades-caption mt-1" style={{ color: 'var(--muted)' }}>
                Per completed job
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="trades-h2">Business Growth</CardTitle>
            <CardDescription>Growth and expansion metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="trades-label" style={{ color: 'var(--ink)' }}>New Clients</div>
                <div className="trades-caption" style={{ color: 'var(--muted)' }}>
                  {timePeriod === 'All' ? 'Total clients acquired' : 'Acquired this period'}
                </div>
              </div>
              <div className="text-right">
                <div className="trades-body font-semibold" style={{ color: 'var(--ink)' }}>
                  +{analytics.newClientsThisPeriod}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="trades-label" style={{ color: 'var(--ink)' }}>Payment Transactions</div>
                <div className="trades-caption" style={{ color: 'var(--muted)' }}>
                  Payments received {timePeriod === 'All' ? 'total' : 'this period'}
                </div>
              </div>
              <div className="text-right">
                <div className="trades-body font-semibold" style={{ color: 'var(--ink)' }}>
                  {analytics.paidInvoices}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}