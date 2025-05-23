import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReflectionSection, ReflectionAnswer } from '../../types/reflection';

interface ProgressIndicatorProps {
  sections: ReflectionSection[];
  currentSectionIndex: number;
  answers: Record<string, ReflectionAnswer>;
  onSectionClick: (index: number) => void;
  disabled?: boolean;
  estimatedTotalMinutes: number;
  startTime?: Date;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  sections,
  currentSectionIndex,
  answers,
  onSectionClick,
  disabled = false,
  estimatedTotalMinutes,
  startTime,
}) => {
  const { t } = useTranslation();

  // Calculate completion for each section
  const getSectionCompletion = (section: ReflectionSection): number => {
    const requiredQuestions = section.questions.filter(q => q.required);
    const answeredRequired = requiredQuestions.filter(q => {
      const answer = answers[q.id];
      return answer && answer.value !== '' && answer.value !== null && answer.value !== undefined;
    });
    
    return requiredQuestions.length > 0 
      ? Math.round((answeredRequired.length / requiredQuestions.length) * 100)
      : 100;
  };

  // Calculate overall completion
  const overallCompletion = Math.round(
    sections.reduce((sum, section) => sum + getSectionCompletion(section), 0) / sections.length
  );

  // Calculate elapsed time
  const getElapsedTime = (): string => {
    if (!startTime) return '0 min';
    
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60));
    return elapsed > 0 ? `${elapsed} min` : '< 1 min';
  };

  const getEstimatedTimeRemaining = (): string => {
    const remaining = Math.max(0, estimatedTotalMinutes - (startTime ? Math.floor((Date.now() - startTime.getTime()) / (1000 * 60)) : 0));
    return `~${remaining} min`;
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Overall Progress */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('reflection.reflectionProgress')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('reflection.section')} {currentSectionIndex + 1} {t('reflection.of')} {sections.length}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-lumea-primary">
              {overallCompletion}%
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div>{t('reflection.timeElapsed')}: {getElapsedTime()}</div>
              <div>{t('reflection.timeRemaining')}: {getEstimatedTimeRemaining()}</div>
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-lumea-primary h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${overallCompletion}%` }}
            />
          </div>
        </div>

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2">
          {sections.map((section, index) => {
            const completion = getSectionCompletion(section);
            const isActive = index === currentSectionIndex;
            const isCompleted = completion === 100;
            const isClickable = !disabled && (index <= currentSectionIndex + 1 || completion > 0);

            return (
              <button
                key={section.id}
                onClick={() => isClickable && onSectionClick(index)}
                disabled={!isClickable}
                className={`
                  relative flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-lumea-primary text-white shadow-md' 
                    : isCompleted
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : completion > 0
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'bg-gray-100 text-gray-500'
                  }
                  ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                  ${disabled ? 'opacity-50' : ''}
                `}
                title={`${section.title} - ${completion}% ${t('reflection.complete')}`}
              >
                {/* Section Number */}
                <span className={`
                  flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2
                  ${isActive 
                    ? 'bg-white text-lumea-primary' 
                    : isCompleted
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }
                `}>
                  {isCompleted ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>

                {/* Section Title */}
                <span className="hidden sm:inline truncate max-w-[120px]">
                  {section.title}
                </span>

                {/* Progress Indicator */}
                {!isCompleted && completion > 0 && (
                  <div className="ml-2 w-8 h-1 bg-gray-300 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-current transition-all duration-300"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                )}

                {/* Optional Badge */}
                {section.optional && (
                  <span className="ml-1 text-xs opacity-75">
                    *
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Current Section Info */}
        <div className="mt-3 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>
              <strong>{sections[currentSectionIndex]?.title}</strong>
              {sections[currentSectionIndex]?.optional && (
                <span className="ml-1 text-xs text-gray-500">
                  ({t('reflection.optional')})
                </span>
              )}
            </span>
            
            <span className="text-xs">
              {t('reflection.estimatedTime', { 
                minutes: sections[currentSectionIndex]?.estimatedMinutes || 0 
              })}
            </span>
          </div>
          
          <p className="mt-1 text-xs leading-relaxed">
            {sections[currentSectionIndex]?.description}
          </p>
        </div>
      </div>
    </div>
  );
}; 