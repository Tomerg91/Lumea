import React, { useState } from 'react';
import { CoachNote, NoteAccessLevel } from '../../types/coachNote';
import { Button } from '../ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { PrivacyControls } from './PrivacyControls';

interface NoteViewerProps {
  note: CoachNote;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  className?: string;
  currentUserId?: string;
  currentUserRole?: string;
  onUpdate?: (updatedNote: CoachNote) => void;
}

export const NoteViewer: React.FC<NoteViewerProps> = ({
  note,
  onEdit,
  onDelete,
  onClose,
  className = '',
  currentUserId,
  currentUserRole = 'coach',
  onUpdate
}) => {
  const [showPrivacyControls, setShowPrivacyControls] = useState(false);
  const [currentNote, setCurrentNote] = useState(note);
  
  const isOwner = currentUserId === currentNote.coachId;
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        relative: formatDistanceToNow(date, { addSuffix: true }),
        absolute: format(date, 'PPpp')
      };
    } catch {
      return {
        relative: 'Unknown date',
        absolute: 'Unknown date'
      };
    }
  };

  const handleDeleteClick = () => {
    if (window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      onDelete();
    }
  };

  const handlePrivacyUpdate = (updatedNote: CoachNote) => {
    setCurrentNote(updatedNote);
    onUpdate?.(updatedNote);
    setShowPrivacyControls(false);
  };

  const getAccessLevelDisplay = (level: NoteAccessLevel) => {
    switch (level) {
      case NoteAccessLevel.PRIVATE:
        return { text: 'Private', color: 'bg-gray-100 text-gray-800', icon: '🔒' };
      case NoteAccessLevel.SUPERVISOR:
        return { text: 'Supervisor Access', color: 'bg-yellow-100 text-yellow-800', icon: '👥' };
      case NoteAccessLevel.TEAM:
        return { text: 'Team Access', color: 'bg-blue-100 text-blue-800', icon: '👫' };
      case NoteAccessLevel.ORGANIZATION:
        return { text: 'Organization Access', color: 'bg-purple-100 text-purple-800', icon: '🏢' };
      default:
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: '❓' };
    }
  };

  const accessLevel = getAccessLevelDisplay(currentNote.accessLevel);
  const createdDate = formatDate(currentNote.createdAt);
  const updatedDate = formatDate(currentNote.updatedAt);
  const wasUpdated = currentNote.updatedAt !== currentNote.createdAt;

  return (
    <>
      <div className={`bg-white rounded-lg border border-gray-200 shadow-lg ${className}`}>
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1">
            {currentNote.title && (
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {currentNote.title}
              </h1>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span title={createdDate.absolute}>
                Created {createdDate.relative}
              </span>
              {wasUpdated && (
                <span title={updatedDate.absolute}>
                  • Updated {updatedDate.relative}
                </span>
              )}
              {currentNote.isEncrypted && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  🔒 Encrypted
                </span>
              )}
              {currentNote.privacySettings.sensitiveContent && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  ⚠️ Sensitive
                </span>
              )}
              {currentNote.audioFileId && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  🎵 Audio Attached
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${accessLevel.color}`}>
                {accessLevel.icon} {accessLevel.text}
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 ml-4">
            {(isOwner || currentUserRole === 'admin') && (
              <Button 
                variant="outline" 
                onClick={() => setShowPrivacyControls(true)}
                size="sm"
              >
                🔐 Privacy
              </Button>
            )}
            <Button variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDeleteClick}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
            <Button variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Access Information Banner */}
        {currentNote.accessCount > 1 && (
          <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center text-sm text-yellow-800">
              <span className="font-medium">👁️ Access History:</span>
              <span className="ml-2">
                This note has been accessed {currentNote.accessCount} times
              </span>
              {currentNote.lastAccessedAt && (
                <span className="ml-2">
                  • Last accessed {formatDistanceToNow(new Date(currentNote.lastAccessedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <div className="prose prose-lg max-w-none">
            <div 
              dangerouslySetInnerHTML={{ __html: currentNote.textContent }}
              className="text-gray-800 leading-relaxed"
            />
          </div>
        </div>

        {/* Tags */}
        {currentNote.tags && currentNote.tags.length > 0 && (
          <div className="px-6 pb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {currentNote.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sharing Information */}
        {currentNote.sharedWith && currentNote.sharedWith.length > 0 && (
          <div className="px-6 pb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Shared With</h3>
            <div className="flex flex-wrap gap-2">
              {currentNote.sharedWith.map((userId, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                >
                  👤 {userId.slice(-8)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Session ID:</span>
              <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {currentNote.sessionId.slice(-8)}
              </span>
            </div>
            <div>
              <span className="font-medium">Coach ID:</span>
              <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {currentNote.coachId.slice(-8)}
              </span>
            </div>
            {currentNote.audioFileId && (
              <div className="md:col-span-2">
                <span className="font-medium">Audio File ID:</span>
                <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {currentNote.audioFileId.slice(-8)}
                </span>
              </div>
            )}
          </div>
          
          {/* Privacy Notice */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {accessLevel.icon}
              </div>
              <div className="ml-2 text-sm text-blue-800">
                <p className="font-medium">{accessLevel.text} Coach Note</p>
                <p className="mt-1">
                  {currentNote.accessLevel === NoteAccessLevel.PRIVATE && 
                    'This note is private and only visible to you as the coach.'
                  }
                  {currentNote.accessLevel === NoteAccessLevel.SUPERVISOR && 
                    'This note is visible to you and designated supervisors.'
                  }
                  {currentNote.accessLevel === NoteAccessLevel.TEAM && 
                    'This note is visible to you and team members.'
                  }
                  {currentNote.accessLevel === NoteAccessLevel.ORGANIZATION && 
                    'This note is visible to all coaches in your organization.'
                  }
                  {currentNote.isEncrypted && ' The content is encrypted for additional security.'}
                  {currentNote.privacySettings.requireReasonForAccess && 
                    ' Access reason may be required for viewing.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Controls Modal */}
      {showPrivacyControls && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <PrivacyControls
            note={currentNote}
            onUpdate={handlePrivacyUpdate}
            onClose={() => setShowPrivacyControls(false)}
            isOwner={isOwner}
            currentUserRole={currentUserRole}
          />
        </div>
      )}
    </>
  );
}; 