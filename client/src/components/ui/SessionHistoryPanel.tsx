import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Filter,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Types
interface SessionHistoryEntry {
  _id: string;
  sessionId: {
    _id: string;
    date: string;
    status: string;
  };
  action: 'created' | 'updated' | 'status_changed' | 'cancelled' | 'rescheduled' | 'completed' | 'reminder_sent' | 'confirmation_sent' | 'notes_updated';
  actionBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  timestamp: string;
  description: string;
  systemGenerated: boolean;
  metadata?: {
    cancellationReason?: string;
    cancellationReasonText?: string;
    originalDate?: string;
    newDate?: string;
    rescheduleReason?: string;
    source?: string;
  };
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

interface SessionHistoryResponse {
  history: SessionHistoryEntry[];
  total: number;
  page: number;
  totalPages: number;
}

interface SessionAnalytics {
  totalSessions: number;
  totalCancellations: number;
  totalRescheduling: number;
  cancellationRate: number;
  reschedulingRate: number;
  commonCancellationReasons: Array<{ reason: string; count: number }>;
  commonRescheduleReasons: Array<{ reason: string; count: number }>;
  monthlyTrends: Array<{
    month: string;
    year: number;
    created: number;
    cancelled: number;
    rescheduled: number;
    completed: number;
  }>;
  userActivitySummary: Array<{
    userId: string;
    userName: string;
    role: string;
    totalActions: number;
    cancellations: number;
    rescheduling: number;
  }>;
}

interface SessionHistoryPanelProps {
  sessionId?: string; // If provided, show history for specific session
  className?: string;
}

const SessionHistoryPanel: React.FC<SessionHistoryPanelProps> = ({ 
  sessionId, 
  className = '' 
}) => {
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    action: '',
    dateFrom: '',
    dateTo: '',
    systemGenerated: '',
    actionBy: '',
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  
  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'analytics'>('history');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Helper function to get authenticated headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  };

  // Fetch session history
  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (sessionId) {
        params.append('sessionId', sessionId);
      }
      
      if (filters.action) params.append('action', filters.action);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.systemGenerated) params.append('systemGenerated', filters.systemGenerated);
      if (filters.actionBy) params.append('actionBy', filters.actionBy);
      
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/session-history?${params}`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session history');
      }

      const data: { success: boolean; data: SessionHistoryResponse } = await response.json();
      
      if (data.success) {
        setHistory(data.data.history);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      } else {
        throw new Error('Failed to fetch session history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session history');
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    if (sessionId) return; // Don't fetch analytics for specific session
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/session-history/analytics?${params}`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data: { success: boolean; data: SessionAnalytics } = await response.json();
      
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or filters change
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else {
      fetchAnalytics();
    }
  }, [activeTab, currentPage, filters, sessionId]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      action: '',
      dateFrom: '',
      dateTo: '',
      systemGenerated: '',
      actionBy: '',
    });
    setCurrentPage(1);
  };

  // Toggle entry expansion
  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  // Get icon for action type
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'rescheduled': return <RotateCcw className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'updated': return <Settings className="w-4 h-4 text-orange-500" />;
      case 'status_changed': return <RefreshCw className="w-4 h-4 text-purple-500" />;
      case 'reminder_sent': 
      case 'confirmation_sent': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Format action name for display
  const formatActionName = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {sessionId ? 'Session History' : 'Session Audit Trail'}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>
            <button
              onClick={() => activeTab === 'history' ? fetchHistory() : fetchAnalytics()}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        {!sessionId && (
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {['history', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'history' | 'analytics')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                <option value="created">Created</option>
                <option value="cancelled">Cancelled</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="completed">Completed</option>
                <option value="updated">Updated</option>
                <option value="status_changed">Status Changed</option>
                <option value="reminder_sent">Reminder Sent</option>
                <option value="confirmation_sent">Confirmation Sent</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* System Generated */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                value={filters.systemGenerated}
                onChange={(e) => handleFilterChange('systemGenerated', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Sources</option>
                <option value="false">User Actions</option>
                <option value="true">System Generated</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            <span className="text-gray-600">Loading...</span>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && !loading && (
          <>
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No history entries found.
              </div>
            ) : (
              <>
                {/* History List */}
                <div className="space-y-4 mb-6">
                  {history.map((entry) => (
                    <div
                      key={entry._id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleExpanded(entry._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getActionIcon(entry.action)}
                            <div>
                              <div className="font-medium text-gray-900">
                                {formatActionName(entry.action)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {entry.description}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-1" />
                              {entry.actionBy.firstName} {entry.actionBy.lastName}
                              {entry.systemGenerated && (
                                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                  System
                                </span>
                              )}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(entry.timestamp).toLocaleString()}
                            </div>
                            {expandedEntries.has(entry._id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedEntries.has(entry._id) && (
                        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {/* Session Info */}
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Session Details</h4>
                              <div className="space-y-1 text-sm">
                                <div>ID: {entry.sessionId._id}</div>
                                <div>Date: {new Date(entry.sessionId.date).toLocaleString()}</div>
                                <div>Status: {entry.sessionId.status}</div>
                              </div>
                            </div>

                            {/* Metadata */}
                            {entry.metadata && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Additional Information</h4>
                                <div className="space-y-1 text-sm">
                                  {entry.metadata.cancellationReason && (
                                    <div>Reason: {entry.metadata.cancellationReason}</div>
                                  )}
                                  {entry.metadata.cancellationReasonText && (
                                    <div>Details: {entry.metadata.cancellationReasonText}</div>
                                  )}
                                  {entry.metadata.originalDate && entry.metadata.newDate && (
                                    <>
                                      <div>From: {new Date(entry.metadata.originalDate).toLocaleString()}</div>
                                      <div>To: {new Date(entry.metadata.newDate).toLocaleString()}</div>
                                    </>
                                  )}
                                  {entry.metadata.rescheduleReason && (
                                    <div>Reason: {entry.metadata.rescheduleReason}</div>
                                  )}
                                  {entry.metadata.source && (
                                    <div>Source: {entry.metadata.source}</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Previous/New Values */}
                            {(entry.previousValues || entry.newValues) && (
                              <div className="md:col-span-2">
                                <h4 className="font-medium text-gray-900 mb-2">Changes</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {entry.previousValues && (
                                    <div>
                                      <h5 className="text-sm font-medium text-gray-700 mb-1">Previous Values</h5>
                                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                        {JSON.stringify(entry.previousValues, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {entry.newValues && (
                                    <div>
                                      <h5 className="text-sm font-medium text-gray-700 mb-1">New Values</h5>
                                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                        {JSON.stringify(entry.newValues, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                    <div className="flex items-center text-sm text-gray-700">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && !loading && analytics && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{analytics.totalSessions}</div>
                <div className="text-sm text-blue-700">Total Sessions</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{analytics.totalCancellations}</div>
                <div className="text-sm text-red-700">Cancellations</div>
                <div className="text-xs text-red-600">{analytics.cancellationRate.toFixed(1)}% rate</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{analytics.totalRescheduling}</div>
                <div className="text-sm text-yellow-700">Rescheduled</div>
                <div className="text-xs text-yellow-600">{analytics.reschedulingRate.toFixed(1)}% rate</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(100 - analytics.cancellationRate).toFixed(1)}%
                </div>
                <div className="text-sm text-green-700">Success Rate</div>
              </div>
            </div>

            {/* Common Reasons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cancellation Reasons */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Common Cancellation Reasons</h3>
                {analytics.commonCancellationReasons.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.commonCancellationReasons.slice(0, 5).map((reason, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">{reason.reason || 'Unknown'}</span>
                        <span className="font-medium text-gray-900">{reason.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No cancellations recorded</div>
                )}
              </div>

              {/* Reschedule Reasons */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Common Reschedule Reasons</h3>
                {analytics.commonRescheduleReasons.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.commonRescheduleReasons.slice(0, 5).map((reason, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">{reason.reason || 'Unknown'}</span>
                        <span className="font-medium text-gray-900">{reason.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No rescheduling recorded</div>
                )}
              </div>
            </div>

            {/* Monthly Trends */}
            {analytics.monthlyTrends.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Monthly Trends</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2">Month</th>
                        <th className="text-center py-2">Created</th>
                        <th className="text-center py-2">Cancelled</th>
                        <th className="text-center py-2">Rescheduled</th>
                        <th className="text-center py-2">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.monthlyTrends.slice(0, 6).map((trend, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2">{trend.month} {trend.year}</td>
                          <td className="text-center py-2">{trend.created}</td>
                          <td className="text-center py-2">{trend.cancelled}</td>
                          <td className="text-center py-2">{trend.rescheduled}</td>
                          <td className="text-center py-2">{trend.completed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionHistoryPanel; 