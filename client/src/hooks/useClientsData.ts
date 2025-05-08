import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Client } from '../components/ClientsTable';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Type for client list response
interface ClientsResponse {
  clients: Client[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Function to fetch clients
const fetchClients = async (page = 1, limit = 10, search = ''): Promise<ClientsResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (search) params.append('search', search);

  const response = await axios.get<ClientsResponse>(`${API_URL}/my-clients`, {
    params,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

// Function to invite a client
const inviteClient = async (email: string): Promise<{ message: string }> => {
  const response = await axios.post<{ message: string }>(`${API_URL}/invite-client`, { email });
  return response.data;
};

// Hook for fetching and managing clients
export const useClientsData = (page = 1, limit = 10, search = '') => {
  const queryClient = useQueryClient();

  // Query for fetching clients
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clients', page, limit, search],
    queryFn: () => fetchClients(page, limit, search),
    // Poll every 30 seconds for any updates
    refetchInterval: 30000,
  });

  // Mutation for inviting a client
  const inviteMutation = useMutation({
    mutationFn: inviteClient,
    onSuccess: () => {
      // Invalidate clients query to refetch
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  return {
    clients: data?.clients || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    inviteClient: inviteMutation.mutate,
    isInviting: inviteMutation.isPending,
    inviteError: inviteMutation.error,
  };
};

export default useClientsData;
