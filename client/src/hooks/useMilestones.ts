import { useState, useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '../contexts/AuthContext';
import {
  Milestone,
  MilestoneCategory,
  MilestoneProgress,
  MilestoneStats,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  CreateMilestoneCategoryRequest,
  UpdateMilestoneCategoryRequest,
  RecordMilestoneProgressRequest,
  MilestoneFilters
} from '../types/milestone';

export interface UseMilestonesReturn {
  // Data
  milestones: Milestone[];
  categories: MilestoneCategory[];
  stats: MilestoneStats | null;
  
  // Loading states
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  
  // Actions
  createMilestone: (data: CreateMilestoneRequest) => Promise<Milestone>;
  updateMilestone: (id: string, data: UpdateMilestoneRequest) => Promise<Milestone>;
  deleteMilestone: (id: string) => Promise<void>;
  recordProgress: (data: RecordMilestoneProgressRequest) => Promise<MilestoneProgress>;
  createCategory: (data: CreateMilestoneCategoryRequest) => Promise<MilestoneCategory>;
  updateCategory: (id: string, data: UpdateMilestoneCategoryRequest) => Promise<MilestoneCategory>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Queries
  getMilestone: (id: string) => Promise<Milestone | null>;
  getMilestonesByClient: (clientId: string) => Promise<Milestone[]>;
  searchMilestones: (filters: MilestoneFilters) => Milestone[];
  
  // Utils
  refreshData: () => Promise<void>;
}

export const useMilestones = (clientId?: string): UseMilestonesReturn => {
  const supabase = useSupabaseClient();
  const { profile } = useAuth();
  
  // State
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [categories, setCategories] = useState<MilestoneCategory[]>([]);
  const [stats, setStats] = useState<MilestoneStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch milestones
  const fetchMilestones = useCallback(async () => {
    if (!profile?.id) return;

    try {
      let query = supabase
        .from('milestones')
        .select(`
          *,
          category:milestone_categories(*),
          progress:milestone_progress(*)
        `)
        .order('created_at', { ascending: false });

      // Filter by client if specified
      if (clientId) {
        query = query.eq('client_id', clientId);
      } else if (profile.role === 'coach') {
        query = query.eq('coach_id', profile.id);
      } else {
        query = query.eq('client_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedMilestones: Milestone[] = (data || []).map(milestone => ({
        ...milestone,
        createdAt: milestone.created_at,
        updatedAt: milestone.updated_at,
        targetDate: milestone.target_date,
        clientId: milestone.client_id,
        coachId: milestone.coach_id,
        categoryId: milestone.category_id,
        completedAt: milestone.completed_at,
        progress: (milestone.progress || []).map((p: any) => ({
          ...p,
          milestoneId: p.milestone_id,
          progressPercent: p.progress_percent,
          recordedBy: p.recorded_by,
          recordedAt: p.recorded_at,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }))
      }));

      setMilestones(formattedMilestones);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    }
  }, [supabase, profile?.id, profile?.role, clientId]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!profile?.id || profile.role !== 'coach') return;

    try {
      const { data, error } = await supabase
        .from('milestone_categories')
        .select('*')
        .eq('coach_id', profile.id)
        .order('name');

      if (error) throw error;

      const formattedCategories: MilestoneCategory[] = (data || []).map(category => ({
        ...category,
        coachId: category.coach_id,
        isDefault: category.is_default,
        createdAt: category.created_at,
        updatedAt: category.updated_at
      }));

      setCategories(formattedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [supabase, profile?.id, profile?.role]);

  // Calculate stats
  const calculateStats = useCallback((milestoneList: Milestone[]): MilestoneStats => {
    const now = new Date();
    const total = milestoneList.length;
    const active = milestoneList.filter(m => m.status === 'active').length;
    const completed = milestoneList.filter(m => m.status === 'completed').length;
    const paused = milestoneList.filter(m => m.status === 'paused').length;
    const cancelled = milestoneList.filter(m => m.status === 'cancelled').length;
    const overdue = milestoneList.filter(m => 
      m.targetDate && 
      new Date(m.targetDate) < now && 
      m.status !== 'completed'
    ).length;

    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    const averageProgress = total > 0 
      ? milestoneList.reduce((acc, m) => {
          const latestProgress = m.progress[m.progress.length - 1];
          return acc + (latestProgress?.progressPercent || 0);
        }, 0) / total
      : 0;

    return {
      total,
      active,
      completed,
      paused,
      cancelled,
      overdue,
      completionRate,
      averageProgress
    };
  }, []);

  // Create milestone
  const createMilestone = useCallback(async (data: CreateMilestoneRequest): Promise<Milestone> => {
    if (!profile?.id) throw new Error('User not authenticated');
    
    setCreating(true);
    try {
      const { data: milestone, error } = await supabase
        .from('milestones')
        .insert({
          title: data.title,
          description: data.description,
          target_date: data.targetDate,
          priority: data.priority,
          client_id: data.clientId,
          coach_id: profile.id,
          category_id: data.categoryId,
          notes: data.notes,
          tags: data.tags || []
        })
        .select(`
          *,
          category:milestone_categories(*),
          progress:milestone_progress(*)
        `)
        .single();

      if (error) throw error;

      const formattedMilestone: Milestone = {
        ...milestone,
        createdAt: milestone.created_at,
        updatedAt: milestone.updated_at,
        targetDate: milestone.target_date,
        clientId: milestone.client_id,
        coachId: milestone.coach_id,
        categoryId: milestone.category_id,
        completedAt: milestone.completed_at,
        progress: []
      };

      setMilestones(prev => [formattedMilestone, ...prev]);
      return formattedMilestone;
    } finally {
      setCreating(false);
    }
  }, [supabase, profile?.id]);

  // Update milestone
  const updateMilestone = useCallback(async (id: string, data: UpdateMilestoneRequest): Promise<Milestone> => {
    setUpdating(true);
    try {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.targetDate !== undefined) updateData.target_date = data.targetDate;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.tags !== undefined) updateData.tags = data.tags;

      const { data: milestone, error } = await supabase
        .from('milestones')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          category:milestone_categories(*),
          progress:milestone_progress(*)
        `)
        .single();

      if (error) throw error;

      const formattedMilestone: Milestone = {
        ...milestone,
        createdAt: milestone.created_at,
        updatedAt: milestone.updated_at,
        targetDate: milestone.target_date,
        clientId: milestone.client_id,
        coachId: milestone.coach_id,
        categoryId: milestone.category_id,
        completedAt: milestone.completed_at,
        progress: (milestone.progress || []).map((p: any) => ({
          ...p,
          milestoneId: p.milestone_id,
          progressPercent: p.progress_percent,
          recordedBy: p.recorded_by,
          recordedAt: p.recorded_at,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }))
      };

      setMilestones(prev => prev.map(m => m.id === id ? formattedMilestone : m));
      return formattedMilestone;
    } finally {
      setUpdating(false);
    }
  }, [supabase]);

  // Delete milestone
  const deleteMilestone = useCallback(async (id: string): Promise<void> => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMilestones(prev => prev.filter(m => m.id !== id));
    } finally {
      setDeleting(false);
    }
  }, [supabase]);

  // Record progress
  const recordProgress = useCallback(async (data: RecordMilestoneProgressRequest): Promise<MilestoneProgress> => {
    if (!profile?.id) throw new Error('User not authenticated');

    try {
      const { data: progress, error } = await supabase
        .from('milestone_progress')
        .insert({
          milestone_id: data.milestoneId,
          progress_percent: data.progressPercent,
          notes: data.notes,
          evidence: data.evidence,
          session_id: data.sessionId,
          recorded_by: profile.id
        })
        .select('*')
        .single();

      if (error) throw error;

      const formattedProgress: MilestoneProgress = {
        ...progress,
        milestoneId: progress.milestone_id,
        progressPercent: progress.progress_percent,
        recordedBy: progress.recorded_by,
        recordedAt: progress.recorded_at,
        createdAt: progress.created_at,
        updatedAt: progress.updated_at
      };

      // Update the milestone in state
      setMilestones(prev => prev.map(m => 
        m.id === data.milestoneId 
          ? { ...m, progress: [...m.progress, formattedProgress] }
          : m
      ));

      return formattedProgress;
    } catch (error) {
      console.error('Error recording progress:', error);
      throw error;
    }
  }, [supabase, profile?.id]);

  // Create category
  const createCategory = useCallback(async (data: CreateMilestoneCategoryRequest): Promise<MilestoneCategory> => {
    if (!profile?.id) throw new Error('User not authenticated');

    try {
      const { data: category, error } = await supabase
        .from('milestone_categories')
        .insert({
          name: data.name,
          description: data.description,
          color: data.color || '#3B82F6',
          icon: data.icon,
          coach_id: profile.id,
          is_default: false
        })
        .select('*')
        .single();

      if (error) throw error;

      const formattedCategory: MilestoneCategory = {
        ...category,
        coachId: category.coach_id,
        isDefault: category.is_default,
        createdAt: category.created_at,
        updatedAt: category.updated_at
      };

      setCategories(prev => [...prev, formattedCategory]);
      return formattedCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }, [supabase, profile?.id]);

  // Update category
  const updateCategory = useCallback(async (id: string, data: UpdateMilestoneCategoryRequest): Promise<MilestoneCategory> => {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.icon !== undefined) updateData.icon = data.icon;

      const { data: category, error } = await supabase
        .from('milestone_categories')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      const formattedCategory: MilestoneCategory = {
        ...category,
        coachId: category.coach_id,
        isDefault: category.is_default,
        createdAt: category.created_at,
        updatedAt: category.updated_at
      };

      setCategories(prev => prev.map(c => c.id === id ? formattedCategory : c));
      return formattedCategory;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }, [supabase]);

  // Delete category
  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('milestone_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }, [supabase]);

  // Get single milestone
  const getMilestone = useCallback(async (id: string): Promise<Milestone | null> => {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select(`
          *,
          category:milestone_categories(*),
          progress:milestone_progress(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        targetDate: data.target_date,
        clientId: data.client_id,
        coachId: data.coach_id,
        categoryId: data.category_id,
        completedAt: data.completed_at,
        progress: (data.progress || []).map((p: any) => ({
          ...p,
          milestoneId: p.milestone_id,
          progressPercent: p.progress_percent,
          recordedBy: p.recorded_by,
          recordedAt: p.recorded_at,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }))
      };
    } catch (error) {
      console.error('Error fetching milestone:', error);
      return null;
    }
  }, [supabase]);

  // Get milestones by client
  const getMilestonesByClient = useCallback(async (clientId: string): Promise<Milestone[]> => {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select(`
          *,
          category:milestone_categories(*),
          progress:milestone_progress(*)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(milestone => ({
        ...milestone,
        createdAt: milestone.created_at,
        updatedAt: milestone.updated_at,
        targetDate: milestone.target_date,
        clientId: milestone.client_id,
        coachId: milestone.coach_id,
        categoryId: milestone.category_id,
        completedAt: milestone.completed_at,
        progress: (milestone.progress || []).map((p: any) => ({
          ...p,
          milestoneId: p.milestone_id,
          progressPercent: p.progress_percent,
          recordedBy: p.recorded_by,
          recordedAt: p.recorded_at,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }))
      }));
    } catch (error) {
      console.error('Error fetching milestones by client:', error);
      return [];
    }
  }, [supabase]);

  // Search milestones
  const searchMilestones = useCallback((filters: MilestoneFilters): Milestone[] => {
    let filtered = [...milestones];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower) ||
        m.notes?.toLowerCase().includes(searchLower) ||
        m.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(m => filters.status!.includes(m.status));
    }

    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter(m => filters.priority!.includes(m.priority));
    }

    if (filters.categoryId) {
      filtered = filtered.filter(m => m.categoryId === filters.categoryId);
    }

    if (filters.clientId) {
      filtered = filtered.filter(m => m.clientId === filters.clientId);
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      filtered = filtered.filter(m => {
        if (!m.targetDate) return false;
        const targetDate = new Date(m.targetDate);
        return targetDate >= start && targetDate <= end;
      });
    }

    return filtered;
  }, [milestones]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMilestones(),
        fetchCategories()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchMilestones, fetchCategories]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Update stats when milestones change
  useEffect(() => {
    setStats(calculateStats(milestones));
  }, [milestones, calculateStats]);

  return {
    // Data
    milestones,
    categories,
    stats,
    
    // Loading states
    loading,
    creating,
    updating,
    deleting,
    
    // Actions
    createMilestone,
    updateMilestone,
    deleteMilestone,
    recordProgress,
    createCategory,
    updateCategory,
    deleteCategory,
    
    // Queries
    getMilestone,
    getMilestonesByClient,
    searchMilestones,
    
    // Utils
    refreshData
  };
}; 