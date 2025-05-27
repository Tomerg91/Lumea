import React, { useState, useEffect } from 'react';
import { CoachNote, CreateCoachNoteRequest, UpdateCoachNoteRequest } from '../../types/coachNote';
import { RichTextEditor } from '../RichTextEditor';
import { Button } from '../ui/button';
import { TagManager, useTagSuggestions } from './TagManager';
import { coachNoteService } from '../../services/coachNoteService';

interface NoteEditorProps {
  note?: CoachNote; // If provided, we're editing; otherwise creating
  sessionId?: string; // Required for new notes
  onSave: (note: CoachNote) => void;
  onCancel: () => void;
  className?: string;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  sessionId,
  onSave,
  onCancel,
  className = ''
}) => {
  const [content, setContent] = useState(note?.textContent || '');
  const [title, setTitle] = useState(note?.title || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(note?.isEncrypted ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get AI-powered tag suggestions based on content
  const suggestedTags = useTagSuggestions(content);

  const isEditing = !!note;
  const isValid = content.trim().length > 0 && (isEditing || sessionId);

  useEffect(() => {
    if (note) {
      setContent(note.textContent);
      setTitle(note.title || '');
      setTags(note.tags || []);
      setIsEncrypted(note.isEncrypted);
    }
  }, [note]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!tags.includes(suggestion)) {
      setTags([...tags, suggestion]);
    }
  };

  const handleSave = async () => {
    if (!isValid) return;

    setIsSaving(true);
    setError(null);

    try {
      let savedNote: CoachNote;

      if (isEditing && note) {
        // Update existing note
        const updateData: UpdateCoachNoteRequest = {
          textContent: content,
          tags: tags.length > 0 ? tags : undefined,
          isEncrypted,
        };
        savedNote = await coachNoteService.updateNote(note._id, updateData);
      } else {
        // Create new note
        if (!sessionId) {
          throw new Error('Session ID is required for new notes');
        }
        const createData: CreateCoachNoteRequest = {
          sessionId,
          textContent: content,
          tags: tags.length > 0 ? tags : undefined,
          isEncrypted,
        };
        savedNote = await coachNoteService.createNote(createData);
      }

      // Update tag usage analytics
      if (tags.length > 0) {
        updateTagUsageAnalytics(tags);
      }

      onSave(savedNote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const updateTagUsageAnalytics = (usedTags: string[]) => {
    // Update local tag usage for analytics
    const savedUsageCounts = localStorage.getItem('coachNotes_tagUsage');
    let usageCounts: Record<string, number> = {};
    
    if (savedUsageCounts) {
      try {
        usageCounts = JSON.parse(savedUsageCounts);
      } catch (e) {
        console.error('Error parsing saved tag usage:', e);
      }
    }

    // Increment usage count for each tag
    usedTags.forEach(tagName => {
      usageCounts[tagName] = (usageCounts[tagName] || 0) + 1;
    });

    localStorage.setItem('coachNotes_tagUsage', JSON.stringify(usageCounts));
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Note' : 'Create New Note'}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isValid || isSaving}
            className="min-w-[80px]"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Title Input */}
      <div className="mb-4">
        <label htmlFor="note-title" className="block text-sm font-medium text-gray-700 mb-2">
          Title (Optional)
        </label>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for your note..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSaving}
        />
      </div>

      {/* Content Editor */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content *
        </label>
        <div className="border border-gray-300 rounded-md">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Write your note here..."
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Tag Suggestions */}
      {suggestedTags.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-900">AI Tag Suggestions</h4>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-xs text-blue-700 hover:text-blue-800"
            >
              {showSuggestions ? 'Hide' : 'Show'} suggestions
            </button>
          </div>
          {showSuggestions && (
            <div className="flex flex-wrap gap-2">
              {suggestedTags.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={tags.includes(suggestion)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    tags.includes(suggestion)
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="tag-input" className="block text-sm font-medium text-gray-700">
            Tags
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTagManager(true)}
            disabled={isSaving}
          >
            🏷️ Manage Tags
          </Button>
        </div>
        
        <div className="flex gap-2 mb-2">
          <input
            id="tag-input"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleTagInputKeyPress}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSaving}
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleAddTag}
            disabled={!tagInput.trim() || isSaving}
          >
            Add
          </Button>
        </div>
        
        {/* Tag List */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                  disabled={isSaving}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Encryption Toggle */}
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isEncrypted}
            onChange={(e) => setIsEncrypted(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            disabled={isSaving}
          />
          <span className="ml-2 text-sm text-gray-700">
            🔒 Encrypt this note (recommended for sensitive content)
          </span>
        </label>
      </div>

      {/* Session Info */}
      {sessionId && !isEditing && (
        <div className="text-xs text-gray-500 border-t pt-3">
          This note will be linked to session: {sessionId.slice(-8)}
        </div>
      )}

      {/* Tag Manager Modal */}
      {showTagManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <TagManager
              selectedTags={tags}
              onTagsChange={setTags}
              onClose={() => setShowTagManager(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 