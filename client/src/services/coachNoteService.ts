import { CoachNote, CreateCoachNoteRequest, UpdateCoachNoteRequest, CoachNoteFilters, AuditEntry } from '../types/coachNote';

const API_BASE_URL = '/api/coach-notes';

// Enhanced search options interface
export interface SearchOptions {
  query?: string;
  tags?: string[];
  accessLevel?: string[];
  dateStart?: string;
  dateEnd?: string;
  coachId?: string;
  sessionId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'title' | 'lastAccess';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  notes: CoachNote[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  metadata?: {
    query?: string;
    executionTime: number;
    filters: any;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class CoachNoteService {
  // Cache for frequently accessed data
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}${params ? `?${JSON.stringify(params)}` : ''}`;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.data as T;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired entry
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, useCache: boolean = false): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, options.body);
    
    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cachedData = this.getCachedData<T>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache successful GET responses
    if (useCache && (!options.method || options.method === 'GET')) {
      this.setCachedData(cacheKey, data);
    }

    return data;
  }

  // Clear cache for specific patterns or all
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Create a new coach note
  async createNote(data: CreateCoachNoteRequest): Promise<CoachNote> {
    const result = await this.request<CoachNote>('/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    // Clear relevant caches
    this.clearCache('/');
    this.clearCache('/search');
    
    return result;
  }

  // Get a specific coach note by ID
  async getNote(id: string, accessReason?: string): Promise<CoachNote> {
    const body = accessReason ? { accessReason } : undefined;
    return this.request<CoachNote>(`/${id}`, {
      method: body ? 'POST' : 'GET',
      body: body ? JSON.stringify(body) : undefined,
    }, !body); // Cache only GET requests
  }

  // Get paginated coach notes with server-side filtering
  async getPaginatedNotes(options: {
    page?: number;
    limit?: number;
    filters?: CoachNoteFilters;
  } = {}): Promise<PaginatedResult<CoachNote>> {
    const { page = 1, limit = 20, filters } = options;
    const queryParams = new URLSearchParams();
    
    queryParams.set('page', page.toString());
    queryParams.set('limit', limit.toString());
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }

    const endpoint = `/?${queryParams.toString()}`;
    return this.request<PaginatedResult<CoachNote>>(endpoint, {}, true);
  }

  // Get all coach notes for the current coach (legacy method - use getPaginatedNotes for better performance)
  async getAllNotes(filters?: CoachNoteFilters): Promise<CoachNote[]> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }

    const endpoint = queryParams.toString() ? `/?${queryParams.toString()}` : '/';
    const result = await this.request<any>(endpoint, {}, true);
    
    // Handle both old format (array) and new format (paginated)
    return Array.isArray(result) ? result : result.notes || result.data || [];
  }

  // Advanced search with server-side processing
  async searchNotes(options: SearchOptions): Promise<SearchResult> {
    const queryParams = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const endpoint = `/search?${queryParams.toString()}`;
    return this.request<SearchResult>(endpoint, {}, true);
  }

  // Get search suggestions
  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const queryParams = new URLSearchParams({
      query,
      limit: limit.toString()
    });

    const endpoint = `/search/suggestions?${queryParams.toString()}`;
    const result = await this.request<{ suggestions: string[] }>(endpoint, {}, true);
    return result.suggestions || [];
  }

  // Get popular tags
  async getPopularTags(limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    const queryParams = new URLSearchParams({ limit: limit.toString() });
    const endpoint = `/tags/popular?${queryParams.toString()}`;
    const result = await this.request<Array<{ tag: string; count: number }>>(endpoint, {}, true);
    return result || [];
  }

  // Get all coach notes for a specific session
  async getSessionNotes(sessionId: string): Promise<CoachNote[]> {
    return this.request<CoachNote[]>(`/session/${sessionId}`, {}, true);
  }

  // Update a coach note
  async updateNote(id: string, data: UpdateCoachNoteRequest): Promise<CoachNote> {
    const result = await this.request<CoachNote>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    // Clear relevant caches
    this.clearCache(`/${id}`);
    this.clearCache('/');
    this.clearCache('/search');
    
    return result;
  }

  // Delete a coach note
  async deleteNote(id: string): Promise<void> {
    await this.request<void>(`/${id}`, {
      method: 'DELETE',
    });
    
    // Clear relevant caches
    this.clearCache(`/${id}`);
    this.clearCache('/');
    this.clearCache('/search');
  }

  // Share a note with specific users
  async shareNote(id: string, userIds: string[]): Promise<{ message: string; sharedWith: string[] }> {
    const result = await this.request<{ message: string; sharedWith: string[] }>(`/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
    
    // Clear cache for this note
    this.clearCache(`/${id}`);
    
    return result;
  }

  // Unshare a note from specific users
  async unshareNote(id: string, userIds: string[]): Promise<{ message: string; sharedWith: string[] }> {
    const result = await this.request<{ message: string; sharedWith: string[] }>(`/${id}/unshare`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
    
    // Clear cache for this note
    this.clearCache(`/${id}`);
    
    return result;
  }

  // Get audit trail for a note (owner and admin only)
  async getAuditTrail(id: string): Promise<AuditEntry[]> {
    const response = await this.request<{ auditTrail: AuditEntry[] }>(`/${id}/audit`, {}, true);
    return response.auditTrail;
  }

  // Legacy search method - now uses server-side search
  async searchNotes_legacy(query: string): Promise<CoachNote[]> {
    const searchResult = await this.searchNotes({
      query,
      limit: 100 // Reasonable limit for legacy usage
    });
    return searchResult.notes;
  }

  // Performance monitoring methods
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Preload data for better performance
  async preloadData(): Promise<void> {
    try {
      // Preload first page of notes
      await this.getPaginatedNotes({ page: 1, limit: 20 });
      // Preload popular tags
      await this.getPopularTags(20);
    } catch (error) {
      console.warn('Failed to preload data:', error);
    }
  }
}

export const coachNoteService = new CoachNoteService(); 