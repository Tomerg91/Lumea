import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import axios from 'axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

// Types
type User = {
  _id: string;
  email: string;
  name: string;
  role: 'client' | 'coach' | 'admin';
  isApproved?: boolean;
  createdAt: string;
};

type UsersResponse = {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const roleFilters = [
  { value: '', label: 'admin.allUsers' },
  { value: 'client', label: 'admin.clients' },
  { value: 'coach', label: 'admin.coaches' },
  { value: 'admin', label: 'admin.admins' },
];

const UsersList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [roleFilter, setRoleFilter] = useState('');

  // Fetch users with filtering
  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ['admin-users', page, limit, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (roleFilter) params.append('role', roleFilter);

      const { data } = await axios.get(`/api/admin/users?${params.toString()}`);
      return data;
    },
  });

  // Format date based on locale
  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    if (isRTL) {
      return format(dateObj, 'PPP', { locale: he });
    }
    return format(dateObj, 'PPP');
  };

  // Handle role filter change
  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setPage(1); // Reset to first page when filter changes
  };

  // Get badge color based on role
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'coach':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'client':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{t('admin.errorLoadingUsers')}</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-xl font-semibold">{t('admin.users')}</h2>

        {/* Role filter */}
        <div className="relative">
          <select
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg py-2 px-4 pr-8 appearance-none focus:outline-none focus:border-lumea-primary"
            value={roleFilter}
            onChange={handleRoleFilterChange}
          >
            {roleFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {t(filter.label)}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>

      {!data?.users.length ? (
        <EmptyState
          title={t('admin.noUsersFound')}
          description={t('admin.tryDifferentFilters')}
          icon="👥"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left">{t('admin.name')}</th>
                  <th className="py-3 px-4 text-left">{t('admin.email')}</th>
                  <th className="py-3 px-4 text-left">{t('admin.role')}</th>
                  <th className="py-3 px-4 text-left">{t('admin.status')}</th>
                  <th className="py-3 px-4 text-left">{t('admin.registered')}</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user._id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-3 px-4">{user.name}</td>
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}
                      >
                        {t(`admin.role_${user.role}`)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.role === 'coach' && (
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.isApproved
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {user.isApproved ? t('admin.approved') : t('admin.pending')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{formatDate(user.createdAt)}</td>
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
        </>
      )}
    </div>
  );
};

export default UsersList;
