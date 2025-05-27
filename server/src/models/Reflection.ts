import mongoose, { Schema, Document } from 'mongoose';

// Question types for the reflection form
export type QuestionType = 'text' | 'scale' | 'multiple_choice' | 'yes_no' | 'rich_text' | 'audio';

// Reflection categories based on Satya Method
export type ReflectionCategory =
  | 'self_awareness'
  | 'patterns'
  | 'growth_opportunities'
  | 'action_commitments'
  | 'gratitude';

// Individual question definition
export interface IReflectionQuestion {
  id: string;
  category: ReflectionCategory;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[]; // For multiple choice
  scaleMin?: number; // For scale questions
  scaleMax?: number; // For scale questions
  scaleLabels?: { min: string; max: string }; // For scale questions
  followUpQuestion?: string; // For yes/no questions
  order: number;
}

// Answer to a reflection question
export interface IReflectionAnswer {
  questionId: string;
  value: string | number | boolean;
  followUpAnswer?: string; // For yes/no questions with follow-up
}

// Main reflection document
export interface IReflection extends Document {
  sessionId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  coachId: mongoose.Types.ObjectId;
  answers: IReflectionAnswer[];
  status: 'draft' | 'submitted';
  submittedAt?: Date;
  lastSavedAt: Date;
  version: number; // For handling concurrent edits
  estimatedCompletionMinutes?: number;
  actualCompletionMinutes?: number;
  sharedWithCoach?: boolean;
  sharedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Answer subdocument schema
const reflectionAnswerSchema = new Schema<IReflectionAnswer>(
  {
    questionId: {
      type: String,
      required: true,
    },
    value: {
      type: Schema.Types.Mixed, // Can be string, number, or boolean
      required: true,
    },
    followUpAnswer: {
      type: String,
      required: false,
    },
  },
  { _id: false }
);

// Main reflection schema
const reflectionSchema = new Schema<IReflection>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'CoachingSession',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coachId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    answers: [reflectionAnswerSchema],
    status: {
      type: String,
      enum: ['draft', 'submitted'],
      default: 'draft',
      required: true,
    },
    submittedAt: {
      type: Date,
      required: false,
    },
    lastSavedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
      required: true,
    },
    estimatedCompletionMinutes: {
      type: Number,
      required: false,
    },
    actualCompletionMinutes: {
      type: Number,
      required: false,
    },
    sharedWithCoach: {
      type: Boolean,
      required: false,
    },
    sharedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique reflection per session
reflectionSchema.index({ sessionId: 1, clientId: 1 }, { unique: true });

// Pre-save middleware to update lastSavedAt
reflectionSchema.pre('save', function (next) {
  this.lastSavedAt = new Date();
  next();
});

// Static method to get reflection questions template
reflectionSchema.statics.getQuestionTemplate = function (): IReflectionQuestion[] {
  return [
    // Self-awareness questions
    {
      id: 'self_awareness_1',
      category: 'self_awareness',
      type: 'rich_text',
      question: 'What did you discover about yourself during this session?',
      required: true,
      order: 1,
    },
    {
      id: 'self_awareness_2',
      category: 'self_awareness',
      type: 'scale',
      question: 'How would you rate your level of self-awareness during this session?',
      required: true,
      scaleMin: 1,
      scaleMax: 10,
      scaleLabels: { min: 'Low awareness', max: 'High awareness' },
      order: 2,
    },

    // Patterns questions
    {
      id: 'patterns_1',
      category: 'patterns',
      type: 'rich_text',
      question: 'What patterns of behavior, thinking, or feeling did you notice in yourself?',
      required: true,
      order: 3,
    },
    {
      id: 'patterns_2',
      category: 'patterns',
      type: 'yes_no',
      question: 'Did you recognize any patterns that you want to change?',
      required: true,
      followUpQuestion: 'What specific pattern would you like to work on?',
      order: 4,
    },

    // Growth opportunities
    {
      id: 'growth_1',
      category: 'growth_opportunities',
      type: 'rich_text',
      question: 'Where do you see the biggest opportunity for your personal growth?',
      required: true,
      order: 5,
    },
    {
      id: 'growth_2',
      category: 'growth_opportunities',
      type: 'multiple_choice',
      question: 'Which area feels most important to focus on next?',
      required: true,
      options: [
        'Emotional awareness',
        'Communication skills',
        'Relationship patterns',
        'Life goals and direction',
        'Self-compassion',
        'Boundary setting',
        'Other',
      ],
      order: 6,
    },

    // Action commitments
    {
      id: 'action_1',
      category: 'action_commitments',
      type: 'rich_text',
      question: 'What specific actions will you take before our next session?',
      required: true,
      order: 7,
    },
    {
      id: 'action_2',
      category: 'action_commitments',
      type: 'scale',
      question: 'How confident are you that you will follow through on these actions?',
      required: true,
      scaleMin: 1,
      scaleMax: 10,
      scaleLabels: { min: 'Not confident', max: 'Very confident' },
      order: 8,
    },

    // Gratitude
    {
      id: 'gratitude_1',
      category: 'gratitude',
      type: 'rich_text',
      question: 'What are you most grateful for from this coaching session?',
      required: false,
      order: 9,
    },
    {
      id: 'gratitude_2',
      category: 'gratitude',
      type: 'text',
      question: 'What support do you need to succeed?',
      required: false,
      order: 10,
    },
  ];
};

export const Reflection = mongoose.model<IReflection>('Reflection', reflectionSchema);
