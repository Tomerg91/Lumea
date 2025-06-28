import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useToast } from '../../hooks/use-toast';
import { paymentService } from '../../services/paymentService';
import { usePayments } from '../../hooks/usePayments';
import { usePaymentSummary } from '../../hooks/usePaymentSummary';
import type { PaymentStatus } from '../../../../shared/types/database';
import { 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users,
  CreditCard,
  TrendingUp,
  Filter,
  MoreHorizontal,
  Download
} from 'lucide-react';

interface PaymentWithRelations {
  id: string;
  amount: number;
  status: PaymentStatus;
  due_date: string;
  client_id: string;
  coach_id: string;
  reminder_sent: boolean;
  sessions_covered: string[];
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string | null;
    email: string;
  };
  coach?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export const PaymentDashboard: React.FC = () => {
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [batchUpdateStatus, setBatchUpdateStatus] = useState<PaymentStatus>('Paid');
  const [showBatchUpdateDialog, setShowBatchUpdateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const { toast } = useToast();
  const { data: payments = [], isLoading: isLoadingPayments, refetch: refetchPayments } = usePayments({ status: filterStatus, client_id: filterClient });
  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = usePaymentSummary();

  const loadPaymentData = () => {
    refetchPayments();
    refetchSummary();
  };

  const handlePaymentStatusUpdate = async (paymentId: string, status: PaymentStatus) => {
    await paymentService.updatePaymentStatus(paymentId, status);
    loadPaymentData();
    toast({
      title: 'Success',
      description: `Payment status updated to ${status}`,
    });
  };

  const handleBatchUpdate = async () => {
    if (selectedPayments.length === 0) return;
    
    await paymentService.batchUpdatePaymentStatus({
      payment_ids: selectedPayments,
      status: batchUpdateStatus,
    });
    
    setSelectedPayments([]);
    setShowBatchUpdateDialog(false);
    loadPaymentData();
    
    toast({
      title: 'Success',
      description: `Updated ${selectedPayments.length} payments to ${batchUpdateStatus}`,
    });
  };

  const handleMarkSessionsPaid = async (sessionIds: string[], amount: number) => {
    await paymentService.markSessionsAsPaid({
      session_ids: sessionIds,
      amount,
    });
    
    loadPaymentData();
    toast({
      title: 'Success',
      description: `Marked ${sessionIds.length} sessions as paid`,
    });
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const getStatusBadgeVariant = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Due': return 'secondary';
      case 'Overdue': return 'destructive';
      case 'Cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Due': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Overdue': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'Cancelled': return <MoreHorizontal className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get unique clients for filter
  const clients = Array.from(
    new Set(payments.map(p => p.client).filter(Boolean))
  ).map(client => client!);

  if (isLoadingPayments || isLoadingSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Management</h1>
          <p className="text-muted-foreground">
            Track and manage client payments
          </p>
        </div>
        <div className="flex gap-2">
          {selectedPayments.length > 0 && (
            <Button
              onClick={() => setShowBatchUpdateDialog(true)}
              variant="outline"
            >
              Update {selectedPayments.length} Selected
            </Button>
          )}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_amount)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.total_payments} total payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.paid_amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.by_status.paid} paid payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Amount</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.due_amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.by_status.due} due payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.overdue_amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.by_status.overdue} overdue payments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Due">Due</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            Manage client payments and track payment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPayments.length === payments.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPayments(payments.map(p => p.id));
                      } else {
                        setSelectedPayments([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPayments.includes(payment.id)}
                      onCheckedChange={() => togglePaymentSelection(payment.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {payment.client?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payment.client?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusBadgeVariant(payment.status)}
                      className="flex items-center gap-1 w-fit"
                    >
                      {getStatusIcon(payment.status)}
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(payment.due_date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {payment.sessions_covered.length} sessions
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {payment.status !== 'Paid' && (
                        <Button
                          size="sm"
                          onClick={() => handlePaymentStatusUpdate(payment.id, 'Paid')}
                        >
                          Mark Paid
                        </Button>
                      )}
                      {payment.status === 'Due' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePaymentStatusUpdate(payment.id, 'Overdue')}
                        >
                          Mark Overdue
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Batch Update Dialog */}
      <AlertDialog open={showBatchUpdateDialog} onOpenChange={setShowBatchUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batch Update Payment Status</AlertDialogTitle>
            <AlertDialogDescription>
              Update the status of {selectedPayments.length} selected payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={batchUpdateStatus} onValueChange={(value: PaymentStatus) => setBatchUpdateStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Due">Due</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchUpdate}>
              Update {selectedPayments.length} Payments
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 