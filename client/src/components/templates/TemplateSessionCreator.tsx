import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar } from '../ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  FileText, 
  AlertCircle,
  Copy,
  Save,
  X,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { SessionTemplate, SessionStructureComponent } from '../../types/sessionTemplate';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface TemplateSessionCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  template?: SessionTemplate | null;
  clients: Client[];
  onCreateSession: (sessionData: {
    templateId: string;
    clientId: string;
    scheduledDate: Date;
    duration: number;
    customizations: {
      title?: string;
      notes?: string;
      objectives?: string[];
      structure?: SessionStructureComponent[];
    };
  }) => void;
  isLoading?: boolean;
}

interface SessionCustomizations {
  title: string;
  notes: string;
  objectives: string[];
  structure: SessionStructureComponent[];
  duration: number;
}

export const TemplateSessionCreator: React.FC<TemplateSessionCreatorProps> = ({
  isOpen,
  onClose,
  template,
  clients,
  onCreateSession,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  // Form state
  const [clientId, setClientId] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [customizations, setCustomizations] = useState<SessionCustomizations>({
    title: '',
    notes: '',
    objectives: [],
    structure: [],
    duration: 60,
  });
  const [newObjective, setNewObjective] = useState('');
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');

  // Initialize customizations from template
  useEffect(() => {
    if (template) {
      setCustomizations({
        title: template.name,
        notes: template.defaultNotes || '',
        objectives: [...template.objectives],
        structure: template.structure.map(comp => ({ ...comp })),
        duration: template.defaultDuration,
      });
    }
  }, [template]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setClientId('');
      setScheduledDate(null);
      setScheduledTime('');
      setNewObjective('');
      setExpandedComponents(new Set());
      setErrors({});
      setActiveTab('basic');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!template) return;

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!clientId) {
      newErrors.clientId = t('validation.required');
    }
    if (!scheduledDate) {
      newErrors.scheduledDate = t('validation.required');
    }
    if (!scheduledTime) {
      newErrors.scheduledTime = t('validation.required');
    }
    if (!customizations.title.trim()) {
      newErrors.title = t('validation.required');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Combine date and time
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const sessionDateTime = new Date(scheduledDate!);
    sessionDateTime.setHours(hours, minutes, 0, 0);

    // Create session data
    onCreateSession({
      templateId: template.id,
      clientId,
      scheduledDate: sessionDateTime,
      duration: customizations.duration,
      customizations: {
        title: customizations.title !== template.name ? customizations.title : undefined,
        notes: customizations.notes !== template.defaultNotes ? customizations.notes : undefined,
        objectives: JSON.stringify(customizations.objectives) !== JSON.stringify(template.objectives) 
          ? customizations.objectives : undefined,
        structure: JSON.stringify(customizations.structure) !== JSON.stringify(template.structure) 
          ? customizations.structure : undefined,
      },
    });
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setCustomizations(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()],
      }));
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    setCustomizations(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index),
    }));
  };

  const updateStructureComponent = (componentId: string, updates: Partial<SessionStructureComponent>) => {
    setCustomizations(prev => ({
      ...prev,
      structure: prev.structure.map(comp =>
        comp.id === componentId ? { ...comp, ...updates } : comp
      ),
    }));
  };

  const toggleComponentExpansion = (componentId: string) => {
    setExpandedComponents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(componentId)) {
        newSet.delete(componentId);
      } else {
        newSet.add(componentId);
      }
      return newSet;
    });
  };

  const resetToTemplate = () => {
    if (template) {
      setCustomizations({
        title: template.name,
        notes: template.defaultNotes || '',
        objectives: [...template.objectives],
        structure: template.structure.map(comp => ({ ...comp })),
        duration: template.defaultDuration,
      });
    }
  };

  const getTotalDuration = () => {
    return customizations.structure.reduce((total, comp) => total + comp.estimatedDuration, 0);
  };

  const getSelectedClient = () => {
    return clients.find(client => client._id === clientId);
  };

  if (!template) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('templates.createSessionFromTemplate')}
          </DialogTitle>
          <DialogDescription>
            {t('templates.createSessionDescription', { templateName: template.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {template.type}
                </Badge>
                {template.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {template.defaultDuration} {t('common.minutes')}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {template.structure.length} {t('templates.components')}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">{t('templates.basicInfo')}</TabsTrigger>
              <TabsTrigger value="structure">{t('templates.sessionStructure')}</TabsTrigger>
              <TabsTrigger value="review">{t('templates.review')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              {/* Client Selection */}
              <div>
                <Label htmlFor="client">{t('sessions.selectClient')}</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className={errors.clientId ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('sessions.chooseClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>
                )}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('sessions.sessionDate')}</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !scheduledDate && "text-muted-foreground",
                          errors.scheduledDate && "border-red-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "MMM dd, yyyy") : t('templates.selectDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate || undefined}
                        onSelect={(date) => {
                          setScheduledDate(date || null);
                          setIsCalendarOpen(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.scheduledDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.scheduledDate}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="time">{t('sessions.sessionTime')}</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className={errors.scheduledTime ? 'border-red-500' : ''}
                  />
                  {errors.scheduledTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.scheduledTime}</p>
                  )}
                </div>
              </div>

              {/* Session Title */}
              <div>
                <Label htmlFor="title">{t('templates.sessionTitle')}</Label>
                <Input
                  id="title"
                  value={customizations.title}
                  onChange={(e) => setCustomizations(prev => ({ ...prev, title: e.target.value }))}
                  className={errors.title ? 'border-red-500' : ''}
                  placeholder={template.name}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration">{t('templates.sessionDuration')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="240"
                    value={customizations.duration}
                    onChange={(e) => setCustomizations(prev => ({ 
                      ...prev, 
                      duration: parseInt(e.target.value) || 60 
                    }))}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600">{t('common.minutes')}</span>
                  {getTotalDuration() !== customizations.duration && (
                    <Alert className="flex-1">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {t('templates.durationMismatch', { 
                          total: getTotalDuration(), 
                          set: customizations.duration 
                        })}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Session Objectives */}
              <div>
                <Label className="text-sm font-medium">{t('templates.sessionObjectives')}</Label>
                <div className="space-y-2 mt-2">
                  {customizations.objectives.map((objective, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={objective}
                        onChange={(e) => {
                          const newObjectives = [...customizations.objectives];
                          newObjectives[index] = e.target.value;
                          setCustomizations(prev => ({ ...prev, objectives: newObjectives }));
                        }}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeObjective(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newObjective}
                      onChange={(e) => setNewObjective(e.target.value)}
                      placeholder={t('templates.addObjective')}
                      onKeyPress={(e) => e.key === 'Enter' && addObjective()}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addObjective}
                      disabled={!newObjective.trim()}
                    >
                      {t('common.add')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Session Notes */}
              <div>
                <Label htmlFor="notes">{t('templates.sessionNotes')}</Label>
                <Textarea
                  id="notes"
                  value={customizations.notes}
                  onChange={(e) => setCustomizations(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('templates.sessionNotesPlaceholder')}
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="structure" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">{t('templates.sessionStructure')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetToTemplate}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t('templates.resetToTemplate')}
                </Button>
              </div>

              <div className="space-y-3">
                {customizations.structure.map((component) => (
                  <Card key={component.id} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleComponentExpansion(component.id)}
                            className="p-1"
                          >
                            {expandedComponents.has(component.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <div>
                            <CardTitle className="text-sm">{component.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {component.type} • {component.estimatedDuration} {t('common.minutes')}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={component.isRequired ? "default" : "outline"} className="text-xs">
                          {component.isRequired ? t('templates.required') : t('templates.optional')}
                        </Badge>
                      </div>
                    </CardHeader>

                    {expandedComponents.has(component.id) && (
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">{t('templates.componentTitle')}</Label>
                            <Input
                              value={component.title}
                              onChange={(e) => updateStructureComponent(component.id, { title: e.target.value })}
                              className="text-sm"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">{t('templates.estimatedDuration')}</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max="120"
                                value={component.estimatedDuration}
                                onChange={(e) => updateStructureComponent(component.id, { 
                                  estimatedDuration: parseInt(e.target.value) || 1 
                                })}
                                className="w-20 text-sm"
                              />
                              <span className="text-xs text-gray-600">{t('common.minutes')}</span>
                            </div>
                          </div>

                          {component.description && (
                            <div>
                              <Label className="text-xs">{t('templates.description')}</Label>
                              <Textarea
                                value={component.description}
                                onChange={(e) => updateStructureComponent(component.id, { description: e.target.value })}
                                className="text-sm"
                                rows={2}
                              />
                            </div>
                          )}

                          {component.prompts && component.prompts.length > 0 && (
                            <div>
                              <Label className="text-xs">{t('templates.prompts')}</Label>
                              <div className="space-y-1">
                                {component.prompts.map((prompt, promptIndex) => (
                                  <div key={promptIndex} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                    {prompt}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t('templates.totalDuration')}:</span>
                  <span>{getTotalDuration()} {t('common.minutes')}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="review" className="space-y-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('templates.sessionSummary')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-gray-600">{t('sessions.client')}</Label>
                        <p className="font-medium">
                          {getSelectedClient() ? 
                            `${getSelectedClient()!.firstName} ${getSelectedClient()!.lastName}` : 
                            t('sessions.noClientSelected')
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">{t('sessions.dateTime')}</Label>
                        <p className="font-medium">
                          {scheduledDate && scheduledTime ? 
                            `${format(scheduledDate, 'MMM dd, yyyy')} at ${scheduledTime}` : 
                            t('sessions.noDateTimeSelected')
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">{t('templates.sessionTitle')}</Label>
                        <p className="font-medium">{customizations.title}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">{t('templates.duration')}</Label>
                        <p className="font-medium">{customizations.duration} {t('common.minutes')}</p>
                      </div>
                    </div>

                    {customizations.objectives.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-600">{t('templates.objectives')}</Label>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {customizations.objectives.map((objective, index) => (
                            <li key={index}>{objective}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {customizations.notes && (
                      <div>
                        <Label className="text-xs text-gray-600">{t('templates.notes')}</Label>
                        <p className="text-sm">{customizations.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('templates.sessionStructure')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {customizations.structure.map((component, componentIndex) => (
                        <div key={component.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{componentIndex + 1}.</span>
                            <span>{component.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {component.type}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-600">
                            {component.estimatedDuration} {t('common.minutes')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !clientId || !scheduledDate || !scheduledTime}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  {t('common.creating')}
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('sessions.createSession')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 