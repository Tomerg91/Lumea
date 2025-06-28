import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/use-toast';
import { SimpleReflectionService } from '../../services/reflectionService.simple';
import { MoodType } from '../../../../shared/types/database';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Loader2, Save, Send } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Session } from '../../types/session';

interface TextReflectionFormProps {
  onSubmit?: () => void;
  onCancel?: () => void;
}

export const TextReflectionForm: React.FC<TextReflectionFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType | ''>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load user sessions with React Query
  const { data: sessions = [], isLoading: isLoadingSessions, error: sessionsError } = useQuery({
    queryKey: ['sessions', 'for-reflections'],
    queryFn: () => SimpleReflectionService.getUserSessions(),
  });

  // Handle sessions loading error
  useEffect(() => {
    if (sessionsError) {
      console.error('Failed to load sessions:', sessionsError);
      toast({
        title: t('reflections.loadSessionsError'),
        variant: 'destructive',
      });
    }
  }, [sessionsError, t, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: t('reflections.contentRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await SimpleReflectionService.createReflection({
        content: content.trim(),
        mood: mood || undefined,
        session_id: sessionId || undefined,
      });

      // Invalidate reflections cache to trigger real-time updates
      queryClient.invalidateQueries({ queryKey: ['reflections'] });

      toast({
        title: t('reflections.submitSuccess'),
      });
      setContent('');
      setMood('');
      setSessionId('');
      onSubmit?.();
    } catch (error) {
      console.error('Failed to submit reflection:', error);
      toast({
        title: t('reflections.submitError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!content.trim()) {
      toast({
        title: t('reflections.contentRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await SimpleReflectionService.createReflection({
        content: content.trim(),
        mood: mood || undefined,
        session_id: sessionId || undefined,
      });

      // Invalidate reflections cache to trigger real-time updates
      queryClient.invalidateQueries({ queryKey: ['reflections'] });

      toast({
        title: t('reflections.draftSaved'),
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast({
        title: t('reflections.saveDraftError'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const moodOptions: Array<{ value: MoodType; label: string }> = [
    { value: 'positive', label: t('reflections.mood.positive') },
    { value: 'neutral', label: t('reflections.mood.neutral') },
    { value: 'negative', label: t('reflections.mood.negative') },
    { value: 'mixed', label: t('reflections.mood.mixed') },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('reflections.createReflection')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content field */}
          <div className="space-y-2">
            <Label htmlFor="content">{t('reflections.content')}</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('reflections.contentPlaceholder')}
              className="min-h-[200px] resize-y"
              required
            />
            <p className="text-sm text-muted-foreground">
              {content.length} {t('reflections.characters')}
            </p>
          </div>

          {/* Mood selection */}
          <div className="space-y-2">
            <Label htmlFor="mood">{t('reflections.mood.label')}</Label>
            <Select
              value={mood}
              onValueChange={(value) => setMood(value as MoodType)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('reflections.mood.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {moodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session association */}
          <div className="space-y-2">
            <Label htmlFor="session">{t('reflections.session.label')}</Label>
            <Select
              value={sessionId}
              onValueChange={setSessionId}
              disabled={isLoadingSessions}
            >
              <SelectTrigger>
                <SelectValue 
                  placeholder={
                    isLoadingSessions 
                      ? t('reflections.session.loading') 
                      : t('reflections.session.placeholder')
                  } 
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('reflections.session.none')}</SelectItem>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {new Date(session.date).toLocaleDateString()} - {session.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between gap-4">
            <div className="flex gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading || isSaving}
                >
                  {t('common.cancel')}
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isLoading || isSaving || !content.trim()}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t('reflections.saveDraft')}
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading || isSaving || !content.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {t('reflections.submit')}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 