import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useRecordAudio from '../../hooks/useRecordAudio';
import useOfflineReflection from '../../hooks/useOfflineReflection';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { toast } from '../ui/use-toast';
import AudioPlayer from '../audio/AudioPlayer';
import {
  Play,
  Pause,
  Square,
  Mic,
  Send,
  Loader2,
  ArrowLeftCircle,
  ArrowRightCircle,
} from 'lucide-react';

interface ReflectionRecorderProps {
  sessionId: string;
  onSuccess?: (reflectionId: string) => void;
  onCancel?: () => void;
}

export default function ReflectionRecorder({
  sessionId,
  onSuccess,
  onCancel,
}: ReflectionRecorderProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [step, setStep] = useState<'text' | 'audio' | 'review'>('text');
  const [isReviewing, setIsReviewing] = useState(false);

  // Audio recording hook
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioBlobUrl,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    formattedDuration,
  } = useRecordAudio({
    maxDuration: 300, // 5 minutes
    onError: (error) => {
      toast({
        title: t('errors.recordingFailed', 'Recording failed'),
        description: error,
        variant: 'destructive',
      });
    },
  });

  // Offline support hook
  const { submitReflection, isSubmitting } = useOfflineReflection({
    onSuccess: (reflectionId) => {
      if (onSuccess) {
        onSuccess(reflectionId);
      }
    },
  });

  // Check if we can proceed to the next step
  const canProceed = step === 'text' ? text.trim().length > 0 : true;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    // Validate that we have at least text or audio
    if (!text && !audioBlob) {
      toast({
        title: t('errors.missingContent', 'Missing content'),
        description: t(
          'errors.missingContentDetail',
          'Please add text or record audio before submitting your reflection.'
        ),
        variant: 'destructive',
      });
      return;
    }

    try {
      await submitReflection({
        sessionId,
        text: text || undefined,
        audio: audioBlob
          ? {
              blob: audioBlob,
              mimeType: audioBlob.type,
              size: audioBlob.size,
            }
          : undefined,
      });
    } catch (error) {
      console.error('Error submitting reflection:', error);
    }
  };

  // Go to the next step
  const handleNext = () => {
    if (step === 'text') {
      setStep('audio');
    } else if (step === 'audio') {
      setStep('review');
      setIsReviewing(true);
    }
  };

  // Go to the previous step
  const handleBack = () => {
    if (step === 'audio') {
      setStep('text');
    } else if (step === 'review') {
      setStep('audio');
      setIsReviewing(false);
    }
  };

  // Reset audio recording when leaving audio step
  useEffect(() => {
    if (step !== 'audio' && isRecording) {
      stopRecording();
    }
  }, [step, isRecording, stopRecording]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Text Input */}
          {step === 'text' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t('reflections.addText', 'Add Text Reflection')}
              </h3>
              <p className="text-sm text-gray-500">
                {t(
                  'reflections.addTextDetail',
                  'Share your thoughts about the session. What insights did you gain?'
                )}
              </p>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('reflections.textPlaceholder', 'Enter your reflection...')}
                rows={6}
                className="w-full resize-none"
              />
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={onCancel}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="button" variant="default" onClick={handleNext} disabled={!canProceed}>
                  {t('common.next', 'Next')}
                  <ArrowRightCircle className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Audio Recording */}
          {step === 'audio' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t('reflections.addAudio', 'Add Audio Reflection')}
              </h3>
              <p className="text-sm text-gray-500">
                {t(
                  'reflections.addAudioDetail',
                  'Record your voice reflection. You can skip this step if you prefer text only.'
                )}
              </p>

              <div className="flex flex-col items-center space-y-4 py-4">
                <div className="text-3xl font-mono">{formattedDuration()}</div>

                {!audioBlob ? (
                  <div className="flex space-x-2">
                    {!isRecording ? (
                      <Button
                        type="button"
                        variant="default"
                        onClick={startRecording}
                        className="rounded-full"
                        size="lg"
                      >
                        <Mic className="h-6 w-6" />
                      </Button>
                    ) : (
                      <>
                        {!isPaused ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={pauseRecording}
                            className="rounded-full"
                            size="lg"
                          >
                            <Pause className="h-6 w-6" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="default"
                            onClick={resumeRecording}
                            className="rounded-full"
                            size="lg"
                          >
                            <Play className="h-6 w-6" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={stopRecording}
                          className="rounded-full"
                          size="lg"
                        >
                          <Square className="h-6 w-6" />
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AudioPlayer
                      audioBlob={audioBlob}
                      audioUrl={audioBlobUrl || ''}
                      duration={duration}
                      showWaveform={true}
                      showControls={true}
                      showVolume={false}
                      showSpeed={false}
                      showDownload={false}
                      autoPlay={false}
                      className="max-w-md mx-auto"
                    />
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={resetRecording}
                        className="rounded-full"
                        size="lg"
                      >
                        {t('common.reset', 'Reset')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeftCircle className="mr-2 h-4 w-4" />
                  {t('common.back', 'Back')}
                </Button>
                <Button type="button" variant="default" onClick={handleNext}>
                  {t('common.next', 'Next')}
                  <ArrowRightCircle className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 'review' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {t('reflections.review', 'Review Your Reflection')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('reflections.reviewDetail', 'Please review your reflection before submitting.')}
              </p>

              {text && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {t('reflections.textReview', 'Text Reflection')}
                  </h4>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="whitespace-pre-wrap">{text}</p>
                  </div>
                </div>
              )}

              {audioBlob && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {t('reflections.audioReview', 'Audio Reflection')}
                  </h4>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <AudioPlayer
                      audioBlob={audioBlob}
                      audioUrl={audioBlobUrl || ''}
                      duration={duration}
                      showWaveform={true}
                      showControls={true}
                      showVolume={false}
                      showSpeed={false}
                      showDownload={false}
                      autoPlay={false}
                      className="max-w-md mx-auto"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeftCircle className="mr-2 h-4 w-4" />
                  {t('common.back', 'Back')}
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={isSubmitting || (!text && !audioBlob)}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common.submit', 'Submit')}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
