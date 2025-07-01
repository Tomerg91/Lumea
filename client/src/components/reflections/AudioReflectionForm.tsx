import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/use-toast';
import { SimpleReflectionService } from '../../services/reflectionService.simple';
import { MoodType, Session } from '../../../../shared/types/database';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Loader2, Save, Send, Mic, AlertCircle } from 'lucide-react';
import AudioRecorder, { RecordingData } from '../audio/AudioRecorder';
import { Alert, AlertDescription } from '../ui/alert';

interface AudioReflectionFormProps {
  onSubmit?: () => void;
  onCancel?: () => void;
}

export const AudioReflectionForm: React.FC<AudioReflectionFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [mood, setMood] = useState<MoodType | ''>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioRecording, setAudioRecording] = useState<RecordingData | null>(null);
  const [hasRecording, setHasRecording] = useState(false);

  // Load available sessions
  useEffect(() => {
    const loadSessions = async () => {
      setIsLoadingSessions(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSessions([
          { 
            id: '1', 
            date: '2024-12-16', 
            status: 'Completed',
            notes: null,
            client_id: 'client-1',
            coach_id: 'coach-1',
            payment_id: null,
            reminder_sent: false,
            audio_file: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: '2', 
            date: '2024-12-10', 
            status: 'Upcoming',
            notes: null,
            client_id: 'client-2',
            coach_id: 'coach-1',
            payment_id: null,
            reminder_sent: false,
            audio_file: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
        ]);
      } catch (error) {
        console.error('Failed to load sessions:', error);
        toast({
          title: t('reflections.loadSessionsError'),
          variant: 'destructive',
        });
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadSessions();
  }, [t, toast]);

  const handleRecordingComplete = (audioBlob: Blob, duration: number, uploadResult?: any) => {
    console.log('Recording completed:', { audioBlob, duration, uploadResult });
    setAudioRecording({
      blob: audioBlob,
      url: URL.createObjectURL(audioBlob),
      duration,
      mimeType: audioBlob.type,
      uploadResult,
      isUploaded: !!uploadResult,
    });
    setHasRecording(true);
  };

  const handleRecordingError = (error: string) => {
    console.error('Recording error:', error);
    toast({
      title: t('reflections.recordingError', { defaultValue: 'Recording failed' }),
      description: error,
      variant: 'destructive',
    });
  };

  const handleSubmit = async () => {
    if (!hasRecording || !audioRecording) {
      toast({
        title: t('reflections.audioRequired', { defaultValue: 'Audio recording is required' }),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create reflection with audio content
      const audioContent = JSON.stringify({
        type: 'audio',
        duration: audioRecording.duration,
        filename: audioRecording.uploadResult?.filename || 'audio-reflection.webm',
        storageUrl: audioRecording.uploadResult?.url || audioRecording.url,
        uploadResult: audioRecording.uploadResult,
      });

      await SimpleReflectionService.createReflection({
        content: audioContent,
        mood: mood || undefined,
        session_id: sessionId || undefined,
      });

      toast({
        title: t('reflections.submitSuccess'),
      });
      
      // Reset form
      setMood('');
      setSessionId('');
      setAudioRecording(null);
      setHasRecording(false);
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
    if (!hasRecording || !audioRecording) {
      toast({
        title: t('reflections.audioRequired', { defaultValue: 'Audio recording is required' }),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Create draft with audio content
      const audioContent = JSON.stringify({
        type: 'audio',
        duration: audioRecording.duration,
        filename: audioRecording.uploadResult?.filename || 'audio-reflection.webm',
        storageUrl: audioRecording.uploadResult?.url || audioRecording.url,
        uploadResult: audioRecording.uploadResult,
        isDraft: true,
      });

      await SimpleReflectionService.createReflection({
        content: audioContent,
        mood: mood || undefined,
        session_id: sessionId || undefined,
      });

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            {t('reflections.createAudioReflection', { defaultValue: 'Audio Reflection' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Audio Recording Section */}
          <div className="space-y-4">
            <Label className="text-base font-medium">
              {t('reflections.audioRecording', { defaultValue: 'Audio Recording' })}
            </Label>
            
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onRecordingError={handleRecordingError}
              maxDuration={600} // 10 minutes
              showWaveform={true}
              showPlayer={true}
              autoUpload={true}
              uploadOnComplete={true}
              storageFolder="reflections"
              mobileOptimized={true}
              playerOptions={{
                showWaveform: true,
                showControls: true,
                showVolume: true,
                showSpeed: true,
                showDownload: false,
                autoPlay: false,
              }}
            />

            {hasRecording && audioRecording && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('reflections.recordingReady', { 
                    defaultValue: 'Recording ready',
                    duration: Math.round(audioRecording.duration)
                  })} ({Math.round(audioRecording.duration)}s)
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Mood Selection */}
          <div className="space-y-2">
            <Label htmlFor="mood">{t('reflections.mood.label')}</Label>
            <Select value={mood} onValueChange={(value: MoodType | '') => setMood(value)}>
              <SelectTrigger id="mood">
                <SelectValue placeholder={t('reflections.mood.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('reflections.mood.placeholder')}</SelectItem>
                <SelectItem value="positive">{t('reflections.mood.positive')}</SelectItem>
                <SelectItem value="neutral">{t('reflections.mood.neutral')}</SelectItem>
                <SelectItem value="negative">{t('reflections.mood.negative')}</SelectItem>
                <SelectItem value="mixed">{t('reflections.mood.mixed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Session Linking */}
          <div className="space-y-2">
            <Label htmlFor="session">{t('reflections.session.label')}</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger id="session">
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isLoading || isSaving || !hasRecording}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t('reflections.saveDraft')}
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || isSaving || !hasRecording}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t('reflections.submit')}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isLoading || isSaving}
              >
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AudioReflectionForm; 