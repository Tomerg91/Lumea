import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  Filter,
  Target,
  Calendar,
  User,
  Tag,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  X,
  Edit,
  Trash2,
  BarChart3,
  Users,
  BookOpen,
  Briefcase,
  Heart,
  DollarSign
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { useMilestones } from '../../hooks/useMilestones';
import {
  Milestone,
  MilestoneCategory,
  MilestoneStats,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  MILESTONE_PRIORITY_CONFIG,
  MILESTONE_STATUS_CONFIG,
  DEFAULT_MILESTONE_CATEGORIES
} from '../../types/milestone';

interface MilestoneManagerProps {
  clientId?: string; // If provided, show milestones for specific client
  coachId: string;
  onMilestoneCreate?: (milestone: Milestone) => void;
  onMilestoneUpdate?: (milestone: Milestone) => void;
  onMilestoneDelete?: (milestoneId: string) => void;
}

const MilestoneManager: React.FC<MilestoneManagerProps> = ({
  clientId,
  coachId,
  onMilestoneCreate,
  onMilestoneUpdate,
  onMilestoneDelete
}) => {
  const { t } = useTranslation();
  const {
    milestones,
    categories,
    stats,
    loading,
    creating,
    updating,
    deleting,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    searchMilestones
  } = useMilestones(clientId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  // Form state for creating/editing milestones
  const [formData, setFormData] = useState<CreateMilestoneRequest>({
    title: '',
    description: '',
    targetDate: '',
    priority: 'medium',
    clientId: clientId || '',
    categoryId: '',
    notes: '',
    tags: []
  });

  // Filter milestones based on search and filters
  const filteredMilestones = searchMilestones({
    search: searchTerm,
    status: selectedStatus !== 'all' ? [selectedStatus] : undefined,
    priority: selectedPriority !== 'all' ? [selectedPriority] : undefined,
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
    clientId: clientId
  });

  const handleCreateMilestone = async () => {
    try {
      const newMilestone = await createMilestone(formData);
      onMilestoneCreate?.(newMilestone);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating milestone:', error);
    }
  };

  const handleUpdateMilestone = async (milestone: Milestone, updates: UpdateMilestoneRequest) => {
    try {
      const updatedMilestone = await updateMilestone(milestone.id, updates);
      onMilestoneUpdate?.(updatedMilestone);
      setEditingMilestone(null);
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await deleteMilestone(milestoneId);
      onMilestoneDelete?.(milestoneId);
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetDate: '',
      priority: 'medium',
      clientId: clientId || '',
      categoryId: '',
      notes: '',
      tags: []
    });
  };

  const getLatestProgress = (milestone: Milestone) => {
    return milestone.progress[milestone.progress.length - 1];
  };

  const getStatusIcon = (status: string) => {
    const config = MILESTONE_STATUS_CONFIG[status as keyof typeof MILESTONE_STATUS_CONFIG];
    if (!config?.icon) return null;
    
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      Play,
      CheckCircle,
      Pause,
      X
    };
    
    const IconComponent = iconMap[config.icon];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const getPriorityIcon = (priority: string) => {
    const config = MILESTONE_PRIORITY_CONFIG[priority as keyof typeof MILESTONE_PRIORITY_CONFIG];
    if (!config?.icon) return null;
    
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      AlertTriangle,
      Clock,
      CheckCircle
    };
    
    const IconComponent = iconMap[config.icon];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const getCategoryIcon = (categoryName?: string) => {
    const iconMap = {
      'Personal Growth': User,
      'Career Development': Briefcase,
      'Health & Wellness': Heart,
      'Relationships': Users,
      'Skills & Learning': BookOpen,
      'Financial': DollarSign
    };
    
    const IconComponent = iconMap[categoryName as keyof typeof iconMap] || Target;
    return <IconComponent className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('milestones.stats.total')}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('milestones.stats.active')}</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
                </div>
                <Play className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('milestones.stats.completed')}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('milestones.stats.averageProgress')}</p>
                  <p className="text-2xl font-bold">{Math.round(stats.averageProgress)}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('milestones.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('milestones.filters.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('milestones.filters.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('milestones.status.active')}</SelectItem>
                  <SelectItem value="completed">{t('milestones.status.completed')}</SelectItem>
                  <SelectItem value="paused">{t('milestones.status.paused')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('milestones.filters.priority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('milestones.filters.allPriorities')}</SelectItem>
                  <SelectItem value="high">{t('milestones.priority.high')}</SelectItem>
                  <SelectItem value="medium">{t('milestones.priority.medium')}</SelectItem>
                  <SelectItem value="low">{t('milestones.priority.low')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('milestones.filters.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('milestones.filters.allCategories')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Milestone Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('milestones.title')}</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('milestones.create.button')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('milestones.create.title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">{t('milestones.form.title')}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('milestones.form.titlePlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="description">{t('milestones.form.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('milestones.form.descriptionPlaceholder')}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">{t('milestones.form.priority')}</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as 'high' | 'medium' | 'low' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t('milestones.priority.high')}</SelectItem>
                      <SelectItem value="medium">{t('milestones.priority.medium')}</SelectItem>
                      <SelectItem value="low">{t('milestones.priority.low')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="targetDate">{t('milestones.form.targetDate')}</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="category">{t('milestones.form.category')}</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('milestones.form.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateMilestone} disabled={!formData.title}>
                  {t('milestones.create.submit')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        {filteredMilestones.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('milestones.empty.title')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('milestones.empty.description')}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('milestones.create.button')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredMilestones.map((milestone) => {
            const latestProgress = getLatestProgress(milestone);
            const progressPercent = latestProgress?.progressPercent || 0;
            const isOverdue = milestone.targetDate && 
                             new Date(milestone.targetDate) < new Date() && 
                             milestone.status !== 'completed';

            return (
              <Card key={milestone.id} className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getCategoryIcon(milestone.category?.name)}
                        <h3 className="text-lg font-semibold">{milestone.title}</h3>
                        <Badge 
                          variant="secondary" 
                          className="flex items-center gap-1"
                          style={{ 
                            backgroundColor: MILESTONE_STATUS_CONFIG[milestone.status as keyof typeof MILESTONE_STATUS_CONFIG]?.bgColor,
                            color: MILESTONE_STATUS_CONFIG[milestone.status as keyof typeof MILESTONE_STATUS_CONFIG]?.color
                          }}
                        >
                          {getStatusIcon(milestone.status)}
                          {MILESTONE_STATUS_CONFIG[milestone.status as keyof typeof MILESTONE_STATUS_CONFIG]?.label}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="flex items-center gap-1"
                          style={{ 
                            borderColor: MILESTONE_PRIORITY_CONFIG[milestone.priority as keyof typeof MILESTONE_PRIORITY_CONFIG]?.color,
                            color: MILESTONE_PRIORITY_CONFIG[milestone.priority as keyof typeof MILESTONE_PRIORITY_CONFIG]?.color
                          }}
                        >
                          {getPriorityIcon(milestone.priority)}
                          {MILESTONE_PRIORITY_CONFIG[milestone.priority as keyof typeof MILESTONE_PRIORITY_CONFIG]?.label}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t('milestones.status.overdue')}
                          </Badge>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-gray-600 mb-3">{milestone.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        {milestone.category && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            {milestone.category.name}
                          </div>
                        )}
                        {milestone.targetDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(milestone.targetDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{t('milestones.progress.label')}</span>
                          <span className="font-medium">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                        {latestProgress?.notes && (
                          <p className="text-sm text-gray-600 italic">
                            "{latestProgress.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingMilestone(milestone)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMilestone(milestone.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {milestone.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {milestone.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MilestoneManager; 