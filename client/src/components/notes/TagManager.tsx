import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';

export interface Tag {
  id: string;
  name: string;
  category: 'predefined' | 'custom';
  type: string; // goals, challenges, breakthroughs, action-items, custom
  color: string;
  usageCount: number;
  createdAt: string;
  description?: string;
}

export interface TagStats {
  totalTags: number;
  predefinedTags: number;
  customTags: number;
  mostUsedTags: Tag[];
  recentTags: Tag[];
  tagsByType: Record<string, number>;
}

interface TagManagerProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onClose?: () => void;
  className?: string;
}

export const TagManager: React.FC<TagManagerProps> = ({
  selectedTags,
  onTagsChange,
  onClose,
  className = ''
}) => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [customTags, setCustomTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState('custom');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Predefined tag categories with colors and descriptions
  const predefinedTags: Omit<Tag, 'id' | 'usageCount' | 'createdAt'>[] = [
    // Goals category
    { name: 'goal-setting', category: 'predefined', type: 'goals', color: 'bg-green-100 text-green-800', description: 'Client goal setting and planning' },
    { name: 'career-goals', category: 'predefined', type: 'goals', color: 'bg-green-100 text-green-800', description: 'Professional and career objectives' },
    { name: 'personal-goals', category: 'predefined', type: 'goals', color: 'bg-green-100 text-green-800', description: 'Personal development goals' },
    { name: 'life-balance', category: 'predefined', type: 'goals', color: 'bg-green-100 text-green-800', description: 'Work-life balance objectives' },
    
    // Challenges category
    { name: 'obstacle', category: 'predefined', type: 'challenges', color: 'bg-red-100 text-red-800', description: 'Identified obstacles and barriers' },
    { name: 'limiting-belief', category: 'predefined', type: 'challenges', color: 'bg-red-100 text-red-800', description: 'Limiting beliefs and mindset blocks' },
    { name: 'skill-gap', category: 'predefined', type: 'challenges', color: 'bg-red-100 text-red-800', description: 'Skills that need development' },
    { name: 'fear', category: 'predefined', type: 'challenges', color: 'bg-red-100 text-red-800', description: 'Fears and anxieties to address' },
    { name: 'procrastination', category: 'predefined', type: 'challenges', color: 'bg-red-100 text-red-800', description: 'Procrastination patterns' },
    
    // Breakthroughs category
    { name: 'breakthrough', category: 'predefined', type: 'breakthroughs', color: 'bg-purple-100 text-purple-800', description: 'Major breakthroughs and insights' },
    { name: 'aha-moment', category: 'predefined', type: 'breakthroughs', color: 'bg-purple-100 text-purple-800', description: 'Sudden realizations and epiphanies' },
    { name: 'mindset-shift', category: 'predefined', type: 'breakthroughs', color: 'bg-purple-100 text-purple-800', description: 'Significant mindset changes' },
    { name: 'confidence-boost', category: 'predefined', type: 'breakthroughs', color: 'bg-purple-100 text-purple-800', description: 'Confidence and self-esteem improvements' },
    { name: 'clarity', category: 'predefined', type: 'breakthroughs', color: 'bg-purple-100 text-purple-800', description: 'Gained clarity and direction' },
    
    // Action Items category
    { name: 'action-items', category: 'predefined', type: 'action-items', color: 'bg-blue-100 text-blue-800', description: 'Tasks and action items' },
    { name: 'homework', category: 'predefined', type: 'action-items', color: 'bg-blue-100 text-blue-800', description: 'Client homework assignments' },
    { name: 'follow-up', category: 'predefined', type: 'action-items', color: 'bg-blue-100 text-blue-800', description: 'Items requiring follow-up' },
    { name: 'accountability', category: 'predefined', type: 'action-items', color: 'bg-blue-100 text-blue-800', description: 'Accountability measures' },
    { name: 'next-steps', category: 'predefined', type: 'action-items', color: 'bg-blue-100 text-blue-800', description: 'Next steps and immediate actions' },
    
    // Session types
    { name: 'session-summary', category: 'predefined', type: 'session', color: 'bg-gray-100 text-gray-800', description: 'Session summary and recap' },
    { name: 'progress-check', category: 'predefined', type: 'session', color: 'bg-gray-100 text-gray-800', description: 'Progress evaluation' },
    { name: 'strategy', category: 'predefined', type: 'session', color: 'bg-indigo-100 text-indigo-800', description: 'Strategic planning and approaches' },
    { name: 'tools-techniques', category: 'predefined', type: 'session', color: 'bg-indigo-100 text-indigo-800', description: 'Coaching tools and techniques used' }
  ];

  const categoryTypes = [
    { value: 'all', label: 'All Categories', icon: '📋' },
    { value: 'goals', label: 'Goals', icon: '🎯' },
    { value: 'challenges', label: 'Challenges', icon: '⚠️' },
    { value: 'breakthroughs', label: 'Breakthroughs', icon: '💡' },
    { value: 'action-items', label: 'Action Items', icon: '✅' },
    { value: 'session', label: 'Session Tags', icon: '📝' },
    { value: 'custom', label: 'Custom Tags', icon: '🏷️' }
  ];

  useEffect(() => {
    initializeTags();
  }, []);

  const initializeTags = () => {
    // In a real app, this would load from localStorage or API
    const savedCustomTags = localStorage.getItem('coachNotes_customTags');
    const savedUsageCounts = localStorage.getItem('coachNotes_tagUsage');
    
    let customTagsData: Tag[] = [];
    let usageCounts: Record<string, number> = {};
    
    if (savedCustomTags) {
      try {
        customTagsData = JSON.parse(savedCustomTags);
      } catch (e) {
        console.error('Error parsing saved custom tags:', e);
      }
    }
    
    if (savedUsageCounts) {
      try {
        usageCounts = JSON.parse(savedUsageCounts);
      } catch (e) {
        console.error('Error parsing saved tag usage:', e);
      }
    }

    // Initialize predefined tags with usage counts
    const initializedPredefinedTags: Tag[] = predefinedTags.map((tag, index) => ({
      ...tag,
      id: `predefined-${index}`,
      usageCount: usageCounts[tag.name] || 0,
      createdAt: new Date().toISOString()
    }));

    setAllTags([...initializedPredefinedTags, ...customTagsData]);
    setCustomTags(customTagsData);
  };

  const saveCustomTags = (tags: Tag[]) => {
    localStorage.setItem('coachNotes_customTags', JSON.stringify(tags));
  };

  const saveTagUsage = (usage: Record<string, number>) => {
    localStorage.setItem('coachNotes_tagUsage', JSON.stringify(usage));
  };

  const updateTagUsage = (tagNames: string[]) => {
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
    tagNames.forEach(tagName => {
      usageCounts[tagName] = (usageCounts[tagName] || 0) + 1;
    });

    saveTagUsage(usageCounts);

    // Update the tags in state
    setAllTags(prevTags => 
      prevTags.map(tag => ({
        ...tag,
        usageCount: usageCounts[tag.name] || tag.usageCount
      }))
    );
  };

  const handleCreateCustomTag = () => {
    if (!newTagName.trim()) return;

    const tagName = newTagName.trim().toLowerCase().replace(/\s+/g, '-');
    
    // Check if tag already exists
    if (allTags.some(tag => tag.name === tagName)) {
      alert('Tag already exists!');
      return;
    }

    const newTag: Tag = {
      id: `custom-${Date.now()}`,
      name: tagName,
      category: 'custom',
      type: newTagType,
      color: 'bg-yellow-100 text-yellow-800',
      usageCount: 0,
      createdAt: new Date().toISOString(),
      description: `Custom ${newTagType} tag`
    };

    const updatedCustomTags = [...customTags, newTag];
    const updatedAllTags = [...allTags, newTag];
    
    setCustomTags(updatedCustomTags);
    setAllTags(updatedAllTags);
    saveCustomTags(updatedCustomTags);
    
    setNewTagName('');
    setNewTagType('custom');
  };

  const handleDeleteCustomTag = (tagId: string) => {
    const tagToDelete = allTags.find(tag => tag.id === tagId);
    if (!tagToDelete || tagToDelete.category !== 'custom') return;

    if (window.confirm(`Are you sure you want to delete the tag "${tagToDelete.name}"?`)) {
      const updatedCustomTags = customTags.filter(tag => tag.id !== tagId);
      const updatedAllTags = allTags.filter(tag => tag.id !== tagId);
      
      setCustomTags(updatedCustomTags);
      setAllTags(updatedAllTags);
      saveCustomTags(updatedCustomTags);
      
      // Remove from selected tags if it's selected
      if (selectedTags.includes(tagToDelete.name)) {
        onTagsChange(selectedTags.filter(tag => tag !== tagToDelete.name));
      }
    }
  };

  const handleTagToggle = (tagName: string) => {
    const newSelectedTags = selectedTags.includes(tagName)
      ? selectedTags.filter(tag => tag !== tagName)
      : [...selectedTags, tagName];
    
    onTagsChange(newSelectedTags);
  };

  const filteredTags = allTags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (tag.description && tag.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || tag.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const generateTagAnalytics = (): TagStats => {
    const predefinedCount = allTags.filter(tag => tag.category === 'predefined').length;
    const customCount = allTags.filter(tag => tag.category === 'custom').length;
    
    const mostUsedTags = [...allTags]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
    
    const recentTags = [...allTags]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    const tagsByType = allTags.reduce((acc, tag) => {
      acc[tag.type] = (acc[tag.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTags: allTags.length,
      predefinedTags: predefinedCount,
      customTags: customCount,
      mostUsedTags,
      recentTags,
      tagsByType
    };
  };

  const analytics = generateTagAnalytics();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Tag Manager</h3>
          <p className="text-sm text-gray-600">
            Organize your notes with {analytics.totalTags} available tags
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            📊 Analytics
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Tag Analytics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analytics.totalTags}</div>
              <div className="text-sm text-gray-600">Total Tags</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.predefinedTags}</div>
              <div className="text-sm text-gray-600">Predefined</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{analytics.customTags}</div>
              <div className="text-sm text-gray-600">Custom</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{selectedTags.length}</div>
              <div className="text-sm text-gray-600">Selected</div>
            </div>
          </div>
          
          {analytics.mostUsedTags.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Most Used Tags</h5>
              <div className="flex flex-wrap gap-2">
                {analytics.mostUsedTags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag.name} ({tag.usageCount})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filter */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tag-search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Tags
            </label>
            <input
              id="tag-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categoryTypes.map(category => (
                <option key={category.value} value={category.value}>
                  {category.icon} {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create Custom Tag */}
      <div className="p-4 border-b border-gray-200 bg-yellow-50">
        <h4 className="font-medium text-gray-900 mb-3">Create Custom Tag</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name (e.g., leadership-development)"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomTag()}
          />
          
          <select
            value={newTagType}
            onChange={(e) => setNewTagType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="custom">Custom</option>
            <option value="goals">Goals</option>
            <option value="challenges">Challenges</option>
            <option value="breakthroughs">Breakthroughs</option>
            <option value="action-items">Action Items</option>
          </select>
          
          <Button onClick={handleCreateCustomTag} disabled={!newTagName.trim()}>
            Create Tag
          </Button>
        </div>
      </div>

      {/* Tag List */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredTags.map(tag => (
            <div
              key={tag.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                selectedTags.includes(tag.name)
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => handleTagToggle(tag.name)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tag.color}`}>
                    {tag.name}
                  </span>
                  {tag.usageCount > 0 && (
                    <span className="text-xs text-gray-500">({tag.usageCount})</span>
                  )}
                </div>
                {tag.description && (
                  <p className="text-xs text-gray-500 mt-1">{tag.description}</p>
                )}
              </div>
              
              {tag.category === 'custom' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCustomTag(tag.id);
                  }}
                  className="text-red-500 hover:text-red-700 text-sm ml-2"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>

        {filteredTags.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">🏷️</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No tags found</h4>
            <p className="text-gray-600">
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Create your first custom tag to get started.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Selected Tags Summary */}
      {selectedTags.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-blue-50">
          <h4 className="font-medium text-gray-900 mb-2">
            Selected Tags ({selectedTags.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tagName => {
              const tag = allTags.find(t => t.name === tagName);
              return (
                <span
                  key={tagName}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    tag?.color || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {tagName}
                  <button
                    onClick={() => handleTagToggle(tagName)}
                    className="ml-1 text-current opacity-70 hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for tag suggestions based on content analysis
export const useTagSuggestions = (content: string): string[] => {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!content || content.length < 10) {
      setSuggestions([]);
      return;
    }

    const generateSuggestions = () => {
      const text = content.toLowerCase();
      const suggestedTags: string[] = [];

      // Goal-related keywords
      if (text.includes('goal') || text.includes('objective') || text.includes('target') || text.includes('aim')) {
        suggestedTags.push('goal-setting');
      }
      if (text.includes('career') || text.includes('job') || text.includes('work') || text.includes('professional')) {
        suggestedTags.push('career-goals');
      }

      // Challenge-related keywords
      if (text.includes('challenge') || text.includes('difficult') || text.includes('struggle') || text.includes('problem')) {
        suggestedTags.push('obstacle');
      }
      if (text.includes('fear') || text.includes('afraid') || text.includes('anxious') || text.includes('worry')) {
        suggestedTags.push('fear');
      }
      if (text.includes('procrastinate') || text.includes('delay') || text.includes('postpone')) {
        suggestedTags.push('procrastination');
      }

      // Breakthrough-related keywords
      if (text.includes('breakthrough') || text.includes('insight') || text.includes('realize') || text.includes('understand')) {
        suggestedTags.push('breakthrough');
      }
      if (text.includes('aha') || text.includes('suddenly') || text.includes('click') || text.includes('epiphany')) {
        suggestedTags.push('aha-moment');
      }
      if (text.includes('confident') || text.includes('confidence') || text.includes('self-esteem')) {
        suggestedTags.push('confidence-boost');
      }

      // Action-related keywords
      if (text.includes('action') || text.includes('step') || text.includes('task') || text.includes('todo')) {
        suggestedTags.push('action-items');
      }
      if (text.includes('homework') || text.includes('assignment') || text.includes('practice')) {
        suggestedTags.push('homework');
      }
      if (text.includes('follow') || text.includes('check') || text.includes('monitor')) {
        suggestedTags.push('follow-up');
      }

      // Session-related keywords
      if (text.includes('summary') || text.includes('recap') || text.includes('overview')) {
        suggestedTags.push('session-summary');
      }
      if (text.includes('progress') || text.includes('improvement') || text.includes('development')) {
        suggestedTags.push('progress-check');
      }

      setSuggestions([...new Set(suggestedTags)].slice(0, 5)); // Unique tags, max 5
    };

    const debounceTimer = setTimeout(generateSuggestions, 500);
    return () => clearTimeout(debounceTimer);
  }, [content]);

  return suggestions;
}; 