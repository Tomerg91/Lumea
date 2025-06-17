import { supabase } from '../lib/supabase';
import { 
  Reflection, 
  ReflectionInsert, 
  ReflectionUpdate,
  MoodType 
} from '../../../shared/types/database';

export interface CreateTextReflectionData {
  content: string;
  mood?: MoodType;
  session_id?: string;
}

export interface UpdateTextReflectionData {
  content?: string;
  mood?: MoodType;
  session_id?: string;
}

export class SimpleReflectionService {
  /**
   * Create a new text reflection
   */
  static async createReflection(data: CreateTextReflectionData): Promise<Reflection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const reflectionData: ReflectionInsert = {
      content: data.content,
      user_id: user.id,
      mood: data.mood || null,
      session_id: data.session_id || null,
    };

    const { data: reflection, error } = await supabase
      .from('reflections')
      .insert(reflectionData)
      .select()
      .single();

    if (error) throw error;
    return reflection;
  }

  /**
   * Update an existing reflection
   */
  static async updateReflection(
    reflectionId: string, 
    data: UpdateTextReflectionData
  ): Promise<Reflection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: ReflectionUpdate = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: reflection, error } = await supabase
      .from('reflections')
      .update(updateData)
      .eq('id', reflectionId)
      .eq('user_id', user.id) // Ensure user owns the reflection
      .select()
      .single();

    if (error) throw error;
    return reflection;
  }

  /**
   * Get reflection by ID
   */
  static async getReflection(reflectionId: string): Promise<Reflection | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: reflection, error } = await supabase
      .from('reflections')
      .select('*')
      .eq('id', reflectionId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return reflection;
  }

  /**
   * Get user's reflections with optional filtering
   */
  static async getUserReflections(options: {
    limit?: number;
    offset?: number;
    session_id?: string;
    mood?: MoodType;
  } = {}): Promise<{ reflections: Reflection[]; count: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('reflections')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (options.session_id) {
      query = query.eq('session_id', options.session_id);
    }

    if (options.mood) {
      query = query.eq('mood', options.mood);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data: reflections, error, count } = await query;

    if (error) throw error;
    return { reflections: reflections || [], count: count || 0 };
  }

  /**
   * Delete a reflection
   */
  static async deleteReflection(reflectionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('reflections')
      .delete()
      .eq('id', reflectionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get user's sessions for reflection association
   */
  static async getUserSessions(): Promise<Array<{ id: string; date: string; status: string }>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, date, status')
      .eq('client_id', user.id)
      .order('date', { ascending: false })
      .limit(20);

    if (error) throw error;
    return sessions || [];
  }
} 