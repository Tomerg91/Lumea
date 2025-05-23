import React from 'react';
import { useTranslation } from 'react-i18next';
import { RichTextEditor } from '../RichTextEditor';
import { AdvancedReflectionQuestion, ReflectionAnswer } from '../../types/reflection';

interface QuestionRendererProps {
  question: AdvancedReflectionQuestion;
  answer?: ReflectionAnswer;
  onAnswerChange: (answer: ReflectionAnswer) => void;
  error?: string;
  disabled?: boolean;
  showFollowUp?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  answer,
  onAnswerChange,
  error,
  disabled = false,
  showFollowUp = true,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const handleValueChange = (value: string | number | boolean) => {
    onAnswerChange({
      questionId: question.id,
      value,
      followUpAnswer: answer?.followUpAnswer,
    });
  };

  const handleFollowUpChange = (followUpAnswer: string) => {
    onAnswerChange({
      questionId: question.id,
      value: answer?.value || '',
      followUpAnswer,
    });
  };

  const validateAnswer = (value: string | number | boolean): string | null => {
    if (question.required && (!value || value === '')) {
      return t('validation.required');
    }

    if (question.validationRules) {
      const rules = question.validationRules;
      const stringValue = String(value);

      if (rules.minLength && stringValue.length < rules.minLength) {
        return t('reflection.validation.minLength', { min: rules.minLength });
      }

      if (rules.maxLength && stringValue.length > rules.maxLength) {
        return t('reflection.validation.maxLength', { max: rules.maxLength });
      }

      if (rules.pattern && !new RegExp(rules.pattern).test(stringValue)) {
        return t('reflection.validation.pattern');
      }

      if (typeof value === 'number') {
        if (rules.minValue && value < rules.minValue) {
          return t('reflection.validation.minValue', { min: rules.minValue });
        }

        if (rules.maxValue && value > rules.maxValue) {
          return t('reflection.validation.maxValue', { max: rules.maxValue });
        }
      }
    }

    return null;
  };

  const renderTextInput = () => (
    <div className="space-y-2">
      <textarea
        value={answer?.value as string || ''}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder={question.placeholder}
        disabled={disabled}
        className={`
          w-full p-3 border rounded-lg resize-vertical min-h-[100px]
          ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
          focus:ring-2 focus:ring-lumea-primary focus:border-lumea-primary
          ${isRTL ? 'text-right' : 'text-left'}
        `}
        dir={isRTL ? 'rtl' : 'ltr'}
        rows={4}
      />
    </div>
  );

  const renderRichTextInput = () => (
    <RichTextEditor
      value={answer?.value as string || ''}
      onChange={handleValueChange}
      placeholder={question.placeholder}
      disabled={disabled}
      required={question.required}
      error={error}
      maxLength={question.validationRules?.maxLength}
      minHeight="150px"
      maxHeight="400px"
      autoSave={false} // Form handles auto-save
      showWordCount
      showCharCount
    />
  );

  const renderScaleInput = () => {
    const { scaleMin = 1, scaleMax = 10, scaleLabels } = question;
    const currentValue = answer?.value as number || scaleMin;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          {scaleLabels && (
            <>
              <span>{scaleLabels.min}</span>
              <span>{scaleLabels.max}</span>
            </>
          )}
        </div>
        
        <div className="px-2">
          <input
            type="range"
            min={scaleMin}
            max={scaleMax}
            value={currentValue}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            disabled={disabled}
            className={`
              w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map(num => (
            <span key={num} className={currentValue === num ? 'font-bold text-lumea-primary' : ''}>
              {num}
            </span>
          ))}
        </div>
        
        <div className="text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-lumea-primary text-white">
            {currentValue}
          </span>
        </div>
      </div>
    );
  };

  const renderMultipleChoice = () => {
    const selectedValues = Array.isArray(answer?.value) ? answer.value as string[] : 
                          answer?.value ? [answer.value as string] : [];

    const handleSelectionChange = (option: string, checked: boolean) => {
      let newValues: string[];
      
      if (checked) {
        newValues = [...selectedValues, option];
      } else {
        newValues = selectedValues.filter(v => v !== option);
      }
      
      // For single selection, only keep the latest choice
      if (!question.options?.includes('Multiple selections allowed')) {
        newValues = checked ? [option] : [];
      }
      
      handleValueChange(newValues.length <= 1 ? newValues[0] || '' : newValues.join(','));
    };

    return (
      <div className="space-y-3">
        {question.options?.map((option, index) => (
          <label
            key={index}
            className={`
              flex items-center p-3 rounded-lg border cursor-pointer transition-colors
              ${selectedValues.includes(option) 
                ? 'border-lumea-primary bg-lumea-primary/5' 
                : 'border-gray-200 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="checkbox"
              checked={selectedValues.includes(option)}
              onChange={(e) => handleSelectionChange(option, e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-lumea-primary border-gray-300 rounded focus:ring-lumea-primary"
            />
            <span className={`ml-3 ${isRTL ? 'mr-3 ml-0' : ''} text-sm font-medium text-gray-900`}>
              {option}
            </span>
          </label>
        ))}
      </div>
    );
  };

  const renderYesNoInput = () => {
    const currentValue = answer?.value;

    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          {[
            { value: true, label: t('common.yes') },
            { value: false, label: t('common.no') }
          ].map(({ value, label }) => (
            <label
              key={String(value)}
              className={`
                flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors min-w-[80px]
                ${currentValue === value 
                  ? 'border-lumea-primary bg-lumea-primary text-white' 
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                type="radio"
                name={question.id}
                checked={currentValue === value}
                onChange={() => handleValueChange(value)}
                disabled={disabled}
                className="sr-only"
              />
              <span className="font-medium">{label}</span>
            </label>
          ))}
        </div>

        {/* Show follow-up question if Yes is selected */}
        {showFollowUp && currentValue === true && question.followUpQuestion && (
          <div className="mt-4 pl-4 border-l-2 border-lumea-primary/20">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {question.followUpQuestion}
            </label>
            <textarea
              value={answer?.followUpAnswer || ''}
              onChange={(e) => handleFollowUpChange(e.target.value)}
              placeholder={t('reflection.followUpPlaceholder')}
              disabled={disabled}
              className={`
                w-full p-3 border rounded-lg resize-vertical min-h-[80px]
                ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
                focus:ring-2 focus:ring-lumea-primary focus:border-lumea-primary
                ${isRTL ? 'text-right' : 'text-left'}
              `}
              dir={isRTL ? 'rtl' : 'ltr'}
              rows={3}
            />
          </div>
        )}
      </div>
    );
  };

  const renderQuestionContent = () => {
    switch (question.type) {
      case 'text':
        return renderTextInput();
      case 'rich_text':
        return renderRichTextInput();
      case 'scale':
        return renderScaleInput();
      case 'multiple_choice':
        return renderMultipleChoice();
      case 'yes_no':
        return renderYesNoInput();
      default:
        return <div className="text-red-500">Unsupported question type: {question.type}</div>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">
          {question.question}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        
        {question.helpText && (
          <p className="text-sm text-gray-600 leading-relaxed">
            {question.helpText}
          </p>
        )}

        {question.estimatedMinutes && (
          <div className="flex items-center text-xs text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('reflection.estimatedTime', { minutes: question.estimatedMinutes })}
          </div>
        )}
      </div>

      <div className="mt-4">
        {renderQuestionContent()}
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}; 