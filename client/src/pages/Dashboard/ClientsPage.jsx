import React, { useState, useEffect } from 'react';
// Use the consolidated Supabase client
import { supabase } from '../../lib/supabase';
// Go up two levels to reach src directory
import { useAuth } from '../../contexts/AuthContext';

// Placeholder component - Replace with actual authentication check later
// const useAuth = () => { ... }; // REMOVE Placeholder hook

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState(null);
  const { profile, loading: authLoading } = useAuth(); // Use the real auth hook

  useEffect(() => {
    // Only fetch clients if auth is not loading and the user is a coach
    if (!authLoading && profile?.role === 'coach') {
      fetchClients();
    } else if (!authLoading && profile?.role !== 'coach') {
      // Should be handled by ProtectedRoute, but as a fallback:
      setError('Access denied. Only coaches can view this page.');
      setLoadingClients(false);
    }
    // If authLoading is true, we wait
    // If profile is null (not logged in), ProtectedRoute handles it

    async function fetchClients() {
      try {
        setLoadingClients(true);
        setError(null);

        // RLS policy ensures only clients linked to the logged-in coach (auth.uid()) are returned.
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, full_name, email') 
          .eq('role', 'client'); 

        if (fetchError) {
          // Handle specific Supabase errors if needed
          if (fetchError.code === '42501') { // RLS policy violation
             setError('You do not have permission to view clients.'); 
          } else {
             throw fetchError;
          }
        } else {
           setClients(data || []);
        }

      } catch (err) {
        console.error('Error fetching clients:', err);
        setError(err.message || 'Failed to fetch clients.');
      } finally {
        setLoadingClients(false);
      }
    }
    // Dependency array includes authLoading and profile state
  }, [authLoading, profile]); 

  // Show loading indicator while authentication is in progress
  if (authLoading) {
    return <div>Loading authentication...</div>;
  }

  // Show loading indicator while fetching clients
  if (loadingClients) {
    return <div>Loading clients...</div>;
  }

  // Show error message if any occurred
  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  // We should only reach here if authenticated as a coach and clients are loaded
  return (
    <div>
      <h1>My Clients</h1>
      {clients.length === 0 ? (
        <p>You don't have any clients assigned yet.</p>
      ) : (
        <ul>
          {clients.map((client) => (
            <li key={client.id}>
              {client.full_name || 'Unnamed Client'} ({client.email})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ClientsPage; 