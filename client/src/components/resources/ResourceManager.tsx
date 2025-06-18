import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useResources } from '../../hooks/useResources';
import { 
  Resource, 
  CreateResourceData, 
  UpdateResourceData,
  ResourceUploadOptions,
  ResourceLinkData,
  ResourceSearchParamsNew
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
  Search,
  Link,
  Paperclip
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
    loading: resourcesLoading, 
    creating: creating, 
    updating: updating, 
    deleting: deleting,
    createResource,
    updateResource,
    deleteResource,
    searchResources,
    uploadResource,
    createLinkResource
  } = useResources();

  // State management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createMode, setCreateMode] = useState<'upload' | 'link'>('upload');

  // Form state for uploads
  const [uploadFormData, setUploadFormData] = useState<ResourceUploadOptions>({
    title: '',
    type: 'file',
    description: '',
    is_public: false,
    tags: []
  });

  // Form state for links
  const [linkFormData, setLinkFormData] = useState<ResourceLinkData>({
    title: '',
    link_url: '',
    description: '',
    is_public: false,
    tags: []
  });

  // Form state for updates
  const [updateFormData, setUpdateFormData] = useState<Partial<UpdateResourceData>>({});

  const [tagInput, setTagInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Get filtered resources
  const filteredResources = searchResources({
    query: searchTerm,
    type: filterType !== 'all' ? filterType as Resource['type'] : undefined,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Handle file upload form submission
  const handleUploadSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFormData.title || !uploadedFile) {
      return;
    }

    try {
      await uploadResource({
        file: uploadedFile,
        options: uploadFormData
      });

      setShowCreateModal(false);
      resetUploadForm();
    } catch (error) {
      console.error('Failed to upload resource:', error);
    }
  }, [uploadFormData, uploadedFile, uploadResource]);

  // Handle link form submission
  const handleLinkSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkFormData.title || !linkFormData.link_url) {
      return;
    }

    try {
      await createLinkResource(linkFormData);
      setShowCreateModal(false);
      resetLinkForm();
    } catch (error) {
      console.error('Failed to create link resource:', error);
    }
  }, [linkFormData, createLinkResource]);

  // Handle edit form submission
  const handleEditSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedResource || !updateFormData.title) {
      return;
    }

    try {
      await updateResource({
        id: selectedResource.id,
        ...updateFormData
      });

      setShowEditModal(false);
      resetEditForm();
    } catch (error) {
      console.error('Failed to update resource:', error);
    }
  }, [selectedResource, updateFormData, updateResource]);

  // Reset forms
  const resetUploadForm = useCallback(() => {
    setUploadFormData({
      title: '',
      type: 'file',
      description: '',
      is_public: false,
      tags: []
    });
    setTagInput('');
    setUploadedFile(null);
  }, []);

  const resetLinkForm = useCallback(() => {
    setLinkFormData({
      title: '',
      link_url: '',
      description: '',
      is_public: false,
      tags: []
    });
    setTagInput('');
  }, []);

  const resetEditForm = useCallback(() => {
    setUpdateFormData({});
    setSelectedResource(null);
    setTagInput('');
  }, []);

  // Handle edit
  const handleEdit = useCallback((resource: Resource) => {
    setSelectedResource(resource);
    setUpdateFormData({
      title: resource.title,
      description: resource.description,
      type: resource.type,
      is_public: resource.is_public,
      tags: resource.tags
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

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file);
    if (!uploadFormData.title) {
      setUploadFormData(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, '')
      }));
    }
  }, [uploadFormData.title]);

  // Add tag helpers
  const addTag = useCallback((formType: 'upload' | 'link' | 'edit') => {
    if (!tagInput.trim()) return;
    
    if (formType === 'upload') {
      setUploadFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
    } else if (formType === 'link') {
      setLinkFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
    } else if (formType === 'edit') {
      setUpdateFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
    }
    
    setTagInput('');
  }, [tagInput]);

  const removeTag = useCallback((tagToRemove: string, formType: 'upload' | 'link' | 'edit') => {
    if (formType === 'upload') {
      setUploadFormData(prev => ({
        ...prev,
        tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
      }));
    } else if (formType === 'link') {
      setLinkFormData(prev => ({
        ...prev,
        tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
      }));
    } else if (formType === 'edit') {
      setUpdateFormData(prev => ({
        ...prev,
        tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
      }));
    }
  }, []);

  // Icon helpers
  const getTypeIcon = (type: Resource['type']) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'pdf': return <BookOpen className="h-4 w-4" />;
      case 'link': return <Link className="h-4 w-4" />;
      case 'file':
      default: return <File className="h-4 w-4" />;
    }
  };

  const getTypeColorClasses = (type: Resource['type']) => {
    switch (type) {
      case 'video': return 'bg-red-100 text-red-800 border-red-200';
      case 'document': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pdf': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'link': return 'bg-green-100 text-green-800 border-green-200';
      case 'file':
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: Resource['type']) => {
    switch (type) {
      case 'video': return 'Video';
      case 'document': return 'Document';
      case 'pdf': return 'PDF';
      case 'link': return 'Link';
      case 'file':
      default: return 'File';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (resourcesLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span>Resource Library</span>
            {showCreateButton && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`flex flex-col md:flex-row gap-4 items-center ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <div className={`flex-1 relative ${isRTL ? 'ml-4' : 'mr-4'}`}>
              <Search className={`absolute top-3 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="file">Files</SelectItem>
                <SelectItem value="link">Links</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="pdf">PDFs</SelectItem>
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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
              onClick={() => onResourceSelect?.(resource)}
            >
              <CardContent className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                {/* Header */}
                <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`p-2 rounded-lg border ${getTypeColorClasses(resource.type)}`}>
                      {getTypeIcon(resource.type)}
                    </div>
                    <Badge variant="secondary" className={getTypeColorClasses(resource.type)}>
                      {getTypeLabel(resource.type)}
                    </Badge>
                  </div>
                  
                  <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {resource.is_public && (
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        Public
                      </Badge>
                    )}
                    {profile?.role === 'coach' && resource.coach_id === profile.id && (
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
                  {resource.description && (
                    <p className="text-gray-600 text-sm line-clamp-3">{resource.description}</p>
                  )}
                  
                  {/* Meta info */}
                  <div className={`flex items-center justify-between text-xs text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {resource.file_size && (
                        <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <File className="w-3 h-3" />
                          <span>{formatFileSize(resource.file_size)}</span>
                        </div>
                      )}
                      <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(resource.created_at)}</span>
                      </div>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          resetUploadForm();
          resetLinkForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Resource</DialogTitle>
            <DialogDescription>
              Add a new resource by uploading a file or providing a link.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={createMode} onValueChange={(value) => setCreateMode(value as 'upload' | 'link')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="link">Add Link</TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="upload-title">Title *</Label>
                  <Input
                    id="upload-title"
                    value={uploadFormData.title}
                    onChange={(e) => setUploadFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter resource title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upload-description">Description</Label>
                  <Textarea
                    id="upload-description"
                    value={uploadFormData.description}
                    onChange={(e) => setUploadFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this resource is about"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upload-type">Type</Label>
                  <Select 
                    value={uploadFormData.type} 
                    onValueChange={(value) => setUploadFormData(prev => ({ ...prev, type: value as Exclude<Resource['type'], 'link'> }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file">File</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>File Upload *</Label>
                  <SimpleFileUploader
                    onUploadComplete={handleFileUpload}
                    maxSize={50 * 1024 * 1024} // 50MB
                  />
                  {uploadedFile && (
                    <div className="text-sm text-green-600">
                      ✓ File ready: {uploadedFile.name} ({formatFileSize(uploadedFile.size)})
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upload-tags">Tags</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="upload-tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag('upload');
                        }
                      }}
                    />
                    <Button type="button" onClick={() => addTag('upload')}>
                      Add
                    </Button>
                  </div>
                  {uploadFormData.tags && uploadFormData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {uploadFormData.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeTag(tag, 'upload')}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="upload-public">Public Resource</Label>
                    <p className="text-sm text-gray-500">
                      Make this resource visible to all users
                    </p>
                  </div>
                  <Switch
                    id="upload-public"
                    checked={uploadFormData.is_public}
                    onCheckedChange={(checked) => setUploadFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                </div>

                <div className={`flex space-x-4 pt-4 border-t ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={creating || !uploadedFile}
                    className="flex-1"
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Resource
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="link">
              <form onSubmit={handleLinkSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link-title">Title *</Label>
                  <Input
                    id="link-title"
                    value={linkFormData.title}
                    onChange={(e) => setLinkFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter resource title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link-url">Link URL *</Label>
                  <Input
                    id="link-url"
                    type="url"
                    value={linkFormData.link_url}
                    onChange={(e) => setLinkFormData(prev => ({ ...prev, link_url: e.target.value }))}
                    placeholder="https://example.com/resource"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link-description">Description</Label>
                  <Textarea
                    id="link-description"
                    value={linkFormData.description}
                    onChange={(e) => setLinkFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this resource is about"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link-tags">Tags</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="link-tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag('link');
                        }
                      }}
                    />
                    <Button type="button" onClick={() => addTag('link')}>
                      Add
                    </Button>
                  </div>
                  {linkFormData.tags && linkFormData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {linkFormData.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeTag(tag, 'link')}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="link-public">Public Resource</Label>
                    <p className="text-sm text-gray-500">
                      Make this resource visible to all users
                    </p>
                  </div>
                  <Switch
                    id="link-public"
                    checked={linkFormData.is_public}
                    onCheckedChange={(checked) => setLinkFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                </div>

                <div className={`flex space-x-4 pt-4 border-t ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={creating}
                    className="flex-1"
                  >
                    {creating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4 mr-2" />
                        Add Link
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowEditModal(false);
          resetEditForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>
              Update the resource information below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={updateFormData.title || ''}
                onChange={(e) => setUpdateFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter resource title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={updateFormData.description || ''}
                onChange={(e) => setUpdateFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this resource is about"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <div className="flex space-x-2">
                <Input
                  id="edit-tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('edit');
                    }
                  }}
                />
                <Button type="button" onClick={() => addTag('edit')}>
                  Add
                </Button>
              </div>
              {updateFormData.tags && updateFormData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {updateFormData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeTag(tag, 'edit')}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-public">Public Resource</Label>
                <p className="text-sm text-gray-500">
                  Make this resource visible to all users
                </p>
              </div>
              <Switch
                id="edit-public"
                checked={updateFormData.is_public || false}
                onCheckedChange={(checked) => setUpdateFormData(prev => ({ ...prev, is_public: checked }))}
              />
            </div>

            <div className={`flex space-x-4 pt-4 border-t ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updating}
                className="flex-1"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Resource
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