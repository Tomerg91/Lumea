import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Session } from '../components/SessionList';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Type for session list response
interface SessionsResponse {
  sessions: Session[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Type for session creation data
interface CreateSessionData {
  clientId: string;
  date: string;
  notes: string;
}

// Function to fetch sessions
const fetchSessions = async (
  page = 1,
  limit = 10,
  clientId?: string
): Promise<SessionsResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (clientId) params.append('clientId', clientId);

  const response = await axios.get<SessionsResponse>(`${API_URL}/sessions`, {
    params,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

// Function to create a session
const createSession = async (
  data: CreateSessionData
): Promise<{ message: string; session: Session }> => {
  const response = await axios.post<{ message: string; session: Session }>(
    `${API_URL}/sessions`,
    data
  );
  return response.data;
};

// Hook for fetching and managing sessions
export const useSessionsData = (page = 1, limit = 100, clientId?: string) => {
  const queryClient = useQueryClient();

  // Query for fetching sessions
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sessions', page, limit, clientId],
    queryFn: () => fetchSessions(page, limit, clientId),
    // Poll every 30 seconds for any updates
    refetchInterval: 30000,
  });

  // Mutation for creating a session with optimistic updates
  const createMutation = useMutation({
    mutationFn: createSession,
    onMutate: async (newSession) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sessions'] });

      // Snapshot the previous value
      const previousSessions = queryClient.getQueryData(['sessions', page, limit, clientId]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        ['sessions', page, limit, clientId],
        (old: SessionsResponse | undefined) => {
          if (!old) return old;

          // Create a fake session for optimistic UI
          const fakeSession: Session = {
            _id: `temp-${Date.now()}`,
            coachId: 'optimistic',
            clientId: newSession.clientId,
            client: {
              _id: newSession.clientId,
              firstName: 'Loading...',
              lastName: '',
              email: '',
              createdAt: new Date().toISOString(),
            },
            date: newSession.date,
            notes: newSession.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          return {
            ...old,
            sessions: [fakeSession, ...old.sessions],
          };
        }
      );

      return { previousSessions };
    },
    onError: (err, newSession, context) => {
      // If there's an error, roll back to the previous state
      if (context?.previousSessions) {
        queryClient.setQueryData(['sessions', page, limit, clientId], context.previousSessions);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return {
    sessions: data?.sessions || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    createSession: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
  };
};

export default useSessionsData;
