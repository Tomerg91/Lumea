import React, { useState, useEffect } from 'react';
import { 
  getComplianceStatus, 
  getComplianceDashboard, 
  generateComplianceReport,
  getComplianceScoreColor,
  getComplianceStatusColor,
  getRiskLevelColor,
  getPriorityColor,
  formatPriority,
  type ComplianceDashboard,
  type ComplianceStatus,
  type HIPAAComplianceReport 
} from '../../services/hipaaComplianceService';
import { 
  Shield, 
  AlertTriangle, 
  FileText,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

const HIPAAComplianceDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<ComplianceDashboard | null>(null);
  const [statusData, setStatusData] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [dashboard, status] = await Promise.all([
        getComplianceDashboard(),
        getComplianceStatus()
      ]);
      
      setDashboardData(dashboard);
      setStatusData(status);
    } catch (err) {
      console.error('Failed to load compliance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const report = await generateComplianceReport();
      
      // Create a downloadable blob
      const reportBlob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json'
      });
      
      // Create download link
      const url = URL.createObjectURL(reportBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hipaa-compliance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate compliance report');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Compliance Data</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadComplianceData}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData || !statusData) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">No compliance data available</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="h-8 w-8 text-blue-600 mr-3" />
            HIPAA Compliance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage HIPAA compliance status</p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={generatingReport}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <FileText className="h-4 w-4 mr-2" />
          {generatingReport ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overall Status</p>
              <p className={`text-lg font-semibold ${getComplianceStatusColor(statusData.overallStatus)}`}>
                {statusData.overallStatus}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Compliance Score</p>
              <p className={`text-lg font-semibold ${getComplianceScoreColor(statusData.complianceScore)}`}>
                {statusData.complianceScore}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Critical Issues</p>
              <p className="text-lg font-semibold text-red-600">
                {statusData.criticalIssues}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Next Review</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(statusData.nextReview).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Compliance Checks */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Compliance Checks</h2>
        </div>
        <div className="p-6">
          {dashboardData.recentChecks && dashboardData.recentChecks.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentChecks.map((check, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-sm font-medium text-gray-900">{check.requirement}</h3>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComplianceStatusColor(check.status)}`}>
                          {check.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{check.description}</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <span className="text-xs text-gray-500">
                          Category: {check.category}
                        </span>
                        <span className={`text-xs ${getPriorityColor(check.priority)}`}>
                          Priority: {formatPriority(check.priority)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Last Checked: {new Date(check.lastChecked).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {check.status === 'compliant' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : check.status === 'non-compliant' ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Info className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  </div>
                  {check.evidence && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">
                        <strong>Evidence:</strong> {check.evidence}
                      </p>
                    </div>
                  )}
                  {check.remediation && (
                    <div className="mt-2 p-3 bg-blue-50 rounded">
                      <p className="text-xs text-blue-700">
                        <strong>Remediation:</strong> {check.remediation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>No recent compliance checks available</p>
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={loadComplianceData}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default HIPAAComplianceDashboard; 