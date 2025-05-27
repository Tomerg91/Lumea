import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Plus, 
  Trash2, 
  Clock, 
  ArrowUp, 
  ArrowDown,
  Save,
  X
} from 'lucide-react';
import {
  SessionTemplate,
  TemplateType,
  SessionStructureComponent,
  SessionStructureType,
  CreateSessionTemplateRequest,
  UpdateSessionTemplateRequest,
  RecurrenceConfig as IRecurrenceConfig,
} from '../../types/sessionTemplate';
import { sessionTemplateService } from '../../services/sessionTemplateService';
import { RecurrenceConfig } from './RecurrenceConfig';

interface TemplateDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: SessionTemplate | null;
  onSave: (template: SessionTemplate) => void;
}

export const TemplateDesignModal: React.FC<TemplateDesignModalProps> = ({
  isOpen,
  onClose,
  template,
  onSave,
}) => {
  const { t } = useTranslation();
  const isEditing = !!template;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'standard' as TemplateType,
    defaultDuration: 60,
    objectives: [] as string[],
    defaultNotes: '',
    isRecurring: false,
    isPublic: false,
    category: '',
    tags: [] as string[],
  });

  const [structure, setStructure] = useState<SessionStructureComponent[]>([]);
  const [recurrenceConfig, setRecurrenceConfig] = useState<IRecurrenceConfig | null>(null);
  const [newObjective, setNewObjective] = useState('');
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        type: template.type,
        defaultDuration: template.defaultDuration,
        objectives: [...template.objectives],
        defaultNotes: template.defaultNotes || '',
        isRecurring: template.isRecurring,
        isPublic: template.isPublic,
        category: template.category || '',
        tags: [...template.tags],
      });
      setStructure([...template.structure]);
      setRecurrenceConfig(template.recurrenceConfig || null);
    } else {
      // Reset for new template
      setFormData({
        name: '',
        description: '',
        type: 'standard',
        defaultDuration: 60,
        objectives: [],
        defaultNotes: '',
        isRecurring: false,
        isPublic: false,
        category: '',
        tags: [],
      });
      setStructure([]);
      setRecurrenceConfig(null);
    }
    setError(null);
  }, [template, isOpen]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate form
      if (!formData.name.trim()) {
        setError('Template name is required');
        return;
      }

      if (formData.defaultDuration < 1 || formData.defaultDuration > 480) {
        setError('Duration must be between 1 and 480 minutes');
        return;
      }

      const templateData = {
        ...formData,
        structure,
        recurrenceConfig: formData.isRecurring ? recurrenceConfig : undefined,
      };

      let savedTemplate: SessionTemplate;
      if (isEditing && template) {
        savedTemplate = await sessionTemplateService.updateTemplate(
          template.id,
          templateData as UpdateSessionTemplateRequest
        );
      } else {
        savedTemplate = await sessionTemplateService.createTemplate(
          templateData as CreateSessionTemplateRequest
        );
      }

      onSave(savedTemplate);
    } catch (error) {
      console.error('Error saving template:', error);
      setError(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const addStructureComponent = () => {
    const newComponent: SessionStructureComponent = {
      id: `component-${Date.now()}`,
      type: 'check-in',
      title: 'New Component',
      description: '',
      estimatedDuration: 10,
      order: structure.length,
      isRequired: false,
      defaultContent: '',
      prompts: [],
    };
    setStructure([...structure, newComponent]);
  };

  const updateStructureComponent = (index: number, updates: Partial<SessionStructureComponent>) => {
    const updatedStructure = [...structure];
    updatedStructure[index] = { ...updatedStructure[index], ...updates };
    setStructure(updatedStructure);
  };

  const removeStructureComponent = (index: number) => {
    const updatedStructure = structure.filter((_, i) => i !== index);
    // Update order for remaining components
    updatedStructure.forEach((component, i) => {
      component.order = i;
    });
    setStructure(updatedStructure);
  };

  const moveComponent = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= structure.length) return;

    const updatedStructure = [...structure];
    [updatedStructure[index], updatedStructure[newIndex]] = [updatedStructure[newIndex], updatedStructure[index]];
    
    // Update order
    updatedStructure.forEach((component, i) => {
      component.order = i;
    });
    
    setStructure(updatedStructure);
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()],
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index),
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('templates.editTemplate') : t('templates.createTemplate')}
          </DialogTitle>
          <DialogDescription>
            {t('templates.designTemplateDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">{t('templates.templateName')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('templates.templateNamePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="type">{t('templates.templateType')}</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: TemplateType) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{t('templates.standard')}</SelectItem>
                  <SelectItem value="recurring">{t('templates.recurring')}</SelectItem>
                  <SelectItem value="assessment">{t('templates.assessment')}</SelectItem>
                  <SelectItem value="follow-up">{t('templates.followUp')}</SelectItem>
                  <SelectItem value="custom">{t('templates.custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">{t('templates.defaultDuration')} ({t('common.minutes')})</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="480"
                value={formData.defaultDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultDuration: parseInt(e.target.value) || 60 }))}
              />
            </div>

            <div>
              <Label htmlFor="category">{t('templates.category')}</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder={t('templates.categoryPlaceholder')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t('templates.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('templates.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Session Structure */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-medium">{t('templates.sessionStructure')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStructureComponent}>
                <Plus className="h-4 w-4 mr-2" />
                {t('templates.addComponent')}
              </Button>
            </div>

            <div className="space-y-4">
              {structure.map((component, index) => (
                <div key={component.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveComponent(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveComponent(index, 'down')}
                        disabled={index === structure.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStructureComponent(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">{t('templates.componentTitle')}</Label>
                      <Input
                        value={component.title}
                        onChange={(e) => updateStructureComponent(index, { title: e.target.value })}
                        placeholder={t('templates.componentTitlePlaceholder')}
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">{t('templates.componentType')}</Label>
                      <Select
                        value={component.type}
                        onValueChange={(value: SessionStructureType) => 
                          updateStructureComponent(index, { type: value })
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="check-in">{t('templates.checkIn')}</SelectItem>
                          <SelectItem value="goal-setting">{t('templates.goalSetting')}</SelectItem>
                          <SelectItem value="progress-review">{t('templates.progressReview')}</SelectItem>
                          <SelectItem value="assessment">{t('templates.assessment')}</SelectItem>
                          <SelectItem value="coaching">{t('templates.coaching')}</SelectItem>
                          <SelectItem value="custom">{t('templates.custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">{t('templates.estimatedDuration')} ({t('common.minutes')})</Label>
                      <Input
                        type="number"
                        min="1"
                        max="240"
                        value={component.estimatedDuration}
                        onChange={(e) => updateStructureComponent(index, { 
                          estimatedDuration: parseInt(e.target.value) || 10 
                        })}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">{t('templates.componentDescription')}</Label>
                    <Textarea
                      value={component.description || ''}
                      onChange={(e) => updateStructureComponent(index, { description: e.target.value })}
                      placeholder={t('templates.componentDescriptionPlaceholder')}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}

              {structure.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>{t('templates.noComponentsYet')}</p>
                  <p className="text-sm">{t('templates.addComponentsDescription')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Objectives */}
          <div>
            <Label className="text-base font-medium">{t('templates.sessionObjectives')}</Label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  placeholder={t('templates.addObjectivePlaceholder')}
                  onKeyPress={(e) => e.key === 'Enter' && addObjective()}
                />
                <Button type="button" variant="outline" onClick={addObjective}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.objectives.map((objective, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {objective}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeObjective(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-base font-medium">{t('templates.tags')}</Label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder={t('templates.addTagPlaceholder')}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div>
            <Label className="text-base font-medium">{t('templates.settings')}</Label>
            <div className="mt-2 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  id="isPublic"
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isPublic" className="text-sm">
                  {t('templates.makePublic')}
                </Label>
              </div>
            </div>
          </div>

          {/* Recurring Session Configuration */}
          <RecurrenceConfig
            config={recurrenceConfig}
            onChange={setRecurrenceConfig}
            isEnabled={formData.isRecurring}
            onEnabledChange={(enabled) => setFormData(prev => ({ ...prev, isRecurring: enabled }))}
          />

          {/* Default Notes */}
          <div>
            <Label htmlFor="defaultNotes">{t('templates.defaultNotes')}</Label>
            <Textarea
              id="defaultNotes"
              value={formData.defaultNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultNotes: e.target.value }))}
              placeholder={t('templates.defaultNotesPlaceholder')}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? t('common.save') : t('templates.createTemplate')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 