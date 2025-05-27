import React, { useState, useEffect } from 'react';
// Use the consolidated Supabase client
import { supabase } from '../../lib/supabase';
// Go up two levels to reach src directory
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Calendar, 
  MessageSquare,
  MoreHorizontal,
  User 
} from 'lucide-react';

interface Client {
  id: string;
  full_name: string | null;
  email: string;
  created_at?: string;
  last_session?: string;
  sessions_count?: number;
}

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { profile, loading: authLoading } = useAuth(); // Use the real auth hook
  const { t, isRTL } = useLanguage();

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
          .select('id, full_name, email, created_at')
          .eq('role', 'client');

        if (fetchError) {
          // Handle specific Supabase errors if needed
          if (fetchError.code === '42501') {
            // RLS policy violation
            setError('You do not have permission to view clients.');
          } else {
            throw fetchError;
          }
        } else {
          setClients(data || []);
        }
      } catch (err: unknown) {
        console.error('Error fetching clients:', err);
        // Type guard to check if error has message property
        if (err instanceof Error) {
          setError(err.message || 'Failed to fetch clients.');
        } else {
          setError('Failed to fetch clients.');
        }
      } finally {
        setLoadingClients(false);
      }
    }
    // Dependency array includes authLoading and profile state
  }, [authLoading, profile]);

  const filteredClients = clients.filter(client => {
    const name = client.full_name || 'Unnamed Client';
    const email = client.email || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Show loading indicator while authentication is in progress
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-background py-8">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/20 rounded-lg w-1/4"></div>
            <div className="grid gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white/20 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading indicator while fetching clients
  if (loadingClients) {
    return (
      <div className="min-h-screen bg-gradient-background py-8">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/20 rounded-lg w-1/4"></div>
            <div className="grid gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white/20 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error message if any occurred
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-background py-8">
        <div className="container mx-auto px-4">
          <div className="card-lumea-strong max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // We should only reach here if authenticated as a coach and clients are loaded
  return (
    <div className={`min-h-screen bg-gradient-background py-8 ${isRTL ? 'rtl-layout' : ''}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-center md:justify-between mb-8 ${isRTL ? 'rtl-flex-row-reverse' : ''}`}>
          <div>
            <h1 className="text-3xl font-bold text-gradient-purple mb-2">
              {t('clients.title')}
            </h1>
            <p className="text-gray-600">
              {t('clients.subtitle')}
            </p>
          </div>
          
          <button className="btn-primary mt-4 md:mt-0 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>{t('clients.addClient')}</span>
          </button>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className={`absolute top-3 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder={t('clients.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full glass-input ${isRTL ? 'pr-10' : 'pl-10'}`}
            />
          </div>
        </div>

        {/* Clients Grid */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-lavender rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm 
                ? t('clients.noSearchResults')
                : t('clients.noClients')
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? t('clients.tryDifferentSearch')
                : t('clients.addFirstClient')
              }
            </p>
            {!searchTerm && (
              <button className="btn-primary flex items-center space-x-2 mx-auto">
                <Plus className="w-4 h-4" />
                <span>{t('clients.addClient')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <div key={client.id} className="card-lumea hover-lift transition-all duration-300">
                {/* Client Header */}
                <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center space-x-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-purple flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {client.full_name || t('clients.unnamedClient')}
                      </h3>
                      <p className="text-sm text-gray-600">{client.email}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Client Stats */}
                <div className="space-y-3 mb-4">
                  <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-600">{t('clients.memberSince')}</span>
                    <span className="font-medium">
                      {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-600">{t('clients.sessions')}</span>
                    <span className="font-medium">{client.sessions_count || 0}</span>
                  </div>
                  <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-gray-600">{t('clients.lastSession')}</span>
                    <span className="font-medium">
                      {client.last_session ? new Date(client.last_session).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className={`flex space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <button className="btn-secondary flex-1 flex items-center justify-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>{t('clients.message')}</span>
                  </button>
                  <button className="btn-primary flex-1 flex items-center justify-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{t('clients.schedule')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsPage;
