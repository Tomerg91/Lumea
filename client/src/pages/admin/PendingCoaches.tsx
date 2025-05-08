import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import axios from 'axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

// Types
type Coach = {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
};

type PendingCoachesResponse = {
  coaches: Coach[];
  pagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    limit: number;
  };
};

const PendingCoaches: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Fetch pending coaches
  const { data, isLoading, error } = useQuery<PendingCoachesResponse>({
    queryKey: ['pending-coaches', page, limit],
    queryFn: async () => {
      const { data } = await axios.get(`/api/admin/pending-coaches?page=${page}&limit=${limit}`);
      return data;
    },
  });

  // Approve coach mutation
  const approveMutation = useMutation({
    mutationFn: async (coachId: string) => {
      await axios.patch(`/api/admin/coaches/${coachId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-coaches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  // Reject coach mutation
  const rejectMutation = useMutation({
    mutationFn: async (coachId: string) => {
      await axios.delete(`/api/admin/coaches/${coachId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-coaches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  // Handle coach approval
  const handleApprove = (coachId: string) => {
    if (confirm(t('admin.confirmApprove'))) {
      approveMutation.mutate(coachId);
    }
  };

  // Handle coach rejection
  const handleReject = (coachId: string) => {
    if (confirm(t('admin.confirmReject'))) {
      rejectMutation.mutate(coachId);
    }
  };

  // Format date based on locale
  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    if (isRTL) {
      return format(dateObj, 'PPP', { locale: he });
    }
    return format(dateObj, 'PPP');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{t('admin.errorLoadingCoaches')}</div>;
  }

  if (!data?.coaches.length) {
    return (
      <EmptyState
        title={t('admin.noPendingCoaches')}
        description={t('admin.noPendingCoachesDescription')}
        icon="🎉"
      />
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{t('admin.pendingCoaches')}</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="py-3 px-4 text-left">{t('admin.name')}</th>
              <th className="py-3 px-4 text-left">{t('admin.email')}</th>
              <th className="py-3 px-4 text-left">{t('admin.registered')}</th>
              <th className="py-3 px-4 text-center">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {data.coaches.map((coach) => (
              <tr key={coach._id} className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-3 px-4">
                  {coach.firstName} {coach.lastName}
                </td>
                <td className="py-3 px-4">{coach.email}</td>
                <td className="py-3 px-4">{formatDate(coach.createdAt)}</td>
                <td className="py-3 px-4 flex justify-center space-x-2">
                  <button
                    onClick={() => handleApprove(coach._id)}
                    disabled={approveMutation.isPending}
                    className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    {t('admin.approve')}
                  </button>
                  <button
                    onClick={() => handleReject(coach._id)}
                    disabled={rejectMutation.isPending}
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    {t('admin.reject')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
          >
            {t('admin.previous')}
          </button>
          <span className="px-3 py-1">
            {t('admin.pageOf', { current: page, total: data.pagination.totalPages })}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, data.pagination.totalPages))}
            disabled={page === data.pagination.totalPages}
            className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
          >
            {t('admin.next')}
          </button>
        </div>
      )}
    </div>
  );
};

export default PendingCoaches;
