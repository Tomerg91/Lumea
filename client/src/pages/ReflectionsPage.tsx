import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { MessageSquare, Calendar, User, Search, Filter, Plus } from 'lucide-react';

interface Reflection {
  id: string;
  sessionId: string;
  title: string;
  content: string;
  createdAt: string;
  clientName?: string;
  sessionDate?: string;
  status: 'draft' | 'completed' | 'shared';
}

const ReflectionsPage = () => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockReflections: Reflection[] = [
      {
        id: '1',
        sessionId: 'session-1',
        title: 'Weekly Progress Reflection',
        content: 'This week I made significant progress on my goals...',
        createdAt: '2024-01-15',
        clientName: profile?.role === 'coach' ? 'John Doe' : undefined,
        sessionDate: '2024-01-15',
        status: 'completed'
      },
      {
        id: '2',
        sessionId: 'session-2',
        title: 'Goal Setting Session',
        content: 'Today we focused on setting clear, achievable goals...',
        createdAt: '2024-01-10',
        clientName: profile?.role === 'coach' ? 'Jane Smith' : undefined,
        sessionDate: '2024-01-10',
        status: 'shared'
      },
      {
        id: '3',
        sessionId: 'session-3',
        title: 'Challenges and Breakthroughs',
        content: 'Reflecting on recent challenges and how to overcome them...',
        createdAt: '2024-01-05',
        clientName: profile?.role === 'coach' ? 'Mike Johnson' : undefined,
        sessionDate: '2024-01-05',
        status: 'draft'
      }
    ];

    setTimeout(() => {
      setReflections(mockReflections);
      setLoading(false);
    }, 1000);
  }, [profile?.role]);

  const filteredReflections = reflections.filter(reflection => {
    const matchesSearch = reflection.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reflection.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (reflection.clientName && reflection.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || reflection.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'shared': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return t('reflections.completed');
      case 'shared': return t('reflections.shared');
      case 'draft': return t('reflections.draft');
      default: return status;
    }
  };

  if (loading) {
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

  return (
    <div className={`min-h-screen bg-gradient-background py-8 ${isRTL ? 'rtl-layout' : ''}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-center md:justify-between mb-8 ${isRTL ? 'rtl-flex-row-reverse' : ''}`}>
          <div>
            <h1 className="text-3xl font-bold text-gradient-purple mb-2">
              {t('reflections.title')}
            </h1>
            <p className="text-gray-600">
              {profile?.role === 'coach' 
                ? t('reflections.coachSubtitle')
                : t('reflections.clientSubtitle')
              }
            </p>
          </div>
          
          <button className="btn-primary mt-4 md:mt-0 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>{t('reflections.newReflection')}</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 ${isRTL ? 'rtl-grid' : ''}`}>
          <div className="relative">
            <Search className={`absolute top-3 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder={t('reflections.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full glass-input ${isRTL ? 'pr-10' : 'pl-10'}`}
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="glass-input"
          >
            <option value="all">{t('reflections.allStatuses')}</option>
            <option value="completed">{t('reflections.completed')}</option>
            <option value="shared">{t('reflections.shared')}</option>
            <option value="draft">{t('reflections.draft')}</option>
          </select>
        </div>

        {/* Reflections Grid */}
        {filteredReflections.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-lavender rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {t('reflections.noReflections')}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? t('reflections.noSearchResults')
                : t('reflections.noReflectionsSubtitle')
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredReflections.map((reflection) => (
              <div key={reflection.id} className="card-lumea hover-lift transition-all duration-300">
                <div className={`flex flex-col md:flex-row md:items-start md:justify-between ${isRTL ? 'rtl-flex-row-reverse' : ''}`}>
                  <div className="flex-1">
                    <div className={`flex items-center space-x-3 mb-3 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <h3 className="text-lg font-semibold">{reflection.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(reflection.status)}`}>
                        {getStatusLabel(reflection.status)}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {reflection.content}
                    </p>
                    
                    <div className={`flex flex-wrap items-center gap-4 text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {profile?.role === 'coach' && reflection.clientName && (
                        <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <User className="w-4 h-4" />
                          <span>{reflection.clientName}</span>
                        </div>
                      )}
                      <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(reflection.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button className="btn-secondary mt-4 md:mt-0 md:ml-4">
                    {t('reflections.viewDetails')}
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

export default ReflectionsPage; 