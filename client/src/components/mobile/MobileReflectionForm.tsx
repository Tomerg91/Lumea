import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { cn } from '../../lib/utils';
import MobileRichTextEditor from './MobileRichTextEditor';
import MobileAudioRecorder from './MobileAudioRecorder';
import { 
  ReflectionTemplate, 
  ReflectionAnswer, 
  ReflectionValidationError,
  AdvancedReflectionQuestion
} from '../../types/reflection';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Star,
  RotateCcw,
  X
} from 'lucide-react';

interface MobileReflectionFormProps {
  sessionId: string;
  template: ReflectionTemplate;
  existingReflection?: {
    answers: ReflectionAnswer[];
    status: 'draft' | 'submitted';
    _id?: string;
  };
  onSave?: (draft: boolean) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  className?: string;
}

interface MobileFormState {
  answers: Record<string, ReflectionAnswer>;
  errors: Record<string, string>;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  isDirty: boolean;
  isSubmitting: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
  timeSpent: number; // in seconds
}

// Haptic feedback utility
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [30],
      heavy: [50, 25, 50]
    };
    navigator.vibrate(patterns[type]);
  }
};

// Mobile-optimized question input component
const MobileQuestionInput: React.FC<{
  question: AdvancedReflectionQuestion;
  answer?: ReflectionAnswer;
  onAnswerChange: (answer: ReflectionAnswer) => void;
  error?: string;
  disabled?: boolean;
}> = ({ question, answer, onAnswerChange, error, disabled }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const handleAnswerChange = useCallback((value: any) => {
    const newAnswer: ReflectionAnswer = {
      questionId: question.id,
      value,
    };
    onAnswerChange(newAnswer);
    triggerHaptic('light');
  }, [question.id, onAnswerChange]);

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <textarea
            value={answer?.value as string || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder={question.placeholder}
            disabled={disabled}
            rows={4}
            className={cn(
              'w-full p-4 border rounded-2xl resize-none',
              'text-base leading-relaxed', // Prevent zoom on iOS
              'touch-manipulation',
              error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white',
              disabled ? 'bg-gray-50 cursor-not-allowed' : '',
              'focus:ring-2 focus:ring-lumea-primary focus:border-lumea-primary',
              'transition-all duration-200',
              isRTL ? 'text-right' : 'text-left'
            )}
            style={{ 
              fontSize: '16px', // Prevent zoom on iOS
              direction: isRTL ? 'rtl' : 'ltr'
            }}
            inputMode="text"
          />
        );

      case 'rich_text':
        return (
          <MobileRichTextEditor
            value={answer?.value as string || ''}
            onChange={handleAnswerChange}
            placeholder={question.placeholder}
            disabled={disabled}
            required={question.required}
            error={error}
            maxLength={question.validationRules?.maxLength}
            minHeight="120px"
            maxHeight="300px"
            autoSave={false}
            showWordCount
            showCharCount
            autoResize
            compactMode
          />
        );

      case 'scale': {
        const scaleMax = question.validationRules?.maxValue || 10;
        const scaleMin = question.validationRules?.minValue || 1;
        const currentValue = (answer?.value as number) || scaleMin;
        
        return (
          <div className="space-y-4">
            {/* Visual scale display */}
            <div className="flex items-center justify-center">
              <div className="text-4xl font-bold text-lumea-primary">
                {currentValue}
              </div>
            </div>
            
            {/* Touch-friendly slider */}
            <div className="relative">
              <input
                type="range"
                min={scaleMin}
                max={scaleMax}
                step={1}
                value={currentValue}
                onChange={(e) => handleAnswerChange(parseInt(e.target.value))}
                disabled={disabled}
                className="w-full h-8 appearance-none bg-transparent cursor-pointer touch-manipulation"
                style={{
                  background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${((currentValue - scaleMin) / (scaleMax - scaleMin)) * 100}%, #E5E7EB ${((currentValue - scaleMin) / (scaleMax - scaleMin)) * 100}%, #E5E7EB 100%)`
                }}
              />
              
              {/* Scale labels */}
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>{scaleMin}</span>
                <span>{scaleMax}</span>
              </div>
            </div>

            {/* Star rating for 1-5 scales */}
            {scaleMax <= 5 && (
              <div className="flex justify-center space-x-2">
                {Array.from({ length: scaleMax }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAnswerChange(i + 1)}
                    disabled={disabled}
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      'transition-all duration-200 active:scale-95',
                      currentValue > i
                        ? 'text-yellow-500'
                        : 'text-gray-300',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Star 
                      className="w-8 h-8" 
                      fill={currentValue > i ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleAnswerChange(option)}
                disabled={disabled}
                className={cn(
                  'w-full p-4 rounded-2xl border text-left',
                  'transition-all duration-200 active:scale-98',
                  'touch-manipulation',
                  answer?.value === option
                    ? 'border-lumea-primary bg-lumea-primary/10 text-lumea-primary'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option}</span>
                  {answer?.value === option && (
                    <CheckCircle2 className="w-5 h-5 text-lumea-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        );

      case 'yes_no':
        return (
          <div className="grid grid-cols-2 gap-4">
            {['yes', 'no'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleAnswerChange(option === 'yes')}
                disabled={disabled}
                className={cn(
                  'p-4 rounded-2xl border font-medium',
                  'transition-all duration-200 active:scale-98',
                  'touch-manipulation',
                  answer?.value === (option === 'yes')
                    ? 'border-lumea-primary bg-lumea-primary text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {t(`common.${option}`)}
              </button>
            ))}
          </div>
        );

      case 'audio':
        return (
          <MobileAudioRecorder
            onRecordingComplete={(audioBlob, duration) => {
              const audioUrl = URL.createObjectURL(audioBlob);
              const audioAnswer: ReflectionAnswer = {
                questionId: question.id,
                value: '', // Empty value for audio
                audioData: {
                  blob: audioBlob,
                  url: audioUrl,
                  duration,
                  mimeType: audioBlob.type,
                  size: audioBlob.size,
                },
              };
              handleAnswerChange(audioAnswer);
            }}
            onRecordingError={(error) => {
              console.error('Recording error:', error);
            }}
            maxDuration={question.validationRules?.maxValue || 300}
            disabled={disabled}
            autoSubmit={true}
            mode="inline"
            showWaveform
          />
        );

      default:
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-800">
              Unsupported question type: {question.type}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Question header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 leading-tight">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          
          {question.estimatedMinutes && (
            <div className="flex items-center text-xs text-gray-500 ml-2 flex-shrink-0">
              <Clock className="w-3 h-3 mr-1" />
              {t('reflection.estimatedTime', { minutes: question.estimatedMinutes })}
            </div>
          )}
        </div>
        
        {question.helpText && (
          <p className="text-sm text-gray-600 leading-relaxed">
            {question.helpText}
          </p>
        )}
      </div>

      {/* Input */}
      <div className="mt-4">
        {renderInput()}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
};

// Progress indicator component
const MobileProgressIndicator: React.FC<{
  currentSection: number;
  totalSections: number;
  currentQuestion: number;
  totalQuestions: number;
  timeSpent: number;
}> = ({ currentSection, totalSections, currentQuestion, totalQuestions, timeSpent }) => {
  const { t } = useTranslation();

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((currentSection * totalQuestions + currentQuestion) / (totalSections * totalQuestions)) * 100;

  return (
    <div className="bg-white border-b border-gray-100 p-4">
      {/* Progress bar */}
      <div className="relative mb-3">
        <div className="h-2 bg-gray-100 rounded-full">
          <div 
            className="h-2 bg-gradient-purple rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="absolute right-0 -top-1 text-xs text-gray-500">
          {Math.round(progressPercentage)}%
        </div>
      </div>

      {/* Section and time info */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-600">
          {t('reflection.section')} {currentSection + 1} {t('reflection.of')} {totalSections}
        </div>
        <div className="flex items-center text-gray-500">
          <Clock className="w-4 h-4 mr-1" />
          {formatTime(timeSpent)}
        </div>
      </div>
    </div>
  );
};

const MobileReflectionForm: React.FC<MobileReflectionFormProps> = ({
  sessionId,
  template,
  existingReflection,
  onSave,
  onSubmit,
  disabled = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const { isMobile } = useMobileDetection();
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeTrackingRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formState, setFormState] = useState<MobileFormState>({
    answers: {},
    errors: {},
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
    isDirty: false,
    isSubmitting: false,
    autoSaveStatus: 'idle',
    timeSpent: 0,
  });

  // Initialize form with existing reflection
  useEffect(() => {
    if (existingReflection) {
      const answersMap: Record<string, ReflectionAnswer> = {};
      existingReflection.answers.forEach(answer => {
        answersMap[answer.questionId] = answer;
      });
      setFormState(prev => ({ ...prev, answers: answersMap }));
    }
  }, [existingReflection]);

  // Time tracking
  useEffect(() => {
    timeTrackingRef.current = setInterval(() => {
      setFormState(prev => ({ ...prev, timeSpent: prev.timeSpent + 1 }));
    }, 1000);

    return () => {
      if (timeTrackingRef.current) {
        clearInterval(timeTrackingRef.current);
      }
    };
  }, []);

  // Get current section and question
  const currentSection = template.sections[formState.currentSectionIndex];
  const currentQuestion = currentSection?.questions[formState.currentQuestionIndex];
  
  const totalQuestions = template.sections.reduce((sum, section) => sum + section.questions.length, 0);
  const currentQuestionNumber = template.sections.slice(0, formState.currentSectionIndex).reduce((sum, section) => sum + section.questions.length, 0) + formState.currentQuestionIndex + 1;

  // Navigation helpers
  const canNavigatePrev = formState.currentSectionIndex > 0 || formState.currentQuestionIndex > 0;
  const canNavigateNext = formState.currentSectionIndex < template.sections.length - 1 || formState.currentQuestionIndex < currentSection.questions.length - 1;
  const isLastQuestion = formState.currentSectionIndex === template.sections.length - 1 && formState.currentQuestionIndex === currentSection.questions.length - 1;

  // Auto-save functionality
  const saveAsDraft = useCallback(async () => {
    if (!formState.isDirty || formState.isSubmitting) return;

    setFormState(prev => ({ ...prev, autoSaveStatus: 'saving' }));
    
    try {
      // Convert answers to array format
      const answersArray = Object.values(formState.answers);
      
      // Call save service (placeholder)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setFormState(prev => ({
        ...prev,
        autoSaveStatus: 'saved',
        lastSaved: new Date(),
        isDirty: false,
      }));

      if (onSave) {
        onSave(true);
      }

      triggerHaptic('light');
    } catch (error) {
      setFormState(prev => ({ ...prev, autoSaveStatus: 'error' }));
    }
  }, [formState.answers, formState.isDirty, formState.isSubmitting, onSave]);

  // Auto-save with debounce
  useEffect(() => {
    if (formState.isDirty && !disabled) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        saveAsDraft();
      }, 5000); // 5 second delay for mobile
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formState.isDirty, saveAsDraft, disabled]);

  // Handle answer changes
  const handleAnswerChange = useCallback((answer: ReflectionAnswer) => {
    setFormState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [answer.questionId]: answer,
      },
      errors: {
        ...prev.errors,
        [answer.questionId]: '', // Clear error
      },
      isDirty: true,
      autoSaveStatus: 'idle',
    }));
  }, []);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (!canNavigatePrev) return;

    if (formState.currentQuestionIndex > 0) {
      setFormState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
      }));
    } else {
      const prevSection = formState.currentSectionIndex - 1;
      setFormState(prev => ({
        ...prev,
        currentSectionIndex: prevSection,
        currentQuestionIndex: template.sections[prevSection].questions.length - 1,
      }));
    }

    triggerHaptic('light');
  }, [canNavigatePrev, formState.currentSectionIndex, formState.currentQuestionIndex, template.sections]);

  const handleNext = useCallback(() => {
    if (!canNavigateNext) return;

    if (formState.currentQuestionIndex < currentSection.questions.length - 1) {
      setFormState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
    } else {
      setFormState(prev => ({
        ...prev,
        currentSectionIndex: prev.currentSectionIndex + 1,
        currentQuestionIndex: 0,
      }));
    }

    triggerHaptic('light');
  }, [canNavigateNext, formState.currentQuestionIndex, currentSection.questions.length]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    setFormState(prev => ({ ...prev, isSubmitting: true }));
    
    try {
      // Validate form first
      const errors: Record<string, string> = {};
      
      template.sections.forEach(section => {
        section.questions.forEach(question => {
          const answer = formState.answers[question.id];
          
          if (question.required && (!answer || !answer.value)) {
            errors[question.id] = t('validation.required');
          }
        });
      });

      if (Object.keys(errors).length > 0) {
        setFormState(prev => ({ ...prev, errors, isSubmitting: false }));
        triggerHaptic('heavy');
        return;
      }

      // Submit reflection
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      if (onSubmit) {
        onSubmit();
      }

      triggerHaptic('heavy');
    } catch (error) {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
      triggerHaptic('heavy');
    }
  }, [formState.answers, template.sections, onSubmit, t]);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-gray-900">No questions found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('mobile-reflection-form h-screen flex flex-col bg-gray-50', className)}>
      {/* Progress indicator */}
      <MobileProgressIndicator
        currentSection={formState.currentSectionIndex}
        totalSections={template.sections.length}
        currentQuestion={currentQuestionNumber - 1}
        totalQuestions={totalQuestions}
        timeSpent={formState.timeSpent}
      />

      {/* Auto-save status */}
      {formState.autoSaveStatus !== 'idle' && (
        <div className="bg-white border-b border-gray-100 px-4 py-2">
          <div className={cn(
            'flex items-center space-x-2 text-sm',
            formState.autoSaveStatus === 'saving' && 'text-blue-600',
            formState.autoSaveStatus === 'saved' && 'text-green-600',
            formState.autoSaveStatus === 'error' && 'text-red-600'
          )}>
            {formState.autoSaveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
            {formState.autoSaveStatus === 'saved' && <CheckCircle2 className="w-4 h-4" />}
            {formState.autoSaveStatus === 'error' && <AlertCircle className="w-4 h-4" />}
            <span>
              {formState.autoSaveStatus === 'saving' && t('reflection.autoSaving')}
              {formState.autoSaveStatus === 'saved' && t('reflection.draftSaved')}
              {formState.autoSaveStatus === 'error' && t('reflection.autoSaveError')}
            </span>
          </div>
        </div>
      )}

      {/* Question content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Section header */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {currentSection.title}
            </h2>
            {currentSection.description && (
              <p className="text-sm text-gray-600">
                {currentSection.description}
              </p>
            )}
          </div>

          {/* Current question */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <MobileQuestionInput
              question={currentQuestion}
              answer={formState.answers[currentQuestion.id]}
              onAnswerChange={handleAnswerChange}
              error={formState.errors[currentQuestion.id]}
              disabled={disabled || formState.isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* Navigation footer */}
      <div className="bg-white border-t border-gray-100 p-4 safe-area-bottom">
        <div className="flex items-center justify-between">
          {/* Previous button */}
          <button
            onClick={handlePrevious}
            disabled={!canNavigatePrev || disabled || formState.isSubmitting}
            className={cn(
              'flex items-center space-x-2 px-6 py-3 rounded-2xl font-medium',
              'transition-all duration-200 active:scale-95',
              canNavigatePrev && !disabled && !formState.isSubmitting
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{t('reflection.previous')}</span>
          </button>

          {/* Save draft button */}
          <button
            onClick={saveAsDraft}
            disabled={!formState.isDirty || disabled || formState.isSubmitting}
            className={cn(
              'px-4 py-3 rounded-2xl font-medium transition-all duration-200',
              formState.isDirty && !disabled && !formState.isSubmitting
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            )}
          >
            <Save className="w-5 h-5" />
          </button>

          {/* Next/Submit button */}
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={disabled || formState.isSubmitting}
              className={cn(
                'flex items-center space-x-2 px-6 py-3 rounded-2xl font-medium',
                'bg-gradient-purple text-white shadow-lumea-strong',
                'transition-all duration-200 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {formState.isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span>
                {formState.isSubmitting ? t('reflection.submitting') : t('reflection.submit')}
              </span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canNavigateNext || disabled || formState.isSubmitting}
              className={cn(
                'flex items-center space-x-2 px-6 py-3 rounded-2xl font-medium',
                'bg-gradient-purple text-white shadow-lumea-strong',
                'transition-all duration-200 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <span>{t('reflection.next')}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileReflectionForm; 