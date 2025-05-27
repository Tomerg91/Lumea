import React, { useState } from 'react';
import { ReflectionForm } from '../components/reflection/ReflectionForm';
import { ReflectionTemplate } from '../types/reflection';

const MOCK_TEMPLATE: ReflectionTemplate = {
  type: 'standard',
  name: 'Standard Session Reflection',
  description: 'Comprehensive reflection for regular coaching sessions',
  estimatedMinutes: 15,
  sections: [
    {
      id: 'opening',
      title: 'Session Overview',
      description: 'How did today\'s session feel for you?',
      estimatedMinutes: 3,
      questions: [
        {
          id: 'session_overall_feeling',
          section: 'opening',
          category: 'self_awareness',
          type: 'scale',
          question: 'How would you rate your overall experience of today\'s session?',
          helpText: 'Consider your emotional state, engagement level, and sense of progress',
          required: true,
          scaleMin: 1,
          scaleMax: 10,
          scaleLabels: { min: 'Challenging/Difficult', max: 'Positive/Energizing' },
          order: 1,
          estimatedMinutes: 1,
        },
        {
          id: 'session_mood_check',
          section: 'opening',
          category: 'self_awareness',
          type: 'multiple_choice',
          question: 'Which words best describe how you\'re feeling right now?',
          helpText: 'You can select multiple options that resonate',
          required: true,
          options: [
            'Hopeful',
            'Relieved',
            'Energized',
            'Calm',
            'Contemplative',
            'Uncertain',
            'Overwhelmed',
            'Frustrated',
            'Multiple selections allowed'
          ],
          order: 2,
          estimatedMinutes: 1,
        },
        {
          id: 'session_audio_reflection',
          section: 'opening',
          category: 'self_awareness',
          type: 'audio',
          question: 'In your own words, how would you describe your experience in today\'s session?',
          helpText: 'Feel free to speak naturally about what stood out to you, how you felt, or any insights you gained. This is your space to reflect verbally.',
          required: false,
          validationRules: {
            minValue: 10, // minimum 10 seconds
            maxValue: 180, // maximum 3 minutes
          },
          followUpQuestion: 'Is there anything else you\'d like to add in writing?',
          order: 3,
          estimatedMinutes: 3,
        },
      ],
    },
    {
      id: 'self_awareness',
      title: 'Self-Discovery',
      description: 'What did you learn about yourself today?',
      estimatedMinutes: 4,
      questions: [
        {
          id: 'self_discovery_main',
          section: 'self_awareness',
          category: 'self_awareness',
          type: 'rich_text',
          question: 'What did you discover or learn about yourself during this session?',
          helpText: 'Think about new insights, realizations, or understanding about your thoughts, feelings, behaviors, or patterns',
          placeholder: 'I realized that...',
          required: true,
          validationRules: { minLength: 50 },
          order: 3,
          estimatedMinutes: 3,
        },
        {
          id: 'self_awareness_scale',
          section: 'self_awareness',
          category: 'self_awareness',
          type: 'scale',
          question: 'How would you rate your level of self-awareness during this session?',
          helpText: 'Consider how clearly you could see your patterns, motivations, and reactions',
          required: true,
          scaleMin: 1,
          scaleMax: 10,
          scaleLabels: { min: 'Unclear/Foggy', max: 'Very Clear/Insightful' },
          order: 4,
          estimatedMinutes: 1,
        },
      ],
    },
    {
      id: 'actions',
      title: 'Action & Integration',
      description: 'How will you integrate today\'s insights?',
      estimatedMinutes: 3,
      questions: [
        {
          id: 'action_commitments',
          section: 'actions',
          category: 'action_commitments',
          type: 'rich_text',
          question: 'What specific actions will you take before our next session?',
          helpText: 'Think of small, concrete steps you can realistically take. Be specific about what, when, and how',
          placeholder: 'I commit to...',
          required: true,
          validationRules: { minLength: 50 },
          order: 5,
          estimatedMinutes: 2,
        },
        {
          id: 'action_confidence',
          section: 'actions',
          category: 'action_commitments',
          type: 'scale',
          question: 'How confident are you that you will follow through on these actions?',
          helpText: 'Be honest about your confidence level - this helps identify what support you might need',
          required: true,
          scaleMin: 1,
          scaleMax: 10,
          scaleLabels: { min: 'Not confident', max: 'Very confident' },
          order: 6,
          estimatedMinutes: 1,
        },
        {
          id: 'support_needed',
          section: 'actions',
          category: 'action_commitments',
          type: 'yes_no',
          question: 'Do you need additional support to achieve these actions?',
          helpText: 'This could be internal support (mindset, self-compassion) or external support (accountability, resources)',
          required: false,
          followUpQuestion: 'What specific support do you need?',
          order: 7,
          estimatedMinutes: 1,
        },
      ],
    },
    {
      id: 'closing',
      title: 'Gratitude & Closing',
      description: 'Completing today\'s reflection',
      estimatedMinutes: 2,
      optional: true,
      questions: [
        {
          id: 'gratitude_session',
          section: 'closing',
          category: 'gratitude',
          type: 'text',
          question: 'What are you most grateful for from today\'s coaching session?',
          helpText: 'This could be an insight, a feeling, a breakthrough, or simply the time and space for reflection',
          placeholder: 'I\'m grateful for...',
          required: false,
          order: 8,
          estimatedMinutes: 2,
        },
      ],
    },
  ],
};

export const ReflectionDemo: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const handleSave = (isDraft: boolean) => {
    setSavedCount(prev => prev + 1);
    console.log(`Reflection ${isDraft ? 'draft' : 'final'} saved! Total saves: ${savedCount + 1}`);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    console.log('Reflection submitted successfully!');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Reflection Submitted!
          </h2>
          <p className="text-gray-600 mb-6">
            Thank you for taking the time to reflect on your coaching session. Your insights are valuable for your growth journey.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setSavedCount(0);
            }}
            className="px-6 py-3 bg-lumea-primary text-white rounded-lg hover:bg-lumea-primary-dark transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Demo Header */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Reflection Form Demo
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            This is a demonstration of the Satya Method reflection form system with a standard template.
          </p>
          <div className="mt-2 text-xs text-gray-500">
            Saves count: {savedCount} | Session ID: demo-session-123
          </div>
        </div>
      </div>

      {/* Reflection Form */}
      <ReflectionForm
        sessionId="demo-session-123"
        template={MOCK_TEMPLATE}
        onSave={handleSave}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default ReflectionDemo; 