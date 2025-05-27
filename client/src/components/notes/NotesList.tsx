import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CoachNote, NoteAccessLevel, NoteCategory } from '../../types/coachNote';
import { coachNoteService, SearchOptions, SearchResult as ApiSearchResult, PaginatedResult } from '../../services/coachNoteService';
import { noteOrganizationService } from '../../services/noteOrganizationService';
import { auditService } from '../../services/auditService';
import { NoteCard } from './NoteCard';
import { NoteEditor } from './NoteEditor';
import { NoteViewer } from './NoteViewer';
import { TagManager } from './TagManager';
import { NoteOrganization } from './NoteOrganization';
import { BulkOperationsPanel } from './BulkOperationsPanel';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { VirtualScrollList, useVirtualScrollList } from '../ui/VirtualScrollList';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { Button } from '../ui/button';

type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'title' | 'usage' | 'relevance';
type SortOrder = 'asc' | 'desc';
type NoteViewMode = 'list' | 'editor' | 'viewer' | 'organization' | 'analytics';

interface TagCategory {
  name: string;
  icon: string;
  color: string;
  tags: string[];
}

interface DateFilter {
  from?: string;
  to?: string;
  preset?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: {
    tags: string[];
    category: string;
    dateFilter: DateFilter;
    clientId?: string;
    sessionId?: string;
  };
  createdAt: string;
}

interface SearchResult extends CoachNote {
  searchScore?: number;
  highlightedContent?: string;
  highlightedTitle?: string;
}

const ITEMS_PER_PAGE = 20; // Increased for better performance
const SEARCH_DEBOUNCE_MS = 300;
const VIRTUAL_ITEM_HEIGHT = 200; // Height for virtual scrolling

export const NotesList: React.FC = () => {
  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor('NotesList', {
    enableMemoryTracking: true,
    enableDetailedTracking: process.env.NODE_ENV === 'development'
  });

  // Virtual scroll list management
  const virtualList = useVirtualScrollList<CoachNote>([]);

  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination for server-side operations
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    pages: 0
  });

  // Server-side search state
  const [serverSearchMode, setServerSearchMode] = useState(false);
  const [lastSearchResult, setLastSearchResult] = useState<ApiSearchResult | null>(null);
  
  // View states
  const [noteViewMode, setNoteViewMode] = useState<NoteViewMode>('list');
  const [selectedNote, setSelectedNote] = useState<CoachNote | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>({ preset: undefined });
  const [clientFilter, setClientFilter] = useState<string>('');
  const [sessionFilter, setSessionFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // UI states
  const [showTagManager, setShowTagManager] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  
  // Bulk operations states
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false);
  const [bulkOperationProgress, setBulkOperationProgress] = useState(0);
  
  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveSearchName, setSaveSearchName] = useState('');

  // Computed values for pagination and search results
  const notes = virtualList.items;
  const searchResults = useMemo(() => {
    if (serverSearchMode && lastSearchResult) {
      return lastSearchResult.notes;
    }
    return notes;
  }, [serverSearchMode, lastSearchResult, notes]);

  const paginatedResults = useMemo(() => {
    if (serverSearchMode && lastSearchResult) {
      return lastSearchResult.notes;
    }
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return searchResults.slice(startIndex, endIndex);
  }, [serverSearchMode, lastSearchResult, searchResults, pagination.page, pagination.limit]);

  const totalPages = Math.ceil(searchResults.length / pagination.limit);
  const currentPage = pagination.page;
  const setCurrentPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Load notes function
  const loadNotes = async () => {
    await loadInitialData();
  };

  // Predefined tag categories for enhanced filtering
  const tagCategories: TagCategory[] = [
    {
      name: 'Goals',
      icon: '🎯',
      color: 'bg-green-100 text-green-800',
      tags: ['goal-setting', 'career-goals', 'personal-goals', 'life-balance']
    },
    {
      name: 'Challenges',
      icon: '⚠️',
      color: 'bg-red-100 text-red-800',
      tags: ['obstacle', 'limiting-belief', 'skill-gap', 'fear', 'procrastination']
    },
    {
      name: 'Breakthroughs',
      icon: '💡',
      color: 'bg-purple-100 text-purple-800',
      tags: ['breakthrough', 'aha-moment', 'mindset-shift', 'confidence-boost', 'clarity']
    },
    {
      name: 'Action Items',
      icon: '✅',
      color: 'bg-blue-100 text-blue-800',
      tags: ['action-items', 'homework', 'follow-up', 'accountability', 'next-steps']
    },
    {
      name: 'Session',
      icon: '📝',
      color: 'bg-gray-100 text-gray-800',
      tags: ['session-summary', 'progress-check', 'strategy', 'tools-techniques']
    }
  ];

  // Date filter presets
  const datePresets = [
    { value: 'today', label: 'Today', days: 0 },
    { value: 'week', label: 'This Week', days: 7 },
    { value: 'month', label: 'This Month', days: 30 },
    { value: 'quarter', label: 'This Quarter', days: 90 },
    { value: 'year', label: 'This Year', days: 365 }
  ];

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get all unique tags, clients, and sessions for filters
  const filterOptions = useMemo(() => {
    const allTags = Array.from(new Set(virtualList.items.flatMap(note => note.tags || []))).sort();
    const allClients = Array.from(new Set(virtualList.items.map(note => note.client).filter(Boolean))).sort();
    const allSessions = Array.from(new Set(virtualList.items.map(note => note.sessionId).filter(Boolean))).sort();
    
    return { allTags, allClients, allSessions };
  }, [virtualList.items]);

  // Get tag usage analytics
  const tagAnalytics = useMemo(() => {
    const tagUsage: Record<string, number> = {};
    virtualList.items.forEach(note => {
      note.tags?.forEach(tag => {
        tagUsage[tag] = (tagUsage[tag] || 0) + 1;
      });
    });
    return tagUsage;
  }, [virtualList.items]);

  useEffect(() => {
    loadInitialData();
    loadCategories();
    loadSavedSearches();
  }, []);

  useEffect(() => {
    if (serverSearchMode) {
      performServerSideSearch();
    } else {
      loadPaginatedNotes();
    }
  }, [debouncedQuery, selectedTags, selectedCategory, dateFilter, clientFilter, sessionFilter, sortBy, sortOrder, pagination.page]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filters change
  }, [debouncedQuery, selectedTags, selectedCategory, dateFilter, clientFilter, sessionFilter]);

  const loadInitialData = async () => {
    const apiCall = performanceMonitor.trackApiCall('load_initial_data');
    try {
      setLoading(true);
      setError(null);
      
      // Preload data for better performance
      await coachNoteService.preloadData();
      
      // Load first page
      await loadPaginatedNotes();
      apiCall.success();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load notes';
      setError(error);
      apiCall.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPaginatedNotes = async () => {
    if (serverSearchMode) return; // Don't load if in search mode
    
    const apiCall = performanceMonitor.trackApiCall('load_paginated_notes');
    try {
      const result = await coachNoteService.getPaginatedNotes({
        page: pagination.page,
        limit: pagination.limit,
        filters: buildFilters()
      });
      
      if (pagination.page === 1) {
        virtualList.reset(result.data);
      } else {
        virtualList.addItems(result.data);
      }
      
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        pages: result.pagination.pages
      }));
      
      apiCall.success();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load notes';
      setError(error);
      apiCall.error(err);
    }
  };

  const performServerSideSearch = async () => {
    const apiCall = performanceMonitor.trackApiCall('server_side_search');
    try {
      const searchOptions: SearchOptions = {
        query: debouncedQuery,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sortBy === 'relevance' ? 'relevance' : sortBy,
        sortOrder,
        ...buildAdvancedFilters()
      };

      const result = await coachNoteService.searchNotes(searchOptions);
      setLastSearchResult(result);
      
      if (pagination.page === 1) {
        virtualList.reset(result.notes);
      } else {
        virtualList.addItems(result.notes);
      }
      
      setPagination(prev => ({
        ...prev,
        total: result.pagination.totalCount,
        pages: result.pagination.totalPages
      }));
      
      apiCall.success();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to search notes';
      setError(error);
      apiCall.error(err);
    }
  };

  const buildFilters = () => {
    const filters: any = {};
    if (clientFilter) filters.clientId = clientFilter;
    if (sessionFilter) filters.sessionId = sessionFilter;
    if (selectedCategory !== 'all') {
      const categoryData = tagCategories.find(cat => cat.name.toLowerCase() === selectedCategory);
      if (categoryData) {
        filters.tags = categoryData.tags.join(',');
      }
    }
    return filters;
  };

  const buildAdvancedFilters = () => {
    const filters: any = {};
    if (clientFilter) filters.coachId = clientFilter;
    if (sessionFilter) filters.sessionId = sessionFilter;
    if (dateFilter.from || dateFilter.to) {
      filters.dateStart = dateFilter.from;
      filters.dateEnd = dateFilter.to;
    }
    return filters;
  };

  const loadCategories = async () => {
    try {
      const allCategories = await noteOrganizationService.getCategories();
      setCategories(allCategories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadSavedSearches = () => {
    try {
      const saved = localStorage.getItem('coachNotes_savedSearches');
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error loading saved searches:', err);
    }
  };

  const saveSavedSearches = (searches: SavedSearch[]) => {
    localStorage.setItem('coachNotes_savedSearches', JSON.stringify(searches));
  };

  // Highlight search terms in text
  const highlightText = useCallback((text: string, query: string): string => {
    if (!query.trim()) return text;
    
    const keywords = query.trim().split(/\s+/).filter(word => word.length > 2);
    if (keywords.length === 0) return text;
    
    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    });
    
    return highlightedText;
  }, []);

  // Calculate search relevance score
  const calculateRelevanceScore = useCallback((note: CoachNote, query: string): number => {
    if (!query.trim()) return 0;
    
    const keywords = query.toLowerCase().trim().split(/\s+/);
    let score = 0;
    
    keywords.forEach(keyword => {
      // Title matches are worth more
      if (note.title && note.title.toLowerCase().includes(keyword)) {
        score += 10;
      }
      
      // Content matches
      if (note.textContent.toLowerCase().includes(keyword)) {
        score += 5;
      }
      
      // Tag matches
      if (note.tags && note.tags.some(tag => tag.toLowerCase().includes(keyword))) {
        score += 3;
      }
    });
    
    return score;
  }, []);

  // Apply date filter
  const applyDateFilter = useCallback((note: CoachNote, filter: DateFilter): boolean => {
    if (!filter.preset && !filter.from && !filter.to) return true;
    
    const noteDate = new Date(note.createdAt);
    const now = new Date();
    
    if (filter.preset && filter.preset !== 'custom') {
      const preset = datePresets.find(p => p.value === filter.preset);
      if (preset) {
        const cutoffDate = new Date(now.getTime() - (preset.days * 24 * 60 * 60 * 1000));
        return noteDate >= cutoffDate;
      }
    }
    
    if (filter.from) {
      const fromDate = new Date(filter.from);
      if (noteDate < fromDate) return false;
    }
    
    if (filter.to) {
      const toDate = new Date(filter.to);
      toDate.setHours(23, 59, 59, 999); // End of day
      if (noteDate > toDate) return false;
    }
    
    return true;
  }, [datePresets]);

  // Note: Server-side search and filtering is now handled by performServerSideSearch() and loadPaginatedNotes()
  // This function is kept for reference but no longer used
  const performSearchAndFilter = useCallback(() => {
    // All search and filtering is now handled server-side for better performance
    console.log('Client-side search disabled - using server-side search for better performance');
  }, []);

  // Current display items (for virtual scrolling or regular display)
  const displayItems = virtualList.items;

  const handleCreateNote = () => {
    setSelectedNote(null);
    setNoteViewMode('editor');
  };

  const handleEditNote = (note: CoachNote) => {
    setSelectedNote(note);
    setNoteViewMode('editor');
  };

  const handleViewNote = (note: CoachNote) => {
    setSelectedNote(note);
    setNoteViewMode('viewer');
  };

  const handleDeleteNote = async (noteId: string) => {
    const apiCall = performanceMonitor.trackApiCall('delete_note');
    try {
      await coachNoteService.deleteNote(noteId);
      
      // Remove from virtual list
      const noteIndex = virtualList.items.findIndex(note => note._id === noteId);
      if (noteIndex !== -1) {
        virtualList.removeItem(noteIndex);
      }
      
      // If we're viewing the deleted note, go back to list
      if (selectedNote && selectedNote._id === noteId) {
        setNoteViewMode('list');
        setSelectedNote(null);
      }
      
      apiCall.success();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete note';
      setError(error);
      apiCall.error(err);
    }
  };

  const handleSaveNote = (savedNote: CoachNote) => {
    if (selectedNote) {
      // Update existing note in virtual list
      const noteIndex = virtualList.items.findIndex(note => note._id === savedNote._id);
      if (noteIndex !== -1) {
        virtualList.updateItem(noteIndex, savedNote);
      }
    } else {
      // Add new note to beginning of virtual list
      virtualList.prependItems([savedNote]);
    }
    
    setNoteViewMode('list');
    setSelectedNote(null);
  };

  const handleCancelEdit = () => {
    setNoteViewMode('list');
    setSelectedNote(null);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    setSelectedTags([]); // Clear individual tag filters when selecting category
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setSelectedCategory('all'); // Clear category filter when selecting individual tags
  };

  const handleDatePreset = (preset: string) => {
    if (preset === 'custom') {
      setDateFilter({ preset: 'custom' });
    } else if (preset === 'all') {
      setDateFilter({ preset: undefined });
    } else {
      setDateFilter({ preset: preset as any });
    }
  };

  const handleSaveSearch = () => {
    if (!saveSearchName.trim()) return;
    
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name: saveSearchName.trim(),
      query: debouncedQuery,
      filters: {
        tags: selectedTags,
        category: selectedCategory,
        dateFilter,
        clientId: clientFilter || undefined,
        sessionId: sessionFilter || undefined
      },
      createdAt: new Date().toISOString()
    };
    
    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    saveSavedSearches(updated);
    setSaveSearchName('');
  };

  const handleLoadSavedSearch = (search: SavedSearch) => {
    setSearchQuery(search.query);
    setSelectedTags(search.filters.tags);
    setSelectedCategory(search.filters.category);
    setDateFilter(search.filters.dateFilter);
    setClientFilter(search.filters.clientId || '');
    setSessionFilter(search.filters.sessionId || '');
    setShowSavedSearches(false);
  };

  const handleDeleteSavedSearch = (searchId: string) => {
    const updated = savedSearches.filter(s => s.id !== searchId);
    setSavedSearches(updated);
    saveSavedSearches(updated);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedCategory('all');
    setDateFilter({ preset: undefined });
    setClientFilter('');
    setSessionFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
    setServerSearchMode(false);
  };

  const hasActiveFilters = () => {
    return debouncedQuery || selectedTags.length > 0 || selectedCategory !== 'all' || 
           dateFilter.preset || dateFilter.from || dateFilter.to || clientFilter || sessionFilter;
  };

  // Bulk operation handlers
  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedNoteIds([]);
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const selectAllNotes = () => {
    const allVisibleNoteIds = displayItems.map(note => note._id);
    setSelectedNoteIds(allVisibleNoteIds);
  };

  const clearSelection = () => {
    setSelectedNoteIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedNoteIds.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedNoteIds.length} note${selectedNoteIds.length > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    let operationId: string | undefined;
    try {
      setBulkOperationInProgress(true);
      setBulkOperationProgress(0);

      // Track bulk operation start
      operationId = await auditService.trackBulkOperation('delete', selectedNoteIds, {
        reason: 'Bulk delete operation'
      });

      for (let i = 0; i < selectedNoteIds.length; i++) {
        await coachNoteService.deleteNote(selectedNoteIds[i]);
        setBulkOperationProgress(((i + 1) / selectedNoteIds.length) * 100);
      }

      // Mark operation as completed
      if (operationId) {
        await auditService.completeBulkOperation(operationId, selectedNoteIds.length, 0);
      }

      // Refresh notes and clear selection
      await loadInitialData();
      setSelectedNoteIds([]);
      setBulkMode(false);
    } catch (err) {
      // Mark operation as failed
      if (operationId) {
        await auditService.failBulkOperation(operationId, err instanceof Error ? err.message : 'Unknown error');
      }
      setError(err instanceof Error ? err.message : 'Failed to delete notes');
    } finally {
      setBulkOperationInProgress(false);
      setBulkOperationProgress(0);
    }
  };

  const handleBulkTagAdd = async (tagsToAdd: string[]) => {
    if (selectedNoteIds.length === 0 || tagsToAdd.length === 0) return;

    try {
      setBulkOperationInProgress(true);
      setBulkOperationProgress(0);

      for (let i = 0; i < selectedNoteIds.length; i++) {
        const note = notes.find(n => n._id === selectedNoteIds[i]);
        if (note) {
          const existingTags = note.tags || [];
          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]));
          await coachNoteService.updateNote(note._id, { ...note, tags: newTags });
        }
        setBulkOperationProgress(((i + 1) / selectedNoteIds.length) * 100);
      }

      await loadNotes();
      setSelectedNoteIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tags');
    } finally {
      setBulkOperationInProgress(false);
      setBulkOperationProgress(0);
    }
  };

  const handleBulkTagRemove = async (tagsToRemove: string[]) => {
    if (selectedNoteIds.length === 0 || tagsToRemove.length === 0) return;

    try {
      setBulkOperationInProgress(true);
      setBulkOperationProgress(0);

      for (let i = 0; i < selectedNoteIds.length; i++) {
        const note = notes.find(n => n._id === selectedNoteIds[i]);
        if (note) {
          const newTags = (note.tags || []).filter(tag => !tagsToRemove.includes(tag));
          await coachNoteService.updateNote(note._id, { ...note, tags: newTags });
        }
        setBulkOperationProgress(((i + 1) / selectedNoteIds.length) * 100);
      }

      await loadNotes();
      setSelectedNoteIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tags');
    } finally {
      setBulkOperationInProgress(false);
      setBulkOperationProgress(0);
    }
  };

  const handleBulkExport = async (format: 'json' | 'csv' | 'pdf') => {
    if (selectedNoteIds.length === 0) return;

    try {
      setBulkOperationInProgress(true);
      const selectedNotes = notes.filter(note => selectedNoteIds.includes(note._id));
      
      // Track the export operation
      await auditService.trackNoteExport(selectedNoteIds, format);
      
      if (format === 'json') {
        const dataStr = JSON.stringify(selectedNotes, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `coach-notes-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const csvHeaders = ['Title', 'Content', 'Tags', 'Client', 'Session', 'Created', 'Updated'];
        const csvRows = selectedNotes.map(note => [
          note.title || 'Untitled',
          note.textContent.replace(/"/g, '""'),
          (note.tags || []).join('; '),
          note.client || '',
          note.sessionId || '',
          new Date(note.createdAt).toLocaleDateString(),
          new Date(note.updatedAt).toLocaleDateString()
        ]);
        
        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');
        
        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `coach-notes-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }
      // PDF export would require additional library like jsPDF
      
      setSelectedNoteIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export notes');
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const handleBulkArchive = async (reason?: string) => {
    if (selectedNoteIds.length === 0) return;
    
    const activeNotes = notes.filter(note => 
      selectedNoteIds.includes(note._id) && !note.isArchived
    );
    
    if (activeNotes.length === 0) return;
    
    const confirmMessage = `Are you sure you want to archive ${activeNotes.length} note${activeNotes.length > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) return;

    let operationId: string | undefined;
    try {
      setBulkOperationInProgress(true);
      setBulkOperationProgress(0);

      // Track bulk operation start
      operationId = await auditService.trackBulkOperation('archive', activeNotes.map(n => n._id), {
        reason: reason || 'Bulk archive operation',
        noteCount: activeNotes.length
      });

      for (let i = 0; i < activeNotes.length; i++) {
        const updateData = {
          isArchived: true,
          archiveReason: reason
        };
        await coachNoteService.updateNote(activeNotes[i]._id, updateData);
        setBulkOperationProgress(((i + 1) / activeNotes.length) * 100);
      }

      // Mark operation as completed
      if (operationId) {
        await auditService.completeBulkOperation(operationId, activeNotes.length, 0);
      }

      await loadNotes();
      setSelectedNoteIds([]);
    } catch (err) {
      // Mark operation as failed
      if (operationId) {
        await auditService.failBulkOperation(operationId, err instanceof Error ? err.message : 'Unknown error');
      }
      setError(err instanceof Error ? err.message : 'Failed to archive notes');
    } finally {
      setBulkOperationInProgress(false);
      setBulkOperationProgress(0);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedNoteIds.length === 0) return;
    
    const archivedNotes = notes.filter(note => 
      selectedNoteIds.includes(note._id) && note.isArchived
    );
    
    if (archivedNotes.length === 0) return;

    try {
      setBulkOperationInProgress(true);
      setBulkOperationProgress(0);

      for (let i = 0; i < archivedNotes.length; i++) {
        const updateData = {
          isArchived: false,
          archiveReason: undefined
        };
        await coachNoteService.updateNote(archivedNotes[i]._id, updateData);
        setBulkOperationProgress(((i + 1) / archivedNotes.length) * 100);
      }

      await loadNotes();
      setSelectedNoteIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore notes');
    } finally {
      setBulkOperationInProgress(false);
      setBulkOperationProgress(0);
    }
  };

  const handleBulkPrivacyChange = async (accessLevel: NoteAccessLevel, reason?: string) => {
    if (selectedNoteIds.length === 0) return;

    const confirmMessage = `Are you sure you want to change the privacy level of ${selectedNoteIds.length} note${selectedNoteIds.length > 1 ? 's' : ''} to ${accessLevel}?`;
    if (!confirm(confirmMessage)) return;

    try {
      setBulkOperationInProgress(true);
      setBulkOperationProgress(0);

      for (let i = 0; i < selectedNoteIds.length; i++) {
        const note = notes.find(n => n._id === selectedNoteIds[i]);
        if (note) {
          const updateData = {
            accessLevel,
            privacySettings: {
              ...note.privacySettings,
              accessLevel
            }
          };
          await coachNoteService.updateNote(note._id, updateData);
        }
        setBulkOperationProgress(((i + 1) / selectedNoteIds.length) * 100);
      }

      await loadNotes();
      setSelectedNoteIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update privacy settings');
    } finally {
      setBulkOperationInProgress(false);
      setBulkOperationProgress(0);
    }
  };

  const handleBulkCategoryAssign = async (categoryId: string, reason?: string) => {
    if (selectedNoteIds.length === 0) return;

    const category = categories.find(c => c._id === categoryId);
    if (!category) return;

    const confirmMessage = `Are you sure you want to assign the category "${category.name}" to ${selectedNoteIds.length} note${selectedNoteIds.length > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) return;

    try {
      setBulkOperationInProgress(true);
      setBulkOperationProgress(0);

      for (let i = 0; i < selectedNoteIds.length; i++) {
        const updateData = {
          categoryId
        };
        await coachNoteService.updateNote(selectedNoteIds[i], updateData);
        setBulkOperationProgress(((i + 1) / selectedNoteIds.length) * 100);
      }

      await loadNotes();
      setSelectedNoteIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign category');
    } finally {
      setBulkOperationInProgress(false);
      setBulkOperationProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading your notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={loadNotes} className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Editor view
  if (noteViewMode === 'editor') {
    return (
      <NoteEditor
        note={selectedNote || undefined}
        onSave={handleSaveNote}
        onCancel={handleCancelEdit}
      />
    );
  }

  // Viewer view
  if (noteViewMode === 'viewer' && selectedNote) {
    return (
      <NoteViewer
        note={selectedNote}
        onEdit={() => setNoteViewMode('editor')}
        onDelete={() => handleDeleteNote(selectedNote._id)}
        onClose={() => setNoteViewMode('list')}
      />
    );
  }

  // Organization view
  if (noteViewMode === 'organization') {
    return (
      <NoteOrganization
        onNoteSelect={(noteId) => {
          const note = notes.find(n => n._id === noteId);
          if (note) {
            setSelectedNote(note);
            setNoteViewMode('viewer');
          }
        }}
        selectedNoteIds={[]}
        onSelectionChange={() => {}}
        onClose={() => {
          setNoteViewMode('list');
          loadNotes(); // Refresh notes in case they were organized
        }}
      />
    );
  }

  // Analytics view
  if (noteViewMode === 'analytics') {
    return (
      <div className="space-y-6">
        {/* Analytics Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Coach Notes Analytics</h2>
            <p className="text-gray-600 mt-1">
              Insights and analytics for your {notes.length} coaching notes
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setNoteViewMode('list')}
          >
            ← Back to Notes
          </Button>
        </div>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard
          notes={notes}
          onFilterChange={(filters) => {
            // Handle analytics filter changes if needed
            console.log('Analytics filters changed:', filters);
          }}
          onInsightAction={(insight) => {
            // Handle insight actions (e.g., apply filters based on insights)
            if (insight.action) {
              switch (insight.action.type) {
                case 'filter':
                  if (insight.action.data.tags) {
                    setSelectedTags(insight.action.data.tags);
                    setNoteViewMode('list');
                  }
                  if (insight.action.data.clientIds) {
                    setClientFilter(insight.action.data.clientIds[0] || '');
                    setNoteViewMode('list');
                  }
                  break;
                case 'create':
                  // Handle create actions (e.g., set reminders, goals)
                  console.log('Create action:', insight.action.data);
                  break;
                case 'view':
                  // Handle view actions
                  console.log('View action:', insight.action.data);
                  break;
                case 'export':
                  // Handle export actions
                  console.log('Export action:', insight.action.data);
                  break;
              }
            }
          }}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Coach Notes</h2>
          <p className="text-gray-600 mt-1">
            {searchResults.length} of {notes.length} notes
            {hasActiveFilters() ? ' (filtered)' : ''}
            {bulkMode && selectedNoteIds.length > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                • {selectedNoteIds.length} selected
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={bulkMode ? "default" : "outline"}
            onClick={toggleBulkMode}
          >
            {bulkMode ? '✓ Bulk Mode' : '☐ Select'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setNoteViewMode('organization')}
          >
            📁 Organize
          </Button>
          <Button
            variant="outline"
            onClick={() => setNoteViewMode('analytics')}
          >
            📊 Analytics
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSavedSearches(true)}
          >
            📚 Saved Searches
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTagManager(true)}
          >
            🏷️ Manage Tags
          </Button>
          <Button onClick={handleCreateNote}>
            + New Note
          </Button>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      {bulkMode && selectedNoteIds.length > 0 && (
        <BulkOperationsPanel
          selectedNoteIds={selectedNoteIds}
          notes={notes}
          categories={categories}
          onBulkDelete={handleBulkDelete}
          onBulkTagAdd={handleBulkTagAdd}
          onBulkTagRemove={handleBulkTagRemove}
          onBulkExport={handleBulkExport}
          onBulkArchive={handleBulkArchive}
          onBulkRestore={handleBulkRestore}
          onBulkPrivacyChange={handleBulkPrivacyChange}
          onBulkCategoryAssign={handleBulkCategoryAssign}
          onSelectAll={selectAllNotes}
          onClearSelection={clearSelection}
          totalVisibleNotes={paginatedResults.length}
          operationInProgress={bulkOperationInProgress}
          operationProgress={bulkOperationProgress}
        />
      )}

      {/* Quick Category Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Filters by Category</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 All Categories
          </button>
          {tagCategories.map(category => {
            const categoryNotes = notes.filter(note =>
              note.tags && note.tags.some(tag => category.tags.includes(tag))
            ).length;
            
            return (
              <button
                key={category.name}
                onClick={() => handleCategoryFilter(category.name.toLowerCase())}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.name.toLowerCase()
                    ? 'bg-blue-600 text-white'
                    : `${category.color} hover:opacity-80`
                }`}
              >
                {category.icon} {category.name} ({categoryNotes})
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">Search & Filter</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
            </button>
            {debouncedQuery && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Sort: {sortBy === 'relevance' ? 'Relevance' : sortBy}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value && sortBy !== 'relevance') {
                    setSortBy('relevance');
                  }
                }}
                placeholder="Search notes, titles, tags..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={clearFilters}
              disabled={!hasActiveFilters()}
              className="flex-1"
            >
              Clear Filters
            </Button>
            {hasActiveFilters() && (
              <Button
                variant="outline"
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim()}
                title="Save current search"
              >
                💾
              </Button>
            )}
          </div>
        </div>

        {/* Save Search Input */}
        {hasActiveFilters() && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex gap-2">
              <input
                type="text"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder="Name this search to save it..."
                className="flex-1 px-3 py-1 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSaveSearch()}
              />
              <Button
                size="sm"
                onClick={handleSaveSearch}
                disabled={!saveSearchName.trim()}
              >
                Save Search
              </Button>
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            {/* Date Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                <button
                  onClick={() => handleDatePreset('all')}
                  className={`px-3 py-2 text-xs rounded-md transition-colors ${
                    !dateFilter.preset ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Time
                </button>
                {datePresets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => handleDatePreset(preset.value)}
                    className={`px-3 py-2 text-xs rounded-md transition-colors ${
                      dateFilter.preset === preset.value ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => handleDatePreset('custom')}
                  className={`px-3 py-2 text-xs rounded-md transition-colors ${
                    dateFilter.preset === 'custom' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Custom Range
                </button>
              </div>
              
              {dateFilter.preset === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={dateFilter.from || ''}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      value={dateFilter.to || ''}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Client and Session Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Clients</option>
                  {filterOptions.allClients.map(clientId => (
                    <option key={clientId} value={clientId}>
                      Client {clientId.slice(-8)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                <select
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Sessions</option>
                  {filterOptions.allSessions.map(sessionId => (
                    <option key={sessionId} value={sessionId}>
                      Session {sessionId.slice(-8)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date">Date Created</option>
                  <option value="title">Title</option>
                  <option value="usage">Tag Usage</option>
                  {debouncedQuery && <option value="relevance">Relevance</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
                <div className="flex rounded-md border border-gray-300">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex-1 px-3 py-2 text-sm font-medium ${
                      viewMode === 'grid'
                        ? 'bg-blue-50 text-blue-700 border-r border-gray-300'
                        : 'text-gray-700 hover:bg-gray-50 border-r border-gray-300'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 px-3 py-2 text-sm font-medium ${
                      viewMode === 'list'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            {/* Individual Tag Filters */}
            {filterOptions.allTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Individual Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.allTags.slice(0, 20).map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      #{tag} ({tagAnalytics[tag] || 0})
                    </button>
                  ))}
                  {filterOptions.allTags.length > 20 && (
                    <span className="text-sm text-gray-500 px-2 py-1">
                      +{filterOptions.allTags.length - 20} more tags...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">Active Filters</h4>
              <div className="flex flex-wrap gap-2 mt-1">
                {debouncedQuery && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Search: "{debouncedQuery}"
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Category: {selectedCategory}
                  </span>
                )}
                {selectedTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    #{tag}
                    <button
                      onClick={() => toggleTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {dateFilter.preset && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Date: {dateFilter.preset === 'custom' ? 'Custom Range' : datePresets.find(p => p.value === dateFilter.preset)?.label}
                  </span>
                )}
                {clientFilter && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Client: {clientFilter.slice(-8)}
                  </span>
                )}
                {sessionFilter && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Session: {sessionFilter.slice(-8)}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Results Count and Pagination Info */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          Showing {paginatedResults.length} of {searchResults.length} notes
          {searchResults.length !== notes.length && ` (${notes.length} total)`}
        </div>
        {totalPages > 1 && (
          <div>
            Page {currentPage} of {totalPages}
          </div>
        )}
      </div>

      {/* Notes List/Grid */}
      {paginatedResults.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {notes.length === 0 ? 'No notes yet' : 'No notes match your filters'}
          </h3>
          <p className="text-gray-600 mb-4">
            {notes.length === 0 
              ? 'Create your first coaching note to get started.'
              : 'Try adjusting your search or filters.'
            }
          </p>
          {notes.length === 0 && (
            <Button onClick={handleCreateNote}>
              Create Your First Note
            </Button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {paginatedResults.map(note => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={handleEditNote}
              onDelete={handleDeleteNote}
              onView={handleViewNote}
              compact={viewMode === 'list'}
              highlightedContent={(note as SearchResult).highlightedContent}
              highlightedTitle={(note as SearchResult).highlightedTitle}
              selectionMode={bulkMode}
              isSelected={selectedNoteIds.includes(note._id)}
              onToggleSelection={toggleNoteSelection}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </Button>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </Button>
        </div>
      )}

      {/* Saved Searches Modal */}
      {showSavedSearches && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Saved Searches</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowSavedSearches(false)}>
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {savedSearches.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-3">🔍</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No saved searches</h4>
                  <p className="text-gray-600">Save your current search to quickly access it later.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedSearches.map(search => (
                    <div key={search.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{search.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {search.query && `Query: "${search.query}"`}
                            {search.filters.category !== 'all' && ` • Category: ${search.filters.category}`}
                            {search.filters.tags.length > 0 && ` • Tags: ${search.filters.tags.join(', ')}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Saved {new Date(search.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoadSavedSearch(search)}
                          >
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSavedSearch(search.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tag Manager Modal */}
      {showTagManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <TagManager
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              onClose={() => setShowTagManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 