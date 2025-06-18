import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useClientResources } from '../../hooks/useResources';
import { ResourceAssignment, Resource } from '../../types/resource';
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
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  BookOpen,
  Search,
  FileText,
  Video,
  File,
  Link,
  Download,
  ExternalLink,
  Clock,
  Calendar,
  CheckCircle,
  Eye,
  AlertCircle,
  Filter,
  Grid,
  List,
  User
} from 'lucide-react';

interface ResourceLibraryProps {
  compact?: boolean;
}

export const ResourceLibrary: React.FC<ResourceLibraryProps> = ({
  compact = false
}) => {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { 
    assignedResources, 
    loading, 
    error,
    markAsViewed,
    markAsCompleted,
    markingAsViewed,
    markingAsCompleted
  } = useClientResources();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedResource, setSelectedResource] = useState<ResourceAssignment | null>(null);
  const [showResourceModal, setShowResourceModal] = useState(false);

  // Get filtered resources
  const filteredResources = assignedResources.filter(assignment => {
    const resource = assignment.resource;
    if (!resource) return false;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matches = 
        resource.title.toLowerCase().includes(searchLower) ||
        resource.description?.toLowerCase().includes(searchLower) ||
        resource.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        assignment.notes?.toLowerCase().includes(searchLower);
      
      if (!matches) return false;
    }

    // Type filter
    if (filterType !== 'all' && resource.type !== filterType) {
      return false;
    }

    // Status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'completed':
          if (!assignment.completed_at) return false;
          break;
        case 'viewed':
          if (!assignment.viewed_at || assignment.completed_at) return false;
          break;
        case 'unviewed':
          if (assignment.viewed_at) return false;
          break;
        case 'overdue':
          if (!assignment.due_date || assignment.completed_at) return false;
          const dueDate = new Date(assignment.due_date);
          const now = new Date();
          if (dueDate > now) return false;
          break;
      }
    }

    return true;
  }).sort((a, b) => {
    // Sort by assignment date, most recent first
    return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
  });

  // Handle resource access
  const handleResourceAccess = useCallback(async (assignment: ResourceAssignment) => {
    const resource = assignment.resource;
    if (!resource) return;

    try {
      // Mark as viewed if not already viewed
      if (!assignment.viewed_at) {
        await markAsViewed(assignment.id);
      }

      // Handle different resource types
      if (resource.type === 'link' && resource.link_url) {
        window.open(resource.link_url, '_blank');
      } else if (resource.file_url) {
        // For files, show in modal first, then allow download
        setSelectedResource(assignment);
        setShowResourceModal(true);
      }
    } catch (error) {
      console.error('Failed to access resource:', error);
    }
  }, [markAsViewed]);

  // Handle mark as completed
  const handleMarkCompleted = useCallback(async (assignment: ResourceAssignment) => {
    try {
      await markAsCompleted(assignment.id);
    } catch (error) {
      console.error('Failed to mark resource as completed:', error);
    }
  }, [markAsCompleted]);

  // Download file
  const handleDownload = useCallback((resource: Resource) => {
    if (resource.file_url) {
      const link = document.createElement('a');
      link.href = resource.file_url;
      link.download = resource.file_name || resource.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  const getStatusBadge = (assignment: ResourceAssignment) => {
    if (assignment.completed_at) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }

    if (assignment.due_date) {
      const dueDate = new Date(assignment.due_date);
      const now = new Date();
      const isOverdue = dueDate < now;

      if (isOverdue) {
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      }
    }

    if (assignment.viewed_at) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
          <Eye className="h-3 w-3 mr-1" />
          Viewed
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        New
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
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

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Resources</h3>
          <p className="text-gray-600">Failed to load your assigned resources. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span>My Resources</span>
            <div className="text-sm text-gray-500">
              {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}
            </div>
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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unviewed">New</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <div className={`flex space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
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
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                ? 'No resources found' 
                : 'No resources assigned yet'
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search terms or filters'
                : 'Your coach will assign resources as part of your coaching journey'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {filteredResources.map((assignment) => {
            const resource = assignment.resource;
            if (!resource) return null;

            return (
              <Card 
                key={assignment.id} 
                className={`hover:shadow-lg transition-all duration-300 cursor-pointer ${
                  viewMode === 'list' ? 'flex flex-row' : ''
                }`}
                onClick={() => handleResourceAccess(assignment)}
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
                      {getStatusBadge(assignment)}
                      {assignment.is_required && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold line-clamp-2">{resource.title}</h3>
                    {resource.description && (
                      <p className="text-gray-600 text-sm line-clamp-3">{resource.description}</p>
                    )}
                    
                    {/* Coach Notes */}
                    {assignment.notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <User className="h-3 w-3 text-blue-600" />
                          <span className="text-xs font-medium text-blue-600">Coach Notes</span>
                        </div>
                        <p className="text-sm text-blue-800">{assignment.notes}</p>
                      </div>
                    )}
                    
                    {/* Meta info */}
                    <div className={`flex items-center justify-between text-xs text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center space-x-4 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          <span>Assigned {formatDate(assignment.assigned_at)}</span>
                        </div>
                        {assignment.due_date && (
                          <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <Clock className="w-3 h-3" />
                            <span>Due {formatDate(assignment.due_date)}</span>
                          </div>
                        )}
                        {resource.file_size && (
                          <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <File className="w-3 h-3" />
                            <span>{formatFileSize(resource.file_size)}</span>
                          </div>
                        )}
                      </div>
                      
                      {assignment.view_count > 0 && (
                        <div className={`flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <Eye className="w-3 h-3" />
                          <span>Viewed {assignment.view_count} time{assignment.view_count !== 1 ? 's' : ''}</span>
                        </div>
                      )}
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

                    {/* Action Buttons */}
                    <div className={`flex space-x-2 pt-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {resource.type === 'link' && resource.link_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResourceAccess(assignment);
                          }}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open Link
                        </Button>
                      )}
                      
                      {resource.file_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(resource);
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      )}

                      {!assignment.completed_at && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={markingAsCompleted}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkCompleted(assignment);
                          }}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resource Detail Modal */}
      <Dialog open={showResourceModal} onOpenChange={setShowResourceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedResource && selectedResource.resource && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  {getTypeIcon(selectedResource.resource.type)}
                  <span>{selectedResource.resource.title}</span>
                </DialogTitle>
                <DialogDescription>
                  {selectedResource.resource.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Resource Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Resource Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <Badge className={getTypeColorClasses(selectedResource.resource.type)}>
                          {getTypeLabel(selectedResource.resource.type)}
                        </Badge>
                      </div>
                      {selectedResource.resource.file_size && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span>{formatFileSize(selectedResource.resource.file_size)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span>{formatDate(selectedResource.resource.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Assignment Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Assigned:</span>
                        <span>{formatDate(selectedResource.assigned_at)}</span>
                      </div>
                      {selectedResource.due_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Due Date:</span>
                          <span>{formatDate(selectedResource.due_date)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        {getStatusBadge(selectedResource)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Required:</span>
                        <span>{selectedResource.is_required ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coach Notes */}
                {selectedResource.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Coach Notes</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">{selectedResource.notes}</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedResource.resource.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedResource.resource.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className={`flex space-x-4 pt-4 border-t ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Button
                    variant="outline"
                    onClick={() => setShowResourceModal(false)}
                  >
                    Close
                  </Button>
                  
                  {selectedResource.resource.type === 'link' && selectedResource.resource.link_url && (
                    <Button
                      onClick={() => {
                        if (selectedResource.resource?.link_url) {
                          window.open(selectedResource.resource.link_url, '_blank');
                        }
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Link
                    </Button>
                  )}
                  
                  {selectedResource.resource.file_url && (
                    <Button
                      onClick={() => handleDownload(selectedResource.resource!)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}

                  {!selectedResource.completed_at && (
                    <Button
                      disabled={markingAsCompleted}
                      onClick={() => handleMarkCompleted(selectedResource)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourceLibrary; 