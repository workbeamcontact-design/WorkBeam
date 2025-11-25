/**
 * Team Activity Card Component
 * 
 * Displays recent team activity with smooth animations
 * Phase 4b Step 5: UI Polish
 */

import React from 'react';
import { Activity, TrendingUp, Users, FileText, Receipt, FileCheck } from 'lucide-react';
import { Card } from './card';
import { Badge } from './badge';

interface ActivityPreview {
  user_name: string;
  action: 'created' | 'updated';
  type: 'client' | 'job' | 'invoice' | 'quote' | 'payment';
  resource_name: string;
  timestamp: string;
}

interface TeamActivityCardProps {
  activities: ActivityPreview[];
  onViewAll: () => void;
}

export function TeamActivityCard({ activities, onViewAll }: TeamActivityCardProps) {
  const recentActivities = activities.slice(0, 3);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <Users className="w-3.5 h-3.5" />;
      case 'job':
        return <FileText className="w-3.5 h-3.5" />;
      case 'invoice':
        return <Receipt className="w-3.5 h-3.5" />;
      case 'quote':
        return <FileCheck className="w-3.5 h-3.5" />;
      case 'payment':
        return <TrendingUp className="w-3.5 h-3.5" />;
      default:
        return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'text-blue-600 bg-blue-100';
      case 'job':
        return 'text-purple-600 bg-purple-100';
      case 'invoice':
        return 'text-green-600 bg-green-100';
      case 'quote':
        return 'text-orange-600 bg-orange-100';
      case 'payment':
        return 'text-emerald-600 bg-emerald-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  if (recentActivities.length === 0) {
    return null;
  }

  return (
    <Card className="m-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full opacity-10 blur-3xl -mr-16 -mt-16" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="trades-body text-blue-900 mb-0.5">Recent Activity</h3>
            <p className="trades-caption text-blue-700">
              Your team's latest work
            </p>
          </div>
          <button
            onClick={onViewAll}
            className="text-blue-600 trades-caption hover:underline"
          >
            View all
          </button>
        </div>

        {/* Activity list */}
        <div className="space-y-2">
          {recentActivities.map((activity, index) => (
            <div
              key={index}
              className="flex items-start gap-2 bg-white/60 backdrop-blur-sm rounded-lg p-2 transition-all hover:bg-white/80"
              style={{
                animation: `slideIn 0.3s ease-out ${index * 0.1}s both`,
              }}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${getActivityColor(activity.type)} flex-shrink-0`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="trades-caption text-ink truncate">
                  <span className="font-medium">{activity.user_name}</span>
                  {' '}
                  <span className="text-muted">{activity.action}</span>
                  {' '}
                  <span className="text-ink">{activity.resource_name}</span>
                </p>
                <p className="trades-caption text-muted">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </Card>
  );
}
