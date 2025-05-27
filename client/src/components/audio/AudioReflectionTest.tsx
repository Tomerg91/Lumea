import React, { useState } from 'react';
import { QuestionRenderer } from '../reflection/QuestionRenderer';
import { AdvancedReflectionQuestion, ReflectionAnswer } from '../../types/reflection';

const AUDIO_TEST_QUESTION: AdvancedReflectionQuestion = {
  id: 'audio_test',
  section: 'test',
  category: 'self_awareness',
  type: 'audio',
  question: 'Test Audio Question: Please record a short message',
  helpText: 'This is a test of the audio recording functionality in reflection forms.',
  required: false,
  validationRules: {
    minValue: 5, // minimum 5 seconds
    maxValue: 60, // maximum 1 minute
  },
  followUpQuestion: 'Any additional thoughts in writing?',
  order: 1,
  estimatedMinutes: 2,
};

export const AudioReflectionTest: React.FC = () => {
  const [answer, setAnswer] = useState<ReflectionAnswer | undefined>();
  const [error, setError] = useState<string>('');

  const handleAnswerChange = (newAnswer: ReflectionAnswer) => {
    setAnswer(newAnswer);
    setError(''); // Clear any previous errors
    console.log('Audio answer updated:', newAnswer);
  };

  const validateAnswer = () => {
    if (AUDIO_TEST_QUESTION.required && !answer?.audioData) {
      setError('Audio recording is required');
      return false;
    }

    if (answer?.audioData && AUDIO_TEST_QUESTION.validationRules) {
      const { minValue, maxValue } = AUDIO_TEST_QUESTION.validationRules;
      
      if (minValue && answer.audioData.duration < minValue) {
        setError(`Recording must be at least ${minValue} seconds long`);
        return false;
      }
      
      if (maxValue && answer.audioData.duration > maxValue) {
        setError(`Recording must be no longer than ${maxValue} seconds`);
        return false;
      }
    }

    setError('');
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Audio Reflection Integration Test
      </h2>
      
      <div className="space-y-6">
        <QuestionRenderer
          question={AUDIO_TEST_QUESTION}
          answer={answer}
          onAnswerChange={handleAnswerChange}
          error={error}
          disabled={false}
          showFollowUp={true}
        />
        
        <div className="flex gap-4">
          <button
            onClick={validateAnswer}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Validate Answer
          </button>
          
          <button
            onClick={() => {
              setAnswer(undefined);
              setError('');
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
        </div>
        
        {/* Debug Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Debug Info:</h3>
          <pre className="text-sm text-gray-600 overflow-auto">
            {JSON.stringify(
              {
                hasAnswer: !!answer,
                hasAudioData: !!answer?.audioData,
                audioInfo: answer?.audioData ? {
                  duration: answer.audioData.duration,
                  size: answer.audioData.size,
                  mimeType: answer.audioData.mimeType,
                } : null,
                followUpAnswer: answer?.followUpAnswer,
                value: answer?.value,
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}; 