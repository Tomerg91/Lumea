import React, { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  Download,
  Lock,
  Unlock,
  UserCheck,
  AlertCircle,
  Clock,
  FileText,
  Settings,
  Trash2,
  Check,
  X,
  Info,
  Calendar,
  Globe,
  Database,
  Activity,
  Bell,
  Key,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Archive
} from 'lucide-react';
import {
  reflectionPrivacyService,
  PrivacySettings,
  DataAccessLog,
  ConsentRecord,
  DataSubjectRequest
} from '../../services/reflectionPrivacyService';

interface PrivacyDashboardProps {
  clientId: string;
  userRole: 'client' | 'coach' | 'admin';
  currentUserId: string;
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({
  clientId,
  userRole,
  currentUserId,
}) => {
  // State management
  const [activeTab, setActiveTab] = useState<'settings' | 'consent' | 'access' | 'requests' | 'export'>('settings');
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [accessLogs, setAccessLogs] = useState<DataAccessLog[]>([]);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [dataRequests, setDataRequests] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter and search state
  const [logFilter, setLogFilter] = useState<{
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    success?: boolean;
  }>({});
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadPrivacyData();
  }, [clientId]);

  const loadPrivacyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load privacy settings
      let settings = reflectionPrivacyService.getPrivacySettings(clientId);
      if (!settings) {
        settings = await reflectionPrivacyService.initializeClientPrivacy(clientId);
      }
      setPrivacySettings(settings);

      // Load consent records
      const consents = reflectionPrivacyService.getConsentRecords(clientId);
      setConsentRecords(consents);

      // Load access logs (if permitted)
      if (userRole === 'client' || userRole === 'admin') {
        const logs = await reflectionPrivacyService.getAccessLogs(
          clientId,
          logFilter.dateFrom,
          logFilter.dateTo,
          logFilter.action,
          50
        );
        setAccessLogs(logs);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load privacy data');
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySettings = async (updates: Partial<PrivacySettings>) => {
    if (!privacySettings) return;

    try {
      const updatedSettings = await reflectionPrivacyService.updatePrivacySettings(
        clientId,
        updates,
        currentUserId,
        userRole,
        '0.0.0.0', // Would be actual IP
        navigator.userAgent
      );
      
      setPrivacySettings(updatedSettings);
      setSuccessMessage('Privacy settings updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  const recordConsent = async (
    consentType: ConsentRecord['consentType'],
    granted: boolean
  ) => {
    try {
      await reflectionPrivacyService.recordConsent(
        clientId,
        consentType,
        granted,
        '0.0.0.0', // Would be actual IP
        'app',
        '1.0'
      );
      
      // Reload consent records
      const consents = reflectionPrivacyService.getConsentRecords(clientId);
      setConsentRecords(consents);
      setSuccessMessage('Consent recorded successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record consent');
    }
  };

  const withdrawConsent = async (
    consentType: ConsentRecord['consentType'],
    reason: string
  ) => {
    try {
      await reflectionPrivacyService.withdrawConsent(
        clientId,
        consentType,
        reason,
        '0.0.0.0' // Would be actual IP
      );
      
      // Reload consent records
      const consents = reflectionPrivacyService.getConsentRecords(clientId);
      setConsentRecords(consents);
      setSuccessMessage('Consent withdrawn successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw consent');
    }
  };

  const submitDataRequest = async (
    requestType: DataSubjectRequest['requestType'],
    details: string
  ) => {
    try {
      await reflectionPrivacyService.submitDataSubjectRequest(
        clientId,
        requestType,
        details,
        currentUserId
      );
      
      setSuccessMessage('Data request submitted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    }
  };

  const exportData = async (format: 'json' | 'csv' | 'pdf', includeAnalytics: boolean = false) => {
    try {
      const blob = await reflectionPrivacyService.exportClientData(
        clientId,
        format,
        includeAnalytics
      );
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `client-data-${clientId}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccessMessage('Data exported successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading privacy settings...</span>
      </div>
    );
  }

  if (!privacySettings) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Privacy settings not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-blue-600" />
            Privacy & Data Control
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your privacy settings and data access controls
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Last updated: {new Date(privacySettings.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'settings', label: 'Privacy Settings', icon: Settings },
          { key: 'consent', label: 'Consent Management', icon: UserCheck },
          { key: 'access', label: 'Access Logs', icon: Activity },
          { key: 'requests', label: 'Data Requests', icon: FileText },
          { key: 'export', label: 'Export Data', icon: Download },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Basic Privacy Settings */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Privacy Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Coach Can View Reflections</h4>
                  <p className="text-sm text-gray-600">Allow your coach to read your reflection responses</p>
                </div>
                <button
                  onClick={() => updatePrivacySettings({ coachCanView: !privacySettings.coachCanView })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    privacySettings.coachCanView ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  disabled={userRole === 'coach'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      privacySettings.coachCanView ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Coach Can Use for Analytics</h4>
                  <p className="text-sm text-gray-600">Allow coach to include your data in trend analysis</p>
                </div>
                <button
                  onClick={() => updatePrivacySettings({ coachCanAnalyze: !privacySettings.coachCanAnalyze })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    privacySettings.coachCanAnalyze ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  disabled={userRole === 'coach'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      privacySettings.coachCanAnalyze ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Anonymize My Data</h4>
                  <p className="text-sm text-gray-600">Replace identifying information with anonymous identifiers</p>
                </div>
                <button
                  onClick={() => updatePrivacySettings({ anonymizeData: !privacySettings.anonymizeData })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    privacySettings.anonymizeData ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  disabled={userRole === 'coach'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      privacySettings.anonymizeData ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Share with Research</h4>
                  <p className="text-sm text-gray-600">Allow anonymized data to be used for research purposes</p>
                </div>
                <button
                  onClick={() => updatePrivacySettings({ shareWithResearch: !privacySettings.shareWithResearch })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    privacySettings.shareWithResearch ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  disabled={userRole === 'coach'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      privacySettings.shareWithResearch ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Retention</h3>
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                Keep my data for:
              </label>
              <select
                value={privacySettings.dataRetentionDays}
                onChange={(e) => updatePrivacySettings({ dataRetentionDays: parseInt(e.target.value) })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={userRole === 'coach'}
              >
                <option value={365}>1 year</option>
                <option value={730}>2 years</option>
                <option value={1095}>3 years</option>
                <option value={1825}>5 years</option>
                <option value={-1}>Indefinitely</option>
              </select>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Data will be automatically deleted after this period unless legally required to retain.
            </p>
          </div>

          {/* Advanced Settings */}
          <div className="bg-white rounded-lg border p-6">
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
              {showAdvancedSettings ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {showAdvancedSettings && (
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Export Permissions</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={privacySettings.exportPermissions.allowExport}
                        onChange={(e) => updatePrivacySettings({
                          exportPermissions: {
                            ...privacySettings.exportPermissions,
                            allowExport: e.target.checked
                          }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={userRole === 'coach'}
                      />
                      <span className="text-sm text-gray-700">Allow data export</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={privacySettings.exportPermissions.includePersonalInfo}
                        onChange={(e) => updatePrivacySettings({
                          exportPermissions: {
                            ...privacySettings.exportPermissions,
                            includePersonalInfo: e.target.checked
                          }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={userRole === 'coach'}
                      />
                      <span className="text-sm text-gray-700">Include personal information in exports</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Access Restrictions</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={privacySettings.accessRestrictions.timeBasedAccess}
                        onChange={(e) => updatePrivacySettings({
                          accessRestrictions: {
                            ...privacySettings.accessRestrictions,
                            timeBasedAccess: e.target.checked
                          }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={userRole === 'coach'}
                      />
                      <span className="text-sm text-gray-700">Restrict access to business hours</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={privacySettings.accessRestrictions.requireTwoFactor}
                        onChange={(e) => updatePrivacySettings({
                          accessRestrictions: {
                            ...privacySettings.accessRestrictions,
                            requireTwoFactor: e.target.checked
                          }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={userRole === 'coach'}
                      />
                      <span className="text-sm text-gray-700">Require two-factor authentication</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'consent' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Consent Management</h3>
            
            <div className="space-y-4">
              {[
                { type: 'data_collection', label: 'Data Collection', description: 'Consent to collect reflection data' },
                { type: 'data_processing', label: 'Data Processing', description: 'Consent to process data for coaching insights' },
                { type: 'data_sharing', label: 'Data Sharing', description: 'Consent to share data with coaching team' },
                { type: 'analytics', label: 'Analytics', description: 'Consent to use data for analytics and improvement' },
                { type: 'export', label: 'Data Export', description: 'Consent to export data functionality' },
              ].map(({ type, label, description }) => {
                const latestConsent = consentRecords
                  .filter(c => c.consentType === type as any && !c.withdrawnAt)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                
                return (
                  <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{label}</h4>
                      <p className="text-sm text-gray-600">{description}</p>
                      {latestConsent && (
                        <p className="text-xs text-gray-500 mt-1">
                          {latestConsent.granted ? 'Granted' : 'Denied'} on {new Date(latestConsent.timestamp).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {latestConsent?.granted ? (
                        <button
                          onClick={() => withdrawConsent(type as any, 'User request')}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
                          disabled={userRole === 'coach'}
                        >
                          Withdraw
                        </button>
                      ) : (
                        <button
                          onClick={() => recordConsent(type as any, true)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
                          disabled={userRole === 'coach'}
                        >
                          Grant
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consent History */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Consent History</h3>
            <div className="space-y-2">
              {consentRecords.map((consent, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">{consent.consentType.replace('_', ' ')}</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      consent.granted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {consent.granted ? 'Granted' : 'Denied'}
                    </span>
                    {consent.withdrawnAt && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        Withdrawn
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(consent.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'access' && (userRole === 'client' || userRole === 'admin') && (
        <div className="space-y-6">
          {/* Access Log Filters */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Access Logs</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <select
                value={logFilter.action || ''}
                onChange={(e) => setLogFilter({ ...logFilter, action: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="view">View</option>
                <option value="export">Export</option>
                <option value="analyze">Analyze</option>
                <option value="modify">Modify</option>
              </select>
              
              <input
                type="date"
                value={logFilter.dateFrom || ''}
                onChange={(e) => setLogFilter({ ...logFilter, dateFrom: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="From Date"
              />
              
              <input
                type="date"
                value={logFilter.dateTo || ''}
                onChange={(e) => setLogFilter({ ...logFilter, dateTo: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="To Date"
              />
              
              <button
                onClick={loadPrivacyData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>

            {/* Access Log Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {accessLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {log.userId} ({log.userRole})
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{log.action}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {log.resourceType}: {log.resourceId}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.success 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                        {log.denialReason && (
                          <p className="text-xs text-red-600 mt-1">{log.denialReason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{log.ipAddress}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Subject Rights</h3>
            <p className="text-gray-600 mb-6">
              Under GDPR and other privacy regulations, you have specific rights regarding your personal data.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { type: 'access', title: 'Right to Access', description: 'Request a copy of all data we hold about you' },
                { type: 'rectification', title: 'Right to Rectification', description: 'Request corrections to inaccurate data' },
                { type: 'erasure', title: 'Right to Erasure', description: 'Request deletion of your personal data' },
                { type: 'portability', title: 'Right to Portability', description: 'Request your data in a portable format' },
                { type: 'restrict_processing', title: 'Restrict Processing', description: 'Limit how we process your data' },
                { type: 'object', title: 'Right to Object', description: 'Object to certain types of processing' },
              ].map(({ type, title, description }) => (
                <div key={type} className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{description}</p>
                  <button
                    onClick={() => {
                      const details = prompt(`Please provide details for your ${title.toLowerCase()} request:`);
                      if (details) {
                        submitDataRequest(type as any, details);
                      }
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                    disabled={userRole === 'coach'}
                  >
                    Submit Request
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Your Data</h3>
            <p className="text-gray-600 mb-6">
              Download a copy of your personal data in your preferred format.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {privacySettings.exportPermissions.formats.map((format) => (
                <div key={format} className="p-4 border rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {format.toUpperCase()} Format
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {format === 'json' && 'Machine-readable format for developers'}
                    {format === 'csv' && 'Spreadsheet-compatible format'}
                    {format === 'pdf' && 'Human-readable document format'}
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => exportData(format, false)}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                      disabled={!privacySettings.exportPermissions.allowExport}
                    >
                      Export Basic Data
                    </button>
                    <button
                      onClick={() => exportData(format, true)}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
                      disabled={!privacySettings.exportPermissions.allowExport}
                    >
                      Include Analytics
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {!privacySettings.exportPermissions.allowExport && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  Data export is currently disabled. Enable it in Privacy Settings to export your data.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 