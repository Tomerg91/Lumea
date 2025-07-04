/**
 * Daily Intention Service
 * 
 * Handles all API calls related to daily intention features:
 * - Managing beings (character traits, values, intentions)
 * - Recording and retrieving daily selections
 * - Checking selection status
 */

import { supabase } from '../lib/supabase';

// ====================== TYPES ======================

export interface Being {
  being_id: string;
  label_en: string;
  label_he: string;
  is_default: boolean;
  created_by_user_id?: string;
}

export interface DailyIntention {
  being_id: string;
  label_en: string;
  label_he: string;
  selection_date: string;
  created_at: string;
}

export interface IntentionStats {
  total_days: number;
  days_with_selections: number;
  most_selected_being_en?: string;
  most_selected_being_he?: string;
  selection_streak: number;
}

export interface CreateBeingRequest {
  label_en: string;
  label_he: string;
}

// ====================== SERVICE CLASS ======================

class IntentionService {
  /**
   * Check if current user needs to select beings for today
   */
  async needsBeingsSelection(): Promise<boolean> {
    try {
      // MOCK AUTH: Return mock response in development mode
      if (import.meta.env.VITE_MOCK_AUTH === 'true' || import.meta.env.VITE_DEVELOPMENT_MODE === 'true') {
        console.log('[IntentionService] Using mock needsBeingsSelection - returning true');
        return true; // Always needs selection in mock mode for testing
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('needs_beings_selection', {
        p_user_id: user.user.id
      });

      if (error) {
        console.error('Error checking beings selection need:', error);
        throw error;
      }

      return data || false;
    } catch (error) {
      console.error('Error in needsBeingsSelection:', error);
      throw error;
    }
  }

  /**
   * Get all beings available to current user (default + custom)
   */
  async getBeings(): Promise<Being[]> {
    try {
      // MOCK AUTH: Return mock beings in development mode
      if (import.meta.env.VITE_MOCK_AUTH === 'true' || import.meta.env.VITE_DEVELOPMENT_MODE === 'true') {
        console.log('[IntentionService] Using mock getBeings');
        return [
          {
            being_id: 'mock-being-1',
            label_en: 'Courage',
            label_he: 'אומץ',
            is_default: true
          },
          {
            being_id: 'mock-being-2',
            label_en: 'Compassion',
            label_he: 'רחמים',
            is_default: true
          },
          {
            being_id: 'mock-being-3',
            label_en: 'Wisdom',
            label_he: 'חכמה',
            is_default: true
          },
          {
            being_id: 'mock-being-4',
            label_en: 'Creativity',
            label_he: 'יצירתיות',
            is_default: true
          },
          {
            being_id: 'mock-being-5',
            label_en: 'Patience',
            label_he: 'סבלנות',
            is_default: true
          }
        ];
      }

      const { data, error } = await supabase.rpc('get_beings');

      if (error) {
        console.error('Error fetching beings:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBeings:', error);
      throw error;
    }
  }

  /**
   * Create a new custom being for current user
   */
  async addBeing(beingData: CreateBeingRequest): Promise<string> {
    try {
      const { label_en, label_he } = beingData;

      if (!label_en?.trim() || !label_he?.trim()) {
        throw new Error('Both English and Hebrew labels are required');
      }

      const { data, error } = await supabase.rpc('add_being', {
        p_label_en: label_en.trim(),
        p_label_he: label_he.trim()
      });

      if (error) {
        console.error('Error adding being:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in addBeing:', error);
      throw error;
    }
  }

  /**
   * Record daily intention selections for current user
   */
  async addDailyIntention(beingIds: string[]): Promise<number> {
    try {
      if (!beingIds || beingIds.length === 0) {
        throw new Error('At least one being must be selected');
      }

      // MOCK AUTH: Return mock response in development mode
      if (import.meta.env.VITE_MOCK_AUTH === 'true' || import.meta.env.VITE_DEVELOPMENT_MODE === 'true') {
        console.log('[IntentionService] Using mock addDailyIntention for beings:', beingIds);
        return beingIds.length; // Return the count of added intentions
      }

      const { data, error } = await supabase.rpc('add_daily_intention', {
        p_being_ids: beingIds
      });

      if (error) {
        console.error('Error adding daily intention:', error);
        throw error;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in addDailyIntention:', error);
      throw error;
    }
  }

  /**
   * Get daily intentions for current user and specified date
   */
  async getDailyIntentions(date?: string): Promise<DailyIntention[]> {
    try {
      const targetDate = date ? new Date(date).toISOString().split('T')[0] : undefined;

      // MOCK AUTH: Return mock daily intentions in development mode
      if (import.meta.env.VITE_MOCK_AUTH === 'true' || import.meta.env.VITE_DEVELOPMENT_MODE === 'true') {
        console.log('[IntentionService] Using mock getDailyIntentions for date:', targetDate);
        // Return empty array initially - user hasn't made selections yet in mock mode
        return [];
      }

      const { data, error } = await supabase.rpc('get_daily_intentions', {
        p_date: targetDate
      });

      if (error) {
        console.error('Error fetching daily intentions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDailyIntentions:', error);
      throw error;
    }
  }

  /**
   * Get intention statistics for current user
   */
  async getIntentionStats(
    startDate?: string, 
    endDate?: string
  ): Promise<IntentionStats> {
    try {
      const start = startDate ? new Date(startDate).toISOString().split('T')[0] : undefined;
      const end = endDate ? new Date(endDate).toISOString().split('T')[0] : undefined;

      // MOCK AUTH: Return mock stats in development mode
      if (import.meta.env.VITE_MOCK_AUTH === 'true' || import.meta.env.VITE_DEVELOPMENT_MODE === 'true') {
        console.log('[IntentionService] Using mock getIntentionStats');
        return {
          total_days: 30,
          days_with_selections: 25,
          most_selected_being_en: 'Courage',
          most_selected_being_he: 'אומץ',
          selection_streak: 7
        };
      }

      const { data, error } = await supabase.rpc('get_intention_stats', {
        p_start_date: start,
        p_end_date: end
      });

      if (error) {
        console.error('Error fetching intention stats:', error);
        throw error;
      }

      return data?.[0] || {
        total_days: 0,
        days_with_selections: 0,
        selection_streak: 0
      };
    } catch (error) {
      console.error('Error in getIntentionStats:', error);
      throw error;
    }
  }

  /**
   * Delete a custom being (only user's own non-default beings)
   */
  async deleteBeing(beingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('beings')
        .delete()
        .eq('being_id', beingId)
        .eq('is_default', false);

      if (error) {
        console.error('Error deleting being:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteBeing:', error);
      throw error;
    }
  }

  /**
   * Update a custom being (only user's own non-default beings)
   */
  async updateBeing(
    beingId: string, 
    updates: Partial<CreateBeingRequest>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('beings')
        .update(updates)
        .eq('being_id', beingId)
        .eq('is_default', false);

      if (error) {
        console.error('Error updating being:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateBeing:', error);
      throw error;
    }
  }

  /**
   * Get beings selected on specific dates (for calendar view)
   */
  async getSelectionsForDateRange(
    startDate: string, 
    endDate: string
  ): Promise<Record<string, DailyIntention[]>> {
    try {
      const { data, error } = await supabase
        .from('daily_intention_log')
        .select(`
          selection_date,
          beings:being_id (
            being_id,
            label_en,
            label_he
          )
        `)
        .gte('selection_date', startDate)
        .lte('selection_date', endDate)
        .order('selection_date', { ascending: true });

      if (error) {
        console.error('Error fetching date range selections:', error);
        throw error;
      }

      // Group by date
      const grouped: Record<string, DailyIntention[]> = {};
      data?.forEach((item: any) => {
        const date = item.selection_date;
        if (!grouped[date]) {
          grouped[date] = [];
        }
        if (item.beings) {
          grouped[date].push({
            being_id: item.beings.being_id,
            label_en: item.beings.label_en,
            label_he: item.beings.label_he,
            selection_date: date,
            created_at: item.created_at
          });
        }
      });

      return grouped;
    } catch (error) {
      console.error('Error in getSelectionsForDateRange:', error);
      throw error;
    }
  }

  /**
   * Clear all selections for a specific date (for re-selection)
   */
  async clearDailySelections(date?: string): Promise<void> {
    try {
      const targetDate = date ? new Date(date).toISOString().split('T')[0] : 
                         new Date().toISOString().split('T')[0];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('daily_intention_log')
        .delete()
        .eq('user_id', user.user.id)
        .eq('selection_date', targetDate);

      if (error) {
        console.error('Error clearing daily selections:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in clearDailySelections:', error);
      throw error;
    }
  }
}

// ====================== EXPORT SINGLETON ======================

export const intentionService = new IntentionService();
export default intentionService;

// ====================== UTILITY FUNCTIONS ======================

/**
 * Format being label based on current language
 * Works with both Being and DailyIntention types
 */
export const formatBeingLabel = (being: Being | DailyIntention, language: 'en' | 'he' = 'en'): string => {
  return language === 'he' ? being.label_he : being.label_en;
};

/**
 * Validate being data before submission
 */
export const validateBeingData = (data: CreateBeingRequest): string[] => {
  const errors: string[] = [];

  if (!data.label_en?.trim()) {
    errors.push('English label is required');
  }

  if (!data.label_he?.trim()) {
    errors.push('Hebrew label is required');
  }

  if (data.label_en && data.label_en.length > 100) {
    errors.push('English label must be 100 characters or less');
  }

  if (data.label_he && data.label_he.length > 100) {
    errors.push('Hebrew label must be 100 characters or less');
  }

  return errors;
};

/**
 * Check if current date is past cutoff time for selection
 * (e.g., selections should be made before noon)
 */
export const isPastSelectionCutoff = (cutoffHour: number = 12): boolean => {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(cutoffHour, 0, 0, 0);
  
  return now > cutoff;
};

/**
 * Get localized date string for display
 */
export const formatSelectionDate = (
  date: string | Date, 
  language: 'en' | 'he' = 'en'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (language === 'he') {
    return dateObj.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};