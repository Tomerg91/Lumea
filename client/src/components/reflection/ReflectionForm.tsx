import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ReflectionTemplate, 
  ReflectionAnswer, 
  ReflectionFormState,
  ReflectionValidationError,
  SaveReflectionRequest
} from '../../types/reflection';
import { reflectionService } from '../../services/reflectionService';
import { ProgressIndicator } from './ProgressIndicator';
import { ReflectionSection } from './ReflectionSection';

interface ReflectionFormProps {
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
}

export const ReflectionForm: React.FC<ReflectionFormProps> = ({
  sessionId,
  template,
  existingReflection,
  onSave,
  onSubmit,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date>(new Date());

  // Initialize form state
  const [formState, setFormState] = useState<ReflectionFormState>(() => {
    const initialAnswers: Record<string, ReflectionAnswer> = {};
    
    if (existingReflection?.answers) {
      existingReflection.answers.forEach(answer => {
        initialAnswers[answer.questionId] = answer;
      });
    }

    return {
      currentSectionIndex: 0,
      answers: initialAnswers,
      errors: {},
      isSubmitting: false,
      isDirty: false,
      autoSaveStatus: 'idle',
    };
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<number | null>(null);

  // Auto-save functionality
  const saveAsDraft = useCallback(async () => {
    if (!formState.isDirty || formState.isSubmitting) return;

    try {
      setFormState(prev => ({ ...prev, autoSaveStatus: 'saving' }));

      const request: SaveReflectionRequest = {
        answers: Object.values(formState.answers),
        status: 'draft',
        estimatedCompletionMinutes: template.estimatedMinutes,
      };

      await reflectionService.saveReflection(sessionId, request);

      setFormState(prev => ({ 
        ...prev, 
        autoSaveStatus: 'saved',
        isDirty: false,
        lastSaved: new Date()
      }));

      onSave?.(true);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setFormState(prev => ({ ...prev, autoSaveStatus: 'error' }));
    }
  }, [formState.isDirty, formState.isSubmitting, formState.answers, sessionId, template.estimatedMinutes, onSave]);

  // Set up auto-save
  useEffect(() => {
    if (formState.isDirty && !disabled) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        saveAsDraft();
      }, 30000); // Auto-save every 30 seconds
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
        [answer.questionId]: '', // Clear error when user starts typing
      },
      isDirty: true,
      autoSaveStatus: 'idle',
    }));
  }, []);

  // Validate form
  const validateForm = useCallback((): ReflectionValidationError[] => {
    const errors: ReflectionValidationError[] = [];

    template.sections.forEach(section => {
      section.questions.forEach(question => {
        const answer = formState.answers[question.id];

        if (question.required) {
          if (!answer || answer.value === '' || answer.value === null || answer.value === undefined) {
            errors.push({
              questionId: question.id,
              message: t('validation.required'),
              type: 'required',
            });
          }
        }

        if (answer && question.validationRules) {
          const rules = question.validationRules;
          const stringValue = String(answer.value);

          if (rules.minLength && stringValue.length < rules.minLength) {
            errors.push({
              questionId: question.id,
              message: t('reflection.validation.minLength', { min: rules.minLength }),
              type: 'minLength',
            });
          }

          if (rules.maxLength && stringValue.length > rules.maxLength) {
            errors.push({
              questionId: question.id,
              message: t('reflection.validation.maxLength', { max: rules.maxLength }),
              type: 'maxLength',
            });
          }
        }
      });
    });

    return errors;
  }, [formState.answers, template.sections, t]);

  // Handle section navigation
  const handleSectionChange = useCallback((newIndex: number) => {
    if (formState.isDirty && formState.autoSaveStatus !== 'saved') {
      setPendingNavigation(newIndex);
      setShowConfirmDialog(true);
      return;
    }

    setFormState(prev => ({ ...prev, currentSectionIndex: newIndex }));
  }, [formState.isDirty, formState.autoSaveStatus]);

  // Confirm navigation with unsaved changes
  const confirmNavigation = useCallback(() => {
    if (pendingNavigation !== null) {
      setFormState(prev => ({ ...prev, currentSectionIndex: pendingNavigation }));
      setPendingNavigation(null);
    }
    setShowConfirmDialog(false);
  }, [pendingNavigation]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm();

    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(error => {
        errorMap[error.questionId] = error.message;
      });

      setFormState(prev => ({ ...prev, errors: errorMap }));

      // Navigate to first section with errors
      const firstErrorSection = template.sections.findIndex(section =>
        section.questions.some(q => errorMap[q.id])
      );
      
      if (firstErrorSection !== -1) {
        setFormState(prev => ({ ...prev, currentSectionIndex: firstErrorSection }));
      }

      return;
    }

    try {
      setFormState(prev => ({ ...prev, isSubmitting: true }));

      const elapsedMinutes = Math.floor((Date.now() - startTimeRef.current.getTime()) / (1000 * 60));

      const request: SaveReflectionRequest = {
        answers: Object.values(formState.answers),
        status: 'submitted',
        estimatedCompletionMinutes: template.estimatedMinutes,
        actualCompletionMinutes: elapsedMinutes,
      };

      await reflectionService.saveReflection(sessionId, request);

      setFormState(prev => ({ 
        ...prev, 
        isSubmitting: false,
        isDirty: false,
        autoSaveStatus: 'saved'
      }));

      onSubmit?.();
    } catch (error) {
      console.error('Submission failed:', error);
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [validateForm, formState.answers, sessionId, template.estimatedMinutes, template.sections, onSubmit]);

  // Navigation controls
  const canNavigateNext = formState.currentSectionIndex < template.sections.length - 1;
  const canNavigatePrev = formState.currentSectionIndex > 0;

  const handleNext = () => {
    if (canNavigateNext) {
      handleSectionChange(formState.currentSectionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (canNavigatePrev) {
      handleSectionChange(formState.currentSectionIndex - 1);
    }
  };

  // Prevent accidental navigation away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formState.isDirty && formState.autoSaveStatus !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formState.isDirty, formState.autoSaveStatus]);

  const currentSection = template.sections[formState.currentSectionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Indicator */}
      <ProgressIndicator
        sections={template.sections}
        currentSectionIndex={formState.currentSectionIndex}
        answers={formState.answers}
        onSectionClick={handleSectionChange}
        disabled={disabled || formState.isSubmitting}
        estimatedTotalMinutes={template.estimatedMinutes}
        startTime={startTimeRef.current}
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Auto-save Status */}
        {formState.autoSaveStatus !== 'idle' && (
          <div className="mb-6">
            <div className={`
              flex items-center px-4 py-2 rounded-lg text-sm
              ${formState.autoSaveStatus === 'saving' ? 'bg-blue-50 text-blue-700' :
                formState.autoSaveStatus === 'saved' ? 'bg-green-50 text-green-700' :
                'bg-red-50 text-red-700'}
            `}>
              {formState.autoSaveStatus === 'saving' && (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('reflection.autoSaving')}
                </>
              )}
              {formState.autoSaveStatus === 'saved' && (
                <>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {t('reflection.draftSaved')} {formState.lastSaved && 
                    `- ${formState.lastSaved.toLocaleTimeString()}`
                  }
                </>
              )}
              {formState.autoSaveStatus === 'error' && (
                <>
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {t('reflection.autoSaveError')}
                </>
              )}
            </div>
          </div>
        )}

        {/* Current Section */}
        <ReflectionSection
          section={currentSection}
          answers={formState.answers}
          errors={formState.errors}
          onAnswerChange={handleAnswerChange}
          disabled={disabled || formState.isSubmitting}
          isActive={true}
        />

        {/* Navigation Controls */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={!canNavigatePrev || disabled || formState.isSubmitting}
            className={`
              flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200
              ${canNavigatePrev && !disabled && !formState.isSubmitting
                ? 'bg-gray-600 text-white hover:bg-gray-700 shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('reflection.previous')}
          </button>

          <div className="flex gap-4">
            <button
              onClick={saveAsDraft}
              disabled={!formState.isDirty || disabled || formState.isSubmitting}
              className={`
                px-6 py-3 rounded-lg font-medium transition-all duration-200
                ${formState.isDirty && !disabled && !formState.isSubmitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {t('reflection.saveDraft')}
            </button>

            {canNavigateNext ? (
              <button
                onClick={handleNext}
                disabled={disabled || formState.isSubmitting}
                className={`
                  flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200
                  ${!disabled && !formState.isSubmitting
                    ? 'bg-lumea-primary text-white hover:bg-lumea-primary-dark shadow-md'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {t('reflection.next')}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={disabled || formState.isSubmitting}
                className={`
                  flex items-center px-8 py-3 rounded-lg font-medium transition-all duration-200
                  ${!disabled && !formState.isSubmitting
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {formState.isSubmitting ? (
                  <>
                    <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('reflection.submitting')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('reflection.submit')}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('reflection.unsavedChanges')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('reflection.unsavedChangesMessage')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmNavigation}
                className="px-4 py-2 bg-lumea-primary text-white rounded hover:bg-lumea-primary-dark transition-colors"
              >
                {t('reflection.continueWithoutSaving')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 