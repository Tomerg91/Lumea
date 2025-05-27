import React from 'react';
import { useTranslation } from 'react-i18next';
import { RichTextEditor } from '../RichTextEditor';
import AudioRecorder from '../audio/AudioRecorder';
import { audioUploadService, AudioUploadProgress } from '../../services/audioUploadService';
import { useMobileDetection } from '../../hooks/useMobileDetection';
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
  const mobileDetection = useMobileDetection();

  const handleAnswerChange = (value: string | number | boolean) => {
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
    if (question.required) {
      if (question.type === 'audio') {
        // For audio questions, check if audioData exists
        if (!answer?.audioData) {
          return t('validation.required');
        }
      } else if (!value || value === '' || value === null || value === undefined) {
        return t('validation.required');
      }
    }

    if (answer && question.validationRules) {
      const rules = question.validationRules;
      
      if (question.type === 'audio' && answer.audioData) {
        // Audio-specific validation
        if (rules.minValue && answer.audioData.duration < rules.minValue) {
          return t('reflection.validation.minDuration', { min: rules.minValue });
        }
        
        if (rules.maxValue && answer.audioData.duration > rules.maxValue) {
          return t('reflection.validation.maxDuration', { max: rules.maxValue });
        }
      } else {
        // Text-based validation for non-audio questions
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
    }

    return null;
  };

  const renderTextInput = () => (
    <div className="space-y-2">
      <textarea
        value={answer?.value as string || ''}
        onChange={(e) => handleAnswerChange(e.target.value)}
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
      onChange={handleAnswerChange}
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
            onChange={(e) => handleAnswerChange(Number(e.target.value))}
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
      
      handleAnswerChange(newValues.length <= 1 ? newValues[0] || '' : newValues.join(','));
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
                name={`question-${question.id}`}
                value={String(value)}
                checked={currentValue === value}
                onChange={(e) => handleAnswerChange(value)}
                disabled={disabled}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        
        {question.followUpQuestion && currentValue !== undefined && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {question.followUpQuestion}
            </label>
            <textarea
              value={answer?.followUpAnswer || ''}
              onChange={(e) => handleFollowUpChange(e.target.value)}
              placeholder={t('reflection.followUpPlaceholder')}
              rows={3}
              disabled={disabled}
              className={`
                w-full px-3 py-2 border rounded-lg transition-colors resize-none
                ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
                border-gray-200 focus:border-lumea-primary focus:ring-2 focus:ring-lumea-primary/20
              `}
            />
          </div>
        )}
      </div>
    );
  };

  const renderAudioInput = () => {
    const [uploadProgress, setUploadProgress] = React.useState<AudioUploadProgress | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadError, setUploadError] = React.useState<string | null>(null);

    const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
      try {
        setIsUploading(true);
        setUploadError(null);

        // Upload audio to S3
        const uploadResult = await audioUploadService.uploadAudio(audioBlob, duration, {
          onProgress: (progress) => setUploadProgress(progress),
          onRetry: (attempt, maxAttempts) => {
            console.log(`Upload retry ${attempt}/${maxAttempts}`);
          },
        });

        // Update reflection answer with upload information
        const updatedAnswer = audioUploadService.updateReflectionAnswerWithUpload(
          answer || {
            questionId: question.id,
            value: '',
            audioData: {
              blob: audioBlob,
              url: URL.createObjectURL(audioBlob),
              duration,
              mimeType: audioBlob.type,
              size: audioBlob.size,
            },
          },
          uploadResult
        );

        onAnswerChange(updatedAnswer);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        setUploadError(errorMessage);
        console.error('Audio upload failed:', error);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    };

    const handleRecordingError = (error: string) => {
      setUploadError(error);
    };

    return (
      <div className="space-y-4">
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          onRecordingError={handleRecordingError}
          maxDuration={question.validationRules?.maxValue || 300}
          disabled={disabled || isUploading}
          showPlayer={true}
          playerOptions={{
            showWaveform: true,
            showControls: true,
            showVolume: false,
            showSpeed: false,
            showDownload: false,
            autoPlay: false,
          }}
          mobileOptimized={mobileDetection.isMobile || mobileDetection.isTablet}
          compactMode={mobileDetection.isMobile || mobileDetection.screenWidth < 640}
        />

        {/* Upload Progress */}
        {isUploading && uploadProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                {t('audioUpload.uploading', 'Uploading audio...')}
              </span>
              <span className="text-sm text-blue-700">
                {uploadProgress.percentage}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.percentage}%` }}
              />
            </div>
            {uploadProgress.eta && (
              <div className="text-xs text-blue-600 mt-1">
                {t('audioUpload.timeRemaining', 'Time remaining: {{time}}s', {
                  time: Math.round(uploadProgress.eta),
                })}
              </div>
            )}
          </div>
        )}

        {/* Upload Success */}
        {answer?.s3Key && answer?.fileId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {t('audioUpload.success', 'Audio uploaded successfully')}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {t('audioUpload.duration', 'Duration: {{duration}}s', {
                    duration: Math.round(answer.audioData?.duration || 0),
                  })} • {(answer.audioData?.size || 0 / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  {t('audioUpload.error', 'Upload failed')}
                </p>
                <p className="text-xs text-red-600 mt-1">{uploadError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Follow-up Question */}
        {question.followUpQuestion && answer?.audioData && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {question.followUpQuestion}
            </label>
            <textarea
              value={answer?.followUpAnswer || ''}
              onChange={(e) => handleFollowUpChange(e.target.value)}
              placeholder={t('reflection.followUpPlaceholder')}
              rows={3}
              disabled={disabled}
              className={`
                w-full px-3 py-2 border rounded-lg transition-colors resize-none
                ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
                border-gray-200 focus:border-lumea-primary focus:ring-2 focus:ring-lumea-primary/20
              `}
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
      case 'audio':
        return renderAudioInput();
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