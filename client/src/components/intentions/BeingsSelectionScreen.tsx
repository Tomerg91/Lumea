/**
 * Beings Selection Screen Component
 * 
 * Allows users to select their daily intentions from available beings
 * Supports both default beings and custom user-created beings
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Check, 
  X, 
  Sparkles, 
  Heart, 
  ArrowRight,
  Loader2,
  Star
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { 
  intentionService, 
  Being, 
  CreateBeingRequest,
  formatBeingLabel,
  validateBeingData
} from '../../services/intentionService';
import { useAuth } from '../../contexts/AuthContext';

interface BeingsSelectionScreenProps {
  onComplete?: () => void;
  maxSelections?: number;
  className?: string;
}

export const BeingsSelectionScreen: React.FC<BeingsSelectionScreenProps> = ({
  onComplete,
  maxSelections = 5,
  className
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [beings, setBeings] = useState<Being[]>([]);
  const [selectedBeingIds, setSelectedBeingIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBeing, setNewBeing] = useState<CreateBeingRequest>({
    label_en: '',
    label_he: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [language, setLanguage] = useState<'en' | 'he'>('en');

  // Load beings on component mount
  useEffect(() => {
    loadBeings();
  }, []);

  const loadBeings = async () => {
    try {
      setIsLoading(true);
      setErrors([]);
      const data = await intentionService.getBeings();
      setBeings(data);
    } catch (error) {
      console.error('Error loading beings:', error);
      setErrors(['Failed to load beings. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBeingToggle = (beingId: string) => {
    setSelectedBeingIds(prev => {
      if (prev.includes(beingId)) {
        return prev.filter(id => id !== beingId);
      } else if (prev.length < maxSelections) {
        return [...prev, beingId];
      }
      return prev;
    });
  };

  const handleAddCustomBeing = async () => {
    try {
      setErrors([]);
      const validationErrors = validateBeingData(newBeing);
      
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      const newBeingId = await intentionService.addBeing(newBeing);
      
      // Add to local state
      const newBeingData: Being = {
        being_id: newBeingId,
        label_en: newBeing.label_en,
        label_he: newBeing.label_he,
        is_default: false,
        created_by_user_id: user?.id
      };
      
      setBeings(prev => [...prev, newBeingData]);
      setNewBeing({ label_en: '', label_he: '' });
      setShowAddForm(false);
      
      // Auto-select the new being
      setSelectedBeingIds(prev => 
        prev.length < maxSelections ? [...prev, newBeingId] : prev
      );
    } catch (error) {
      console.error('Error adding being:', error);
      setErrors(['Failed to add custom being. Please try again.']);
    }
  };

  const handleSaveSelections = async () => {
    try {
      setIsSaving(true);
      setErrors([]);

      if (selectedBeingIds.length === 0) {
        setErrors(['Please select at least one being for your daily intention.']);
        return;
      }

      await intentionService.addDailyIntention(selectedBeingIds);
      
      // Call completion callback or navigate
      if (onComplete) {
        onComplete();
      } else {
        // Navigate based on user role
        const userRole = user?.role || 'client';
        navigate(userRole === 'coach' ? '/coach-dashboard' : '/client-dashboard');
      }
    } catch (error) {
      console.error('Error saving selections:', error);
      setErrors(['Failed to save your selections. Please try again.']);
    } finally {
      setIsSaving(false);
    }
  };

  const defaultBeings = beings.filter(b => b.is_default);
  const customBeings = beings.filter(b => !b.is_default);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-indigo-600" />
          <p className="text-gray-600">Loading your daily intentions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
      className
    )}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-indigo-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">
              {language === 'he' ? 'כוונות יומיות' : 'Daily Intentions'}
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {language === 'he' 
              ? `בחרו עד ${maxSelections} תכונות או ערכים שיובילו אתכם היום`
              : `Choose up to ${maxSelections} qualities or values to guide you today`
            }
          </p>
          
          {/* Language toggle */}
          <div className="flex items-center justify-center mt-4">
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                'px-3 py-1 rounded-l-lg text-sm font-medium',
                language === 'en' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-600 border border-gray-300'
              )}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('he')}
              className={cn(
                'px-3 py-1 rounded-r-lg text-sm font-medium',
                language === 'he' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-gray-600 border border-gray-300'
              )}
            >
              עברית
            </button>
          </div>
        </div>

        {/* Selection Counter */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center bg-white rounded-full px-4 py-2 shadow-sm border">
            <Heart className="w-4 h-4 text-pink-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">
              {language === 'he' 
                ? `נבחרו ${selectedBeingIds.length} מתוך ${maxSelections}`
                : `${selectedBeingIds.length} of ${maxSelections} selected`
              }
            </span>
          </div>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center mb-2">
              <X className="w-5 h-5 text-red-500 mr-2" />
              <h3 className="text-sm font-medium text-red-800">
                {language === 'he' ? 'שגיאה' : 'Error'}
              </h3>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Default Beings Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            {language === 'he' ? 'תכונות מובנות' : 'Suggested Beings'}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {defaultBeings.map((being) => (
              <BeingCard
                key={being.being_id}
                being={being}
                isSelected={selectedBeingIds.includes(being.being_id)}
                onToggle={() => handleBeingToggle(being.being_id)}
                disabled={!selectedBeingIds.includes(being.being_id) && selectedBeingIds.length >= maxSelections}
                language={language}
              />
            ))}
          </div>
        </div>

        {/* Custom Beings Section */}
        {customBeings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Plus className="w-5 h-5 text-indigo-500 mr-2" />
              {language === 'he' ? 'התכונות שלי' : 'My Custom Beings'}
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {customBeings.map((being) => (
                <BeingCard
                  key={being.being_id}
                  being={being}
                  isSelected={selectedBeingIds.includes(being.being_id)}
                  onToggle={() => handleBeingToggle(being.being_id)}
                  disabled={!selectedBeingIds.includes(being.being_id) && selectedBeingIds.length >= maxSelections}
                  language={language}
                  isCustom
                />
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Being */}
        <div className="mb-8">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-gray-600 font-medium">
                {language === 'he' ? 'הוסף תכונה אישית' : 'Add Custom Being'}
              </span>
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {language === 'he' ? 'הוסף תכונה אישית' : 'Add Custom Being'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    English Label
                  </label>
                  <input
                    type="text"
                    value={newBeing.label_en}
                    onChange={(e) => setNewBeing(prev => ({ ...prev, label_en: e.target.value }))}
                    placeholder="e.g., Kindness"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hebrew Label
                  </label>
                  <input
                    type="text"
                    value={newBeing.label_he}
                    onChange={(e) => setNewBeing(prev => ({ ...prev, label_he: e.target.value }))}
                    placeholder="למשל, חסד"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    dir="rtl"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleAddCustomBeing}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {language === 'he' ? 'הוסף' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewBeing({ label_en: '', label_he: '' });
                    setErrors([]);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {language === 'he' ? 'ביטול' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1 as any)}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            {language === 'he' ? 'חזור' : 'Back'}
          </button>
          
          <button
            onClick={handleSaveSelections}
            disabled={selectedBeingIds.length === 0 || isSaving}
            className={cn(
              'flex items-center justify-center px-8 py-3 rounded-lg font-medium transition-colors',
              selectedBeingIds.length > 0 && !isSaving
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === 'he' ? 'שומר...' : 'Saving...'}
              </>
            ) : (
              <>
                {language === 'he' ? 'המשך' : 'Continue'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ====================== BEING CARD COMPONENT ======================

interface BeingCardProps {
  being: Being;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  language: 'en' | 'he';
  isCustom?: boolean;
}

const BeingCard: React.FC<BeingCardProps> = ({
  being,
  isSelected,
  onToggle,
  disabled = false,
  language,
  isCustom = false
}) => {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative p-4 rounded-lg border-2 transition-all duration-200 text-center',
        'hover:shadow-md transform hover:scale-105',
        isSelected
          ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
        disabled && 'opacity-50 cursor-not-allowed transform-none hover:scale-100',
        isCustom && 'border-purple-200 bg-purple-50'
      )}
    >
      {/* Selection indicator */}
      <div className={cn(
        'absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center',
        isSelected
          ? 'border-indigo-500 bg-indigo-500'
          : 'border-gray-300 bg-white'
      )}>
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>

      {/* Custom indicator */}
      {isCustom && (
        <div className="absolute top-2 left-2">
          <Star className="w-4 h-4 text-purple-500" />
        </div>
      )}

      {/* Being label */}
      <div className="text-sm font-medium leading-tight">
        {formatBeingLabel(being, language)}
      </div>
    </button>
  );
};

export default BeingsSelectionScreen;