import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { cn } from '../../lib/utils';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCcw,
  Type,
  Check,
  ChevronDown,
  ChevronUp,
  Keyboard,
  X
} from 'lucide-react';

interface MobileRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  minHeight?: string;
  maxHeight?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onAutoSave?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  showWordCount?: boolean;
  showCharCount?: boolean;
  className?: string;
  autoResize?: boolean;
  keyboardType?: 'default' | 'email' | 'numeric' | 'tel' | 'url' | 'search';
  showToolbar?: boolean;
  compactMode?: boolean;
}

interface FormattingState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bulletList: boolean;
  numberedList: boolean;
  textAlign: 'left' | 'center' | 'right';
}

// Haptic feedback utility
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [30],
      heavy: [50]
    };
    navigator.vibrate(patterns[type]);
  }
};

// Mobile formatting toolbar component
const MobileFormatToolbar: React.FC<{
  formatting: FormattingState;
  onExecuteCommand: (command: string, value?: string) => void;
  onToggleDirection: () => void;
  isRTL: boolean;
  disabled: boolean;
  isCompact: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}> = ({ 
  formatting, 
  onExecuteCommand, 
  onToggleDirection, 
  isRTL, 
  disabled, 
  isCompact,
  isExpanded,
  onToggleExpanded
}) => {
  const { t } = useTranslation();

  const primaryButtons = [
    {
      icon: Bold,
      command: 'bold',
      active: formatting.bold,
      title: t('richEditor.bold'),
    },
    {
      icon: Italic,
      command: 'italic',
      active: formatting.italic,
      title: t('richEditor.italic'),
    },
    {
      icon: List,
      command: 'insertUnorderedList',
      active: formatting.bulletList,
      title: t('richEditor.bulletList'),
    },
  ];

  const secondaryButtons = [
    {
      icon: Underline,
      command: 'underline',
      active: formatting.underline,
      title: t('richEditor.underline'),
    },
    {
      icon: ListOrdered,
      command: 'insertOrderedList',
      active: formatting.numberedList,
      title: t('richEditor.numberedList'),
    },
  ];

  const alignmentButtons = [
    {
      icon: AlignLeft,
      command: isRTL ? 'justifyRight' : 'justifyLeft',
      active: formatting.textAlign === (isRTL ? 'right' : 'left'),
      title: t('richEditor.alignLeft'),
    },
    {
      icon: AlignCenter,
      command: 'justifyCenter',
      active: formatting.textAlign === 'center',
      title: t('richEditor.alignCenter'),
    },
    {
      icon: AlignRight,
      command: isRTL ? 'justifyLeft' : 'justifyRight',
      active: formatting.textAlign === (isRTL ? 'left' : 'right'),
      title: t('richEditor.alignRight'),
    },
  ];

  const handleButtonPress = (command: string) => {
    triggerHaptic('light');
    onExecuteCommand(command);
  };

  const handleDirectionToggle = () => {
    triggerHaptic('medium');
    onToggleDirection();
  };

  return (
    <div className="mobile-format-toolbar bg-gray-50 border-b border-gray-200">
      {/* Primary toolbar - always visible */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center space-x-1">
          {primaryButtons.map((button, index) => {
            const IconComponent = button.icon;
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleButtonPress(button.command)}
                disabled={disabled}
                title={button.title}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg',
                  'transition-all duration-200 touch-manipulation',
                  'active:scale-95',
                  button.active
                    ? 'bg-lumea-primary text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <IconComponent className="w-5 h-5" />
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2">
          {/* Text direction toggle */}
          <button
            type="button"
            onClick={handleDirectionToggle}
            disabled={disabled}
            title={t('richEditor.toggleDirection')}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg',
              'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200',
              'transition-all duration-200 active:scale-95',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Type className="w-5 h-5" />
          </button>

          {/* Expand/collapse button for secondary tools */}
          {!isCompact && (
            <button
              type="button"
              onClick={onToggleExpanded}
              disabled={disabled}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg',
                'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200',
                'transition-all duration-200 active:scale-95',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Secondary toolbar - expandable */}
      {isExpanded && !isCompact && (
        <div className="border-t border-gray-200 p-2 space-y-2">
          {/* Text formatting */}
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500 mr-2">Format:</span>
            {secondaryButtons.map((button, index) => {
              const IconComponent = button.icon;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleButtonPress(button.command)}
                  disabled={disabled}
                  title={button.title}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg',
                    'transition-all duration-200 touch-manipulation',
                    'active:scale-95',
                    button.active
                      ? 'bg-lumea-primary text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <IconComponent className="w-5 h-5" />
                </button>
              );
            })}
          </div>

          {/* Alignment */}
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500 mr-2">Align:</span>
            {alignmentButtons.map((button, index) => {
              const IconComponent = button.icon;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleButtonPress(button.command)}
                  disabled={disabled}
                  title={button.title}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg',
                    'transition-all duration-200 touch-manipulation',
                    'active:scale-95',
                    button.active
                      ? 'bg-lumea-primary text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <IconComponent className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Auto-resize hook for text areas
const useAutoResize = (
  elementRef: React.RefObject<HTMLDivElement>,
  minHeight: string,
  maxHeight: string,
  content: string
) => {
  const [currentHeight, setCurrentHeight] = useState(minHeight);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Reset height to measure scroll height
    element.style.height = minHeight;
    
    const scrollHeight = element.scrollHeight;
    const minHeightPx = parseInt(minHeight);
    const maxHeightPx = parseInt(maxHeight);
    
    const newHeight = Math.min(Math.max(scrollHeight, minHeightPx), maxHeightPx);
    const newHeightStr = `${newHeight}px`;
    
    if (newHeightStr !== currentHeight) {
      element.style.height = newHeightStr;
      setCurrentHeight(newHeightStr);
    }
  }, [content, minHeight, maxHeight, currentHeight, elementRef]);

  return currentHeight;
};

const MobileRichTextEditor: React.FC<MobileRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  maxLength,
  minHeight = '120px',
  maxHeight = '400px',
  autoSave = true,
  autoSaveDelay = 3000, // Longer delay for mobile
  onAutoSave,
  disabled = false,
  required = false,
  error,
  label,
  showWordCount = true,
  showCharCount = true,
  className = '',
  autoResize = true,
  keyboardType = 'default',
  showToolbar = true,
  compactMode = false
}) => {
  const { t, i18n } = useTranslation();
  const { isMobile, isIOS, isAndroid } = useMobileDetection();
  const isRTL = i18n.language === 'he';
  
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formatting, setFormatting] = useState<FormattingState>({
    bold: false,
    italic: false,
    underline: false,
    bulletList: false,
    numberedList: false,
    textAlign: isRTL ? 'right' : 'left',
  });
  
  const [isFocused, setIsFocused] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Auto-resize functionality
  const currentHeight = useAutoResize(editorRef, minHeight, maxHeight, value);

  // Calculate word and character counts
  const updateCounts = useCallback((text: string) => {
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    const words = plainText ? plainText.split(/\s+/).length : 0;
    const chars = plainText.length;
    
    setWordCount(words);
    setCharCount(chars);
  }, []);

  // Update counts when value changes
  useEffect(() => {
    updateCounts(value);
  }, [value, updateCounts]);

  // Auto-save functionality with mobile optimizations
  useEffect(() => {
    if (autoSave && onAutoSave && value && isFocused) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      setIsAutoSaving(true);
      autoSaveTimeoutRef.current = setTimeout(() => {
        onAutoSave(value);
        setIsAutoSaving(false);
        triggerHaptic('light');
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        setIsAutoSaving(false);
      }
    };
  }, [value, autoSave, onAutoSave, autoSaveDelay, isFocused]);

  // Handle content changes with mobile optimizations
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      
      // Check max length if specified
      if (maxLength) {
        const plainText = newValue.replace(/<[^>]*>/g, '');
        if (plainText.length > maxLength) {
          // Provide haptic feedback for limit reached
          triggerHaptic('medium');
          return;
        }
      }
      
      onChange(newValue);
      updateFormatting();
    }
  }, [onChange, maxLength]);

  // Update formatting state based on current selection
  const updateFormatting = useCallback(() => {
    if (!document.getSelection()) return;

    setFormatting({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      bulletList: document.queryCommandState('insertUnorderedList'),
      numberedList: document.queryCommandState('insertOrderedList'),
      textAlign: document.queryCommandValue('justify') as any || (isRTL ? 'right' : 'left'),
    });
  }, [isRTL]);

  // Execute formatting commands
  const executeCommand = useCallback((command: string, value?: string) => {
    if (disabled) return;
    
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateFormatting();
    
    // Trigger change event after formatting
    setTimeout(() => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }, 0);
  }, [disabled, onChange, updateFormatting]);

  // Handle mobile-optimized key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    // Mobile keyboard shortcuts (external keyboard support)
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          executeCommand('bold');
          triggerHaptic('light');
          break;
        case 'i':
          e.preventDefault();
          executeCommand('italic');
          triggerHaptic('light');
          break;
        case 'u':
          e.preventDefault();
          executeCommand('underline');
          triggerHaptic('light');
          break;
      }
    }

    // Handle Enter key for better mobile experience
    if (e.key === 'Enter' && !e.shiftKey) {
      // Allow normal enter behavior, but provide haptic feedback
      triggerHaptic('light');
    }
  }, [disabled, executeCommand]);

  // Toggle text direction
  const toggleTextDirection = useCallback(() => {
    if (editorRef.current) {
      const currentDir = editorRef.current.style.direction || (isRTL ? 'rtl' : 'ltr');
      const newDir = currentDir === 'rtl' ? 'ltr' : 'rtl';
      editorRef.current.style.direction = newDir;
      editorRef.current.style.textAlign = newDir === 'rtl' ? 'right' : 'left';
    }
  }, [isRTL]);

  // Handle paste with mobile optimizations
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    // Clean and insert text
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
    document.execCommand('insertText', false, cleanText);
    
    triggerHaptic('light');
  }, []);

  // Handle focus with mobile optimizations
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    
    // Scroll element into view on mobile
    if (isMobile && editorRef.current) {
      setTimeout(() => {
        editorRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300); // Wait for keyboard to appear
    }
  }, [isMobile]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setIsToolbarExpanded(false);
  }, []);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Update formatting when selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      if (isFocused) {
        updateFormatting();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [isFocused, updateFormatting]);

  // Don't render on desktop unless forced
  if (!isMobile) {
    return null;
  }

  return (
    <div className={cn('mobile-rich-text-editor', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-900 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={cn(
        'border rounded-2xl bg-white overflow-hidden',
        'transition-all duration-200',
        error ? 'border-red-300 shadow-sm shadow-red-100' : 'border-gray-200',
        isFocused && !error && 'border-lumea-primary shadow-lumea-soft',
        disabled && 'bg-gray-50 opacity-60'
      )}>
        {/* Mobile Toolbar */}
        {showToolbar && (
          <MobileFormatToolbar
            formatting={formatting}
            onExecuteCommand={executeCommand}
            onToggleDirection={toggleTextDirection}
            isRTL={isRTL}
            disabled={disabled}
            isCompact={compactMode}
            isExpanded={isToolbarExpanded}
            onToggleExpanded={() => setIsToolbarExpanded(!isToolbarExpanded)}
          />
        )}

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'p-4 outline-none overflow-y-auto',
            'leading-relaxed text-base', // Mobile-optimized text size
            'touch-manipulation',
            disabled && 'cursor-not-allowed',
            isRTL ? 'text-right' : 'text-left'
          )}
          style={{
            minHeight: autoResize ? undefined : minHeight,
            maxHeight: autoResize ? maxHeight : undefined,
            height: autoResize ? currentHeight : minHeight,
            direction: isRTL ? 'rtl' : 'ltr',
            fontSize: '16px', // Prevent zoom on iOS
            WebkitUserSelect: 'text',
            WebkitTouchCallout: 'default',
          }}
          data-placeholder={placeholder}
          role="textbox"
          aria-multiline="true"
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? 'mobile-editor-error' : undefined}
          suppressContentEditableWarning={true}
          inputMode={keyboardType === 'numeric' ? 'numeric' : 'text'}
        />

        {/* Footer with counts and status */}
        <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            {showWordCount && (
              <span>{t('richEditor.wordCount', { count: wordCount })}</span>
            )}
            {showCharCount && (
              <span>
                {t('richEditor.charCount', { count: charCount })}
                {maxLength && (
                  <span className={cn(
                    'ml-1',
                    charCount > maxLength * 0.9 && 'text-amber-600',
                    charCount >= maxLength && 'text-red-600 font-medium'
                  )}>
                    / {maxLength}
                  </span>
                )}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Auto-save indicator */}
            {autoSave && onAutoSave && (
              <div className="flex items-center space-x-1">
                {isAutoSaving ? (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-xs text-blue-600">
                      {t('richEditor.autoSaving')}
                    </span>
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">Saved</span>
                  </>
                )}
              </div>
            )}

            {/* Keyboard type indicator for iOS */}
            {isIOS && keyboardType !== 'default' && (
              <div className="flex items-center space-x-1">
                <Keyboard className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400 capitalize">
                  {keyboardType}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p id="mobile-editor-error" className="mt-2 text-sm text-red-600 px-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default MobileRichTextEditor; 