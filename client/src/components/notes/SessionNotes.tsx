import React, { useState, useEffect } from 'react';
import { CoachNote } from '../../types/coachNote';
import { coachNoteService } from '../../services/coachNoteService';
import { NoteCard } from './NoteCard';
import { NoteEditor } from './NoteEditor';
import { NoteViewer } from './NoteViewer';
import { Button } from '../ui/button';

interface SessionNotesProps {
  sessionId: string;
  clientName?: string;
  isCoach?: boolean;
  className?: string;
}

type ViewMode = 'list' | 'editor' | 'viewer';

export const SessionNotes: React.FC<SessionNotesProps> = ({
  sessionId,
  clientName,
  isCoach = false,
  className = ''
}) => {
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNote, setSelectedNote] = useState<CoachNote | null>(null);

  useEffect(() => {
    loadSessionNotes();
  }, [sessionId]);

  const loadSessionNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionNotes = await coachNoteService.getSessionNotes(sessionId);
      setNotes(sessionNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session notes');
    } finally {
      setLoading(false);
    }
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

  // Quick note templates for session context
  const noteTemplates = [
    {
      title: 'Session Summary',
      content: `<h3>Session Summary - ${clientName || 'Client'}</h3>
<p><strong>Key Topics Discussed:</strong></p>
<ul>
  <li></li>
  <li></li>
</ul>

<p><strong>Client Insights:</strong></p>
<ul>
  <li></li>
  <li></li>
</ul>

<p><strong>Action Items:</strong></p>
<ul>
  <li></li>
  <li></li>
</ul>

<p><strong>Next Session Focus:</strong></p>
<p></p>`,
      tags: ['session-summary', 'action-items']
    },
    {
      title: 'Breakthrough Moment',
      content: `<h3>Breakthrough Moment</h3>
<p><strong>What happened:</strong></p>
<p></p>

<p><strong>Client's reaction:</strong></p>
<p></p>

<p><strong>How to build on this:</strong></p>
<p></p>`,
      tags: ['breakthrough', 'progress']
    },
    {
      title: 'Challenge Identified',
      content: `<h3>Challenge Identified</h3>
<p><strong>Challenge:</strong></p>
<p></p>

<p><strong>Root cause analysis:</strong></p>
<p></p>

<p><strong>Proposed approach:</strong></p>
<p></p>

<p><strong>Support needed:</strong></p>
<p></p>`,
      tags: ['challenge', 'strategy']
    }
  ];

  const handleTemplateSelect = (template: typeof noteTemplates[0]) => {
    setSelectedNote({
      _id: '',
      sessionId,
      coachId: '',
      textContent: template.content,
      title: template.title,
      tags: template.tags,
      isEncrypted: true,
      createdAt: '',
      updatedAt: ''
    } as CoachNote);
    setViewMode('editor');
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading session notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{error}</p>
          <Button 
            variant="outline" 
            onClick={loadSessionNotes}
            className="mt-2 text-xs"
            size="sm"
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
          sessionId={sessionId}
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
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-lg font-medium text-gray-900">Private Coach Notes</h4>
          <p className="text-sm text-gray-600">
            {notes.length} note{notes.length !== 1 ? 's' : ''} for this session
          </p>
        </div>
        {isCoach && (
          <Button onClick={handleCreateNote} size="sm">
            + Add Note
          </Button>
        )}
      </div>

      {/* Quick Templates (only for coaches when creating notes) */}
      {isCoach && notes.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="text-sm font-medium text-blue-900 mb-3">Quick Start Templates</h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {noteTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => handleTemplateSelect(template)}
                className="text-left p-3 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium text-blue-900 text-sm">{template.title}</div>
                <div className="text-xs text-blue-700 mt-1">
                  {template.tags.map(tag => `#${tag}`).join(' ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-3">📝</div>
          <h5 className="text-lg font-medium text-gray-900 mb-2">No notes for this session yet</h5>
          <p className="text-gray-600 mb-4">
            {isCoach 
              ? 'Add private coaching notes to track insights, breakthroughs, and action items.'
              : 'Your coach hasn\'t added any private notes for this session yet.'
            }
          </p>
          {isCoach && (
            <Button onClick={handleCreateNote} size="sm">
              Create First Note
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map(note => (
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
      )}

      {/* Privacy Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-gray-400 mr-2">🔒</div>
          <div className="text-xs text-gray-600">
            <p className="font-medium">Privacy Notice</p>
            <p className="mt-1">
              These notes are private to the coach and are not visible to clients. 
              All notes are encrypted for additional security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 