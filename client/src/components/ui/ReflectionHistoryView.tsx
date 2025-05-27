import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  TrendingUp,
  BarChart3,
  Download,
  Eye,
  BookOpen,
  Tag,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Star,
  MessageSquare,
  Lightbulb,
  Target,
  Heart,
  RefreshCw,
  Settings,
  X,
  Plus,
  Save,
  Trash2
} from 'lucide-react';
import { reflectionSearchService, AdvancedSearchFilters, EnhancedSearchResult, SavedSearch } from '../../services/reflectionSearchService';
import { reflectionService, ReflectionAnalytics } from '../../services/reflectionService';
import { Reflection } from '../../types/reflection';

interface ReflectionHistoryViewProps {
  clientId?: string;
  showAnalytics?: boolean;
  compact?: boolean;
}

type ViewMode = 'timeline' | 'grid' | 'list';
type FilterPanelTab = 'search' | 'filters' | 'saved';

export const ReflectionHistoryView: React.FC<ReflectionHistoryViewProps> = ({
  clientId,
  showAnalytics = true,
  compact = false,
}) => {
  // State management
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [searchResults, setSearchResults] = useState<EnhancedSearchResult[]>([]);
  const [analytics, setAnalytics] = useState<ReflectionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterPanelTab, setFilterPanelTab] = useState<FilterPanelTab>('search');
  const [selectedReflection, setSelectedReflection] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    status: 'all',
    sortBy: 'submittedAt',
    sortOrder: 'desc',
    limit: 20,
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [newSavedSearchName, setNewSavedSearchName] = useState('');

  // Load initial data
  useEffect(() => {
    loadReflections();
    loadAnalytics();
    loadSavedSearches();
  }, [clientId]);

  // Load reflections based on current filters
  const loadReflections = async () => {
    try {
      setLoading(true);
      setError(null);

      if (searchQuery.trim()) {
        setSearchLoading(true);
        const results = await reflectionSearchService.searchReflections(searchQuery, filters);
        setSearchResults(results.results);
        setReflections([]);
        setSearchLoading(false);
      } else {
        const response = await reflectionSearchService.getReflectionHistory({
          ...filters,
          clientId,
        });
        setReflections(response.reflections);
        setSearchResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reflections');
    } finally {
      setLoading(false);
    }
  };

  // Load analytics data
  const loadAnalytics = async () => {
    if (!showAnalytics) return;

    try {
      const analyticsData = await reflectionService.getReflectionAnalytics(
        clientId,
        undefined, // dateFrom
        undefined  // dateTo
      );
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  // Load saved searches
  const loadSavedSearches = () => {
    setSavedSearches(reflectionSearchService.getSavedSearches());
  };

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      await loadReflections();
    } else {
      setSearchResults([]);
      await loadReflections();
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<AdvancedSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Apply filters
  useEffect(() => {
    if (Object.keys(filters).length > 1) { // More than just empty object
      loadReflections();
    }
  }, [filters]);

  // Toggle card expansion
  const toggleCardExpansion = (reflectionId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reflectionId)) {
        newSet.delete(reflectionId);
      } else {
        newSet.add(reflectionId);
      }
      return newSet;
    });
  };

  // Save current search
  const saveCurrentSearch = () => {
    if (!newSavedSearchName.trim()) return;

    const savedSearch = reflectionSearchService.saveSearch(newSavedSearchName, {
      ...filters,
      query: searchQuery,
    });

    setSavedSearches(prev => [...prev, savedSearch]);
    setNewSavedSearchName('');
  };

  // Load saved search
  const loadSavedSearch = (savedSearch: SavedSearch) => {
    reflectionSearchService.useSavedSearch(savedSearch.id);
    setFilters(savedSearch.filters);
    setSearchQuery(savedSearch.filters.query || '');
    loadSavedSearches(); // Refresh to update usage count
  };

  // Delete saved search
  const deleteSavedSearch = (id: string) => {
    reflectionSearchService.deleteSavedSearch(id);
    loadSavedSearches();
  };

  // Export results
  const exportResults = async (format: 'json' | 'csv' = 'json') => {
    try {
      const dataToExport = searchResults.length > 0 ? searchResults : 
        reflections.map(r => ({
          reflectionId: r._id,
          sessionDate: r.sessionId?.date || new Date().toISOString(),
          submittedAt: r.submittedAt || r.lastSavedAt,
          relevanceScore: 1,
          matches: 1,
          preview: r.answers?.slice(0, 3).map(answer => ({
            questionId: answer.questionId,
            value: answer.value,
            followUpAnswer: answer.followUpAnswer || null,
            isHighlighted: false,
          })) || [],
          client: null,
          categories: [],
          completionTime: r.actualCompletionMinutes,
          sentiment: 'neutral' as const,
        }));

      const blob = await reflectionSearchService.exportSearchResults(dataToExport, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reflection-history-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export data');
    }
  };

  // Memoized computed values
  const displayData = useMemo(() => {
    return searchResults.length > 0 ? searchResults : reflections.map(r => ({
      reflectionId: r._id,
      sessionDate: r.sessionId?.date || new Date().toISOString(),
      submittedAt: r.submittedAt || r.lastSavedAt,
      relevanceScore: 1,
      matches: 1,
      preview: r.answers?.slice(0, 3).map(answer => ({
        questionId: answer.questionId,
        value: answer.value,
        followUpAnswer: answer.followUpAnswer || null,
        isHighlighted: false,
      })) || [],
      client: null,
      categories: [],
      completionTime: r.actualCompletionMinutes,
      sentiment: 'neutral' as const,
    }));
  }, [searchResults, reflections]);

  const categoryOptions = reflectionService.getReflectionCategories();

  if (loading && !searchLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading reflections...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reflection History</h1>
          <p className="text-gray-600 mt-1">
            {displayData.length} reflection{displayData.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(['timeline', 'grid', 'list'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'timeline' && <Calendar className="w-4 h-4" />}
                {mode === 'grid' && <BarChart3 className="w-4 h-4" />}
                {mode === 'list' && <BookOpen className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              showFilterPanel
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>

          {/* Export button */}
          <div className="relative group">
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => exportResults('json')}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                Export as JSON
              </button>
              <button
                onClick={() => exportResults('csv')}
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-b-lg"
              >
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Overview */}
      {showAnalytics && analytics && !compact && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reflections</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalReflections}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(analytics.overview.completionRate)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Completion Time</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(analytics.overview.avgCompletionTime)}min
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-orange-600">
                  {analytics.trends.monthly[0]?.count || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-4">
              {(['search', 'filters', 'saved'] as FilterPanelTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterPanelTab(tab)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filterPanelTab === tab
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab === 'search' && 'Search'}
                  {tab === 'filters' && 'Filters'}
                  {tab === 'saved' && 'Saved Searches'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilterPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Tab */}
          {filterPanelTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search reflections..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchLoading && (
                  <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
                )}
              </div>
              
              {searchQuery && (
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    placeholder="Save this search..."
                    value={newSavedSearchName}
                    onChange={(e) => setNewSavedSearchName(e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={saveCurrentSearch}
                    disabled={!newSavedSearchName.trim()}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Filters Tab */}
          {filterPanelTab === 'filters' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status || 'all'}
                  onChange={(e) => handleFilterChange({ status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="submitted">Submitted</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange({ category: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={filters.sortBy || 'submittedAt'}
                  onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="submittedAt">Submission Date</option>
                  <option value="lastSavedAt">Last Modified</option>
                  <option value="createdAt">Created Date</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange({ dateFrom: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange({ dateTo: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <select
                  value={filters.sortOrder || 'desc'}
                  onChange={(e) => handleFilterChange({ sortOrder: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          )}

          {/* Saved Searches Tab */}
          {filterPanelTab === 'saved' && (
            <div className="space-y-3">
              {savedSearches.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No saved searches yet</p>
              ) : (
                savedSearches.map((savedSearch) => (
                  <div
                    key={savedSearch.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{savedSearch.name}</h4>
                      <p className="text-sm text-gray-600">
                        Used {savedSearch.useCount} times • Last used{' '}
                        {new Date(savedSearch.lastUsed).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => loadSavedSearch(savedSearch)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSavedSearch(savedSearch.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {displayData.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reflections found</h3>
            <p className="text-gray-600">
              {searchQuery
                ? 'Try adjusting your search terms or filters'
                : 'You haven\'t completed any reflections yet'}
            </p>
          </div>
        ) : (
          /* Reflection Cards */
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {displayData.map((item) => (
              <div
                key={item.reflectionId}
                className="bg-white rounded-lg border hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {new Date(item.sessionDate).toLocaleDateString()}
                      </span>
                      {item.sentiment && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.sentiment === 'positive' 
                            ? 'bg-green-100 text-green-800'
                            : item.sentiment === 'negative'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.sentiment === 'positive' && <Heart className="w-3 h-3 mr-1" />}
                          {item.sentiment === 'negative' && <Target className="w-3 h-3 mr-1" />}
                          {item.sentiment === 'neutral' && <Lightbulb className="w-3 h-3 mr-1" />}
                          {item.sentiment}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleCardExpansion(item.reflectionId)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedCards.has(item.reflectionId) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="space-y-2">
                    {item.preview.slice(0, expandedCards.has(item.reflectionId) ? undefined : 2).map((preview, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-gray-900">
                          Question {idx + 1}:
                        </span>
                        <p className="text-gray-700 mt-1">
                          {typeof preview.value === 'string' 
                            ? preview.value.substring(0, expandedCards.has(item.reflectionId) ? undefined : 150)
                            : preview.value
                          }
                          {typeof preview.value === 'string' && 
                           preview.value.length > 150 && 
                           !expandedCards.has(item.reflectionId) && '...'}
                        </p>
                        {preview.followUpAnswer && (
                          <p className="text-gray-600 text-xs mt-1 italic">
                            Follow-up: {preview.followUpAnswer.substring(0, 100)}
                            {preview.followUpAnswer.length > 100 && '...'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {item.completionTime && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{item.completionTime}min</span>
                        </span>
                      )}
                      {searchQuery && (
                        <span className="flex items-center space-x-1">
                          <Star className="w-3 h-3" />
                          <span>Score: {item.relevanceScore.toFixed(1)}</span>
                        </span>
                      )}
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{item.preview.length} answers</span>
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedReflection(item.reflectionId)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Full
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 