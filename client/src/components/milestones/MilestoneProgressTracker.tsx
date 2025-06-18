import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Calendar,
  User,
  FileText,
  Plus,
  Save,
  Target,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Slider } from '../ui/slider';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { useMilestones } from '../../hooks/useMilestones';
import {
  Milestone,
  MilestoneProgress,
  RecordMilestoneProgressRequest,
  MILESTONE_STATUS_CONFIG,
  MILESTONE_PRIORITY_CONFIG
} from '../../types/milestone';

interface MilestoneProgressTrackerProps {
  milestone: Milestone;
  onProgressUpdate: (progress: MilestoneProgress) => void;
  onMilestoneUpdate: (milestone: Milestone) => void;
  sessions?: Array<{ id: string; date: string; notes?: string }>;
  currentUserId: string;
}

const MilestoneProgressTracker: React.FC<MilestoneProgressTrackerProps> = ({
  milestone,
  onProgressUpdate,
  onMilestoneUpdate,
  sessions = [],
  currentUserId
}) => {
  const { t } = useTranslation();
  const { recordProgress, updateMilestone } = useMilestones();
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [progressForm, setProgressForm] = useState<RecordMilestoneProgressRequest>({
    milestoneId: milestone.id,
    progressPercent: milestone.progress[milestone.progress.length - 1]?.progressPercent || 0,
    notes: '',
    evidence: '',
    sessionId: ''
  });

  const latestProgress = milestone.progress[milestone.progress.length - 1];
  const currentProgress = latestProgress?.progressPercent || 0;
  
  const handleProgressSubmit = async () => {
    try {
      const newProgress = await recordProgress(progressForm);
      onProgressUpdate(newProgress);

      // Auto-complete milestone if progress reaches 100%
      if (progressForm.progressPercent >= 100 && milestone.status !== 'completed') {
        const updatedMilestone = await updateMilestone(milestone.id, {
          status: 'completed'
        });
        onMilestoneUpdate(updatedMilestone);
      }

      setIsProgressDialogOpen(false);
      setProgressForm({
        milestoneId: milestone.id,
        progressPercent: 0,
        notes: '',
        evidence: '',
        sessionId: ''
      });
    } catch (error) {
      console.error('Error recording progress:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updatedMilestone = await updateMilestone(milestone.id, {
        status: newStatus as 'active' | 'completed' | 'paused' | 'cancelled'
      });
      onMilestoneUpdate(updatedMilestone);
    } catch (error) {
      console.error('Error updating milestone status:', error);
    }
  };

  const getProgressTrend = () => {
    if (milestone.progress.length < 2) return null;
    
    const previousProgress = milestone.progress[milestone.progress.length - 2];
    const currentProgress = milestone.progress[milestone.progress.length - 1];
    const trend = currentProgress.progressPercent - previousProgress.progressPercent;
    
    return {
      value: trend,
      isPositive: trend > 0,
      isNegative: trend < 0
    };
  };

  const getStatusColor = (status: string) => {
    return MILESTONE_STATUS_CONFIG[status as keyof typeof MILESTONE_STATUS_CONFIG]?.color || '#6B7280';
  };

  const getStatusBgColor = (status: string) => {
    return MILESTONE_STATUS_CONFIG[status as keyof typeof MILESTONE_STATUS_CONFIG]?.bgColor || '#F3F4F6';
  };

  const getPriorityColor = (priority: string) => {
    return MILESTONE_PRIORITY_CONFIG[priority as keyof typeof MILESTONE_PRIORITY_CONFIG]?.color || '#6B7280';
  };

  const trend = getProgressTrend();
  const isOverdue = milestone.targetDate && 
                   new Date(milestone.targetDate) < new Date() && 
                   milestone.status !== 'completed';

  return (
    <Card className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5" />
              {milestone.title}
            </CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="secondary"
                style={{ 
                  backgroundColor: getStatusBgColor(milestone.status),
                  color: getStatusColor(milestone.status)
                }}
              >
                {MILESTONE_STATUS_CONFIG[milestone.status as keyof typeof MILESTONE_STATUS_CONFIG]?.label}
              </Badge>
              <Badge 
                variant="outline"
                style={{ 
                  borderColor: getPriorityColor(milestone.priority),
                  color: getPriorityColor(milestone.priority)
                }}
              >
                {MILESTONE_PRIORITY_CONFIG[milestone.priority as keyof typeof MILESTONE_PRIORITY_CONFIG]?.label}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t('milestones.status.overdue')}
                </Badge>
              )}
            </div>
            {milestone.description && (
              <p className="text-gray-600 text-sm mb-2">{milestone.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {milestone.category && (
                <span className="flex items-center gap-1">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: milestone.category.color }}
                  />
                  {milestone.category.name}
                </span>
              )}
              {milestone.targetDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(milestone.targetDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={milestone.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('milestones.status.active')}</SelectItem>
                <SelectItem value="completed">{t('milestones.status.completed')}</SelectItem>
                <SelectItem value="paused">{t('milestones.status.paused')}</SelectItem>
                <SelectItem value="cancelled">{t('milestones.status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('milestones.progress.update')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('milestones.progress.updateTitle')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t('milestones.progress.percentage')}</Label>
                    <div className="space-y-2">
                      <Slider
                        value={[progressForm.progressPercent]}
                        onValueChange={(value) => 
                          setProgressForm(prev => ({ ...prev, progressPercent: value[0] }))
                        }
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>0%</span>
                        <span className="font-medium">{progressForm.progressPercent}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">{t('milestones.progress.notes')}</Label>
                    <Textarea
                      id="notes"
                      value={progressForm.notes}
                      onChange={(e) => setProgressForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={t('milestones.progress.notesPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="evidence">{t('milestones.progress.evidence')}</Label>
                    <Input
                      id="evidence"
                      value={progressForm.evidence}
                      onChange={(e) => setProgressForm(prev => ({ ...prev, evidence: e.target.value }))}
                      placeholder={t('milestones.progress.evidencePlaceholder')}
                    />
                  </div>
                  {sessions.length > 0 && (
                    <div>
                      <Label htmlFor="session">{t('milestones.progress.linkToSession')}</Label>
                      <Select 
                        value={progressForm.sessionId} 
                        onValueChange={(value) => setProgressForm(prev => ({ ...prev, sessionId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('milestones.progress.selectSession')} />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {new Date(session.date).toLocaleDateString()} 
                              {session.notes && ` - ${session.notes.substring(0, 30)}...`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsProgressDialogOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleProgressSubmit}>
                      <Save className="h-4 w-4 mr-2" />
                      {t('milestones.progress.save')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('milestones.progress.current')}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{currentProgress}%</span>
                {trend && (
                  <div className={`flex items-center gap-1 text-sm ${
                    trend.isPositive ? 'text-green-600' : trend.isNegative ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    <TrendingUp className={`h-3 w-3 ${trend.isNegative ? 'rotate-180' : ''}`} />
                    {trend.isPositive ? '+' : ''}{trend.value}%
                  </div>
                )}
              </div>
            </div>
            <Progress value={currentProgress} className="h-3" />
            {milestone.status === 'completed' && (
              <div className="flex items-center gap-2 mt-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('milestones.progress.completedOn')} {
                    milestone.completedAt ? new Date(milestone.completedAt).toLocaleDateString() : ''
                  }
                </span>
              </div>
            )}
          </div>

          {/* Progress History */}
          {milestone.progress.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">{t('milestones.progress.history')}</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {milestone.progress
                  .slice()
                  .reverse()
                  .map((progress, index) => (
                    <div key={progress.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {progress.progressPercent}%
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {new Date(progress.recordedAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(progress.recordedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        {progress.notes && (
                          <p className="text-sm text-gray-700 mb-2">{progress.notes}</p>
                        )}
                        {progress.evidence && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <FileText className="h-3 w-3" />
                            {progress.evidence}
                          </div>
                        )}
                        {progress.sessionId && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <Calendar className="h-3 w-3" />
                            {t('milestones.progress.linkedToSession')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Milestone Notes */}
          {milestone.notes && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t('milestones.notes')}</h4>
              <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{milestone.notes}</p>
            </div>
          )}

          {/* Tags */}
          {milestone.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t('milestones.tags')}</h4>
              <div className="flex flex-wrap gap-2">
                {milestone.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MilestoneProgressTracker; 