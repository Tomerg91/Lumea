import { IReflectionQuestion, ReflectionCategory, QuestionType } from './Reflection';

// Extended question interface for advanced features
export interface IAdvancedReflectionQuestion extends IReflectionQuestion {
  section: string; // Group questions into sections
  subsection?: string; // Optional subsection within a section
  helpText?: string; // Additional guidance for the question
  placeholder?: string; // Placeholder text for text inputs
  conditionalLogic?: {
    dependsOn: string; // Question ID this depends on
    showIf: string | number | boolean | string[]; // Value(s) that trigger showing this question
  };
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    pattern?: string; // Regex pattern for validation
  };
  estimatedMinutes?: number; // Time estimate for this question
}

// Template types for different session contexts
export type ReflectionTemplateType =
  | 'standard' // Regular session reflection
  | 'breakthrough' // After major breakthrough sessions
  | 'challenge' // When working through difficult topics
  | 'goal_setting' // Goal-oriented sessions
  | 'relationship' // Relationship-focused sessions
  | 'career' // Career/professional focus
  | 'wellness' // Health and wellness focus
  | 'short_form'; // Quick reflection for shorter sessions

export interface IReflectionTemplate {
  type: ReflectionTemplateType;
  name: string;
  description: string;
  estimatedMinutes: number;
  sections: IReflectionSection[];
}

export interface IReflectionSection {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  questions: IAdvancedReflectionQuestion[];
  optional?: boolean;
}

export class ReflectionTemplates {
  // Get template based on session context or default to standard
  static getTemplate(type: ReflectionTemplateType = 'standard'): IReflectionTemplate {
    switch (type) {
      case 'breakthrough':
        return this.getBreakthroughTemplate();
      case 'challenge':
        return this.getChallengeTemplate();
      case 'goal_setting':
        return this.getGoalSettingTemplate();
      case 'relationship':
        return this.getRelationshipTemplate();
      case 'career':
        return this.getCareerTemplate();
      case 'wellness':
        return this.getWellnessTemplate();
      case 'short_form':
        return this.getShortFormTemplate();
      default:
        return this.getStandardTemplate();
    }
  }

  // Standard comprehensive reflection template
  private static getStandardTemplate(): IReflectionTemplate {
    return {
      type: 'standard',
      name: 'Standard Session Reflection',
      description: 'Comprehensive reflection for regular coaching sessions',
      estimatedMinutes: 15,
      sections: [
        {
          id: 'opening',
          title: 'Session Overview',
          description: "How did today's session feel for you?",
          estimatedMinutes: 3,
          questions: [
            {
              id: 'session_overall_feeling',
              section: 'opening',
              category: 'self_awareness',
              type: 'scale',
              question: "How would you rate your overall experience of today's session?",
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
              question: "Which words best describe how you're feeling right now?",
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
                'Sad',
                'Angry',
                'Grateful',
                'Inspired',
              ],
              order: 2,
              estimatedMinutes: 1,
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
              helpText:
                'Think about new insights, realizations, or understanding about your thoughts, feelings, behaviors, or patterns',
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
              helpText:
                'Consider how clearly you could see your patterns, motivations, and reactions',
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
          id: 'patterns',
          title: 'Patterns & Behaviors',
          description: 'What patterns are you noticing?',
          estimatedMinutes: 3,
          questions: [
            {
              id: 'patterns_noticed',
              section: 'patterns',
              category: 'patterns',
              type: 'rich_text',
              question:
                'What patterns of thinking, feeling, or behaving did you notice in yourself?',
              helpText:
                'Patterns might be recurring thoughts, emotional reactions, or ways you respond to certain situations',
              placeholder: 'I notice that I tend to...',
              required: true,
              validationRules: { minLength: 30 },
              order: 5,
              estimatedMinutes: 2,
            },
            {
              id: 'patterns_change_desire',
              section: 'patterns',
              category: 'patterns',
              type: 'yes_no',
              question: 'Are there any patterns you recognized that you would like to change?',
              required: true,
              followUpQuestion:
                'What specific pattern would you like to work on changing, and why?',
              order: 6,
              estimatedMinutes: 1,
            },
          ],
        },
        {
          id: 'growth',
          title: 'Growth Opportunities',
          description: 'Where do you see potential for growth?',
          estimatedMinutes: 3,
          questions: [
            {
              id: 'growth_opportunities',
              section: 'growth',
              category: 'growth_opportunities',
              type: 'rich_text',
              question:
                'Where do you see the biggest opportunity for your personal growth right now?',
              helpText:
                'Consider areas where you feel ready to expand, heal, or develop new skills',
              placeholder: 'I see an opportunity to grow in...',
              required: true,
              validationRules: { minLength: 40 },
              order: 7,
              estimatedMinutes: 2,
            },
            {
              id: 'growth_focus_area',
              section: 'growth',
              category: 'growth_opportunities',
              type: 'multiple_choice',
              question: 'Which area feels most important to focus on in the coming weeks?',
              helpText: 'Choose the area that feels most alive and important for you right now',
              required: true,
              options: [
                'Emotional awareness and regulation',
                'Communication and expressing needs',
                'Relationship patterns and boundaries',
                'Life purpose and direction',
                'Self-compassion and inner critic work',
                'Confidence and self-trust',
                'Career and professional growth',
                'Family and intimate relationships',
                'Health and self-care',
                'Creativity and self-expression',
                'Other',
              ],
              order: 8,
              estimatedMinutes: 1,
            },
          ],
        },
        {
          id: 'actions',
          title: 'Action & Integration',
          description: "How will you integrate today's insights?",
          estimatedMinutes: 3,
          questions: [
            {
              id: 'action_commitments',
              section: 'actions',
              category: 'action_commitments',
              type: 'rich_text',
              question:
                "What specific actions will you take before our next session to integrate today's insights?",
              helpText:
                'Think of small, concrete steps you can realistically take. Be specific about what, when, and how',
              placeholder: 'I commit to...',
              required: true,
              validationRules: { minLength: 50 },
              order: 9,
              estimatedMinutes: 2,
            },
            {
              id: 'action_confidence',
              section: 'actions',
              category: 'action_commitments',
              type: 'scale',
              question: 'How confident are you that you will follow through on these actions?',
              helpText:
                'Be honest about your confidence level - this helps identify what support you might need',
              required: true,
              scaleMin: 1,
              scaleMax: 10,
              scaleLabels: { min: 'Not confident', max: 'Very confident' },
              order: 10,
              estimatedMinutes: 1,
            },
            {
              id: 'support_needed',
              section: 'actions',
              category: 'action_commitments',
              type: 'text',
              question: 'What support do you need to succeed with these actions?',
              helpText:
                'This could be internal support (mindset, self-compassion) or external support (accountability, resources)',
              placeholder: 'To succeed, I need...',
              required: false,
              order: 11,
              estimatedMinutes: 1,
              conditionalLogic: {
                dependsOn: 'action_confidence',
                showIf: ['1', '2', '3', '4', '5', '6', '7'], // Show if confidence is 7 or below
              },
            },
          ],
        },
        {
          id: 'closing',
          title: 'Gratitude & Closing',
          description: "Completing today's reflection",
          estimatedMinutes: 2,
          optional: true,
          questions: [
            {
              id: 'gratitude_session',
              section: 'closing',
              category: 'gratitude',
              type: 'rich_text',
              question: "What are you most grateful for from today's coaching session?",
              helpText:
                'This could be an insight, a feeling, a breakthrough, or simply the time and space for reflection',
              placeholder: "I'm grateful for...",
              required: false,
              order: 12,
              estimatedMinutes: 1,
            },
            {
              id: 'session_completion',
              section: 'closing',
              category: 'gratitude',
              type: 'multiple_choice',
              question: 'How complete does this session feel for you?',
              helpText: "There's no right answer - just notice what feels true",
              required: false,
              options: [
                'Very complete - I feel satisfied and ready to move forward',
                'Mostly complete - I got what I needed with some lingering questions',
                'Somewhat complete - I have more to explore on this topic',
                'Incomplete - I feel like we just scratched the surface',
              ],
              order: 13,
              estimatedMinutes: 1,
            },
          ],
        },
      ],
    };
  }

  // Breakthrough session template - for significant insights or shifts
  private static getBreakthroughTemplate(): IReflectionTemplate {
    return {
      type: 'breakthrough',
      name: 'Breakthrough Session Reflection',
      description:
        'Deep reflection for sessions with significant insights or emotional breakthroughs',
      estimatedMinutes: 20,
      sections: [
        {
          id: 'breakthrough_recognition',
          title: 'Recognizing the Breakthrough',
          description: 'What shifted for you today?',
          estimatedMinutes: 5,
          questions: [
            {
              id: 'breakthrough_description',
              section: 'breakthrough_recognition',
              category: 'self_awareness',
              type: 'rich_text',
              question: 'Describe the breakthrough, insight, or shift you experienced today',
              helpText:
                'What changed in your understanding, feeling, or perspective? Take your time to capture this fully',
              placeholder: 'The breakthrough I experienced was...',
              required: true,
              validationRules: { minLength: 100 },
              order: 1,
              estimatedMinutes: 4,
            },
            {
              id: 'breakthrough_impact',
              section: 'breakthrough_recognition',
              category: 'self_awareness',
              type: 'scale',
              question: 'How significant does this breakthrough feel for you?',
              helpText: 'Trust your inner sense of the magnitude of this shift',
              required: true,
              scaleMin: 1,
              scaleMax: 10,
              scaleLabels: { min: 'Minor insight', max: 'Life-changing revelation' },
              order: 2,
              estimatedMinutes: 1,
            },
          ],
        },
        // ... additional sections for breakthrough template
      ],
    };
  }

  // Short form template for quick check-ins
  private static getShortFormTemplate(): IReflectionTemplate {
    return {
      type: 'short_form',
      name: 'Quick Reflection',
      description: 'Brief reflection for shorter sessions or quick check-ins',
      estimatedMinutes: 5,
      sections: [
        {
          id: 'quick_check',
          title: 'Quick Check-In',
          description: "Essential reflections from today's session",
          estimatedMinutes: 5,
          questions: [
            {
              id: 'quick_insight',
              section: 'quick_check',
              category: 'self_awareness',
              type: 'text',
              question: 'What was your biggest insight or takeaway from today?',
              placeholder: 'My key insight was...',
              required: true,
              validationRules: { minLength: 20 },
              order: 1,
              estimatedMinutes: 2,
            },
            {
              id: 'quick_action',
              section: 'quick_check',
              category: 'action_commitments',
              type: 'text',
              question: "What is one thing you will do differently as a result of today's session?",
              placeholder: 'I will...',
              required: true,
              validationRules: { minLength: 15 },
              order: 2,
              estimatedMinutes: 2,
            },
            {
              id: 'quick_support',
              section: 'quick_check',
              category: 'gratitude',
              type: 'text',
              question: 'What support do you need this week?',
              placeholder: 'This week I need...',
              required: false,
              order: 3,
              estimatedMinutes: 1,
            },
          ],
        },
      ],
    };
  }

  // Placeholder methods for other templates (to be implemented)
  private static getChallengeTemplate(): IReflectionTemplate {
    // Implementation for challenge-focused sessions
    return this.getStandardTemplate(); // Fallback for now
  }

  private static getGoalSettingTemplate(): IReflectionTemplate {
    // Implementation for goal-setting sessions
    return this.getStandardTemplate(); // Fallback for now
  }

  private static getRelationshipTemplate(): IReflectionTemplate {
    // Implementation for relationship-focused sessions
    return this.getStandardTemplate(); // Fallback for now
  }

  private static getCareerTemplate(): IReflectionTemplate {
    // Implementation for career-focused sessions
    return this.getStandardTemplate(); // Fallback for now
  }

  private static getWellnessTemplate(): IReflectionTemplate {
    // Implementation for wellness-focused sessions
    return this.getStandardTemplate(); // Fallback for now
  }

  // Helper method to get all available templates
  static getAvailableTemplates(): {
    type: ReflectionTemplateType;
    name: string;
    description: string;
    estimatedMinutes: number;
  }[] {
    return [
      {
        type: 'standard',
        name: 'Standard Session Reflection',
        description: 'Comprehensive reflection for regular coaching sessions',
        estimatedMinutes: 15,
      },
      {
        type: 'breakthrough',
        name: 'Breakthrough Session Reflection',
        description: 'Deep reflection for sessions with significant insights',
        estimatedMinutes: 20,
      },
      {
        type: 'short_form',
        name: 'Quick Reflection',
        description: 'Brief reflection for shorter sessions',
        estimatedMinutes: 5,
      },
      {
        type: 'challenge',
        name: 'Challenge-Focused Reflection',
        description: 'For sessions working through difficult topics',
        estimatedMinutes: 18,
      },
      {
        type: 'goal_setting',
        name: 'Goal Setting Reflection',
        description: 'For goal-oriented and planning sessions',
        estimatedMinutes: 12,
      },
      {
        type: 'relationship',
        name: 'Relationship Reflection',
        description: 'For relationship-focused sessions',
        estimatedMinutes: 16,
      },
      {
        type: 'career',
        name: 'Career & Professional Reflection',
        description: 'For career and professional development sessions',
        estimatedMinutes: 14,
      },
      {
        type: 'wellness',
        name: 'Wellness & Self-Care Reflection',
        description: 'For health and wellness focused sessions',
        estimatedMinutes: 13,
      },
    ];
  }

  // Convert advanced template to simple questions for backward compatibility
  static templateToQuestions(template: IReflectionTemplate): IReflectionQuestion[] {
    const questions: IReflectionQuestion[] = [];

    template.sections.forEach((section) => {
      section.questions.forEach((question) => {
        questions.push({
          id: question.id,
          category: question.category,
          type: question.type,
          question: question.question,
          required: question.required,
          options: question.options,
          scaleMin: question.scaleMin,
          scaleMax: question.scaleMax,
          scaleLabels: question.scaleLabels,
          followUpQuestion: question.followUpQuestion,
          order: question.order,
        });
      });
    });

    return questions.sort((a, b) => a.order - b.order);
  }
}
