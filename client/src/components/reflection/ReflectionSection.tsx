import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReflectionSection as IReflectionSection, ReflectionAnswer, AdvancedReflectionQuestion } from '../../types/reflection';
import { QuestionRenderer } from './QuestionRenderer';

interface ReflectionSectionProps {
  section: IReflectionSection;
  answers: Record<string, ReflectionAnswer>;
  errors: Record<string, string>;
  onAnswerChange: (answer: ReflectionAnswer) => void;
  disabled?: boolean;
  isActive?: boolean;
  isCompleted?: boolean;
}

export const ReflectionSection: React.FC<ReflectionSectionProps> = ({
  section,
  answers,
  errors,
  onAnswerChange,
  disabled = false,
  isActive = false,
  isCompleted = false,
}) => {
  const { t } = useTranslation();

  // Check if a question should be shown based on conditional logic
  const shouldShowQuestion = (question: AdvancedReflectionQuestion): boolean => {
    if (!question.conditionalLogic) {
      return true;
    }

    const { dependsOn, showIf } = question.conditionalLogic;
    const dependentAnswer = answers[dependsOn];

    if (!dependentAnswer) {
      return false;
    }

    const dependentValue = dependentAnswer.value;

    // Handle different types of showIf conditions
    if (Array.isArray(showIf)) {
      return showIf.some(condition => {
        if (typeof condition === 'string' && typeof dependentValue === 'number') {
          return condition === String(dependentValue);
        }
        return condition === dependentValue;
      });
    }

    if (typeof showIf === 'string' && typeof dependentValue === 'number') {
      return showIf === String(dependentValue);
    }

    return showIf === dependentValue;
  };

  // Filter questions based on conditional logic
  const visibleQuestions = section.questions.filter(shouldShowQuestion);

  // Calculate section completion
  const requiredQuestions = visibleQuestions.filter(q => q.required);
  const answeredRequired = requiredQuestions.filter(q => {
    const answer = answers[q.id];
    return answer && answer.value !== '' && answer.value !== null && answer.value !== undefined;
  });
  
  const completionPercentage = requiredQuestions.length > 0 
    ? Math.round((answeredRequired.length / requiredQuestions.length) * 100)
    : 100;

  const sectionClasses = `
    rounded-lg border transition-all duration-300
    ${isActive 
      ? 'border-lumea-primary bg-white shadow-md' 
      : isCompleted 
        ? 'border-green-300 bg-green-50' 
        : 'border-gray-200 bg-gray-50'
    }
    ${disabled ? 'opacity-60' : ''}
  `;

  return (
    <div className={sectionClasses}>
      {/* Section Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {section.title}
              </h2>
              
              {section.optional && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  {t('reflection.optional')}
                </span>
              )}
              
              {isCompleted && (
                <div className="flex items-center text-green-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            <p className="mt-1 text-sm text-gray-600">
              {section.description}
            </p>

            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('reflection.estimatedTime', { minutes: section.estimatedMinutes })}
              </div>
              
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {answeredRequired.length} / {requiredQuestions.length} {t('reflection.required')}
              </div>
            </div>
          </div>

          {/* Progress Circle */}
          <div className="flex items-center justify-center w-12 h-12">
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  strokeWidth="3"
                  fill="none"
                  stroke="currentColor"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${isCompleted ? 'text-green-500' : 'text-lumea-primary'}`}
                  strokeWidth="3"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${completionPercentage}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-semibold ${isCompleted ? 'text-green-600' : 'text-lumea-primary'}`}>
                  {completionPercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-lumea-primary'}`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section Content */}
      <div className="p-6 space-y-8">
        {visibleQuestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>{t('reflection.noQuestionsToShow')}</p>
          </div>
        ) : (
          visibleQuestions.map((question, index) => (
            <div 
              key={question.id}
              className={`
                transition-all duration-300
                ${index > 0 ? 'pt-8 border-t border-gray-100' : ''}
              `}
            >
              <QuestionRenderer
                question={question}
                answer={answers[question.id]}
                onAnswerChange={onAnswerChange}
                error={errors[question.id]}
                disabled={disabled}
                showFollowUp={true}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}; 