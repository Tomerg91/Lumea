import React, { useState, useEffect } from 'react';
import { CoachNote } from '../../types/coachNote';
import { coachNoteService } from '../../services/coachNoteService';
import { NoteCard } from './NoteCard';
import { NoteEditor } from './NoteEditor';
import { NoteViewer } from './NoteViewer';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';

interface ClientNotesViewProps {
  clientId: string;
  clientName: string;
  className?: string;
}

type ViewMode = 'list' | 'editor' | 'viewer';

export const ClientNotesView: React.FC<ClientNotesViewProps> = ({
  clientId,
  clientName,
  className = ''
}) => {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<CoachNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = useState<CoachNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get all unique tags from notes
  const allTags = Array.from(
    new Set(notes.flatMap(note => note.tags || []))
  ).sort();

  useEffect(() => {
    loadClientNotes();
  }, [clientId]);

  useEffect(() => {
    filterNotes();
  }, [notes, searchQuery, selectedTags]);

  const loadClientNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get all notes and filter by client on the frontend for now
      // In a real implementation, you'd add a clientId filter to the API
      const allNotes = await coachNoteService.getAllNotes();
      // For now, we'll need to match sessionIds to clientId
      // This is a temporary solution - ideally the API would support client filtering
      setNotes(allNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client notes');
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.textContent.toLowerCase().includes(query) ||
        (note.title && note.title.toLowerCase().includes(query)) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note =>
        note.tags && selectedTags.every(tag => note.tags!.includes(tag))
      );
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredNotes(filtered);
  };

  const handleCreateNote = () => {
    setSelectedNote(null);
    setViewMode('editor');
  };

  const handleEditNote = (note: CoachNote) => {
    setSelectedNote(note);
    setViewMode('editor');
  };

  const handleViewNote = (note: CoachNote) => {
    setSelectedNote(note);
    setViewMode('viewer');
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await coachNoteService.deleteNote(noteId);
      setNotes(notes.filter(note => note._id !== noteId));
      
      // If we're viewing the deleted note, go back to list
      if (selectedNote && selectedNote._id === noteId) {
        setViewMode('list');
        setSelectedNote(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  const handleSaveNote = (savedNote: CoachNote) => {
    if (selectedNote) {
      // Update existing note
      setNotes(notes.map(note => 
        note._id === savedNote._id ? savedNote : note
      ));
    } else {
      // Add new note
      setNotes([savedNote, ...notes]);
    }
    
    setViewMode('list');
    setSelectedNote(null);
  };

  const handleCancelEdit = () => {
    setViewMode('list');
    setSelectedNote(null);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  // Group notes by session for better organization
  const groupedNotes = filteredNotes.reduce((acc, note) => {
    const sessionId = note.sessionId;
    if (!acc[sessionId]) {
      acc[sessionId] = [];
    }
    acc[sessionId].push(note);
    return acc;
  }, {} as Record<string, CoachNote[]>);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading notes for {clientName}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <Button 
            variant="outline" 
            onClick={loadClientNotes}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Editor view
  if (viewMode === 'editor') {
    return (
      <div className={className}>
        <NoteEditor
          note={selectedNote || undefined}
          // Note: For general client notes, we'd need a way to create notes without a specific session
          // This is a limitation of the current design that assumes all notes are session-specific
          onSave={handleSaveNote}
          onCancel={handleCancelEdit}
        />
      </div>
    );
  }

  // Viewer view
  if (viewMode === 'viewer' && selectedNote) {
    return (
      <div className={className}>
        <NoteViewer
          note={selectedNote}
          onEdit={() => setViewMode('editor')}
          onDelete={() => handleDeleteNote(selectedNote._id)}
          onClose={() => setViewMode('list')}
        />
      </div>
    );
  }

  // List view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            Notes for {clientName}
          </h3>
          <p className="text-gray-600 mt-1">
            {filteredNotes.length} of {notes.length} notes across all sessions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Notes
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content, titles, tags..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="w-full"
              disabled={!searchQuery && selectedTags.length === 0}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes by Session */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {notes.length === 0 ? 'No notes for this client yet' : 'No notes match your filters'}
          </h4>
          <p className="text-gray-600">
            {notes.length === 0 
              ? 'Notes will appear here after you create them during sessions.'
              : 'Try adjusting your search or filters.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedNotes).map(([sessionId, sessionNotes]) => (
            <div key={sessionId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">
                  Session: {sessionId.slice(-8)}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {sessionNotes.length} note{sessionNotes.length !== 1 ? 's' : ''} • 
                  Last updated {formatDistanceToNow(new Date(sessionNotes[0].updatedAt), { addSuffix: true })}
                </p>
              </div>
              <div className="p-4 space-y-4">
                {sessionNotes.map(note => (
                  <NoteCard
                    key={note._id}
                    note={note}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                    onView={handleViewNote}
                    compact={true}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 