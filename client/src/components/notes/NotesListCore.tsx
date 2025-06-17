import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CoachNote, NoteViewMode } from '../../types/coachNote';
import { coachNoteService } from '../../services/coachNoteService';
import { NoteCard } from './NoteCard';
import { VirtualScrollList, useVirtualScrollList } from '../ui/VirtualScrollList';
import { Button } from '../ui/button';

const ITEMS_PER_PAGE = 20;

interface NotesListCoreProps {
  onViewModeChange: (mode: NoteViewMode) => void;
  onNoteSelect: (note: CoachNote) => void;
  onTagManagerToggle: (show: boolean) => void;
}

/**
 * Core notes list component with essential functionality
 * Heavy features like analytics, organization, etc. are lazy loaded separately
 */
export const NotesListCore: React.FC<NotesListCoreProps> = ({
  onViewModeChange,
  onNoteSelect,
  onTagManagerToggle
}) => {
  const virtualList = useVirtualScrollList<CoachNote>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Load notes
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await coachNoteService.getPaginatedNotes({
        page: currentPage,
        limit: ITEMS_PER_PAGE
      });
      virtualList.setItems(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [currentPage, virtualList]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Filter notes based on search and tags
  const filteredNotes = useMemo(() => {
    let filtered = virtualList.items;
    
    if (searchQuery) {
      filtered = filtered.filter(note =>
        note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.textContent.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note =>
        note.tags?.some(tag => selectedTags.includes(tag))
      );
    }
    
    return filtered;
  }, [virtualList.items, searchQuery, selectedTags]);

  const handleCreateNote = useCallback(() => {
    onViewModeChange('editor');
  }, [onViewModeChange]);

  const handleEditNote = useCallback((note: CoachNote) => {
    onNoteSelect(note);
    onViewModeChange('editor');
  }, [onNoteSelect, onViewModeChange]);

  const handleViewNote = useCallback((note: CoachNote) => {
    onNoteSelect(note);
    onViewModeChange('viewer');
  }, [onNoteSelect, onViewModeChange]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      await coachNoteService.deleteNote(noteId);
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  }, [loadNotes]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Coach Notes</h2>
          <p className="text-gray-600 mt-1">
            {filteredNotes.length} of {virtualList.items.length} notes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onViewModeChange('organization')}
          >
            📁 Organize
          </Button>
          <Button
            variant="outline"
            onClick={() => onViewModeChange('analytics')}
          >
            📊 Analytics
          </Button>
          <Button
            variant="outline"
            onClick={() => onTagManagerToggle(true)}
          >
            🏷️ Manage Tags
          </Button>
          <Button onClick={handleCreateNote}>
            + New Note
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {selectedTags.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setSelectedTags([])}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {virtualList.items.length === 0 ? 'No notes yet' : 'No notes match your filters'}
          </h3>
          <p className="text-gray-600 mb-4">
            {virtualList.items.length === 0 
              ? 'Create your first coaching note to get started.'
              : 'Try adjusting your search or filters.'
            }
          </p>
          {virtualList.items.length === 0 && (
            <Button onClick={handleCreateNote}>
              Create Your First Note
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map(note => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={handleEditNote}
              onDelete={handleDeleteNote}
              onView={handleViewNote}
              compact={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}; 