import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useResources } from '../../hooks/useResources';
import { 
  Resource, 
  CreateResourceRequest, 
  UpdateResourceRequest,
  RESOURCE_TYPE_CONFIG,
  RESOURCE_DIFFICULTY_CONFIG,
  DEFAULT_RESOURCE_CATEGORIES
} from '../../types/resource';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { SimpleFileUploader } from '../upload/SimpleFileUploader';
import {
  Plus,
  Edit3,
  Trash2,
  Upload,
  FileText,
  Video,
  BookOpen,
  Layout,
  File,
  X,
  Save,
  Eye,
  Download,
  Star,
  Clock,
  User,
  Tag,
  Folder,
  Settings,
  Search
} from 'lucide-react';

interface ResourceManagerProps {
  onResourceSelect?: (resource: Resource) => void;
  showCreateButton?: boolean;
  compact?: boolean;
}

export const ResourceManager: React.FC<ResourceManagerProps> = ({
  onResourceSelect,
  showCreateButton = true,
  compact = false
}) => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { 
    resources, 
    categories, 
    loading, 
    creating, 
    updating, 
    deleting,
    createResource,
    updateResource,
    deleteResource,
    searchResources,
    trackResourceAccess
  } = useResources();

  // State management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Form state
  const [formData, setFormData] = useState<Partial<CreateResourceRequest>>({
    title: '',
    type: 'article',
    description: '',
    content: '',
    fileUrl: '',
    thumbnailUrl: '',
    duration: '',
    difficulty: 'beginner',
    tags: [],
    categories: [],
    isPublic: true,
    isPremium: false
  });

  const [tagInput, setTagInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{url: string; name: string} | null>(null);

  // Get filtered resources
  const filteredResources = searchResources({
    query: searchTerm,
    type: filterType !== 'all' ? filterType as Resource['type'] : undefined,
    difficulty: filterDifficulty !== 'all' ? filterDifficulty as Resource['difficulty'] : undefined,
    category: filterCategory !== 'all' ? filterCategory : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      return;
    }

    try {
      const resourceData: CreateResourceRequest = {
        title: formData.title,
        type: formData.type || 'article',
        description: formData.description,
        content: formData.content,
        fileUrl: uploadedFile?.url || formData.fileUrl,
        thumbnailUrl: formData.thumbnailUrl,
        duration: formData.duration,
        difficulty: formData.difficulty || 'beginner',
        tags: formData.tags || [],
        categories: formData.categories || [],
        isPublic: formData.isPublic ?? true,
        isPremium: formData.isPremium ?? false
      };

      if (selectedResource) {
        await updateResource({ id: selectedResource.id, ...resourceData });
        setShowEditModal(false);
      } else {
        await createResource(resourceData);
        setShowCreateModal(false);
      }

      resetForm();
    } catch (error) {
      console.error('Failed to save resource:', error);
    }
  }, [formData, uploadedFile, selectedResource, createResource, updateResource]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      type: 'article',
      description: '',
      content: '',
      fileUrl: '',
      thumbnailUrl: '',
      duration: '',
      difficulty: 'beginner',
      tags: [],
      categories: [],
      isPublic: true,
      isPremium: false
    });
    setTagInput('');
    setUploadedFile(null);
    setSelectedResource(null);
  }, []);

  // Handle edit
  const handleEdit = useCallback((resource: Resource) => {
    setSelectedResource(resource);
    setFormData({
      title: resource.title,
      type: resource.type,
      description: resource.description,
      content: resource.content,
      fileUrl: resource.fileUrl,
      thumbnailUrl: resource.thumbnailUrl,
      duration: resource.duration,
      difficulty: resource.difficulty,
      tags: resource.tags,
      categories: resource.categories,
      isPublic: resource.isPublic,
      isPremium: resource.isPremium
    });
    setShowEditModal(true);
  }, []);

  // Handle delete
  const handleDelete = useCallback(async (resource: Resource) => {
    if (window.confirm(`Are you sure you want to delete "${resource.title}"?`)) {
      try {
        await deleteResource(resource.id);
      } catch (error) {
        console.error('Failed to delete resource:', error);
      }
    }
  }, [deleteResource]);

  // Handle tag input
  const handleAddTag = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags?.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...(prev.tags || []), newTag]
        }));
      }
      setTagInput('');
    }
  }, [tagInput, formData.tags]);

  // Remove tag
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((result: {url: string; name: string}) => {
    setUploadedFile(result);
    setFormData(prev => ({
      ...prev,
      fileUrl: result.url
    }));
  }, []);

  // Get type icon
  const getTypeIcon = (type: Resource['type']) => {
    const config = RESOURCE_TYPE_CONFIG[type];
    switch (config.icon) {
      case 'FileText': return <FileText className="w-4 h-4" />;
      case 'Video': return <Video className="w-4 h-4" />;
      case 'BookOpen': return <BookOpen className="w-4 h-4" />;
      case 'Layout': return <Layout className="w-4 h-4" />;
      case 'File': return <File className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Get type color classes
  const getTypeColorClasses = (type: Resource['type']) => {
    const config = RESOURCE_TYPE_CONFIG[type];
    switch (config.color) {
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'orange': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'gray': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get difficulty color classes
  const getDifficultyColorClasses = (difficulty: Resource['difficulty']) => {
    const config = RESOURCE_DIFFICULTY_CONFIG[difficulty];
    switch (config.color) {
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl-layout' : ''}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-2xl font-bold text-gradient-purple">Resource Library</h2>
          <p className="text-gray-600 mt-1">
            Manage and organize your coaching resources
          </p>
        </div>
        {showCreateButton && (
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Resource
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className={`grid gap-4 md:grid-cols-5 ${isRTL ? 'rtl-grid' : ''}`}>
            <div className="relative">
              <Search className={`absolute top-3 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${isRTL ? 'pr-10' : 'pl-10'}`}
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(RESOURCE_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {Object.entries(RESOURCE_DIFFICULTY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {DEFAULT_RESOURCE_CATEGORIES.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className={`flex space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid/List */}
      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gradient-lavender rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'No resources found' : 'No resources yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms or filters'
                : 'Create your first resource to get started'
              }
            </p>
            {showCreateButton && !searchTerm && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Resource
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {filteredResources.map((resource) => (
            <Card 
              key={resource.id} 
              className={`hover:shadow-lg transition-all duration-300 cursor-pointer ${
                viewMode === 'list' ? 'flex flex-row' : ''
              }`}
              onClick={() => {
                trackResourceAccess(resource.id, 'view');
                onResourceSelect?.(resource);
              }}
            >
              <CardContent className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                {/* Header */}
                <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`p-2 rounded-lg border ${getTypeColorClasses(resource.type)}`}>
                      {getTypeIcon(resource.type)}
                    </div>
                    <Badge variant="secondary" className={getTypeColorClasses(resource.type)}>
                      {RESOURCE_TYPE_CONFIG[resource.type].label}
                    </Badge>
                  </div>
                  
                  <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <Badge variant="outline" className={getDifficultyColorClasses(resource.difficulty)}>
                      {RESOURCE_DIFFICULTY_CONFIG[resource.difficulty].label}
                    </Badge>
                    {profile?.role === 'coach' && resource.authorId === profile.id && (
                      <div className={`flex space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(resource);
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(resource);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold line-clamp-2">{resource.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-3">{resource.description}</p>
                  
                  {/* Meta info */}
                  <div className={`flex items-center justify-between text-xs text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {resource.duration && (
                        <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <Clock className="w-3 h-3" />
                          <span>{resource.duration}</span>
                        </div>
                      )}
                      <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{resource.rating.toFixed(1)}</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Eye className="w-3 h-3" />
                        <span>{resource.viewCount}</span>
                      </div>
                      <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Download className="w-3 h-3" />
                        <span>{resource.downloadCount}</span>
                      </div>
                    </div>
                    
                    <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <User className="w-3 h-3" />
                      <span>{resource.authorName}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {resource.tags.length > 0 && (
                    <div className={`flex flex-wrap gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {resource.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {resource.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{resource.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Categories */}
                  {resource.categories.length > 0 && (
                    <div className={`flex flex-wrap gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {resource.categories.slice(0, 2).map((category, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Folder className="w-3 h-3 mr-1" />
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedResource ? 'Edit Resource' : 'Create New Resource'}
            </DialogTitle>
            <DialogDescription>
              {selectedResource 
                ? 'Update the resource information below.'
                : 'Fill in the details to create a new resource.'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter resource title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as Resource['type'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RESOURCE_TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this resource is about"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select 
                      value={formData.difficulty} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value as Resource['difficulty'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RESOURCE_DIFFICULTY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="e.g., 15 min read, 30 min"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type a tag and press Enter"
                  />
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <Label>Categories</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {DEFAULT_RESOURCE_CATEGORIES.map((category) => (
                      <div key={category.name} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`category-${category.name}`}
                          checked={formData.categories?.includes(category.name) || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                categories: [...(prev.categories || []), category.name]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                categories: prev.categories?.filter(c => c !== category.name) || []
                              }));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`category-${category.name}`} className="text-sm">
                          {category.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter the main content of the resource"
                    rows={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label>File Upload</Label>
                  <SimpleFileUploader
                    onUploadComplete={handleFileUpload}
                    maxSize={50 * 1024 * 1024} // 50MB
                  />
                  {uploadedFile && (
                    <div className="text-sm text-green-600">
                      ✓ File uploaded: {uploadedFile.name}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fileUrl">File URL (if external)</Label>
                  <Input
                    id="fileUrl"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
                    placeholder="https://example.com/resource.pdf"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
                  <Input
                    id="thumbnailUrl"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="isPublic">Public Resource</Label>
                      <p className="text-sm text-gray-500">
                        Make this resource visible to all users
                      </p>
                    </div>
                    <Switch
                      id="isPublic"
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="isPremium">Premium Resource</Label>
                      <p className="text-sm text-gray-500">
                        Require premium access to view this resource
                      </p>
                    </div>
                    <Switch
                      id="isPremium"
                      checked={formData.isPremium}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPremium: checked }))}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className={`flex space-x-4 pt-4 border-t ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={creating || updating}
                className="flex-1"
              >
                {creating || updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {selectedResource ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {selectedResource ? 'Update Resource' : 'Create Resource'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourceManager; 