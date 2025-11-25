import { Bell, Mail, Clock, CreditCard, Quote, Calendar, ArrowLeft, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { api } from "../../utils/api";
import { toast } from "sonner@2.0.3";

interface NotificationsSettingsProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface NotificationPreferences {
  // Push Notifications
  push_payment_overdue: boolean;
  push_calendar_reminders: boolean;
  
  // Email Notifications  
  email_payment_overdue: boolean;
  email_calendar_reminders: boolean;
  
  // Timing Settings for Overdue Payments
  overdue_reminder_frequency: 'daily' | 'every_3_days' | 'weekly';
  overdue_grace_period: number; // days after due date before starting reminders
  
  // Calendar Reminder Timing
  calendar_reminder_times: string[]; // e.g., ['1_day', '3_hours', '1_hour', '30_minutes']
  
  // General Settings
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

const defaultPreferences: NotificationPreferences = {
  // Push Notifications - More immediate/urgent notifications
  push_payment_overdue: true,
  push_calendar_reminders: true,
  
  // Email Notifications - More detailed/summary notifications
  email_payment_overdue: true,
  email_calendar_reminders: false, // Push is usually enough for calendar
  
  // Timing Settings for Overdue Payments
  overdue_reminder_frequency: 'daily',
  overdue_grace_period: 0, // Immediately after due date
  
  // Calendar Reminder Timing
  calendar_reminder_times: ['1_day', '3_hours', '30_minutes'], // Default practical reminders
  
  // General Settings
  quiet_hours_enabled: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00"
};

export function NotificationsSettings({ onNavigate, onBack }: NotificationsSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      setLoading(true);
      const result = await api.getNotificationPreferences();
      
      if (result && result.success) {
        setPreferences({ ...defaultPreferences, ...result.data });
      } else {
        // Use defaults if no preferences found
        console.log('Using default notification preferences');
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const result = await api.updateNotificationPreferences(preferences);
      
      if (result && result.success) {
        toast.success('Notification settings saved successfully');
        setHasChanges(false);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const notificationCategories = [
    {
      id: 'payments',
      title: 'Payments & Finance',
      description: 'Payment notifications and overdue reminders',
      icon: CreditCard,
      iconColor: '#0A84FF',
      iconBg: '#EFF6FF',
      notifications: [

        {
          id: 'payment_overdue',
          label: 'Overdue Payments',
          description: 'Reminders for overdue invoices and payments',
          pushKey: 'push_payment_overdue' as keyof NotificationPreferences,
          emailKey: 'email_payment_overdue' as keyof NotificationPreferences
        }
      ]
    },
    {
      id: 'schedule',
      title: 'Schedule & Calendar',
      description: 'Booking reminders and calendar updates',
      icon: Calendar,
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      notifications: [
        {
          id: 'calendar_reminders',
          label: 'Calendar Reminders',
          description: 'Upcoming appointments and job schedules',
          pushKey: 'push_calendar_reminders' as keyof NotificationPreferences,
          emailKey: 'email_calendar_reminders' as keyof NotificationPreferences
        }
      ]
    }
  ];

  if (loading) {
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
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Notifications</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="trades-body text-gray-600">Loading notification settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="header bg-white p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Notifications</h1>
            <p className="trades-caption text-gray-600">Manage how you receive updates</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: hasChanges ? '160px' : '80px' }}>
        <div className="p-4 space-y-6">
          
          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Bell size={20} className="text-blue-600" />
              </div>
              <div className="trades-body font-medium mb-1" style={{ color: 'var(--ink)' }}>Push Notifications</div>
              <div className="trades-caption text-gray-600">Instant alerts on your device</div>
            </div>
            
            <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Mail size={20} className="text-green-600" />
              </div>
              <div className="trades-body font-medium mb-1" style={{ color: 'var(--ink)' }}>Email Notifications</div>
              <div className="trades-caption text-gray-600">Detailed updates via email</div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="trades-body font-medium" style={{ color: 'var(--ink)' }}>Quiet Hours</h3>
                  <p className="trades-caption text-gray-600">Pause notifications during off-hours</p>
                </div>
              </div>
              <Switch
                checked={preferences.quiet_hours_enabled}
                onCheckedChange={(checked) => handlePreferenceChange('quiet_hours_enabled', checked)}
              />
            </div>
            
            {preferences.quiet_hours_enabled && (
              <div className="pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="trades-label text-gray-900 block mb-2">From</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_start}
                      onChange={(e) => handlePreferenceChange('quiet_hours_start', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg trades-body focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="trades-label text-gray-900 block mb-2">Until</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_end}
                      onChange={(e) => handlePreferenceChange('quiet_hours_end', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg trades-body focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <p className="trades-caption text-gray-600 mt-2">
                  Push notifications will be silenced during these hours
                </p>
              </div>
            )}
          </div>

          {/* Notification Categories */}
          {notificationCategories.map((category) => (
            <div key={category.id} className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: category.iconBg }}
                >
                  <category.icon size={20} style={{ color: category.iconColor }} />
                </div>
                <div>
                  <h3 className="trades-body font-medium" style={{ color: 'var(--ink)' }}>{category.title}</h3>
                  <p className="trades-caption text-gray-600">{category.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {category.notifications.map((notification) => (
                  <div key={notification.id} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="trades-label font-medium mb-1" style={{ color: 'var(--ink)' }}>
                          {notification.label}
                        </h4>
                        <p className="trades-caption text-gray-600">{notification.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Push Toggle */}
                      {notification.pushKey && (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={preferences[notification.pushKey] as boolean}
                            onCheckedChange={(checked) => handlePreferenceChange(notification.pushKey!, checked)}
                          />
                          <div className="flex items-center gap-1">
                            <Bell size={14} className="text-blue-600" />
                            <span className="trades-caption text-gray-700">Push</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Email Toggle */}
                      {notification.emailKey && (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={preferences[notification.emailKey] as boolean}
                            onCheckedChange={(checked) => handlePreferenceChange(notification.emailKey!, checked)}
                          />
                          <div className="flex items-center gap-1">
                            <Mail size={14} className="text-green-600" />
                            <span className="trades-caption text-gray-700">Email</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Overdue Payment Timing */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="trades-body font-medium" style={{ color: 'var(--ink)' }}>Overdue Payment Reminders</h3>
                <p className="trades-caption text-gray-600">Configure when and how often to get overdue payment alerts</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="trades-label text-gray-900 block mb-2">Grace Period</label>
                <select
                  value={preferences.overdue_grace_period}
                  onChange={(e) => handlePreferenceChange('overdue_grace_period', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg trades-body focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>Start reminders immediately after due date</option>
                  <option value={1}>1 day grace period</option>
                  <option value={3}>3 days grace period</option>
                  <option value={7}>1 week grace period</option>
                </select>
                <p className="trades-caption text-gray-600 mt-1">
                  How long to wait after due date before starting overdue reminders
                </p>
              </div>
              
              <div>
                <label className="trades-label text-gray-900 block mb-2">Reminder Frequency</label>
                <select
                  value={preferences.overdue_reminder_frequency}
                  onChange={(e) => handlePreferenceChange('overdue_reminder_frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg trades-body focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily reminders</option>
                  <option value="every_3_days">Every 3 days</option>
                  <option value="weekly">Weekly reminders</option>
                </select>
                <p className="trades-caption text-gray-600 mt-1">
                  How often to remind you about overdue payments after grace period
                </p>
              </div>
            </div>
          </div>

          {/* Calendar Reminder Timing */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="trades-body font-medium" style={{ color: 'var(--ink)' }}>Calendar Reminder Times</h3>
                <p className="trades-caption text-gray-600">Choose when to get reminders before appointments</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { value: '1_day', label: '1 day before', description: 'Good for planning and preparation' },
                { value: '3_hours', label: '3 hours before', description: 'Time to finish current work and travel' },
                { value: '1_hour', label: '1 hour before', description: 'Final preparation and travel time' },
                { value: '30_minutes', label: '30 minutes before', description: 'Last-minute reminder before leaving' },
                { value: '15_minutes', label: '15 minutes before', description: 'Final alert if running late' }
              ].map((reminder) => (
                <div key={reminder.value} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="trades-label font-medium" style={{ color: 'var(--ink)' }}>{reminder.label}</div>
                    <p className="trades-caption text-gray-600">{reminder.description}</p>
                  </div>
                  <Switch
                    checked={preferences.calendar_reminder_times.includes(reminder.value)}
                    onCheckedChange={(checked) => {
                      const currentTimes = preferences.calendar_reminder_times;
                      const newTimes = checked 
                        ? [...currentTimes, reminder.value]
                        : currentTimes.filter(time => time !== reminder.value);
                      handlePreferenceChange('calendar_reminder_times', newTimes);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Expert Tip */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={16} className="text-blue-600" />
              </div>
              <div>
                <h4 className="trades-label font-medium mb-1 text-blue-900">Smart Timing Strategy</h4>
                <p className="trades-caption text-blue-800">
                  <strong>Overdue Payments:</strong> We use your invoice due dates (not the terms text) to calculate when payments are overdue. 
                  A 3-day grace period prevents nagging clients who pay promptly.
                  <br /><br />
                  <strong>Calendar Reminders:</strong> 1 day + 3 hours + 30 minutes gives you planning time, travel time, and a final nudge.
                  <br /><br />
                  <strong>Quote Management:</strong> Since you manually update quote statuses when clients respond, no automated notifications are needed for quote approvals.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Save Button - Floating Action Button */}
      {hasChanges && (
        <div className="absolute bottom-20 left-0 right-0 px-4 bg-surface-alt z-10">
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-warning/10 text-warning rounded-full">
                <div className="w-2 h-2 bg-warning rounded-full" />
                <span className="trades-caption">Unsaved changes</span>
              </div>
            </div>
            
            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              style={{
                backgroundColor: '#0A84FF',
                color: 'white',
                height: '56px',
                borderRadius: '12px',
                minHeight: '44px'
              }}
            >
              {saving ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="trades-body">Saving...</span>
                </>
              ) : (
                <>
                  <Check size={20} />
                  <span className="trades-body">Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}