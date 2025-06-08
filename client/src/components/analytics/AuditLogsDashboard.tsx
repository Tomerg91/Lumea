import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Users, 
  Activity, 
  Download,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { auditService } from '../../services/auditService';

interface AuditLog {
  _id: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  phiAccessed: boolean;
  phiType?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  eventType: string;
  eventCategory: string;
  ipAddress: string;
  description: string;
  statusCode?: number;
  suspicious: boolean;
  investigationStatus?: string;
  dataClassification: string;
}

interface AuditStatistics {
  totalLogs: number;
  phiAccessCount: number;
  suspiciousActivityCount: number;
  riskLevelBreakdown: Record<string, number>;
  eventTypeBreakdown: Record<string, number>;
  topUsers: Array<{ userId: string; userEmail: string; count: number }>;
  topResources: Array<{ resource: string; count: number }>;
  recentActivity: AuditLog[];
  complianceMetrics: {
    hipaaCompliantLogs: number;
    retentionCompliance: number;
    dataClassificationBreakdown: Record<string, number>;
  };
}

interface FilterOptions {
  startDate?: string;
  endDate?: string;
  riskLevel?: string;
  eventType?: string;
  phiAccessed?: boolean;
  suspicious?: boolean;
  searchText?: string;
}

const AuditLogsDashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [filters, currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, logsResponse] = await Promise.all([
        auditService.getStatistics(filters.startDate, filters.endDate),
        auditService.getLogs({
          ...filters,
          page: currentPage,
          limit: 50
        })
      ]);

      setStatistics(statsResponse.data);
      setAuditLogs(logsResponse.data.logs);
      setTotalPages(logsResponse.pagination.totalPages);
    } catch (err) {
      setError('Failed to load audit data');
      console.error('Error loading audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const exportLogs = async (format: 'json' | 'csv') => {
    try {
      await auditService.exportLogs(format, filters);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading && !statistics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading audit data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs Dashboard</h2>
          <p className="text-gray-600">HIPAA compliance monitoring and audit trail</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => exportLogs('csv')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => exportLogs('json')}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalLogs.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">PHI Access</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.phiAccessCount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Suspicious Activity</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.suspiciousActivityCount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">HIPAA Compliant</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.complianceMetrics.hipaaCompliantLogs.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            <Filter className="h-5 w-5 mr-2" />
            Filters
            {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </button>
        </div>

        {showFilters && (
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                <select
                  value={filters.riskLevel || ''}
                  onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={filters.eventType || ''}
                  onChange={(e) => handleFilterChange('eventType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="user_action">User Action</option>
                  <option value="data_access">Data Access</option>
                  <option value="security_event">Security Event</option>
                  <option value="admin_action">Admin Action</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={filters.searchText || ''}
                    onChange={(e) => handleFilterChange('searchText', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.phiAccessed === true}
                  onChange={(e) => handleFilterChange('phiAccessed', e.target.checked ? true : undefined)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">PHI Access Only</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.suspicious === true}
                  onChange={(e) => handleFilterChange('suspicious', e.target.checked ? true : undefined)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="ml-2 text-sm text-gray-700">Suspicious Activity Only</span>
              </label>

              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Audit Logs</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PHI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.userEmail || 'Anonymous'}</div>
                    <div className="text-sm text-gray-500">{log.userRole}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.resource}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(log.riskLevel)}`}>
                      {log.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.phiAccessed ? (
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 text-red-500 mr-1" />
                        <span className="text-sm text-red-600">{log.phiType}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.suspicious ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Suspicious
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-900 flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Audit Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <p className="text-sm text-gray-900">{selectedLog.userEmail || 'Anonymous'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <p className="text-sm text-gray-900">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource</label>
                  <p className="text-sm text-gray-900">{selectedLog.resource}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Risk Level</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(selectedLog.riskLevel)}`}>
                    {selectedLog.riskLevel}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <p className="text-sm text-gray-900">{selectedLog.ipAddress}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{selectedLog.description}</p>
              </div>
              {selectedLog.phiAccessed && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">PHI Access Details</h4>
                  <p className="text-sm text-red-700">Type: {selectedLog.phiType}</p>
                  <p className="text-sm text-red-700">Classification: {selectedLog.dataClassification}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsDashboard; 