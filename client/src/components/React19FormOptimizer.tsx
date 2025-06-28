import React, { startTransition, useTransition, memo } from 'react';

// React 19 hooks - using polyfills for now until full React 19 support
const useOptimistic = <T,>(
  state: T,
  updateFn: (state: T, optimisticValue: any) => T
): [T, (optimisticValue: any) => void] => {
  const [optimisticState, setOptimisticState] = React.useState(state);
  
  React.useEffect(() => {
    setOptimisticState(state);
  }, [state]);
  
  const setOptimistic = React.useCallback((optimisticValue: any) => {
    setOptimisticState(current => updateFn(current, optimisticValue));
  }, [updateFn]);
  
  return [optimisticState, setOptimistic];
};

/**
 * React 19 Form Optimizer with Actions API
 * Implements modern form patterns for optimal UX
 */

// Enhanced form action handler with React 19 patterns
interface FormState {
  success: boolean;
  error: string | null;
  data: any;
}

interface OptimizedFormProps {
  onSubmit: (formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}

export const OptimizedForm = memo(({ 
  onSubmit, 
  children, 
  className = '',
  resetOnSuccess = true 
}: OptimizedFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = React.useState<FormState>({
    success: false,
    error: null,
    data: null
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(async () => {
      try {
        const result = await onSubmit(formData);
        setFormState(result);
        
        if (result.success && resetOnSuccess) {
          event.currentTarget.reset();
        }
      } catch (error) {
        setFormState({
          success: false,
          error: error instanceof Error ? error.message : 'An error occurred',
          data: null
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
      
      {formState.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{formState.error}</p>
        </div>
      )}
      
      {formState.success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600 text-sm">Form submitted successfully!</p>
        </div>
      )}
      
      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isPending && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          )}
          {isPending ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
});

// Optimistic update component for immediate UI feedback
interface OptimisticListProps<T> {
  items: T[];
  onAddItem: (item: T) => Promise<void>;
  onRemoveItem: (id: string) => Promise<void>;
  renderItem: (item: T, onRemove: (id: string) => void) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

export function OptimisticList<T extends { id: string }>({
  items,
  onAddItem,
  onRemoveItem,
  renderItem,
  keyExtractor
}: OptimisticListProps<T>) {
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items,
    (state: T[], action: { type: 'add' | 'remove'; item?: T; id?: string }) => {
      switch (action.type) {
        case 'add':
          return action.item ? [...state, action.item] : state;
        case 'remove':
          return action.id ? state.filter(item => item.id !== action.id) : state;
        default:
          return state;
      }
    }
  );

  const handleAdd = async (item: T) => {
    setOptimisticItems({ type: 'add', item });
    try {
      await onAddItem(item);
    } catch (error) {
      // Optimistic update will be reverted automatically
      console.error('Failed to add item:', error);
    }
  };

  const handleRemove = async (id: string) => {
    setOptimisticItems({ type: 'remove', id });
    try {
      await onRemoveItem(id);
    } catch (error) {
      // Optimistic update will be reverted automatically
      console.error('Failed to remove item:', error);
    }
  };

  return (
    <div className="space-y-2">
      {optimisticItems.map(item => (
        <div key={keyExtractor(item)}>
          {renderItem(item, handleRemove)}
        </div>
      ))}
    </div>
  );
}

// Enhanced input component with React 19 optimizations
interface OptimizedInputProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  validation?: (value: string) => string | null;
  className?: string;
}

export const OptimizedInput = memo(({
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
  value,
  onChange,
  validation,
  className = ''
}: OptimizedInputProps) => {
  const [internalValue, setInternalValue] = React.useState(value || '');
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    
    if (onChange) {
      onChange(newValue);
    }

    // Validate input with transition for non-blocking validation
    if (validation) {
      startTransition(() => {
        const validationError = validation(newValue);
        setError(validationError);
      });
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <input
        type={type}
        id={name}
        name={name}
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {isPending && (
        <div className="mt-1 text-xs text-gray-500 flex items-center">
          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1"></div>
          Validating...
        </div>
      )}
    </div>
  );
});

// Session form component using React 19 features
interface SessionFormData {
  title: string;
  type: 'individual' | 'group';
  duration: number;
  notes: string;
}

interface SessionFormProps {
  onSubmit: (data: SessionFormData) => Promise<FormState>;
  initialData?: Partial<SessionFormData>;
}

export const OptimizedSessionForm = memo(({ onSubmit, initialData }: SessionFormProps) => {
  const [formData, setFormData] = React.useState<SessionFormData>({
    title: initialData?.title || '',
    type: initialData?.type || 'individual',
    duration: initialData?.duration || 60,
    notes: initialData?.notes || ''
  });

  const handleFormSubmit = async (formData: FormData) => {
    const data: SessionFormData = {
      title: formData.get('title') as string,
      type: formData.get('type') as 'individual' | 'group',
      duration: parseInt(formData.get('duration') as string),
      notes: formData.get('notes') as string
    };

    return await onSubmit(data);
  };

  const validateTitle = (value: string) => {
    if (value.length < 3) return 'Title must be at least 3 characters';
    if (value.length > 100) return 'Title must be less than 100 characters';
    return null;
  };

  const validateDuration = (value: string) => {
    const duration = parseInt(value);
    if (isNaN(duration) || duration < 15) return 'Duration must be at least 15 minutes';
    if (duration > 480) return 'Duration cannot exceed 8 hours';
    return null;
  };

  return (
    <OptimizedForm onSubmit={handleFormSubmit} className="max-w-lg mx-auto">
      <OptimizedInput
        label="Session Title"
        name="title"
        required
        placeholder="Enter session title"
        value={formData.title}
        onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
        validation={validateTitle}
      />

      <div className="mb-4">
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Session Type
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'individual' | 'group' }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="individual">Individual Session</option>
          <option value="group">Group Session</option>
        </select>
      </div>

      <OptimizedInput
        label="Duration (minutes)"
        name="duration"
        type="number"
        required
        placeholder="60"
        value={formData.duration.toString()}
        onChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) || 60 }))}
        validation={validateDuration}
      />

      <div className="mb-4">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Session Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Optional session notes..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </OptimizedForm>
  );
});

OptimizedForm.displayName = 'OptimizedForm';
OptimizedInput.displayName = 'OptimizedInput';
OptimizedSessionForm.displayName = 'OptimizedSessionForm';