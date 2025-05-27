import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { RatingInput } from './RatingInput';
import { 
  FeedbackFormData, 
  FeedbackFormProps, 
  FeedbackFormState,
  FeedbackType,
  FeedbackRatings
} from '../../types/feedback';
import { feedbackService } from '../../services/feedbackService';
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Send, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Star,
  MessageSquare,
  Shield,
  Eye
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Validation schema
const feedbackSchema = z.object({
  feedbackType: z.enum(['coach', 'client']),
  ratings: z.object({
    overallSatisfaction: z.number().min(1).max(5),
    coachEffectiveness: z.number().min(1).max(5),
    sessionQuality: z.number().min(1).max(5),
    goalProgress: z.number().min(1).max(5),
    communicationQuality: z.number().min(1).max(5),
    wouldRecommend: z.number().min(1).max(5),
  }),
  sessionGoalsMet: z.boolean(),
  overallComments: z.string().max(2000).optional(),
  sessionGoalsComments: z.string().max(1000).optional(),
  challengesFaced: z.string().max(1000).optional(),
  successHighlights: z.string().max(1000).optional(),
  improvementSuggestions: z.string().max(1000).optional(),
  nextSessionFocus: z.string().max(1000).optional(),
  privateNotes: z.string().max(1000).optional(),
  anonymous: z.boolean().optional(),
  consentToShare: z.boolean().optional(),
  confidentialityLevel: z.enum(['standard', 'restricted', 'anonymous']).optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const STEPS = [
  { id: 'ratings', title: 'Rate Your Experience', icon: Star },
  { id: 'comments', title: 'Share Your Thoughts', icon: MessageSquare },
  { id: 'privacy', title: 'Privacy Settings', icon: Shield },
  { id: 'review', title: 'Review & Submit', icon: Eye },
];

export const SessionFeedbackForm: React.FC<FeedbackFormProps> = ({
  sessionId,
  feedbackType,
  existingFeedback,
  template,
  onSubmit,
  onSave,
  onCancel,
  disabled = false,
  className,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formState, setFormState] = useState<FeedbackFormState>({
    currentStep: 0,
    totalSteps: STEPS.length,
    isSubmitting: false,
    isDirty: false,
    errors: {},
    autoSaveStatus: 'idle',
    startTime: new Date(),
  });
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef(new Date());

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feedbackType,
      ratings: {
        overallSatisfaction: existingFeedback?.ratings.overallSatisfaction || 0,
        coachEffectiveness: existingFeedback?.ratings.coachEffectiveness || 0,
        sessionQuality: existingFeedback?.ratings.sessionQuality || 0,
        goalProgress: existingFeedback?.ratings.goalProgress || 0,
        communicationQuality: existingFeedback?.ratings.communicationQuality || 0,
        wouldRecommend: existingFeedback?.ratings.wouldRecommend || 0,
      },
      sessionGoalsMet: existingFeedback?.sessionGoalsMet || false,
      overallComments: existingFeedback?.overallComments || '',
      sessionGoalsComments: existingFeedback?.sessionGoalsComments || '',
      challengesFaced: existingFeedback?.challengesFaced || '',
      successHighlights: existingFeedback?.successHighlights || '',
      improvementSuggestions: existingFeedback?.improvementSuggestions || '',
      nextSessionFocus: existingFeedback?.nextSessionFocus || '',
      privateNotes: existingFeedback?.privateNotes || '',
      anonymous: existingFeedback?.anonymous || false,
      consentToShare: existingFeedback?.consentToShare || true,
      confidentialityLevel: existingFeedback?.confidentialityLevel || 'standard',
    },
    mode: 'onChange',
  });

  const { watch, formState: { isDirty, isValid } } = form;
  const watchedValues = watch();

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!isDirty || !onSave) return;

    setFormState(prev => ({ ...prev, autoSaveStatus: 'saving' }));
    
    try {
      const formData = form.getValues();
      await onSave(formData);
      setFormState(prev => ({ 
        ...prev, 
        autoSaveStatus: 'saved',
        lastSaved: new Date(),
      }));
    } catch (error) {
      console.error('Auto-save failed:', error);
      setFormState(prev => ({ ...prev, autoSaveStatus: 'error' }));
    }
  }, [isDirty, onSave, form]);

  // Debounced auto-save
  useEffect(() => {
    if (isDirty) {
      setFormState(prev => ({ ...prev, isDirty: true }));
      
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isDirty, performAutoSave]);

  // Navigation functions
  const nextStep = () => {
    if (formState.currentStep < STEPS.length - 1) {
      setFormState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const prevStep = () => {
    if (formState.currentStep > 0) {
      setFormState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < STEPS.length) {
      setFormState(prev => ({ ...prev, currentStep: stepIndex }));
    }
  };

  // Form submission
  const handleSubmit = async (data: FeedbackFormValues) => {
    setFormState(prev => ({ ...prev, isSubmitting: true }));
    
    try {
      // Calculate response time
      const responseTime = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
      
      const feedbackData: FeedbackFormData = {
        feedbackType,
        ratings: data.ratings as FeedbackRatings, // Cast to ensure required fields are present
        sessionGoalsMet: data.sessionGoalsMet,
        overallComments: data.overallComments,
        sessionGoalsComments: data.sessionGoalsComments,
        challengesFaced: data.challengesFaced,
        successHighlights: data.successHighlights,
        improvementSuggestions: data.improvementSuggestions,
        nextSessionFocus: data.nextSessionFocus,
        privateNotes: data.privateNotes,
        anonymous: data.anonymous,
        consentToShare: data.consentToShare,
        confidentialityLevel: data.confidentialityLevel,
        responseTime,
      };

      if (onSubmit) {
        await onSubmit(feedbackData);
      } else {
        await feedbackService.submitFeedback(sessionId, feedbackData);
      }

      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your feedback! It has been submitted successfully.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Step validation
  const validateCurrentStep = (): boolean => {
    const currentStepId = STEPS[formState.currentStep].id;
    const values = form.getValues();
    
    switch (currentStepId) {
      case 'ratings':
        return Object.values(values.ratings).every(rating => rating >= 1 && rating <= 5);
      case 'comments':
        return true; // Comments are optional
      case 'privacy':
        return true; // Privacy settings are optional
      case 'review':
        return isValid;
      default:
        return true;
    }
  };

  const canProceed = validateCurrentStep();
  const progress = ((formState.currentStep + 1) / STEPS.length) * 100;

  // Render step content
  const renderStepContent = () => {
    const currentStepId = STEPS[formState.currentStep].id;
    
    switch (currentStepId) {
      case 'ratings':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">How would you rate this session?</h3>
              <p className="text-muted-foreground">
                Please rate your experience on a scale of 1 to 5 stars
              </p>
            </div>
            
            <div className="space-y-4">
              <RatingInput
                label="Overall Satisfaction"
                value={watchedValues.ratings.overallSatisfaction}
                onChange={(value) => form.setValue('ratings.overallSatisfaction', value, { shouldDirty: true })}
                required
                disabled={disabled}
                description="How satisfied are you with this session overall?"
              />
              
              <RatingInput
                label="Coach Effectiveness"
                value={watchedValues.ratings.coachEffectiveness}
                onChange={(value) => form.setValue('ratings.coachEffectiveness', value, { shouldDirty: true })}
                required
                disabled={disabled}
                description="How effective was your coach in helping you?"
              />
              
              <RatingInput
                label="Session Quality"
                value={watchedValues.ratings.sessionQuality}
                onChange={(value) => form.setValue('ratings.sessionQuality', value, { shouldDirty: true })}
                required
                disabled={disabled}
                description="How would you rate the quality of this session?"
              />
              
              <RatingInput
                label="Goal Progress"
                value={watchedValues.ratings.goalProgress}
                onChange={(value) => form.setValue('ratings.goalProgress', value, { shouldDirty: true })}
                required
                disabled={disabled}
                description="How much progress did you make toward your goals?"
              />
              
              <RatingInput
                label="Communication Quality"
                value={watchedValues.ratings.communicationQuality}
                onChange={(value) => form.setValue('ratings.communicationQuality', value, { shouldDirty: true })}
                required
                disabled={disabled}
                description="How clear and effective was the communication?"
              />
              
              <RatingInput
                label="Would Recommend"
                value={watchedValues.ratings.wouldRecommend}
                onChange={(value) => form.setValue('ratings.wouldRecommend', value, { shouldDirty: true })}
                required
                disabled={disabled}
                description="How likely are you to recommend this coach to others?"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Were your session goals met? <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watchedValues.sessionGoalsMet}
                  onCheckedChange={(checked) => form.setValue('sessionGoalsMet', checked, { shouldDirty: true })}
                  disabled={disabled}
                />
                <Label className="text-sm">
                  {watchedValues.sessionGoalsMet ? 'Yes, my goals were met' : 'No, my goals were not fully met'}
                </Label>
              </div>
            </div>
          </div>
        );
        
      case 'comments':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Share Your Thoughts</h3>
              <p className="text-muted-foreground">
                Help us understand your experience better (optional)
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="overallComments">Overall Comments</Label>
                <Textarea
                  id="overallComments"
                  placeholder="Share your overall thoughts about this session..."
                  {...form.register('overallComments')}
                  disabled={disabled}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  {watchedValues.overallComments?.length || 0}/2000 characters
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sessionGoalsComments">Session Goals</Label>
                <Textarea
                  id="sessionGoalsComments"
                  placeholder="Tell us about your session goals and how well they were addressed..."
                  {...form.register('sessionGoalsComments')}
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  {watchedValues.sessionGoalsComments?.length || 0}/1000 characters
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="successHighlights">Success Highlights</Label>
                  <Textarea
                    id="successHighlights"
                    placeholder="What went particularly well?"
                    {...form.register('successHighlights')}
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    {watchedValues.successHighlights?.length || 0}/1000 characters
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="challengesFaced">Challenges Faced</Label>
                  <Textarea
                    id="challengesFaced"
                    placeholder="What challenges did you encounter?"
                    {...form.register('challengesFaced')}
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    {watchedValues.challengesFaced?.length || 0}/1000 characters
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="improvementSuggestions">Improvement Suggestions</Label>
                  <Textarea
                    id="improvementSuggestions"
                    placeholder="How could this session be improved?"
                    {...form.register('improvementSuggestions')}
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    {watchedValues.improvementSuggestions?.length || 0}/1000 characters
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nextSessionFocus">Next Session Focus</Label>
                  <Textarea
                    id="nextSessionFocus"
                    placeholder="What should the next session focus on?"
                    {...form.register('nextSessionFocus')}
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    {watchedValues.nextSessionFocus?.length || 0}/1000 characters
                  </p>
                </div>
              </div>
              
              {feedbackType === 'coach' && (
                <div className="space-y-2">
                  <Label htmlFor="privateNotes">Private Notes</Label>
                  <Textarea
                    id="privateNotes"
                    placeholder="Private notes for your own reference (not shared with client)..."
                    {...form.register('privateNotes')}
                    disabled={disabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    {watchedValues.privateNotes?.length || 0}/1000 characters • Private notes are only visible to you
                  </p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Privacy Settings</h3>
              <p className="text-muted-foreground">
                Control how your feedback is shared and used
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Anonymous Feedback</Label>
                  <p className="text-xs text-muted-foreground">
                    Submit this feedback anonymously (your name won't be associated with it)
                  </p>
                </div>
                <Switch
                  checked={watchedValues.anonymous}
                  onCheckedChange={(checked) => form.setValue('anonymous', checked, { shouldDirty: true })}
                  disabled={disabled}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Consent to Share</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow this feedback to be used for improving our services
                  </p>
                </div>
                <Switch
                  checked={watchedValues.consentToShare}
                  onCheckedChange={(checked) => form.setValue('consentToShare', checked, { shouldDirty: true })}
                  disabled={disabled}
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Confidentiality Level</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: 'standard', label: 'Standard', description: 'Feedback shared with relevant team members' },
                    { value: 'restricted', label: 'Restricted', description: 'Feedback shared only with direct supervisor' },
                    { value: 'anonymous', label: 'Anonymous', description: 'Feedback completely anonymized' },
                  ].map((option) => (
                    <div
                      key={option.value}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-colors",
                        watchedValues.confidentialityLevel === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => form.setValue('confidentialityLevel', option.value as any, { shouldDirty: true })}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="confidentialityLevel"
                          value={option.value}
                          checked={watchedValues.confidentialityLevel === option.value}
                          onChange={() => form.setValue('confidentialityLevel', option.value as any, { shouldDirty: true })}
                          disabled={disabled}
                          className="text-primary"
                        />
                        <div>
                          <Label className="text-sm font-medium">{option.label}</Label>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'review': {
        const averageRating = Object.values(watchedValues.ratings).reduce((sum, val) => sum + val, 0) / 6;
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Review Your Feedback</h3>
              <p className="text-muted-foreground">
                Please review your feedback before submitting
              </p>
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Ratings Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
                    <div className="flex">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-5 h-5",
                            i < Math.round(averageRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          )}
                        />
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Overall Satisfaction: {watchedValues.ratings.overallSatisfaction}/5</div>
                    <div>Coach Effectiveness: {watchedValues.ratings.coachEffectiveness}/5</div>
                    <div>Session Quality: {watchedValues.ratings.sessionQuality}/5</div>
                    <div>Goal Progress: {watchedValues.ratings.goalProgress}/5</div>
                    <div>Communication: {watchedValues.ratings.communicationQuality}/5</div>
                    <div>Would Recommend: {watchedValues.ratings.wouldRecommend}/5</div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Badge variant={watchedValues.sessionGoalsMet ? "default" : "secondary"}>
                        {watchedValues.sessionGoalsMet ? "Goals Met" : "Goals Not Met"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {(watchedValues.overallComments || 
                watchedValues.sessionGoalsComments || 
                watchedValues.successHighlights || 
                watchedValues.challengesFaced) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Comments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {watchedValues.overallComments && (
                      <div>
                        <Label className="text-sm font-medium">Overall Comments</Label>
                        <p className="text-sm text-muted-foreground mt-1">{watchedValues.overallComments}</p>
                      </div>
                    )}
                    {watchedValues.sessionGoalsComments && (
                      <div>
                        <Label className="text-sm font-medium">Session Goals</Label>
                        <p className="text-sm text-muted-foreground mt-1">{watchedValues.sessionGoalsComments}</p>
                      </div>
                    )}
                    {watchedValues.successHighlights && (
                      <div>
                        <Label className="text-sm font-medium">Success Highlights</Label>
                        <p className="text-sm text-muted-foreground mt-1">{watchedValues.successHighlights}</p>
                      </div>
                    )}
                    {watchedValues.challengesFaced && (
                      <div>
                        <Label className="text-sm font-medium">Challenges Faced</Label>
                        <p className="text-sm text-muted-foreground mt-1">{watchedValues.challengesFaced}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Privacy Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Anonymous:</span>
                      <Badge variant={watchedValues.anonymous ? "default" : "secondary"}>
                        {watchedValues.anonymous ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Consent to Share:</span>
                      <Badge variant={watchedValues.consentToShare ? "default" : "secondary"}>
                        {watchedValues.consentToShare ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidentiality:</span>
                      <Badge variant="outline">
                        {watchedValues.confidentialityLevel?.charAt(0).toUpperCase() + 
                         watchedValues.confidentialityLevel?.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      }
        
      default:
        return null;
    }
  };

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Session Feedback
              <Badge variant="outline" className="capitalize">
                {feedbackType}
              </Badge>
            </CardTitle>
            <CardDescription>
              Step {formState.currentStep + 1} of {STEPS.length}: {STEPS[formState.currentStep].title}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {formState.autoSaveStatus === 'saving' && (
              <div className="flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </div>
            )}
            {formState.autoSaveStatus === 'saved' && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </div>
            )}
            {formState.autoSaveStatus === 'error' && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                Save failed
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(index)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded transition-colors",
                    index === formState.currentStep
                      ? "bg-primary text-primary-foreground"
                      : index < formState.currentStep
                      ? "text-primary hover:bg-primary/10"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                  disabled={disabled}
                >
                  <StepIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <CardContent>
          {renderStepContent()}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={formState.currentStep === 0 || disabled}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={disabled}
              >
                Cancel
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {formState.currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceed || disabled}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!isValid || formState.isSubmitting || disabled}
              >
                {formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}; 