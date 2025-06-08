import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity,
  Settings,
  Download,
  Upload,
  TestTube,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { encryptionService, EncryptionMetrics, EncryptionKey, KeyRotationPolicy } from '../services/encryptionService';
import { useTranslation } from 'react-i18next';

interface EncryptionDashboardProps {
  className?: string;
}

export const EncryptionDashboard: React.FC<EncryptionDashboardProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<EncryptionMetrics & { keyUsageStats: any[] } | null>(null);
  const [keys, setKeys] = useState<EncryptionKey[]>([]);
  const [expiringKeys, setExpiringKeys] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'tools'>('overview');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string>('');

  // Modal states
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // Form states
  const [rotateForm, setRotateForm] = useState({ purpose: '', force: false, reason: '' });
  const [testForm, setTestForm] = useState({ testData: 'HIPAA Test Data', purpose: 'data' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, keysData, expiringData] = await Promise.all([
        encryptionService.getMetrics(),
        encryptionService.getKeys(selectedPurpose),
        encryptionService.getKeysNearingExpiration(7)
      ]);

      setMetrics(metricsData);
      setKeys(keysData.keys);
      setExpiringKeys(expiringData.keys);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load encryption data');
    } finally {
      setLoading(false);
    }
  };

  const handleRotateKey = async () => {
    try {
      setActionLoading('rotate');
      await encryptionService.rotateKey(rotateForm.purpose, rotateForm.force, rotateForm.reason);
      setShowRotateModal(false);
      setRotateForm({ purpose: '', force: false, reason: '' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate key');
    } finally {
      setActionLoading('');
    }
  };

  const handleTestEncryption = async () => {
    try {
      setActionLoading('test');
      const result = await encryptionService.testEncryption(testForm.testData, testForm.purpose);
      alert(`Encryption test ${result.testPassed ? 'PASSED' : 'FAILED'}\nKey: ${result.keyId}\nAlgorithm: ${result.algorithm}`);
      setShowTestModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test encryption');
    } finally {
      setActionLoading('');
    }
  };

  const handleCleanupKeys = async () => {
    if (!confirm('Are you sure you want to cleanup expired keys? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading('cleanup');
      const result = await encryptionService.cleanupExpiredKeys();
      alert(`Successfully cleaned up ${result.cleanedCount} expired keys`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup keys');
    } finally {
      setActionLoading('');
    }
  };

  const getPurposeColor = (purpose: string) => {
    switch (purpose) {
      case 'data': return 'bg-blue-100 text-blue-800';
      case 'backup': return 'bg-green-100 text-green-800';
      case 'transit': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (ms: number) => {
    return `${ms.toFixed(2)}ms`;
  };

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center h-64`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumea-primary"></div>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-lumea-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('encryption.title', 'Encryption Management')}</h1>
            <p className="text-gray-600">{t('encryption.subtitle', 'HIPAA-compliant data encryption and key management')}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-lumea-primary text-white rounded-lg hover:bg-lumea-secondary transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'keys', label: 'Keys', icon: Key },
            { id: 'tools', label: 'Tools', icon: TestTube }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 text-sm font-medium ${
                activeTab === id
                  ? 'border-lumea-primary text-lumea-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Encryptions</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.totalEncryptions.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Key className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Key Rotations</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.keyRotations}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Encryption Time</p>
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(metrics.averageEncryptionTime)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className={`h-8 w-8 ${metrics.failedOperations > 0 ? 'text-red-500' : 'text-green-500'}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Failed Operations</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.failedOperations}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expiring Keys Alert */}
          {expiringKeys.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">Keys Nearing Expiration</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {expiringKeys.length} key(s) will expire within 7 days
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('keys')}
                  className="text-yellow-800 hover:text-yellow-900 text-sm font-medium"
                >
                  View Keys
                </button>
              </div>
            </div>
          )}

          {/* Key Usage Stats */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Key Usage by Purpose</h3>
            <div className="space-y-4">
              {metrics.keyUsageStats.map((stat: any) => (
                <div key={stat._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPurposeColor(stat._id)}`}>
                      {stat._id}
                    </span>
                    <span className="text-sm text-gray-600">
                      {stat.activeKeys}/{stat.totalKeys} active keys
                    </span>
                  </div>
                  <div className="text-sm text-gray-900 font-medium">
                    {stat.totalUsage.toLocaleString()} operations
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keys Tab */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <select
                value={selectedPurpose}
                onChange={(e) => setSelectedPurpose(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Purposes</option>
                <option value="data">Data</option>
                <option value="backup">Backup</option>
                <option value="transit">Transit</option>
              </select>
              <button
                onClick={loadData}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Filter
              </button>
            </div>
            <button
              onClick={() => setShowRotateModal(true)}
              className="px-4 py-2 bg-lumea-primary text-white rounded-lg hover:bg-lumea-secondary transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Rotate Key</span>
            </button>
          </div>

          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Encryption Keys</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {keys.map((key) => (
                    <tr key={key.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {key.id.split('-')[0]}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPurposeColor(key.purpose)}`}>
                          {key.purpose}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {key.isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          )}
                          <span className={`text-sm ${key.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                            {key.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(key.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {key.expiresAt ? (
                          <div>
                            {formatDate(key.expiresAt)}
                            {key.daysUntilExpiration !== null && key.daysUntilExpiration <= 7 && (
                              <div className="text-xs text-yellow-600">
                                {key.daysUntilExpiration} days left
                              </div>
                            )}
                          </div>
                        ) : (
                          'Never'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {key.usageCount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tools Tab */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <TestTube className="h-5 w-5 mr-2" />
                Encryption Test
              </h3>
              <p className="text-gray-600 mb-4">Test encryption/decryption functionality</p>
              <button
                onClick={() => setShowTestModal(true)}
                className="w-full px-4 py-2 bg-lumea-primary text-white rounded-lg hover:bg-lumea-secondary transition-colors"
              >
                Run Test
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Trash2 className="h-5 w-5 mr-2" />
                Cleanup Keys
              </h3>
              <p className="text-gray-600 mb-4">Remove expired encryption keys</p>
              <button
                onClick={handleCleanupKeys}
                disabled={actionLoading === 'cleanup'}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'cleanup' ? 'Cleaning...' : 'Cleanup Keys'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotate Key Modal */}
      {showRotateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rotate Encryption Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <select
                  value={rotateForm.purpose}
                  onChange={(e) => setRotateForm({ ...rotateForm, purpose: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select purpose</option>
                  <option value="data">Data</option>
                  <option value="backup">Backup</option>
                  <option value="transit">Transit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={rotateForm.reason}
                  onChange={(e) => setRotateForm({ ...rotateForm, reason: e.target.value })}
                  placeholder="Reason for key rotation"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="force-rotate"
                  checked={rotateForm.force}
                  onChange={(e) => setRotateForm({ ...rotateForm, force: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="force-rotate" className="text-sm text-gray-700">
                  Force rotation (ignore rotation schedule)
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRotateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRotateKey}
                disabled={!rotateForm.purpose || actionLoading === 'rotate'}
                className="px-4 py-2 bg-lumea-primary text-white rounded-lg hover:bg-lumea-secondary disabled:opacity-50"
              >
                {actionLoading === 'rotate' ? 'Rotating...' : 'Rotate Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Test Encryption</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Data</label>
                <input
                  type="text"
                  value={testForm.testData}
                  onChange={(e) => setTestForm({ ...testForm, testData: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <select
                  value={testForm.purpose}
                  onChange={(e) => setTestForm({ ...testForm, purpose: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="data">Data</option>
                  <option value="backup">Backup</option>
                  <option value="transit">Transit</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTestEncryption}
                disabled={actionLoading === 'test'}
                className="px-4 py-2 bg-lumea-primary text-white rounded-lg hover:bg-lumea-secondary disabled:opacity-50"
              >
                {actionLoading === 'test' ? 'Testing...' : 'Run Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 