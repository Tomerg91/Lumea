import { reflectionService, ReflectionHistoryFilters, ReflectionSearchResponse } from './reflectionService';

// Advanced search filters interface
export interface AdvancedSearchFilters extends ReflectionHistoryFilters {
  query?: string;
  categories?: string[];
  minCompletionTime?: number;
  maxCompletionTime?: number;
  hasFollowUp?: boolean;
  scoreRange?: {
    min: number;
    max: number;
  };
}

// Search suggestion interface
export interface SearchSuggestion {
  text: string;
  type: 'category' | 'keyword' | 'date' | 'client';
  count?: number;
}

// Saved search interface
export interface SavedSearch {
  id: string;
  name: string;
  filters: AdvancedSearchFilters;
  createdAt: string;
  lastUsed: string;
  useCount: number;
}

// Search result with enhanced metadata
export interface EnhancedSearchResult {
  reflectionId: string;
  sessionDate: string;
  submittedAt: string;
  relevanceScore: number;
  matches: number;
  preview: Array<{
    questionId: string;
    value: string | number;
    followUpAnswer: string | null;
    isHighlighted: boolean;
  }>;
  client?: {
    name: string;
    email: string;
  } | null;
  categories: string[];
  completionTime?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

class ReflectionSearchService {
  private searchHistory: string[] = [];
  private savedSearches: SavedSearch[] = [];
  private recentCategories: string[] = [];

  // Initialize service with local storage
  constructor() {
    this.loadFromStorage();
  }

  // Full-text search with advanced options
  async searchReflections(
    query: string,
    filters: AdvancedSearchFilters = {}
  ): Promise<{
    results: EnhancedSearchResult[];
    total: number;
    suggestions: SearchSuggestion[];
    executionTime: number;
  }> {
    const startTime = Date.now();

    // Add to search history
    this.addToSearchHistory(query);

    // Build search options
    const searchOptions = {
      limit: filters.limit || 20,
      categories: filters.categories,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    };

    // Execute search
    const searchResponse = await reflectionService.searchReflections(query, searchOptions);

    // Enhanced results with additional metadata
    const enhancedResults: EnhancedSearchResult[] = searchResponse.results.map(result => ({
      ...result,
      preview: result.preview.map(p => ({ ...p, isHighlighted: true })),
      categories: this.extractCategories(result.preview),
      sentiment: this.analyzeSentiment(result.preview),
    }));

    // Filter by additional criteria
    const filteredResults = this.applyAdvancedFilters(enhancedResults, filters);

    // Generate search suggestions
    const suggestions = await this.generateSearchSuggestions(query, filters);

    const executionTime = Date.now() - startTime;

    return {
      results: filteredResults,
      total: filteredResults.length,
      suggestions,
      executionTime,
    };
  }

  // Get search history with advanced filtering
  async getReflectionHistory(filters: ReflectionHistoryFilters = {}) {
    return reflectionService.getReflectionHistory(filters);
  }

  // Quick search with auto-complete
  async quickSearch(query: string, limit = 5): Promise<EnhancedSearchResult[]> {
    if (query.length < 2) return [];

    const results = await this.searchReflections(query, { limit });
    return results.results;
  }

  // Search by category
  async searchByCategory(category: string, filters: ReflectionHistoryFilters = {}) {
    this.addToRecentCategories(category);
    
    return this.getReflectionHistory({
      ...filters,
      category,
    });
  }

  // Search by date range
  async searchByDateRange(dateFrom: string, dateTo: string, filters: ReflectionHistoryFilters = {}) {
    return this.getReflectionHistory({
      ...filters,
      dateFrom,
      dateTo,
    });
  }

  // Advanced filtering
  async applyAdvancedFilter(filters: AdvancedSearchFilters) {
    if (filters.query) {
      return this.searchReflections(filters.query, filters);
    } else {
      const result = await this.getReflectionHistory(filters);
      return {
        results: result.reflections.map(r => ({
          reflectionId: r._id,
          sessionDate: r.createdAt || new Date().toISOString(),
          submittedAt: r.submittedAt || r.lastSavedAt,
          relevanceScore: 1,
          matches: 1,
          preview: r.answers?.slice(0, 2).map(answer => ({
            questionId: answer.questionId,
            value: answer.value,
            followUpAnswer: answer.followUpAnswer || null,
            isHighlighted: false,
          })) || [],
          client: null,
          categories: this.extractCategories(r.answers || []),
          completionTime: r.actualCompletionMinutes,
          sentiment: 'neutral' as const,
        })),
        total: result.pagination.total,
        suggestions: [],
        executionTime: 0,
      };
    }
  }

  // Generate search suggestions
  private async generateSearchSuggestions(
    query: string,
    filters: AdvancedSearchFilters
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    // Add category suggestions
    const categories = reflectionService.getReflectionCategories();
    categories.forEach(category => {
      if (category.label.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          text: category.label,
          type: 'category',
        });
      }
    });

    // Add keyword suggestions from search history
    this.searchHistory
      .filter(term => term.toLowerCase().includes(query.toLowerCase()) && term !== query)
      .slice(0, 3)
      .forEach(term => {
        suggestions.push({
          text: term,
          type: 'keyword',
        });
      });

    // Add date suggestions
    if (query.match(/\d{4}/) || query.includes('last') || query.includes('this')) {
      suggestions.push(
        { text: 'This week', type: 'date' },
        { text: 'This month', type: 'date' },
        { text: 'Last 3 months', type: 'date' }
      );
    }

    return suggestions.slice(0, 8);
  }

  // Apply advanced filters to results
  private applyAdvancedFilters(
    results: EnhancedSearchResult[],
    filters: AdvancedSearchFilters
  ): EnhancedSearchResult[] {
    let filtered = [...results];

    // Filter by completion time
    if (filters.minCompletionTime || filters.maxCompletionTime) {
      filtered = filtered.filter(result => {
        const time = result.completionTime || 0;
        return (!filters.minCompletionTime || time >= filters.minCompletionTime) &&
               (!filters.maxCompletionTime || time <= filters.maxCompletionTime);
      });
    }

    // Filter by follow-up answers
    if (filters.hasFollowUp !== undefined) {
      filtered = filtered.filter(result => {
        const hasFollowUp = result.preview.some(p => p.followUpAnswer);
        return filters.hasFollowUp ? hasFollowUp : !hasFollowUp;
      });
    }

    // Filter by score range
    if (filters.scoreRange) {
      filtered = filtered.filter(result => {
        const numericAnswers = result.preview.filter(p => typeof p.value === 'number');
        if (numericAnswers.length === 0) return true;
        
        const avgScore = numericAnswers.reduce((sum, p) => sum + (p.value as number), 0) / numericAnswers.length;
        return avgScore >= filters.scoreRange!.min && avgScore <= filters.scoreRange!.max;
      });
    }

    return filtered;
  }

  // Extract categories from reflection preview
  private extractCategories(preview: any[]): string[] {
    const categories = new Set<string>();
    
    preview.forEach(item => {
      if (item.questionId) {
        const category = item.questionId.split('_')[0];
        categories.add(category);
      }
    });

    return Array.from(categories);
  }

  // Simple sentiment analysis
  private analyzeSentiment(preview: any[]): 'positive' | 'neutral' | 'negative' {
    const text = preview
      .filter(p => typeof p.value === 'string')
      .map(p => p.value.toLowerCase())
      .join(' ');

    const positiveWords = ['great', 'good', 'excellent', 'amazing', 'wonderful', 'happy', 'grateful', 'progress', 'success'];
    const negativeWords = ['bad', 'terrible', 'awful', 'difficult', 'struggle', 'challenge', 'frustrated', 'disappointed'];

    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Search history management
  private addToSearchHistory(query: string) {
    if (!query || query.length < 2) return;

    this.searchHistory = this.searchHistory.filter(q => q !== query);
    this.searchHistory.unshift(query);
    this.searchHistory = this.searchHistory.slice(0, 20); // Keep last 20 searches

    this.saveToStorage();
  }

  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  clearSearchHistory() {
    this.searchHistory = [];
    this.saveToStorage();
  }

  // Recent categories management
  private addToRecentCategories(category: string) {
    this.recentCategories = this.recentCategories.filter(c => c !== category);
    this.recentCategories.unshift(category);
    this.recentCategories = this.recentCategories.slice(0, 10);

    this.saveToStorage();
  }

  getRecentCategories(): string[] {
    return [...this.recentCategories];
  }

  // Saved searches management
  saveSearch(name: string, filters: AdvancedSearchFilters): SavedSearch {
    const savedSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      useCount: 1,
    };

    this.savedSearches.push(savedSearch);
    this.saveToStorage();

    return savedSearch;
  }

  getSavedSearches(): SavedSearch[] {
    return [...this.savedSearches];
  }

  useSavedSearch(id: string): SavedSearch | null {
    const search = this.savedSearches.find(s => s.id === id);
    if (search) {
      search.lastUsed = new Date().toISOString();
      search.useCount++;
      this.saveToStorage();
    }
    return search || null;
  }

  deleteSavedSearch(id: string) {
    this.savedSearches = this.savedSearches.filter(s => s.id !== id);
    this.saveToStorage();
  }

  // Export search results
  async exportSearchResults(
    results: EnhancedSearchResult[],
    format: 'csv' | 'json' = 'json'
  ): Promise<Blob> {
    if (format === 'json') {
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalResults: results.length,
        results: results.map(result => ({
          reflectionId: result.reflectionId,
          sessionDate: result.sessionDate,
          submittedAt: result.submittedAt,
          relevanceScore: result.relevanceScore,
          preview: result.preview.map(p => ({
            questionId: p.questionId,
            value: p.value,
            followUpAnswer: p.followUpAnswer,
          })),
          categories: result.categories,
          completionTime: result.completionTime,
          sentiment: result.sentiment,
        })),
      };

      return new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
    } else {
      // CSV format
      const headers = ['Reflection ID', 'Session Date', 'Submitted At', 'Relevance Score', 'Categories', 'Completion Time', 'Sentiment', 'Preview'];
      const rows = results.map(result => [
        result.reflectionId,
        result.sessionDate,
        result.submittedAt,
        result.relevanceScore.toString(),
        result.categories.join('; '),
        (result.completionTime || 0).toString(),
        result.sentiment,
        result.preview.map(p => `${p.questionId}: ${p.value}`).join('; '),
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return new Blob([csvContent], {
        type: 'text/csv',
      });
    }
  }

  // Search analytics
  getSearchAnalytics(): {
    totalSearches: number;
    topSearchTerms: Array<{ term: string; count: number }>;
    topCategories: Array<{ category: string; count: number }>;
    avgResultsPerSearch: number;
  } {
    // This would ideally be tracked server-side, but for now return mock data
    const termCounts = this.searchHistory.reduce((acc, term) => {
      acc[term] = (acc[term] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSearchTerms = Object.entries(termCounts)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const categoryCounts = this.recentCategories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalSearches: this.searchHistory.length,
      topSearchTerms,
      topCategories,
      avgResultsPerSearch: 8.5, // Mock average
    };
  }

  // Local storage helpers
  private saveToStorage() {
    try {
      localStorage.setItem('reflectionSearchService', JSON.stringify({
        searchHistory: this.searchHistory,
        savedSearches: this.savedSearches,
        recentCategories: this.recentCategories,
      }));
    } catch (error) {
      console.warn('Failed to save search service data to localStorage:', error);
    }
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem('reflectionSearchService');
      if (data) {
        const parsed = JSON.parse(data);
        this.searchHistory = parsed.searchHistory || [];
        this.savedSearches = parsed.savedSearches || [];
        this.recentCategories = parsed.recentCategories || [];
      }
    } catch (error) {
      console.warn('Failed to load search service data from localStorage:', error);
    }
  }
}

// Export singleton instance
export const reflectionSearchService = new ReflectionSearchService(); 