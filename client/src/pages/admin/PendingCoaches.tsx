import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { useToast } from '../../hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User as UserIcon, 
  Mail, 
  Calendar,
  Filter,
  Search,
  CheckCheck,
  MessageSquare
} from 'lucide-react';
import { createFetchConfig } from '../../services/api';
import type { User, UserStatus } from '../../../../shared/types/database';

// Extended user type with coach-specific fields
interface CoachApplication extends User {
  application_date?: string;
  experience?: string;
  specialization?: string;
}

interface PendingCoachesResponse {
  coaches: CoachApplication[];
  count: number;
}

import { API_BASE_URL } from "../../lib/api";

const PendingCoaches: React.FC = () => {
  const [coaches, setCoaches] = useState<CoachApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoaches, setSelectedCoaches] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<UserStatus>('pending_approval');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [batchComment, setBatchComment] = useState('');
  const [individualComment, setIndividualComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedCoachForAction, setSelectedCoachForAction] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Fetch coaches based on status filter
  const fetchCoaches = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/admin/pending-coaches?status=${statusFilter}`,
        createFetchConfig()
      );

      if (!response.ok) {
        throw new Error('Failed to fetch coaches');
      }

      const data: PendingCoachesResponse = await response.json();
      setCoaches(data.coaches);
    } catch (error) {
      console.error('Error fetching coaches:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load coach applications',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoaches();
  }, [statusFilter]);

  // Filter coaches based on search term
  const filteredCoaches = coaches.filter(coach =>
    coach.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coach.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Individual coach approval
  const approveCoach = async (coachId: string) => {
    try {
      setActionLoading(coachId);
      const response = await fetch(
        `${API_BASE_URL}/admin/coaches/${coachId}/approve`,
        {
          ...createFetchConfig(),
          method: 'POST',
          body: JSON.stringify({ comment: individualComment }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve coach');
      }

      toast({
        title: 'Success',
        description: 'Coach approved successfully',
      });

      setIndividualComment('');
      await fetchCoaches();
    } catch (error) {
      console.error('Error approving coach:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve coach',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Individual coach rejection
  const rejectCoach = async (coachId: string) => {
    try {
      setActionLoading(coachId);
      const response = await fetch(
        `${API_BASE_URL}/admin/coaches/${coachId}/reject`,
        {
          ...createFetchConfig(),
          method: 'POST',
          body: JSON.stringify({ 
            reason: rejectionReason,
            comment: individualComment 
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject coach');
      }

      toast({
        title: 'Success',
        description: 'Coach application rejected',
      });

      setIndividualComment('');
      setRejectionReason('');
      setShowRejectDialog(false);
      setSelectedCoachForAction(null);
      await fetchCoaches();
    } catch (error) {
      console.error('Error rejecting coach:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject coach',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Batch approve coaches
  const batchApproveCoaches = async () => {
    try {
      setActionLoading('batch');
      const response = await fetch(
        `${API_BASE_URL}/admin/coaches/batch-approve`,
        {
          ...createFetchConfig(),
          method: 'POST',
          body: JSON.stringify({
            coach_ids: Array.from(selectedCoaches),
            comment: batchComment,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to batch approve coaches');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: result.message,
      });

      setSelectedCoaches(new Set());
      setBatchComment('');
      setShowBatchDialog(false);
      await fetchCoaches();
    } catch (error) {
      console.error('Error batch approving coaches:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve coaches',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle coach selection
  const toggleCoachSelection = (coachId: string) => {
    const newSelection = new Set(selectedCoaches);
    if (newSelection.has(coachId)) {
      newSelection.delete(coachId);
    } else {
      newSelection.add(coachId);
    }
    setSelectedCoaches(newSelection);
  };

  // Select all visible coaches
  const selectAllCoaches = () => {
    if (selectedCoaches.size === filteredCoaches.length) {
      setSelectedCoaches(new Set());
    } else {
      setSelectedCoaches(new Set(filteredCoaches.map(c => c.id)));
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    const statusConfig = {
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      active: { color: 'bg-blue-100 text-blue-800', label: 'Active' },
      suspended: { color: 'bg-gray-100 text-gray-800', label: 'Suspended' },
    };

    const config = statusConfig[status];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Coach Applications Management
          </CardTitle>
          <CardDescription>
            Review and manage coach applications for the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search coaches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={(value: UserStatus) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedCoaches.size > 0 && statusFilter === 'pending_approval' && (
              <div className="flex gap-2">
                <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <CheckCheck className="h-4 w-4" />
                      Approve Selected ({selectedCoaches.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Batch Approve Coaches</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to approve {selectedCoaches.size} selected coaches?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="batch-comment">Comment (optional)</Label>
                        <Textarea
                          id="batch-comment"
                          placeholder="Add a comment for the approved coaches..."
                          value={batchComment}
                          onChange={(e) => setBatchComment(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={batchApproveCoaches}
                        disabled={actionLoading === 'batch'}
                      >
                        {actionLoading === 'batch' ? 'Processing...' : 'Approve All'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Coaches Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {statusFilter === 'pending_approval' && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCoaches.size === filteredCoaches.length && filteredCoaches.length > 0}
                        onCheckedChange={selectAllCoaches}
                      />
                    </TableHead>
                  )}
                  <TableHead>Coach</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={statusFilter === 'pending_approval' ? 5 : 4} className="text-center py-8">
                      Loading coaches...
                    </TableCell>
                  </TableRow>
                ) : filteredCoaches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={statusFilter === 'pending_approval' ? 5 : 4} className="text-center py-8">
                      No coaches found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoaches.map((coach) => (
                    <TableRow key={coach.id}>
                      {statusFilter === 'pending_approval' && (
                        <TableCell>
                          <Checkbox
                            checked={selectedCoaches.has(coach.id)}
                            onCheckedChange={() => toggleCoachSelection(coach.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{coach.name || 'No Name'}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {coach.email}
                          </div>
                          {coach.bio && (
                            <div className="text-sm text-gray-600 max-w-md truncate">
                              {coach.bio}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(coach.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(coach.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {statusFilter === 'pending_approval' && (
                            <>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    disabled={actionLoading === coach.id}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Approve Coach Application</DialogTitle>
                                    <DialogDescription>
                                      Approve {coach.name || coach.email} as a coach on the platform?
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="individual-comment">Comment (optional)</Label>
                                      <Textarea
                                        id="individual-comment"
                                        placeholder="Add a comment for the coach..."
                                        value={individualComment}
                                        onChange={(e) => setIndividualComment(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline">Cancel</Button>
                                    <Button onClick={() => approveCoach(coach.id)}>
                                      Approve Coach
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <AlertDialog open={showRejectDialog && selectedCoachForAction === coach.id} onOpenChange={(open) => {
                                if (!open) {
                                  setShowRejectDialog(false);
                                  setSelectedCoachForAction(null);
                                  setRejectionReason('');
                                  setIndividualComment('');
                                }
                              }}>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    disabled={actionLoading === coach.id}
                                    onClick={() => {
                                      setSelectedCoachForAction(coach.id);
                                      setShowRejectDialog(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reject Coach Application</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will reject {coach.name || coach.email}'s application and send them a notification email.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="rejection-reason">Reason for rejection</Label>
                                      <Select value={rejectionReason} onValueChange={setRejectionReason}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a reason..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="insufficient_experience">Insufficient Experience</SelectItem>
                                          <SelectItem value="incomplete_application">Incomplete Application</SelectItem>
                                          <SelectItem value="qualifications_not_met">Qualifications Not Met</SelectItem>
                                          <SelectItem value="capacity_full">Capacity Full</SelectItem>
                                          <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label htmlFor="rejection-comment">Additional feedback (optional)</Label>
                                      <Textarea
                                        id="rejection-comment"
                                        placeholder="Provide additional feedback for the applicant..."
                                        value={individualComment}
                                        onChange={(e) => setIndividualComment(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => rejectCoach(coach.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Reject Application
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="text-sm text-gray-500">
            Showing {filteredCoaches.length} of {coaches.length} coaches
            {selectedCoaches.size > 0 && ` • ${selectedCoaches.size} selected`}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingCoaches;
