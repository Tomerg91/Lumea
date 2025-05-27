import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { useToast } from '../../hooks/use-toast';
import { feedbackService } from '../../services/feedbackService';
import { FeedbackFormData, FeedbackFormProps, FeedbackType, FeedbackRatings } from '../../types/feedback';
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  Send,
  Check,
  X,
  Heart,
  ThumbsUp,
  MessageSquare,
  Lock,
  Globe,
  Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Mobile-optimized validation schema with simpler validation
const mobileFeedbackSchema = z.object({
  ratings: z.object({
    overallSatisfaction: z.number().min(1).max(5),
    coachEffectiveness: z.number().min(1).max(5),
    sessionQuality: z.number().min(1).max(5),
    goalProgress: z.number().min(1).max(5),
    communicationQuality: z.number().min(1).max(5),
    wouldRecommend: z.number().min(1).max(5),
  }),
  sessionGoalsMet: z.boolean(),
  overallComments: z.string().max(2000, 'Comments must be 2000 characters or less').optional(),
  challengesFaced: z.string().max(1000).optional(),
  successHighlights: z.string().max(1000).optional(),
  improvementSuggestions: z.string().max(1000).optional(),
  nextSessionFocus: z.string().max(1000).optional(),
  privateNotes: z.string().max(1000).optional(),
  anonymous: z.boolean().default(false),
  consentToShare: z.boolean().default(true),
  confidentialityLevel: z.enum(['standard', 'restricted', 'anonymous']).default('standard'),
});

interface MobileRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

const MobileRatingInput: React.FC<MobileRatingInputProps> = ({ 
  value, 
  onChange, 
  label, 
  description,
  icon 
}) => {
  const [selectedRating, setSelectedRating] = useState(value);
  const [hoverRating, setHoverRating] = useState(0);

  const handleTouchStart = (rating: number) => {
    setHoverRating(rating);
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleTouchEnd = (rating: number) => {
    setSelectedRating(rating);
    onChange(rating);
    setHoverRating(0);
    // Stronger haptic feedback for selection
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  const ratingLabels = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon && <div className="text-blue-600">{icon}</div>}
        <div>
          <h3 className="font-medium text-base">{label}</h3>
          {description && <p className="text-sm text-gray-600">{description}</p>}
        </div>
      </div>
      
      <div className="flex justify-center gap-2 py-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            className={cn(
              "touch-manipulation p-3 rounded-full transition-all duration-200 transform",
              "active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500",
              "min-w-[44px] min-h-[44px] flex items-center justify-center"
            )}
            onTouchStart={() => handleTouchStart(rating)}
            onTouchEnd={() => handleTouchEnd(rating)}
            onMouseEnter={() => setHoverRating(rating)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => handleTouchEnd(rating)}
          >
            <Star
              className={cn(
                "w-8 h-8 transition-all duration-200",
                rating <= (hoverRating || selectedRating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              )}
            />
          </button>
        ))}
      </div>
      
      <div className="text-center">
        <span className="text-sm font-medium text-gray-700">
          {ratingLabels[(selectedRating || value) - 1] || 'Tap to rate'}
        </span>
      </div>
    </div>
  );
};

interface MobileStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}

const MobileStepIndicator: React.FC<MobileStepIndicatorProps> = ({ 
  currentStep, 
  totalSteps, 
  stepTitles 
}) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round(progressPercentage)}% complete
        </span>
      </div>
      <Progress value={progressPercentage} className="h-2 mb-2" />
      <h2 className="text-lg font-semibold text-gray-900">
        {stepTitles[currentStep - 1]}
      </h2>
    </div>
  );
};

export const MobileFeedbackForm: React.FC<FeedbackFormProps> = ({
  sessionId,
  feedbackType,
  onSubmit,
  onCancel,
  initialData
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const startTimeRef = useRef(new Date());
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const totalSteps = 4;
  const stepTitles = [
    'Rate Your Experience',
    'Share Your Thoughts',
    'Privacy Settings',
    'Review & Submit'
  ];

  const form = useForm<z.infer<typeof mobileFeedbackSchema>>({
    resolver: zodResolver(mobileFeedbackSchema),
    defaultValues: {
      ratings: {
        overallSatisfaction: initialData?.ratings?.overallSatisfaction || 1,
        coachEffectiveness: initialData?.ratings?.coachEffectiveness || 1,
        sessionQuality: initialData?.ratings?.sessionQuality || 1,
        goalProgress: initialData?.ratings?.goalProgress || 1,
        communicationQuality: initialData?.ratings?.communicationQuality || 1,
        wouldRecommend: initialData?.ratings?.wouldRecommend || 1,
      },
      sessionGoalsMet: initialData?.sessionGoalsMet || false,
      overallComments: initialData?.overallComments || '',
      challengesFaced: initialData?.challengesFaced || '',
      successHighlights: initialData?.successHighlights || '',
      improvementSuggestions: initialData?.improvementSuggestions || '',
      nextSessionFocus: initialData?.nextSessionFocus || '',
      privateNotes: initialData?.privateNotes || '',
      anonymous: initialData?.anonymous || false,
      consentToShare: initialData?.consentToShare ?? true,
      confidentialityLevel: initialData?.confidentialityLevel || 'standard',
    },
  });

  // Auto-save functionality with debouncing
  const autoSaveTimeout = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
      
      autoSaveTimeout.current = setTimeout(() => {
        localStorage.setItem(`mobile-feedback-${sessionId}`, JSON.stringify(value));
        setLastSaved(new Date());
      }, 2000);
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [form, sessionId]);

  // Load saved data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(`mobile-feedback-${sessionId}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        form.reset(parsed);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error loading saved feedback data:', error);
      }
    }
  }, [sessionId, form]);

  const handleSwipeNavigation = (event: MouseEvent | TouchEvent, info: PanInfo) => {
    const threshold = 100;
    
    if (info.delta.x > threshold && currentStep > 1) {
      // Swipe right - go to previous step
      setCurrentStep(prev => prev - 1);
    } else if (info.delta.x < -threshold && currentStep < totalSteps) {
      // Swipe left - go to next step (if current step is valid)
      if (validateCurrentStep()) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const validateCurrentStep = (): boolean => {
    const data = form.getValues();
    
    switch (currentStep) {
      case 1:
        return Object.values(data.ratings).every(rating => rating > 0);
      case 2:
        return true; // Comments are optional
      case 3:
        return true; // Privacy settings have defaults
      case 4:
        return true; // Review step
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else if (!validateCurrentStep()) {
      toast({
        title: "Please complete this step",
        description: "All ratings are required before proceeding.",
        variant: "destructive",
      });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (data: z.infer<typeof mobileFeedbackSchema>) => {
    setIsSubmitting(true);
    
    try {
      const responseTime = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
      
      const feedbackData: FeedbackFormData = {
        feedbackType,
        ratings: data.ratings as FeedbackRatings,
        sessionGoalsMet: data.sessionGoalsMet,
        overallComments: data.overallComments || '',
        sessionGoalsComments: '', // Not collected in mobile form
        challengesFaced: data.challengesFaced || '',
        successHighlights: data.successHighlights || '',
        improvementSuggestions: data.improvementSuggestions || '',
        nextSessionFocus: data.nextSessionFocus || '',
        privateNotes: data.privateNotes || '',
        answers: [], // Not used in mobile form
        anonymous: data.anonymous,
        consentToShare: data.consentToShare,
        confidentialityLevel: data.confidentialityLevel,
        responseTime,
      };

      await onSubmit(feedbackData);
      
      // Clear saved data after successful submission
      localStorage.removeItem(`mobile-feedback-${sessionId}`);
      
      toast({
        title: "Feedback submitted successfully!",
        description: "Thank you for your valuable feedback.",
      });
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Submission failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    const data = form.watch();
    
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6 p-4"
          >
            <Controller
              name="ratings.overallSatisfaction"
              control={form.control}
              render={({ field }) => (
                <MobileRatingInput
                  value={field.value}
                  onChange={field.onChange}
                  label="Overall Satisfaction"
                  description="How satisfied were you with this session?"
                  icon={<Heart className="w-5 h-5" />}
                />
              )}
            />

            <Controller
              name="ratings.coachEffectiveness"
              control={form.control}
              render={({ field }) => (
                <MobileRatingInput
                  value={field.value}
                  onChange={field.onChange}
                  label="Coach Effectiveness"
                  description="How effective was your coach?"
                  icon={<ThumbsUp className="w-5 h-5" />}
                />
              )}
            />

            <Controller
              name="ratings.sessionQuality"
              control={form.control}
              render={({ field }) => (
                <MobileRatingInput
                  value={field.value}
                  onChange={field.onChange}
                  label="Session Quality"
                  description="How would you rate the overall quality?"
                  icon={<Star className="w-5 h-5" />}
                />
              )}
            />

            <Controller
              name="ratings.goalProgress"
              control={form.control}
              render={({ field }) => (
                <MobileRatingInput
                  value={field.value}
                  onChange={field.onChange}
                  label="Goal Progress"
                  description="Did you make progress toward your goals?"
                  icon={<CheckCircle2 className="w-5 h-5" />}
                />
              )}
            />

            <Controller
              name="ratings.communicationQuality"
              control={form.control}
              render={({ field }) => (
                <MobileRatingInput
                  value={field.value}
                  onChange={field.onChange}
                  label="Communication Quality"
                  description="How clear and helpful was the communication?"
                  icon={<MessageSquare className="w-5 h-5" />}
                />
              )}
            />

            <Controller
              name="ratings.wouldRecommend"
              control={form.control}
              render={({ field }) => (
                <MobileRatingInput
                  value={field.value}
                  onChange={field.onChange}
                  label="Would Recommend"
                  description="Would you recommend this coaching experience?"
                  icon={<Heart className="w-5 h-5" />}
                />
              )}
            />

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                Did you meet your session goals?
              </span>
              <Controller
                name="sessionGoalsMet"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-blue-600"
                  />
                )}
              />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6 p-4"
          >
            <Controller
              name="overallComments"
              control={form.control}
              render={({ field }) => (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Overall Comments (Optional)
                  </label>
                  <Textarea
                    {...field}
                    placeholder="Share your overall thoughts about the session..."
                    className="min-h-[100px] resize-none text-base"
                    maxLength={2000}
                  />
                  <div className="text-xs text-gray-500 text-right">
                    {field.value?.length || 0}/2000
                  </div>
                </div>
              )}
            />

            <Controller
              name="successHighlights"
              control={form.control}
              render={({ field }) => (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Success Highlights (Optional)
                  </label>
                  <Textarea
                    {...field}
                    placeholder="What went particularly well in this session?"
                    className="min-h-[80px] resize-none text-base"
                    maxLength={1000}
                  />
                  <div className="text-xs text-gray-500 text-right">
                    {field.value?.length || 0}/1000
                  </div>
                </div>
              )}
            />

            <Controller
              name="challengesFaced"
              control={form.control}
              render={({ field }) => (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Challenges Faced (Optional)
                  </label>
                  <Textarea
                    {...field}
                    placeholder="What challenges did you encounter?"
                    className="min-h-[80px] resize-none text-base"
                    maxLength={1000}
                  />
                  <div className="text-xs text-gray-500 text-right">
                    {field.value?.length || 0}/1000
                  </div>
                </div>
              )}
            />

            <Controller
              name="improvementSuggestions"
              control={form.control}
              render={({ field }) => (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Improvement Suggestions (Optional)
                  </label>
                  <Textarea
                    {...field}
                    placeholder="How could future sessions be improved?"
                    className="min-h-[80px] resize-none text-base"
                    maxLength={1000}
                  />
                  <div className="text-xs text-gray-500 text-right">
                    {field.value?.length || 0}/1000
                  </div>
                </div>
              )}
            />

            {feedbackType === 'client' && (
              <Controller
                name="privateNotes"
                control={form.control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Private Notes for Coach (Optional)
                    </label>
                    <Textarea
                      {...field}
                      placeholder="Private notes that only your coach will see..."
                      className="min-h-[80px] resize-none text-base"
                      maxLength={1000}
                    />
                    <div className="text-xs text-gray-500 text-right">
                      {field.value?.length || 0}/1000
                    </div>
                  </div>
                )}
              />
            )}
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6 p-4"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Privacy & Sharing Settings
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-gray-600" />
                    <div>
                      <span className="font-medium text-gray-900">Submit Anonymously</span>
                      <p className="text-sm text-gray-600">Hide your identity in this feedback</p>
                    </div>
                  </div>
                  <Controller
                    name="anonymous"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-gray-600" />
                    <div>
                      <span className="font-medium text-gray-900">Consent to Share</span>
                      <p className="text-sm text-gray-600">Allow sharing insights for improvement</p>
                    </div>
                  </div>
                  <Controller
                    name="consentToShare"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Confidentiality Level</span>
                  </div>
                  <Controller
                    name="confidentialityLevel"
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        {[
                          { value: 'standard', label: 'Standard', description: 'Normal privacy settings' },
                          { value: 'restricted', label: 'Restricted', description: 'Limited sharing and access' },
                          { value: 'anonymous', label: 'Anonymous', description: 'Maximum privacy protection' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              "w-full p-3 text-left rounded-lg border transition-all",
                              "min-h-[44px] touch-manipulation",
                              field.value === option.value
                                ? "border-blue-500 bg-blue-50 text-blue-900"
                                : "border-gray-200 bg-white text-gray-900"
                            )}
                          >
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-gray-600">{option.description}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6 p-4"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Review Your Feedback
              </h3>

              {/* Ratings Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Your Ratings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(data.ratings).map(([key, value]) => {
                    const labels = {
                      overallSatisfaction: 'Overall Satisfaction',
                      coachEffectiveness: 'Coach Effectiveness',
                      sessionQuality: 'Session Quality',
                      goalProgress: 'Goal Progress',
                      communicationQuality: 'Communication Quality',
                      wouldRecommend: 'Would Recommend',
                    };
                    
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {labels[key as keyof typeof labels]}
                        </span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "w-4 h-4",
                                star <= value
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Average Rating</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          {(Object.values(data.ratings).reduce((a, b) => a + b, 0) / Object.values(data.ratings).length).toFixed(1)}
                        </span>
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Goals Met */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className={cn(
                  "w-5 h-5",
                  data.sessionGoalsMet ? "text-green-600" : "text-gray-400"
                )} />
                <span className="text-sm">
                  Session goals {data.sessionGoalsMet ? 'were met' : 'were not fully met'}
                </span>
              </div>

              {/* Comments Summary */}
              {(data.overallComments || data.successHighlights || data.challengesFaced) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Your Comments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.overallComments && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Overall Comments</div>
                        <div className="text-sm text-gray-600 line-clamp-3">
                          {data.overallComments}
                        </div>
                      </div>
                    )}
                    {data.successHighlights && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Success Highlights</div>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {data.successHighlights}
                        </div>
                      </div>
                    )}
                    {data.challengesFaced && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Challenges Faced</div>
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {data.challengesFaced}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Privacy Settings Summary */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Privacy Settings</div>
                <div className="flex flex-wrap gap-2">
                  {data.anonymous && (
                    <Badge variant="secondary" className="text-xs">
                      Anonymous Submission
                    </Badge>
                  )}
                  {data.consentToShare && (
                    <Badge variant="secondary" className="text-xs">
                      Consent to Share
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {data.confidentialityLevel.charAt(0).toUpperCase() + data.confidentialityLevel.slice(1)} Confidentiality
                  </Badge>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileStepIndicator 
        currentStep={currentStep} 
        totalSteps={totalSteps} 
        stepTitles={stepTitles} 
      />

      <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="flex-1">
        <motion.div
          className="relative overflow-hidden"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleSwipeNavigation}
          dragElastic={0.1}
        >
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </motion.div>

        {/* Auto-save indicator */}
        {lastSaved && (
          <div className="fixed bottom-20 left-4 right-4 z-10">
            <div className="bg-green-100 border border-green-200 rounded-lg p-2 text-center">
              <span className="text-sm text-green-800">
                Auto-saved at {lastSaved.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex-1 min-h-[44px] touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                className="flex-1 min-h-[44px] touch-manipulation"
                disabled={!validateCurrentStep()}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || !validateCurrentStep()}
                className="flex-1 min-h-[44px] touch-manipulation bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    Submit Feedback
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Cancel button - accessible via bottom sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="fixed top-4 right-4 z-20 p-2 rounded-full bg-white shadow-lg border border-gray-200 min-w-[44px] min-h-[44px] touch-manipulation"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Cancel Feedback?</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pt-4">
              <p className="text-gray-600">
                Are you sure you want to cancel? Your progress will be saved automatically.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Close sheet logic would go here
                  }}
                  className="flex-1 min-h-[44px] touch-manipulation"
                >
                  Continue Editing
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onCancel}
                  className="flex-1 min-h-[44px] touch-manipulation"
                >
                  Yes, Cancel
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </form>
    </div>
  );
}; 