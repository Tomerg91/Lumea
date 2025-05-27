import React from 'react';
import { CoachNote } from '../../types/coachNote';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';

interface NoteCardProps {
  note: CoachNote;
  onEdit: (note: CoachNote) => void;
  onDelete: (noteId: string) => void;
  onView: (note: CoachNote) => void;
  compact?: boolean;
  highlightedContent?: string;
  highlightedTitle?: string;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (noteId: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onEdit,
  onDelete,
  onView,
  compact = false,
  highlightedContent,
  highlightedTitle,
  selectionMode = false,
  isSelected = false,
  onToggleSelection
}) => {
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown date';
    }
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDelete(note._id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(note);
  };

  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(note._id);
  };

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelection?.(note._id);
    } else {
      onView(note);
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer ${
        compact ? 'p-4' : 'p-6'
      } ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
          : 'border-gray-200'
      }`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        {/* Selection Checkbox */}
        {selectionMode && (
          <div className="mr-3 mt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelectionClick}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        )}
        
        <div className="flex-1">
          {note.title && (
            <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'} mb-1`}>
              {highlightedTitle ? (
                <span dangerouslySetInnerHTML={{ __html: highlightedTitle }} />
              ) : note.title}
            </h3>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formatDate(note.createdAt)}</span>
            {note.isEncrypted && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                🔒 Encrypted
              </span>
            )}
            {note.audioFileId && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                🎵 Audio
              </span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-1 ml-2">
          {!selectionMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditClick}
                className="h-8 w-8 p-0"
              >
                ✏️
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                🗑️
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content Preview */}
      <div className={`text-gray-700 ${compact ? 'text-sm' : 'text-base'} mb-3`}>
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: highlightedContent || truncateText(note.textContent, compact ? 100 : 150) 
          }}
        />
      </div>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.slice(0, compact ? 2 : 4).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
            >
              #{tag}
            </span>
          ))}
          {note.tags.length > (compact ? 2 : 4) && (
            <span className="text-xs text-gray-500">
              +{note.tags.length - (compact ? 2 : 4)} more
            </span>
          )}
        </div>
      )}

      {/* Footer Info */}
      {!compact && (
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <span>Session: {note.sessionId.slice(-8)}</span>
            {note.updatedAt !== note.createdAt && (
              <span>Updated {formatDate(note.updatedAt)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 