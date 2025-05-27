import { 
  SessionFeedback, 
  FeedbackFormData, 
  FeedbackTemplate,
  FeedbackAnalytics,
  FeedbackSubmissionResponse,
  FeedbackListResponse,
  FeedbackAnalyticsResponse,
  FeedbackTemplateListResponse,
  FeedbackType
} from '../types/feedback';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class FeedbackService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Submit feedback for a session
   */
  async submitFeedback(
    sessionId: string, 
    feedbackData: FeedbackFormData
  ): Promise<FeedbackSubmissionResponse> {
    return this.makeRequest<FeedbackSubmissionResponse>(
      `/api/feedback/session/${sessionId}`,
      {
        method: 'POST',
        body: JSON.stringify(feedbackData),
      }
    );
  }

  /**
   * Get feedback for a specific session
   */
  async getSessionFeedback(
    sessionId: string,
    type?: FeedbackType
  ): Promise<FeedbackListResponse> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    
    const queryString = params.toString();
    const endpoint = `/api/feedback/session/${sessionId}${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<FeedbackListResponse>(endpoint);
  }

  /**
   * Get feedback analytics for a coach
   */
  async getCoachAnalytics(
    coachId: string,
    options: {
      period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<FeedbackAnalyticsResponse> {
    const params = new URLSearchParams();
    if (options.period) params.append('period', options.period);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    
    const queryString = params.toString();
    const endpoint = `/api/feedback/coach/${coachId}/analytics${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<FeedbackAnalyticsResponse>(endpoint);
  }

  /**
   * Get feedback analytics for a client
   */
  async getClientAnalytics(
    clientId: string,
    options: {
      period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<FeedbackAnalyticsResponse> {
    const params = new URLSearchParams();
    if (options.period) params.append('period', options.period);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    
    const queryString = params.toString();
    const endpoint = `/api/feedback/client/${clientId}/analytics${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<FeedbackAnalyticsResponse>(endpoint);
  }

  /**
   * Create a new feedback template
   */
  async createTemplate(templateData: Partial<FeedbackTemplate>): Promise<{
    success: boolean;
    message: string;
    template?: FeedbackTemplate;
  }> {
    return this.makeRequest<{
      success: boolean;
      message: string;
      template?: FeedbackTemplate;
    }>('/api/feedback/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  /**
   * Get available feedback templates
   */
  async getTemplates(options: {
    type?: 'coach' | 'client' | 'combined';
    category?: string;
    isPublic?: boolean;
    isDefault?: boolean;
  } = {}): Promise<FeedbackTemplateListResponse> {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.category) params.append('category', options.category);
    if (options.isPublic !== undefined) params.append('isPublic', options.isPublic.toString());
    if (options.isDefault !== undefined) params.append('isDefault', options.isDefault.toString());
    
    const queryString = params.toString();
    const endpoint = `/api/feedback/templates${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<FeedbackTemplateListResponse>(endpoint);
  }

  /**
   * Get default template for a feedback type
   */
  async getDefaultTemplate(type: FeedbackType): Promise<FeedbackTemplate | null> {
    try {
      const response = await this.getTemplates({ type, isDefault: true });
      return response.templates.length > 0 ? response.templates[0] : null;
    } catch (error) {
      console.error('Error fetching default template:', error);
      return null;
    }
  }

  /**
   * Check if feedback has been submitted for a session
   */
  async checkFeedbackStatus(sessionId: string, feedbackType: FeedbackType): Promise<{
    submitted: boolean;
    feedback?: SessionFeedback;
  }> {
    try {
      const response = await this.getSessionFeedback(sessionId, feedbackType);
      const feedback = response.feedbacks.find(f => f.feedbackType === feedbackType);
      
      return {
        submitted: !!feedback && feedback.status === 'submitted',
        feedback,
      };
    } catch (error) {
      console.error('Error checking feedback status:', error);
      return { submitted: false };
    }
  }

  /**
   * Get feedback summary for multiple sessions
   */
  async getFeedbackSummary(sessionIds: string[]): Promise<{
    [sessionId: string]: {
      coachFeedback?: SessionFeedback;
      clientFeedback?: SessionFeedback;
      hasCoachFeedback: boolean;
      hasClientFeedback: boolean;
    };
  }> {
    const summary: {
      [sessionId: string]: {
        coachFeedback?: SessionFeedback;
        clientFeedback?: SessionFeedback;
        hasCoachFeedback: boolean;
        hasClientFeedback: boolean;
      };
    } = {};

    // Fetch feedback for each session
    await Promise.all(
      sessionIds.map(async (sessionId) => {
        try {
          const response = await this.getSessionFeedback(sessionId);
          const coachFeedback = response.feedbacks.find(f => f.feedbackType === 'coach');
          const clientFeedback = response.feedbacks.find(f => f.feedbackType === 'client');
          
          summary[sessionId] = {
            coachFeedback,
            clientFeedback,
            hasCoachFeedback: !!coachFeedback && coachFeedback.status === 'submitted',
            hasClientFeedback: !!clientFeedback && clientFeedback.status === 'submitted',
          };
        } catch (error) {
          console.error(`Error fetching feedback for session ${sessionId}:`, error);
          summary[sessionId] = {
            hasCoachFeedback: false,
            hasClientFeedback: false,
          };
        }
      })
    );

    return summary;
  }

  /**
   * Calculate completion rate for feedback
   */
  async getFeedbackCompletionRate(
    entityId: string,
    entityType: 'coach' | 'client',
    dateRange?: { startDate: string; endDate: string }
  ): Promise<{
    totalSessions: number;
    feedbackSubmitted: number;
    completionRate: number;
  }> {
    try {
      const analyticsResponse = await (entityType === 'coach' 
        ? this.getCoachAnalytics(entityId, dateRange)
        : this.getClientAnalytics(entityId, dateRange)
      );
      
      const { metrics } = analyticsResponse.analytics;
      
      return {
        totalSessions: metrics.totalFeedbacks,
        feedbackSubmitted: metrics.submittedCount,
        completionRate: metrics.responseRate,
      };
    } catch (error) {
      console.error('Error calculating feedback completion rate:', error);
      return {
        totalSessions: 0,
        feedbackSubmitted: 0,
        completionRate: 0,
      };
    }
  }

  /**
   * Get feedback trends over time
   */
  async getFeedbackTrends(
    entityId: string,
    entityType: 'coach' | 'client',
    period: 'weekly' | 'monthly' | 'quarterly' = 'monthly'
  ): Promise<FeedbackAnalytics['trends']> {
    try {
      const analyticsResponse = await (entityType === 'coach' 
        ? this.getCoachAnalytics(entityId, { period })
        : this.getClientAnalytics(entityId, { period })
      );
      
      return analyticsResponse.analytics.trends;
    } catch (error) {
      console.error('Error fetching feedback trends:', error);
      return [];
    }
  }

  /**
   * Validate feedback data before submission
   */
  validateFeedbackData(data: FeedbackFormData): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    // Validate ratings (1-5 scale)
    const ratingFields = [
      'overallSatisfaction',
      'coachEffectiveness', 
      'sessionQuality',
      'goalProgress',
      'communicationQuality',
      'wouldRecommend'
    ] as const;

    ratingFields.forEach(field => {
      const value = data.ratings[field];
      if (!value || value < 1 || value > 5) {
        errors[`ratings.${field}`] = 'Rating must be between 1 and 5';
      }
    });

    // Validate required boolean field
    if (data.sessionGoalsMet === undefined || data.sessionGoalsMet === null) {
      errors.sessionGoalsMet = 'Please indicate if session goals were met';
    }

    // Validate text field lengths
    const textFields = [
      { field: 'overallComments', maxLength: 2000 },
      { field: 'sessionGoalsComments', maxLength: 1000 },
      { field: 'challengesFaced', maxLength: 1000 },
      { field: 'successHighlights', maxLength: 1000 },
      { field: 'improvementSuggestions', maxLength: 1000 },
      { field: 'nextSessionFocus', maxLength: 1000 },
      { field: 'privateNotes', maxLength: 1000 },
    ] as const;

    textFields.forEach(({ field, maxLength }) => {
      const value = data[field];
      if (value && value.length > maxLength) {
        errors[field] = `Must be ${maxLength} characters or less`;
      }
    });

    // Validate dynamic answers if present
    if (data.answers) {
      data.answers.forEach((answer, index) => {
        if (!answer.questionId) {
          errors[`answers.${index}.questionId`] = 'Question ID is required';
        }
        if (answer.answer === undefined || answer.answer === null || answer.answer === '') {
          errors[`answers.${index}.answer`] = 'Answer is required';
        }
      });
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Format feedback data for display
   */
  formatFeedbackForDisplay(feedback: SessionFeedback): {
    averageRating: number;
    formattedRatings: Array<{ label: string; value: number; max: number }>;
    hasComments: boolean;
    responseTime: string;
  } {
    const ratings = feedback.ratings;
    const ratingValues = [
      ratings.overallSatisfaction,
      ratings.coachEffectiveness,
      ratings.sessionQuality,
      ratings.goalProgress,
      ratings.communicationQuality,
      ratings.wouldRecommend,
    ];
    
    const averageRating = ratingValues.reduce((sum, val) => sum + val, 0) / ratingValues.length;
    
    const formattedRatings = [
      { label: 'Overall Satisfaction', value: ratings.overallSatisfaction, max: 5 },
      { label: 'Coach Effectiveness', value: ratings.coachEffectiveness, max: 5 },
      { label: 'Session Quality', value: ratings.sessionQuality, max: 5 },
      { label: 'Goal Progress', value: ratings.goalProgress, max: 5 },
      { label: 'Communication Quality', value: ratings.communicationQuality, max: 5 },
      { label: 'Would Recommend', value: ratings.wouldRecommend, max: 5 },
    ];
    
    const hasComments = !!(
      feedback.overallComments ||
      feedback.sessionGoalsComments ||
      feedback.challengesFaced ||
      feedback.successHighlights ||
      feedback.improvementSuggestions ||
      feedback.nextSessionFocus
    );
    
    const responseTime = feedback.responseTime 
      ? `${Math.round(feedback.responseTime / 60)} minutes`
      : 'Unknown';
    
    return {
      averageRating: Math.round(averageRating * 10) / 10,
      formattedRatings,
      hasComments,
      responseTime,
    };
  }
}

export const feedbackService = new FeedbackService(); 