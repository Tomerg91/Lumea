import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Session, SessionStatus } from '../components/SessionList';
import { 
  fetchSessions as fetchSessionsService,
  createSession as createSessionService,
  updateSessionStatus as updateSessionStatusService,
  APICreateSessionData,
  UpdateSessionStatusData
} from '../services/sessionService';

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

// Wrapper function to match the expected response format
const fetchSessions = async (
  page = 1,
  limit = 10,
  clientId?: string
): Promise<SessionsResponse> => {
  // For now, we'll use the service function and wrap it in the expected format
  // In the future, the backend might support pagination parameters
  const sessions = await fetchSessionsService();
  
  // Apply client filtering if specified
  const filteredSessions = clientId 
    ? sessions.filter(session => session.clientId === clientId)
    : sessions;
  
  // Create pagination info (mock for now since backend doesn't support it yet)
  const total = filteredSessions.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);
  
  return {
    sessions: paginatedSessions,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Function to create a session
const createSession = async (
  data: APICreateSessionData
): Promise<{ message: string; session: Session }> => {
  const session = await createSessionService(data);
  return { message: 'Session created successfully', session };
};

// Function to update session status
const updateSessionStatus = async (
  sessionId: string,
  data: UpdateSessionStatusData
): Promise<{ message: string; session: Session }> => {
  const session = await updateSessionStatusService(sessionId, data);
  return { message: 'Session status updated successfully', session };
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
            status: 'pending', // Default status for new sessions
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

  // Mutation for updating session status with optimistic updates
  const updateStatusMutation = useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: string; status: SessionStatus }) =>
      updateSessionStatus(sessionId, { status }),
    onMutate: async ({ sessionId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sessions'] });

      // Snapshot the previous value
      const previousSessions = queryClient.getQueryData(['sessions', page, limit, clientId]);

      // Optimistically update the session status
      queryClient.setQueryData(
        ['sessions', page, limit, clientId],
        (old: SessionsResponse | undefined) => {
          if (!old) return old;

          return {
            ...old,
            sessions: old.sessions.map((session) =>
              session._id === sessionId
                ? { ...session, status, updatedAt: new Date().toISOString() }
                : session
            ),
          };
        }
      );

      return { previousSessions };
    },
    onError: (err, variables, context) => {
      // If there's an error, roll back to the previous state
      if (context?.previousSessions) {
        queryClient.setQueryData(['sessions', page, limit, clientId], context.previousSessions);
      }
      
      // Log the detailed error for debugging
      console.error('Status update failed:', {
        error: err,
        sessionId: variables.sessionId,
        attemptedStatus: variables.status,
      });
      
      // You can also show a toast notification here if you have a toast system
      // toast.error(err.message || 'Failed to update session status');
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
    updateSessionStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    updateStatusError: updateStatusMutation.error,
  };
};

export default useSessionsData;
