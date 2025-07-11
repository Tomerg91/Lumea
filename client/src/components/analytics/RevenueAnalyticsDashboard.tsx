import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRevenueAnalytics } from '../../hooks/useRevenueAnalytics';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  BarChart3,
  LineChart,
  Target,
  Calendar,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Star,
  Zap
} from 'lucide-react';

interface RevenueAnalyticsDashboardProps {
  className?: string;
  compact?: boolean;
}

export const RevenueAnalyticsDashboard: React.FC<RevenueAnalyticsDashboardProps> = ({
  className = '',
  compact = false
}) => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'forecast' | 'profitloss'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const endDate = new Date();
  const startDate = new Date();
  switch (timeRange) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }

  const { data, isLoading, error, refetch } = useRevenueAnalytics(startDate, endDate);

  const { revenueMetrics, revenueBreakdown, revenueForecast, profitLossData } = data || {};

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    // Export functionality
    console.log(`Exporting revenue report as ${format}`);
  };

  if (!profile || (profile.role !== 'admin' && profile.role !== 'coach')) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">Revenue analytics require admin or coach privileges.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data) {
    return <div>No data available.</div>;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Revenue Analytics
          </h2>
          <p className="text-gray-600">
            Comprehensive financial insights and business intelligence
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Select onValueChange={handleExport}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">Export PDF</SelectItem>
              <SelectItem value="excel">Export Excel</SelectItem>
              <SelectItem value="csv">Export CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenueMetrics.totalRevenue)}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {formatPercentage(data.revenueMetrics.revenueGrowthRate)} vs last period
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Recurring Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenueMetrics.monthlyRecurringRevenue)}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  Stable growth
                </p>
              </div>
              <LineChart className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                <p className="text-2xl font-bold text-gray-900">{data.revenueMetrics.profitMargin.toFixed(1)}%</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Healthy margin
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer LTV</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.revenueMetrics.customerLifetimeValue)}</p>
                <p className="text-xs text-orange-600 flex items-center mt-1">
                  <Star className="w-3 h-3 mr-1" />
                  Above industry avg
                </p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="profitloss">P&L</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Revenue Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Revenue Growth Rate</span>
                      <span className="font-medium">{formatPercentage(data.revenueMetrics.revenueGrowthRate)}</span>
                    </div>
                    <Progress value={Math.min(data.revenueMetrics.revenueGrowthRate, 100)} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Year over Year Growth</span>
                      <span className="font-medium">{formatPercentage(data.revenueMetrics.yearOverYearGrowth)}</span>
                    </div>
                    <Progress value={Math.min(data.revenueMetrics.yearOverYearGrowth / 2, 100)} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Churn Rate</span>
                      <span className="font-medium text-red-600">{data.revenueMetrics.churnRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={data.revenueMetrics.churnRate * 5} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Key Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">ARPU</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(data.revenueMetrics.averageRevenuePerUser)}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Avg Session Value</p>
                    <p className="text-lg font-bold text-green-900">{formatCurrency(data.revenueMetrics.averageSessionValue)}</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Monthly Active Revenue</p>
                    <p className="text-lg font-bold text-purple-900">{formatCurrency(data.revenueMetrics.monthlyActiveRevenue)}</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600 font-medium">Customer LTV</p>
                    <p className="text-lg font-bold text-orange-900">{formatCurrency(data.revenueMetrics.customerLifetimeValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="w-5 h-5" />
                <span>Revenue Breakdown</span>
              </CardTitle>
              <CardDescription>Revenue by source and category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.revenueBreakdown).map(([source, amount]) => {
                  const percentage = (Math.abs(amount) / Object.values(data.revenueBreakdown).reduce((sum, val) => sum + Math.abs(val), 0)) * 100;
                  const isNegative = amount < 0;
                  
                  return (
                    <div key={source} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">
                          {source.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatCurrency(amount)}
                          </span>
                          <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <Progress 
                        value={percentage} 
                        className={`h-2 ${isNegative ? 'bg-red-100' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LineChart className="w-5 h-5" />
                <span>Revenue Forecast</span>
              </CardTitle>
              <CardDescription>6-month revenue projections with scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.revenueForecast.map((forecast, index) => (
                  <div key={index} className="grid grid-cols-5 gap-4 p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{forecast.month}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Conservative</p>
                      <p className="text-sm font-medium">{formatCurrency(forecast.conservative)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Projected</p>
                      <p className="text-sm font-medium text-blue-600">{formatCurrency(forecast.projected)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Optimistic</p>
                      <p className="text-sm font-medium text-green-600">{formatCurrency(forecast.optimistic)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Actual</p>
                      <p className="text-sm font-medium">
                        {forecast.actual ? formatCurrency(forecast.actual) : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit & Loss Tab */}
        <TabsContent value="profitloss" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span>Revenue</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.profitLossData.revenue).map(([item, amount]) => (
                    <div key={item} className="flex justify-between">
                      <span className="text-sm capitalize">{item.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className={`text-sm font-medium ${amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                  <hr className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Total Revenue</span>
                    <span className="text-green-600">
                      {formatCurrency(Object.values(data.profitLossData.revenue).reduce((sum, val) => sum + val, 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <span>Expenses</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.profitLossData.expenses).map(([item, amount]) => (
                    <div key={item} className="flex justify-between">
                      <span className="text-sm capitalize">{item.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-sm font-medium text-red-600">-{formatCurrency(amount)}</span>
                    </div>
                  ))}
                  <hr className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Total Expenses</span>
                    <span className="text-red-600">
                      -{formatCurrency(Object.values(data.profitLossData.expenses).reduce((sum, val) => sum + val, 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span>Net Profit Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-600 font-medium">Net Profit</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(data.profitLossData.netProfit)}</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-blue-600 font-medium">Profit Margin</p>
                  <p className="text-2xl font-bold text-blue-900">{profitLossData.profitMargin.toFixed(1)}%</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-purple-600 font-medium">ROI</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {((data.profitLossData.netProfit / Object.values(data.profitLossData.expenses).reduce((sum, val) => sum + val, 0)) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 