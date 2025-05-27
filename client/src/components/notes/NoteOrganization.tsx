import React, { useState, useEffect, useCallback } from 'react';
import { 
  NoteCategory, 
  NoteFolder, 
  NoteTemplate, 
  NoteCollection, 
  NoteOrganizationAnalytics,
  EnhancedCoachNote
} from '../../types/coachNote';
import { noteOrganizationService } from '../../services/noteOrganizationService';
import { coachNoteService } from '../../services/coachNoteService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface NoteOrganizationProps {
  onNoteSelect?: (noteId: string) => void;
  selectedNoteIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onClose?: () => void;
}

type ViewMode = 'folders' | 'categories' | 'templates' | 'collections' | 'analytics';

export const NoteOrganization: React.FC<NoteOrganizationProps> = ({
  onNoteSelect,
  selectedNoteIds = [],
  onSelectionChange,
  onClose
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('folders');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [collections, setCollections] = useState<NoteCollection[]>([]);
  const [analytics, setAnalytics] = useState<NoteOrganizationAnalytics | null>(null);
  const [notes, setNotes] = useState<EnhancedCoachNote[]>([]);
  
  // UI state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{
    type: 'category' | 'folder' | 'template' | 'collection';
    id: string | null;
  } | null>(null);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{
    type: 'note' | 'folder';
    id: string;
  } | null>(null);
  
  // Form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemColor, setNewItemColor] = useState('#3B82F6');
  const [newItemIcon, setNewItemIcon] = useState('📁');

  // Load data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        categoriesData,
        foldersData,
        templatesData,
        collectionsData,
        analyticsData,
        notesData
      ] = await Promise.all([
        noteOrganizationService.getCategories(),
        noteOrganizationService.getFolders(),
        noteOrganizationService.getTemplates(),
        noteOrganizationService.getCollections(),
        noteOrganizationService.getOrganizationAnalytics(),
        coachNoteService.getAllNotes()
      ]);
      
      setCategories(categoriesData);
      setFolders(foldersData);
      setTemplates(templatesData);
      setCollections(collectionsData);
      setAnalytics(analyticsData);
      setNotes(notesData as EnhancedCoachNote[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'note' | 'folder', id: string) => {
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${type}:${id}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    try {
      if (draggedItem.type === 'note') {
        await noteOrganizationService.moveNotesToFolder([draggedItem.id], targetFolderId);
        await loadAllData(); // Refresh data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move item');
    } finally {
      setDraggedItem(null);
    }
  };

  // Create handlers
  const handleCreateCategory = async () => {
    if (!newItemName.trim()) return;
    
    try {
      const newCategory = await noteOrganizationService.createCategory({
        name: newItemName.trim(),
        description: newItemDescription.trim() || undefined,
        color: newItemColor,
        icon: newItemIcon,
        isSystem: false,
        sortOrder: categories.length
      });
      
      setCategories([...categories, newCategory]);
      setNewItemName('');
      setNewItemDescription('');
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleCreateFolder = async () => {
    if (!newItemName.trim()) return;
    
    try {
      const newFolder = await noteOrganizationService.createFolder({
        name: newItemName.trim(),
        description: newItemDescription.trim() || undefined,
        color: newItemColor,
        icon: newItemIcon,
        sortOrder: folders.length
      });
      
      setFolders([...folders, newFolder]);
      setNewItemName('');
      setNewItemDescription('');
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    }
  };

  const handleCreateTemplate = async () => {
    if (!newItemName.trim()) return;
    
    try {
      const newTemplate = await noteOrganizationService.createTemplate({
        name: newItemName.trim(),
        description: newItemDescription.trim() || undefined,
        content: 'Start writing your note here...',
        tags: [],
        isSystem: false
      });
      
      setTemplates([...templates, newTemplate]);
      setNewItemName('');
      setNewItemDescription('');
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    }
  };

  const handleCreateCollection = async () => {
    if (!newItemName.trim()) return;
    
    try {
      const newCollection = await noteOrganizationService.createCollection({
        name: newItemName.trim(),
        description: newItemDescription.trim() || undefined,
        noteIds: [],
        color: newItemColor,
        icon: newItemIcon,
        isPublic: false,
        sortOrder: collections.length
      });
      
      setCollections([...collections, newCollection]);
      setNewItemName('');
      setNewItemDescription('');
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
    }
  };

  // Delete handlers
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Notes will not be deleted.')) return;
    
    try {
      await noteOrganizationService.deleteCategory(categoryId);
      setCategories(categories.filter(c => c._id !== categoryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? Notes will be moved to the root folder.')) return;
    
    try {
      await noteOrganizationService.deleteFolder(folderId);
      setFolders(folders.filter(f => f._id !== folderId));
      await loadAllData(); // Refresh to update note counts
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
    }
  };

  // Toggle folder expansion
  const toggleFolderExpansion = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Get notes in folder
  const getNotesInFolder = (folderId: string | null) => {
    return notes.filter(note => note.folderId === folderId);
  };

  // Get notes in category
  const getNotesInCategory = (categoryId: string | null) => {
    return notes.filter(note => note.categoryId === categoryId);
  };

  // Render functions
  const renderFolderTree = () => {
    const rootFolders = folders.filter(f => !f.parentFolderId);
    const unorganizedNotes = getNotesInFolder(null);
    
    const renderFolder = (folder: NoteFolder, depth = 0) => {
      const folderNotes = getNotesInFolder(folder._id);
      const childFolders = folders.filter(f => f.parentFolderId === folder._id);
      const isExpanded = expandedFolders.has(folder._id);
      
      return (
        <div
          key={folder._id}
          className={`ml-${depth * 4}`}
          draggable
          onDragStart={(e) => handleDragStart(e, 'folder', folder._id)}
        >
          <div 
            className="flex items-center justify-between p-2 border border-gray-200 rounded-md mb-2 bg-white hover:bg-gray-50 cursor-move"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, folder._id)}
          >
            <div className="flex items-center flex-1">
              <button
                onClick={() => toggleFolderExpansion(folder._id)}
                className="mr-2 text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? '📂' : '📁'}
              </button>
              <span className="font-medium">{folder.name}</span>
              <span className="ml-2 text-sm text-gray-500">({folder.noteCount})</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => handleDeleteFolder(folder._id)}>
                🗑️
              </Button>
            </div>
          </div>
          
          {isExpanded && (
            <div 
              className={`ml-${(depth + 1) * 4} min-h-[50px] border-2 border-dashed border-gray-200 rounded-md p-2 mb-2 ${
                draggedItem?.type === 'note' ? 'border-blue-400 bg-blue-50' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, folder._id)}
            >
              {folderNotes.map((note) => (
                <div
                  key={note._id}
                  className="p-2 bg-blue-50 border border-blue-200 rounded-md mb-1 cursor-move hover:bg-blue-100"
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'note', note._id)}
                  onClick={() => onNoteSelect?.(note._id)}
                >
                  <div className="font-medium text-sm">{note.title || 'Untitled Note'}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {note.textContent.slice(0, 100)}...
                  </div>
                </div>
              ))}
              {folderNotes.length === 0 && (
                <div className="text-gray-400 text-sm text-center py-4">
                  Drop notes here
                </div>
              )}
            </div>
          )}
          
          {isExpanded && childFolders.map(childFolder => renderFolder(childFolder, depth + 1))}
        </div>
      );
    };
    
    return (
      <div className="space-y-4">
        {/* Root level folders */}
        <div>
          <h3 className="text-lg font-medium mb-3">Folders</h3>
          {rootFolders.map(folder => renderFolder(folder))}
          {rootFolders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No folders yet. Create your first folder to organize notes.
            </div>
          )}
        </div>
        
        {/* Unorganized notes */}
        {unorganizedNotes.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-3">Unorganized Notes ({unorganizedNotes.length})</h3>
            <div 
              className={`min-h-[100px] border-2 border-dashed border-gray-300 rounded-md p-3 ${
                draggedItem?.type === 'note' ? 'border-orange-400 bg-orange-50' : ''
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, null)}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {unorganizedNotes.map((note) => (
                  <div
                    key={note._id}
                    className="p-2 bg-gray-50 border border-gray-200 rounded-md cursor-move hover:bg-gray-100"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'note', note._id)}
                    onClick={() => onNoteSelect?.(note._id)}
                  >
                    <div className="font-medium text-sm">{note.title || 'Untitled Note'}</div>
                    <div className="text-xs text-gray-600 truncate">
                      {note.textContent.slice(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCategories = () => (
    <div className="space-y-4">
      {categories.map(category => {
        const categoryNotes = getNotesInCategory(category._id);
        return (
          <div key={category._id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <span className="text-2xl mr-2">{category.icon}</span>
                <div>
                  <h3 className="font-semibold">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600">{category.description}</p>
                  )}
                </div>
                <span className="ml-auto text-sm text-gray-500">({categoryNotes.length} notes)</span>
              </div>
              <div className="flex gap-1">
                {!category.isSystem && (
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(category._id)}>
                    🗑️
                  </Button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {categoryNotes.slice(0, 6).map(note => (
                <div
                  key={note._id}
                  className="p-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
                  onClick={() => onNoteSelect?.(note._id)}
                >
                  <div className="font-medium text-sm">{note.title || 'Untitled Note'}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {note.textContent.slice(0, 60)}...
                  </div>
                </div>
              ))}
              {categoryNotes.length > 6 && (
                <div className="p-2 border border-gray-200 rounded-md text-center text-gray-500 text-sm">
                  +{categoryNotes.length - 6} more notes
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTemplates = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map(template => (
        <div key={template._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold">{template.name}</h3>
            <div className="flex gap-1">
              <Button size="sm" variant="outline">Use</Button>
              {!template.isSystem && (
                <Button size="sm" variant="ghost">🗑️</Button>
              )}
            </div>
          </div>
          
          {template.description && (
            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
          )}
          
          <div className="bg-gray-50 rounded-md p-3 text-sm">
            {template.content.slice(0, 200)}...
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            Used {template.usageCount} times
          </div>
        </div>
      ))}
    </div>
  );

  const renderCollections = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map(collection => (
        <div key={collection._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center">
              <span className="text-2xl mr-2">{collection.icon || '📚'}</span>
              <h3 className="font-semibold">{collection.name}</h3>
            </div>
            <Button size="sm" variant="ghost">🗑️</Button>
          </div>
          
          {collection.description && (
            <p className="text-sm text-gray-600 mb-3">{collection.description}</p>
          )}
          
          <div className="text-sm text-gray-500">
            {collection.noteIds.length} notes
          </div>
        </div>
      ))}
    </div>
  );

  const renderAnalytics = () => {
    if (!analytics) return <div>Loading analytics...</div>;
    
    return (
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{analytics.totalNotes}</div>
            <div className="text-sm text-blue-700">Total Notes</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{analytics.organizationScore}%</div>
            <div className="text-sm text-green-700">Organization Score</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{analytics.categorizedNotes}</div>
            <div className="text-sm text-purple-700">Categorized Notes</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{analytics.folderizedNotes}</div>
            <div className="text-sm text-orange-700">In Folders</div>
          </div>
        </div>

        {/* Category Usage */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-4">Category Usage</h3>
          <div className="space-y-2">
            {analytics.categoryUsage.map(usage => (
              <div key={usage.categoryId} className="flex justify-between items-center">
                <span>{usage.categoryName}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${usage.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{usage.noteCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Template Usage */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-4">Template Usage</h3>
          <div className="space-y-2">
            {analytics.templateUsage.map(usage => (
              <div key={usage.templateId} className="flex justify-between items-center">
                <span>{usage.templateName}</span>
                <span className="text-sm text-gray-600">{usage.usageCount} uses</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading organization data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={loadAllData} className="mt-2">
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
        <h2 className="text-2xl font-bold text-gray-900">Note Organization</h2>
        <div className="flex gap-2">
          {editingItem && (
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
          )}
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              ← Back to Notes
            </Button>
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'folders', label: '📁 Folders', count: folders.length },
            { id: 'categories', label: '🏷️ Categories', count: categories.length },
            { id: 'templates', label: '📝 Templates', count: templates.length },
            { id: 'collections', label: '📚 Collections', count: collections.length },
            { id: 'analytics', label: '📊 Analytics', count: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                viewMode === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Create New Item */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium">
            Create New {viewMode.slice(0, -1).charAt(0).toUpperCase() + viewMode.slice(1, -1)}
          </h3>
          <Button
            onClick={() => setEditingItem({ type: viewMode.slice(0, -1) as any, id: null })}
            disabled={!!editingItem}
          >
            + Add {viewMode.slice(0, -1)}
          </Button>
        </div>

        {editingItem && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input
              placeholder="Name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
            />
            <Input
              type="color"
              value={newItemColor}
              onChange={(e) => setNewItemColor(e.target.value)}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Icon"
                value={newItemIcon}
                onChange={(e) => setNewItemIcon(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (editingItem.type === 'category') handleCreateCategory();
                  else if (editingItem.type === 'folder') handleCreateFolder();
                  else if (editingItem.type === 'template') handleCreateTemplate();
                  else if (editingItem.type === 'collection') handleCreateCollection();
                }}
                disabled={!newItemName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {viewMode === 'folders' && renderFolderTree()}
        {viewMode === 'categories' && renderCategories()}
        {viewMode === 'templates' && renderTemplates()}
        {viewMode === 'collections' && renderCollections()}
        {viewMode === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
}; 