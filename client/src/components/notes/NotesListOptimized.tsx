import React, { lazy, Suspense } from 'react';
import { NoteViewMode, CoachNote } from '../../types/coachNote';
import { NotesListCore } from './NotesListCore';

// Import components directly to avoid lazy loading type issues
import { NoteEditor } from './NoteEditor';
import { NoteViewer } from './NoteViewer';
// Lazy load heavy components that don't have immediate type requirements
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard').then(module => ({ default: module.AnalyticsDashboard })));

// Loading component for suspense fallbacks
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

interface NotesListProps {
  noteViewMode: NoteViewMode;
  onViewModeChange: (mode: NoteViewMode) => void;
  selectedNote?: any;
  onNoteSelect: (note: any) => void;
  bulkMode?: boolean;
  selectedNoteIds?: string[];
  showTagManager?: boolean;
  onTagManagerToggle: (show: boolean) => void;
}

/**
 * Optimized NotesList component with lazy loading and code splitting
 * Reduces initial bundle size by loading components only when needed
 */
export const NotesListOptimized: React.FC<NotesListProps> = ({
  noteViewMode,
  onViewModeChange,
  selectedNote,
  onNoteSelect,
  bulkMode = false,
  selectedNoteIds = [],
  showTagManager = false,
  onTagManagerToggle
}) => {
  // Render different views based on mode with lazy loading
  const renderView = () => {
    switch (noteViewMode) {
      case 'editor':
        return (
          <NoteEditor
            note={selectedNote}
            onSave={(note: CoachNote) => {
              onNoteSelect(note);
              onViewModeChange('list');
            }}
            onCancel={() => onViewModeChange('list')}
          />
        );

      case 'viewer':
        return selectedNote ? (
          <NoteViewer
            note={selectedNote}
            onEdit={() => onViewModeChange('editor')}
            onDelete={() => onViewModeChange('list')}
            onClose={() => onViewModeChange('list')}
          />
        ) : null;

      case 'organization':
        return (
          <div className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Organization View</h3>
            <p className="text-gray-600 mb-4">This feature is coming soon.</p>
            <button
              onClick={() => onViewModeChange('list')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back to Notes
            </button>
          </div>
        );

      case 'analytics':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Coach Notes Analytics</h2>
                  <p className="text-gray-600 mt-1">Analytics and insights for your coaching notes</p>
                </div>
                <button
                  onClick={() => onViewModeChange('list')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ← Back to Notes
                </button>
              </div>
              <AnalyticsDashboard />
            </div>
          </Suspense>
        );

      case 'list':
      default:
        return (
          <>
            <NotesListCore
              onViewModeChange={onViewModeChange}
              onNoteSelect={onNoteSelect}
              onTagManagerToggle={onTagManagerToggle}
            />
            
            {/* Bulk operations and tag manager features coming soon */}
            {bulkMode && selectedNoteIds.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  Bulk operations panel coming soon. {selectedNoteIds.length} notes selected.
                </p>
              </div>
            )}
            
            {showTagManager && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Tag Manager</h3>
                  <p className="text-gray-600 mb-4">Tag management features coming soon.</p>
                  <button
                    onClick={() => onTagManagerToggle(false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </>
        );
    }
  };

  return renderView();
};

export default NotesListOptimized; 