import { 
  ReflectionTemplateType,
  GetReflectionFormResponse,
  SaveReflectionRequest,
  SaveReflectionResponse,
  Reflection 
} from '../types/reflection';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

// New interfaces for enhanced functionality
export interface ReflectionHistoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'draft' | 'submitted';
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  sortBy?: 'submittedAt' | 'lastSavedAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  clientId?: string;
}

export interface ReflectionHistoryResponse {
  reflections: Reflection[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  filters: ReflectionHistoryFilters;
}

export interface ReflectionAnalytics {
  overview: {
    totalReflections: number;
    submittedReflections: number;
    draftReflections: number;
    completionRate: number;
    avgCompletionTime: number;
    earliestReflection: string | null;
    latestReflection: string | null;
  };
  trends: {
    monthly: Array<{
      month: string;
      count: number;
      avgCompletionTime: number;
    }>;
    weekly: Array<{
      dayOfWeek: number;
      count: number;
      avgCompletionTime: number;
    }>;
  };
  insights: {
    categories: Array<{
      category: string;
      responses: number;
      averageScore: number | null;
    }>;
    completionTime: {
      average: number;
      minimum: number;
      maximum: number;
      median: number;
    };
  };
}

export interface ReflectionSearchResult {
  reflectionId: string;
  sessionDate: string;
  submittedAt: string;
  relevanceScore: number;
  matches: number;
  preview: Array<{
    questionId: string;
    value: string | number;
    followUpAnswer: string | null;
  }>;
  client?: {
    name: string;
    email: string;
  } | null;
}

export interface ReflectionSearchResponse {
  query: string;
  results: ReflectionSearchResult[];
  total: number;
}

class ReflectionService {
  // Get available reflection templates
  async getAvailableTemplates(): Promise<{ type: ReflectionTemplateType; name: string; description: string; estimatedMinutes: number }[]> {
    const response = await fetch(`${API_BASE}/reflections/templates`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get templates: ${response.statusText}`);
    }

    const data = await response.json();
    return data.templates;
  }

  // Get reflection form for a session
  async getReflectionForm(
    sessionId: string, 
    templateType: ReflectionTemplateType = 'standard'
  ): Promise<GetReflectionFormResponse> {
    const response = await fetch(
      `${API_BASE}/reflections/form/${sessionId}?template=${templateType}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get reflection form: ${response.statusText}`);
    }

    return response.json();
  }

  // Get existing reflection for a session
  async getReflection(sessionId: string): Promise<Reflection> {
    const response = await fetch(`${API_BASE}/reflections/${sessionId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No reflection found for this session');
      }
      throw new Error(`Failed to get reflection: ${response.statusText}`);
    }

    return response.json();
  }

  // Save or update reflection
  async saveReflection(
    sessionId: string, 
    data: SaveReflectionRequest
  ): Promise<SaveReflectionResponse> {
    const response = await fetch(`${API_BASE}/reflections/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to save reflection: ${response.statusText}`);
    }

    return response.json();
  }

  // Update existing reflection
  async updateReflection(
    sessionId: string, 
    data: SaveReflectionRequest
  ): Promise<SaveReflectionResponse> {
    const response = await fetch(`${API_BASE}/reflections/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update reflection: ${response.statusText}`);
    }

    return response.json();
  }

  // Delete reflection (drafts only)
  async deleteReflection(sessionId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/reflections/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete reflection: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all reflections for current client
  async getClientReflections(page = 1, limit = 10): Promise<{
    reflections: Reflection[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    const response = await fetch(
      `${API_BASE}/reflections/client/all?page=${page}&limit=${limit}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get client reflections: ${response.statusText}`);
    }

    return response.json();
  }

  // Get reflections for coach (submitted only)
  async getCoachReflections(page = 1, limit = 10, clientId?: string): Promise<{
    reflections: Reflection[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    let url = `${API_BASE}/reflections/coach/all?page=${page}&limit=${limit}`;
    if (clientId) {
      url += `&clientId=${clientId}`;
    }

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get coach reflections: ${response.statusText}`);
    }

    return response.json();
  }

  // Get reflection history with advanced filtering
  async getReflectionHistory(filters: ReflectionHistoryFilters = {}): Promise<ReflectionHistoryResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE}/reflections/history?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get reflection history: ${response.statusText}`);
    }

    return response.json();
  }

  // Get reflection analytics and insights
  async getReflectionAnalytics(
    clientId?: string, 
    dateFrom?: string, 
    dateTo?: string
  ): Promise<ReflectionAnalytics> {
    const params = new URLSearchParams();
    
    if (clientId) params.append('clientId', clientId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await fetch(`${API_BASE}/reflections/analytics?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get reflection analytics: ${response.statusText}`);
    }

    return response.json();
  }

  // Search reflections with full-text search
  async searchReflections(
    query: string,
    options: {
      limit?: number;
      categories?: string[];
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<ReflectionSearchResponse> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.categories && options.categories.length > 0) {
      params.append('categories', options.categories.join(','));
    }
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);

    const response = await fetch(`${API_BASE}/reflections/search?${params}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to search reflections: ${response.statusText}`);
    }

    return response.json();
  }

  // Get reflection statistics for dashboard
  async getReflectionStats(clientId?: string): Promise<{
    totalReflections: number;
    submittedThisWeek: number;
    submittedThisMonth: number;
    averageCompletionTime: number;
    completionRate: number;
    longestStreak: number;
    currentStreak: number;
  }> {
    const analytics = await this.getReflectionAnalytics(
      clientId,
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days
      new Date().toISOString()
    );

    // Calculate streaks and weekly/monthly stats
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const submittedThisWeek = analytics.trends.monthly
      .filter(trend => new Date(trend.month + '-01') >= oneWeekAgo)
      .reduce((sum, trend) => sum + trend.count, 0);

    const submittedThisMonth = analytics.trends.monthly
      .filter(trend => new Date(trend.month + '-01') >= oneMonthAgo)
      .reduce((sum, trend) => sum + trend.count, 0);

    return {
      totalReflections: analytics.overview.totalReflections,
      submittedThisWeek,
      submittedThisMonth,
      averageCompletionTime: analytics.overview.avgCompletionTime,
      completionRate: analytics.overview.completionRate,
      longestStreak: 0, // Would need additional API endpoint for streak calculation
      currentStreak: 0,
    };
  }

  // Export reflections data (for privacy compliance)
  async exportReflections(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response = await fetch(`${API_BASE}/reflections/export?format=${format}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to export reflections: ${response.statusText}`);
    }

    return response.blob();
  }

  // Get reflection categories for filtering
  getReflectionCategories(): Array<{ value: string; label: string }> {
    return [
      { value: 'self_awareness', label: 'Self Awareness' },
      { value: 'patterns', label: 'Patterns' },
      { value: 'growth_opportunities', label: 'Growth Opportunities' },
      { value: 'action_commitments', label: 'Action Commitments' },
      { value: 'gratitude', label: 'Gratitude' },
    ];
  }

  // Helper method to format reflection data for display
  formatReflectionPreview(reflection: Reflection): {
    title: string;
    date: string;
    status: string;
    preview: string;
    completionTime?: number;
  } {
    const sessionDate = reflection.createdAt || new Date().toISOString();

    const firstTextAnswer = reflection.answers?.find(
      answer => typeof answer.value === 'string' && answer.value.length > 10
    );

    return {
      title: `Reflection - ${new Date(sessionDate).toLocaleDateString()}`,
      date: reflection.submittedAt || reflection.lastSavedAt,
      status: reflection.status,
      preview: firstTextAnswer 
        ? (firstTextAnswer.value as string).substring(0, 150) + '...'
        : 'No text content available',
      completionTime: reflection.actualCompletionMinutes,
    };
  }
}

export const reflectionService = new ReflectionService(); 