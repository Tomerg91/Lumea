import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useMobileDetection } from '../hooks/useMobileDetection';
import useClientsData from '../hooks/useClientsData';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Copy, 
  Trash2,
  Clock,
  Users,
  Tag,
  MoreVertical,
  Repeat,
  FileText,
  Settings
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { TemplateDesignModal } from '../components/templates/TemplateDesignModal';
import { MobileTemplateList } from '../components/mobile/MobileTemplateList';
import { TemplateSessionCreator } from '../components/templates/TemplateSessionCreator';
import { sessionTemplateService } from '../services/sessionTemplateService';
import { SessionTemplate, TemplateType } from '../types/sessionTemplate';
import { formatDistanceToNow } from 'date-fns';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SessionTemplatesPageProps {}

export const SessionTemplatesPage: React.FC<SessionTemplatesPageProps> = () => {
  const { t } = useTranslation();
  const { profile: _profile } = useAuth();
  const { isMobile } = useMobileDetection();
  const { clients } = useClientsData(1, 100); // Fetch all clients for session creation

  // State management
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TemplateType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Modal states
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<SessionTemplate | null>(null);
  const [isSessionCreatorOpen, setIsSessionCreatorOpen] = useState(false);
  const [templateForSession, setTemplateForSession] = useState<SessionTemplate | null>(null);

  // Categories derived from templates
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
  }, [selectedType, selectedCategory, showActiveOnly]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = {
        type: selectedType !== 'all' ? selectedType : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        isActive: showActiveOnly ? true : undefined,
        search: searchQuery || undefined,
        limit: 100,
        sortBy: 'lastUsed' as const,
        sortOrder: 'desc' as const,
      };

      const response = await sessionTemplateService.getTemplates(queryParams);
      setTemplates(response.templates);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(response.templates.map(t => t.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCategories);

    } catch (error) {
      console.error('Error loading templates:', error);
      setError(error instanceof Error ? error.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadTemplates();
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsDesignModalOpen(true);
  };

  const handleEditTemplate = (template: SessionTemplate) => {
    setSelectedTemplate(template);
    setIsDesignModalOpen(true);
  };

  const handleCloneTemplate = async (template: SessionTemplate) => {
    try {
      const clonedTemplate = await sessionTemplateService.cloneTemplate(template.id, {
        name: `${template.name} (Copy)`,
        description: template.description,
        isPublic: false,
        category: template.category,
        tags: template.tags,
      });
      
      setTemplates(prev => [clonedTemplate, ...prev]);
    } catch (error) {
      console.error('Error cloning template:', error);
    }
  };

  const handleDeleteTemplate = (template: SessionTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      await sessionTemplateService.deleteTemplate(templateToDelete.id);
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleTemplateSaved = (savedTemplate: SessionTemplate) => {
    if (selectedTemplate) {
      // Update existing template
      setTemplates(prev => prev.map(t => t.id === savedTemplate.id ? savedTemplate : t));
    } else {
      // Add new template
      setTemplates(prev => [savedTemplate, ...prev]);
    }
    setIsDesignModalOpen(false);
    setSelectedTemplate(null);
  };

  const handleCreateSessionFromTemplate = (template: SessionTemplate) => {
    setTemplateForSession(template);
    setIsSessionCreatorOpen(true);
  };

  const handleSessionCreated = async (sessionData: {
    templateId: string;
    clientId: string;
    scheduledDate: Date;
    duration: number;
    customizations: {
      title?: string;
      notes?: string;
      objectives?: string[];
      structure?: any[];
    };
  }) => {
    try {
      // This would integrate with the session creation API
      // For now, we'll just close the modal and show success
      console.log('Creating session from template:', sessionData);
      
      // Close the modal
      setIsSessionCreatorOpen(false);
      setTemplateForSession(null);
      
      // You could add a success message or redirect to sessions page here
      // navigate('/sessions');
      
    } catch (error) {
      console.error('Error creating session from template:', error);
      // Handle error - could show error message to user
    }
  };

  const getTypeIcon = (type: TemplateType) => {
    switch (type) {
      case 'recurring':
        return <Repeat className="h-4 w-4" />;
      case 'assessment':
        return <Settings className="h-4 w-4" />;
      case 'follow-up':
        return <Users className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: TemplateType) => {
    switch (type) {
      case 'recurring':
        return 'bg-blue-100 text-blue-800';
      case 'assessment':
        return 'bg-purple-100 text-purple-800';
      case 'follow-up':
        return 'bg-green-100 text-green-800';
      case 'custom':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  // Use mobile component if on mobile
  if (isMobile) {
    return (
      <MobileTemplateList
        templates={filteredTemplates}
        loading={loading}
        error={error}
        onCreateTemplate={handleCreateTemplate}
        onEditTemplate={handleEditTemplate}
        onCloneTemplate={handleCloneTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onCreateSessionFromTemplate={handleCreateSessionFromTemplate}
        onRefresh={loadTemplates}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={handleSearch}
      />
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('templates.sessionTemplates')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('templates.manageTemplatesDescription')}
          </p>
        </div>
        
        <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('templates.createTemplate')}
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('templates.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as TemplateType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent"
            >
              <option value="all">{t('templates.allTypes')}</option>
              <option value="standard">{t('templates.standard')}</option>
              <option value="recurring">{t('templates.recurring')}</option>
              <option value="assessment">{t('templates.assessment')}</option>
              <option value="follow-up">{t('templates.followUp')}</option>
              <option value="custom">{t('templates.custom')}</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lumea-primary focus:border-transparent"
            >
              <option value="all">{t('templates.allCategories')}</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Active Filter */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              {t('templates.activeOnly')}
            </label>

            <Button onClick={handleSearch} variant="outline" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumea-primary"></div>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${getTypeColor(template.type)}`}>
                      {getTypeIcon(template.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {t(`templates.${template.type}`)}
                      </Badge>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCreateSessionFromTemplate(template)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('templates.createSession')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCloneTemplate(template)}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t('templates.clone')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteTemplate(template)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                <CardDescription className="mb-4 line-clamp-2">
                  {template.description || t('templates.noDescription')}
                </CardDescription>

                <div className="space-y-3">
                  {/* Template Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {template.defaultDuration} {t('common.minutes')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {template.usageCount} {t('templates.uses')}
                    </div>
                  </div>

                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Last Used */}
                  {template.lastUsed && (
                    <div className="text-xs text-gray-500">
                      {t('templates.lastUsed')}: {formatDistanceToNow(new Date(template.lastUsed), { addSuffix: true })}
                    </div>
                  )}

                  {/* Category */}
                  {template.category && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Tag className="h-3 w-3" />
                      {template.category}
                    </div>
                  )}

                  {/* Recurring indicator */}
                  {template.isRecurring && (
                    <Badge variant="secondary" className="text-xs">
                      <Repeat className="h-3 w-3 mr-1" />
                      {t('templates.recurring')}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('templates.noTemplatesFound')}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? t('templates.noTemplatesMatchSearch')
              : t('templates.createFirstTemplate')
            }
          </p>
          <Button onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('templates.createTemplate')}
          </Button>
        </div>
      )}

      {/* Template Design Modal */}
      <TemplateDesignModal
        isOpen={isDesignModalOpen}
        onClose={() => setIsDesignModalOpen(false)}
        template={selectedTemplate}
        onSave={handleTemplateSaved}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templates.deleteTemplate')}</DialogTitle>
            <DialogDescription>
              {t('templates.deleteConfirmation', { name: templateToDelete?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteTemplate}
            >
              {t('common.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Session Creator Modal */}
      <TemplateSessionCreator
        isOpen={isSessionCreatorOpen}
        onClose={() => setIsSessionCreatorOpen(false)}
        template={templateForSession}
        clients={clients || []}
        onCreateSession={handleSessionCreated}
        isLoading={false}
      />
    </div>
  );
};

export default SessionTemplatesPage; 