import { createFetchConfig } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface HIPAAComplianceCheck {
  id: string;
  category: 'administrative' | 'physical' | 'technical';
  requirement: string;
  description: string;
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
  lastChecked: Date;
  evidence?: string;
  remediation?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RiskFactor {
  category: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  lastAssessment: Date;
}

export interface HIPAAComplianceReport {
  id: string;
  generatedAt: Date;
  overallStatus: 'compliant' | 'non-compliant' | 'partial';
  complianceScore: number;
  checks: HIPAAComplianceCheck[];
  riskAssessment: RiskAssessment;
  recommendations: string[];
  nextReviewDate: Date;
}

export interface ComplianceDashboard {
  overallStatus: string;
  complianceScore: number;
  criticalIssues: number;
  lastReview: Date;
  nextReview: Date;
  recentChecks: HIPAAComplianceCheck[];
}

export interface ComplianceStatus {
  overallStatus: string;
  complianceScore: number;
  criticalIssues: number;
  lastReview: Date;
  nextReview: Date;
}

/**
 * Get current compliance status summary
 */
export const getComplianceStatus = async (): Promise<ComplianceStatus> => {
  const response = await fetch(
    `${API_BASE_URL}/compliance/status`,
    createFetchConfig({
      method: 'GET',
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to fetch compliance status' 
    }));
    throw new Error(errorData.message || 'Failed to fetch compliance status');
  }

  const result = await response.json();
  return result.data;
};

/**
 * Get comprehensive compliance dashboard
 */
export const getComplianceDashboard = async (): Promise<ComplianceDashboard> => {
  const response = await fetch(
    `${API_BASE_URL}/compliance/dashboard`,
    createFetchConfig({
      method: 'GET',
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to fetch compliance dashboard' 
    }));
    throw new Error(errorData.message || 'Failed to fetch compliance dashboard');
  }

  const result = await response.json();
  return result.data;
};

/**
 * Generate and download full compliance report
 */
export const generateComplianceReport = async (): Promise<HIPAAComplianceReport> => {
  const response = await fetch(
    `${API_BASE_URL}/compliance/report`,
    createFetchConfig({
      method: 'GET',
    })
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: 'Failed to generate compliance report' 
    }));
    throw new Error(errorData.message || 'Failed to generate compliance report');
  }

  const result = await response.json();
  return result.data;
};

/**
 * Get compliance score color based on score value
 */
export const getComplianceScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * Get compliance status badge color
 */
export const getComplianceStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'compliant':
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'non-compliant':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get risk level color
 */
export const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel.toLowerCase()) {
    case 'low':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-orange-600';
    case 'critical':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

/**
 * Format compliance check priority
 */
export const formatPriority = (priority: string): string => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

/**
 * Get priority color
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'text-red-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
}; 