import React, { useState } from 'react';
import { Button } from '../ui/button';
import { CoachNote, NoteAccessLevel, NoteCategory } from '../../types/coachNote';

interface BulkOperationsPanelProps {
  selectedNoteIds: string[];
  notes: CoachNote[];
  categories?: NoteCategory[];
  onBulkDelete: () => void;
  onBulkTagAdd: (tags: string[]) => void;
  onBulkTagRemove: (tags: string[]) => void;
  onBulkExport: (format: 'json' | 'csv' | 'pdf') => void;
  onBulkArchive: (reason?: string) => void;
  onBulkRestore: () => void;
  onBulkPrivacyChange: (accessLevel: NoteAccessLevel, reason?: string) => void;
  onBulkCategoryAssign: (categoryId: string, reason?: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  totalVisibleNotes: number;
  operationInProgress: boolean;
  operationProgress: number;
}

export const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  selectedNoteIds,
  notes,
  categories = [],
  onBulkDelete,
  onBulkTagAdd,
  onBulkTagRemove,
  onBulkExport,
  onBulkArchive,
  onBulkRestore,
  onBulkPrivacyChange,
  onBulkCategoryAssign,
  onSelectAll,
  onClearSelection,
  totalVisibleNotes,
  operationInProgress,
  operationProgress
}) => {
  const [showAdvancedActions, setShowAdvancedActions] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showPrivacyManager, setShowPrivacyManager] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showArchiveManager, setShowArchiveManager] = useState(false);
  const [newTags, setNewTags] = useState('');
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<NoteAccessLevel>(NoteAccessLevel.PRIVATE);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [archiveReason, setArchiveReason] = useState('');
  const [operationReason, setOperationReason] = useState('');

  // Get all unique tags from selected notes
  const selectedNotes = notes.filter(note => selectedNoteIds.includes(note._id));
  const allTagsInSelection = Array.from(
    new Set(selectedNotes.flatMap(note => note.tags || []))
  ).sort();
  
  // Analysis of selected notes for available operations
  const archivedNotesCount = selectedNotes.filter(note => note.isArchived).length;
  const activeNotesCount = selectedNotes.length - archivedNotesCount;
  const canArchive = activeNotesCount > 0;
  const canRestore = archivedNotesCount > 0;

  const handleTagAdd = () => {
    if (newTags.trim()) {
      const tagList = newTags.split(',').map(t => t.trim()).filter(t => t);
      onBulkTagAdd(tagList);
      setNewTags('');
      setShowTagManager(false);
    }
  };

  const handleTagRemove = () => {
    if (tagsToRemove.length > 0) {
      onBulkTagRemove(tagsToRemove);
      setTagsToRemove([]);
      setShowTagManager(false);
    }
  };

  const toggleTagForRemoval = (tag: string) => {
    setTagsToRemove(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handlePrivacyChange = () => {
    onBulkPrivacyChange(selectedAccessLevel, operationReason.trim() || undefined);
    setShowPrivacyManager(false);
    setOperationReason('');
  };

  const handleCategoryAssign = () => {
    if (selectedCategoryId) {
      onBulkCategoryAssign(selectedCategoryId, operationReason.trim() || undefined);
      setShowCategoryManager(false);
      setSelectedCategoryId('');
      setOperationReason('');
    }
  };

  const handleArchive = () => {
    onBulkArchive(archiveReason.trim() || undefined);
    setShowArchiveManager(false);
    setArchiveReason('');
  };

  const handleRestore = () => {
    if (confirm(`Are you sure you want to restore ${archivedNotesCount} archived note${archivedNotesCount > 1 ? 's' : ''}?`)) {
      onBulkRestore();
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-medium text-blue-900">
            {selectedNoteIds.length} note{selectedNoteIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onSelectAll}>
              Select All ({totalVisibleNotes})
            </Button>
            <Button size="sm" variant="outline" onClick={onClearSelection}>
              Clear Selection
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdvancedActions(!showAdvancedActions)}
          >
            {showAdvancedActions ? 'Hide' : 'Show'} Actions
          </Button>
        </div>
      </div>
      
      {showAdvancedActions && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={onBulkDelete}
              disabled={operationInProgress}
              className="text-red-600 hover:text-red-700"
            >
              🗑️ Delete
            </Button>
            {canArchive && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowArchiveManager(!showArchiveManager)}
                disabled={operationInProgress}
                className="text-orange-600 hover:text-orange-700"
              >
                📦 Archive ({activeNotesCount})
              </Button>
            )}
            {canRestore && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRestore}
                disabled={operationInProgress}
                className="text-green-600 hover:text-green-700"
              >
                📂 Restore ({archivedNotesCount})
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTagManager(!showTagManager)}
              disabled={operationInProgress}
            >
              🏷️ Manage Tags
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPrivacyManager(!showPrivacyManager)}
              disabled={operationInProgress}
            >
              🔒 Privacy Level
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              disabled={operationInProgress}
            >
              📁 Assign Category
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkExport('json')}
              disabled={operationInProgress}
            >
              📄 Export JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkExport('csv')}
              disabled={operationInProgress}
            >
              📊 Export CSV
            </Button>
          </div>

          {/* Tag Management Panel */}
          {showTagManager && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Tag Management</h4>
              
              {/* Add Tags */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Tags
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="Enter tags separated by commas..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleTagAdd()}
                  />
                  <Button
                    size="sm"
                    onClick={handleTagAdd}
                    disabled={!newTags.trim() || operationInProgress}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Remove Tags */}
              {allTagsInSelection.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remove Existing Tags
                  </label>
                                     <div className="flex flex-wrap gap-2 mb-3">
                     {allTagsInSelection.map((tag: string) => (
                       <button
                         key={tag}
                         onClick={() => toggleTagForRemoval(tag)}
                         className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                           tagsToRemove.includes(tag)
                             ? 'bg-red-100 text-red-800 border border-red-300'
                             : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                         }`}
                       >
                         #{tag} {tagsToRemove.includes(tag) && '✕'}
                       </button>
                     ))}
                  </div>
                  {tagsToRemove.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTagRemove}
                      disabled={operationInProgress}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove Selected Tags ({tagsToRemove.length})
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Archive Management Panel */}
          {showArchiveManager && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Archive Notes</h4>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Archive Reason (Optional)
                </label>
                <textarea
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Enter reason for archiving these notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleArchive}
                  disabled={operationInProgress}
                  className="bg-orange-600 text-white hover:bg-orange-700"
                >
                  Archive {activeNotesCount} Note{activeNotesCount > 1 ? 's' : ''}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowArchiveManager(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Privacy Management Panel */}
          {showPrivacyManager && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Change Privacy Level</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Access Level
                  </label>
                  <select
                    value={selectedAccessLevel}
                    onChange={(e) => setSelectedAccessLevel(e.target.value as NoteAccessLevel)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value={NoteAccessLevel.PRIVATE}>Private</option>
                    <option value={NoteAccessLevel.SUPERVISOR}>Supervisor</option>
                    <option value={NoteAccessLevel.TEAM}>Team</option>
                    <option value={NoteAccessLevel.ORGANIZATION}>Organization</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={operationReason}
                    onChange={(e) => setOperationReason(e.target.value)}
                    placeholder="Reason for privacy change..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handlePrivacyChange}
                  disabled={operationInProgress}
                >
                  Update Privacy for {selectedNoteIds.length} Note{selectedNoteIds.length > 1 ? 's' : ''}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPrivacyManager(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Category Management Panel */}
          {showCategoryManager && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Assign Category</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Category
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Select a category...</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={operationReason}
                    onChange={(e) => setOperationReason(e.target.value)}
                    placeholder="Reason for categorization..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCategoryAssign}
                  disabled={operationInProgress || !selectedCategoryId}
                >
                  Assign Category to {selectedNoteIds.length} Note{selectedNoteIds.length > 1 ? 's' : ''}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCategoryManager(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Operation Progress */}
          {operationInProgress && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-gray-900">
                  Processing operation...
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${operationProgress}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {Math.round(operationProgress)}%
                </span>
              </div>
            </div>
          )}

          {/* Selection Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 mt-4">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Selection Summary</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 mb-3">
              <div>
                <span className="font-medium">Total Notes:</span> {selectedNoteIds.length}
              </div>
              <div>
                <span className="font-medium">Active:</span> {activeNotesCount}
              </div>
              <div>
                <span className="font-medium">Archived:</span> {archivedNotesCount}
              </div>
              <div>
                <span className="font-medium">Unique Tags:</span> {allTagsInSelection.length}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-medium">With Audio:</span>{' '}
                {selectedNotes.filter(note => note.audioFileId).length}
              </div>
              <div>
                <span className="font-medium">Encrypted:</span>{' '}
                {selectedNotes.filter(note => note.isEncrypted).length}
              </div>
              <div>
                <span className="font-medium">Private:</span>{' '}
                {selectedNotes.filter(note => note.accessLevel === NoteAccessLevel.PRIVATE).length}
              </div>
              <div>
                <span className="font-medium">Team/Org:</span>{' '}
                {selectedNotes.filter(note => 
                  note.accessLevel === NoteAccessLevel.TEAM || 
                  note.accessLevel === NoteAccessLevel.ORGANIZATION
                ).length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 