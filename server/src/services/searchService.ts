export enum NoteAccessLevel {
  PRIVATE = 'private',
  CLIENT = 'client',
  TEAM = 'team',
  SUPERVISOR = 'supervisor',
  ORGANIZATION = 'organization',
}

export interface SearchOptions {
  query?: string;
  tags?: string[];
  accessLevel?: NoteAccessLevel[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  coachId?: string;
  clientId?: string;
  sessionId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'title' | 'lastAccess';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchFilters {
  userId: string;
  userRole: string;
  options: SearchOptions;
}

export interface SearchResult {
  notes: ICoachNote[];
  totalCount: number;
  page: number;
  totalPages: number;
  searchMetadata: {
    query?: string;
    executionTime: number;
    filters: any;
  };
}

export class CoachNoteSearchService {
  /**
   * Search coach notes with full-text search and filtering
   */
  static async searchNotes(filters: SearchFilters): Promise<SearchResult> {
    const startTime = Date.now();
    const { userId, userRole, options } = filters;
    
    // Build MongoDB aggregation pipeline
    const pipeline: any[] = [];
    
    // Stage 1: Match documents based on basic filters
    const matchStage: any = {};
    
    // Access control: Only include notes the user can access
    if (userRole !== 'admin') {
      matchStage.$or = [
        { coachId: new Types.ObjectId(userId) }, // Notes created by the user
        { sharedWith: userId }, // Notes explicitly shared with the user
        { 
          accessLevel: { 
            $in: this.getAllowedAccessLevels(userRole) 
          } 
        }
      ];
    }
    
    // Apply filters
    if (options.coachId) {
      matchStage.coachId = new Types.ObjectId(options.coachId);
    }
    
    if (options.sessionId) {
      matchStage.sessionId = new Types.ObjectId(options.sessionId);
    }
    
    if (options.tags && options.tags.length > 0) {
      matchStage.tags = { $in: options.tags };
    }
    
    if (options.accessLevel && options.accessLevel.length > 0) {
      matchStage.accessLevel = { $in: options.accessLevel };
    }
    
    if (options.dateRange) {
      const dateFilter: any = {};
      if (options.dateRange.start) {
        dateFilter.$gte = options.dateRange.start;
      }
      if (options.dateRange.end) {
        dateFilter.$lte = options.dateRange.end;
      }
      if (Object.keys(dateFilter).length > 0) {
        matchStage.createdAt = dateFilter;
      }
    }
    
    pipeline.push({ $match: matchStage });
    
    // Stage 2: Full-text search if query is provided
    if (options.query && options.query.trim()) {
      const searchQuery = this.buildSearchQuery(options.query);
      
      pipeline.push({
        $match: {
          $text: {
            $search: searchQuery,
            $caseSensitive: false,
            $diacriticSensitive: false
          }
        }
      });
      
      // Add relevance score
      pipeline.push({
        $addFields: {
          searchScore: { $meta: 'textScore' }
        }
      });
    }
    
    // Stage 3: Add computed fields
    pipeline.push({
      $addFields: {
        // Decrypt content for display (this should be done in application layer)
        hasAudio: { $ne: ['$audioFileId', null] },
        tagCount: { $size: { $ifNull: ['$tags', []] } },
        auditCount: { $size: { $ifNull: ['$auditTrail', []] } }
      }
    });
    
    // Stage 4: Sort
    const sortStage = this.buildSortStage(options.sortBy, options.sortOrder, !!options.query);
    pipeline.push({ $sort: sortStage });
    
    // Stage 5: Facet for pagination and count
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;
    
    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    });
    
    // Execute search
    const results = await CoachNote.aggregate(pipeline);
    const data = results[0];
    const notes = data.data || [];
    const totalCount = data.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    
    const executionTime = Date.now() - startTime;
    
    return {
      notes,
      totalCount,
      page,
      totalPages,
      searchMetadata: {
        query: options.query,
        executionTime,
        filters: {
          tags: options.tags,
          accessLevel: options.accessLevel,
          dateRange: options.dateRange,
          coachId: options.coachId,
          sessionId: options.sessionId
        }
      }
    };
  }
  
  /**
   * Get search suggestions based on partial query
   */
  static async getSearchSuggestions(
    userId: string,
    userRole: string,
    partialQuery: string,
    limit: number = 10
  ): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }
    
    const pipeline: any[] = [
      {
        $match: {
          $and: [
            {
              $or: [
                { coachId: new Types.ObjectId(userId) },
                { sharedWith: userId },
                { accessLevel: { $in: this.getAllowedAccessLevels(userRole) } }
              ]
            },
            {
              $or: [
                { title: { $regex: partialQuery, $options: 'i' } },
                { tags: { $regex: partialQuery, $options: 'i' } },
                { searchableContent: { $regex: partialQuery, $options: 'i' } }
              ]
            }
          ]
        }
      },
      {
        $project: {
          suggestions: {
            $concat: [
              { $ifNull: ['$title', ''] },
              ' ',
              { $reduce: {
                input: '$tags',
                initialValue: '',
                in: { $concat: ['$$value', ' ', '$$this'] }
              }}
            ]
          }
        }
      },
      { $limit: limit * 2 }, // Get more to filter duplicates
      { $group: { _id: '$suggestions' } },
      { $limit: limit }
    ];
    
    const results = await CoachNote.aggregate(pipeline);
    return results.map(r => r._id).filter(Boolean);
  }
  
  /**
   * Get popular tags for the user
   */
  static async getPopularTags(
    userId: string,
    userRole: string,
    limit: number = 20
  ): Promise<Array<{ tag: string; count: number }>> {
    console.warn('getPopularTags is a placeholder. Implement with Supabase.');
    return [];
  }
  
  /**
   * Build search query with advanced operators
   */
  private static buildSearchQuery(query: string): string {
    // Handle quoted phrases
    const quotedPhrases = query.match(/"([^"]+)"/g) || [];
    let searchQuery = query;
    
    // Replace quoted phrases with escaped versions
    quotedPhrases.forEach((phrase: string) => {
      const escaped = phrase.replace(/"/g, '\\"');
      searchQuery = searchQuery.replace(phrase, escaped);
    });
    
    // Handle exclusions (words with minus prefix)
    const exclusions = searchQuery.match(/-\w+/g) || [];
    exclusions.forEach((exclusion: string) => {
      searchQuery = searchQuery.replace(exclusion, `-"${exclusion.substring(1)}"`);
    });
    
    return searchQuery;
  }
  
  /**
   * Build sort stage for aggregation pipeline
   */
  private static buildSortStage(
    sortBy?: string,
    sortOrder?: string,
    hasTextSearch?: boolean
  ): any {
    const order = sortOrder === 'asc' ? 1 : -1;
    
    switch (sortBy) {
      case 'relevance':
        if (hasTextSearch) {
          return { searchScore: { $meta: 'textScore' }, createdAt: -1 };
        }
        return { createdAt: -1 };
      
      case 'title':
        return { title: order, createdAt: -1 };
      
      case 'lastAccess':
        return { lastAccessedAt: order, createdAt: -1 };
      
      case 'date':
      default:
        return { createdAt: order };
    }
  }
  
  /**
   * Get allowed access levels based on user role
   */
  private static getAllowedAccessLevels(userRole: string): NoteAccessLevel[] {
    switch (userRole) {
      case 'admin':
        return Object.values(NoteAccessLevel);
      
      case 'supervisor':
        return [
          NoteAccessLevel.SUPERVISOR,
          NoteAccessLevel.TEAM,
          NoteAccessLevel.ORGANIZATION
        ];
      
      case 'coach':
        return [
          NoteAccessLevel.TEAM,
          NoteAccessLevel.ORGANIZATION
        ];
      
      default:
        return [];
    }
  }
}

export default CoachNoteSearchService; 