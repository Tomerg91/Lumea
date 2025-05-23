import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './RichTextEditor.css';

interface RichTextEditorProps {
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
}

interface FormattingState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bulletList: boolean;
  numberedList: boolean;
  textAlign: 'left' | 'center' | 'right';
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  maxLength,
  minHeight = '120px',
  maxHeight = '400px',
  autoSave = true,
  autoSaveDelay = 2000,
  onAutoSave,
  disabled = false,
  required = false,
  error,
  label,
  showWordCount = true,
  showCharCount = true,
  className = '',
}) => {
  const { t, i18n } = useTranslation();
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

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && onAutoSave && value) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        onAutoSave(value);
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [value, autoSave, onAutoSave, autoSaveDelay]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      
      // Check max length if specified
      if (maxLength) {
        const plainText = newValue.replace(/<[^>]*>/g, '');
        if (plainText.length > maxLength) {
          return; // Don't update if exceeds max length
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

  // Handle key shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    // Bold: Ctrl/Cmd + B
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      executeCommand('bold');
    }
    
    // Italic: Ctrl/Cmd + I
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      executeCommand('italic');
    }
    
    // Underline: Ctrl/Cmd + U
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      executeCommand('underline');
    }

    // Handle text direction switching for RTL
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
      e.preventDefault();
      toggleTextDirection();
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

  // Handle paste to clean up formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
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

  const toolbarButtons = [
    {
      icon: '𝐁',
      command: 'bold',
      active: formatting.bold,
      title: t('richEditor.bold'),
      ariaLabel: t('richEditor.bold'),
    },
    {
      icon: '𝐼',
      command: 'italic',
      active: formatting.italic,
      title: t('richEditor.italic'),
      ariaLabel: t('richEditor.italic'),
    },
    {
      icon: '𝐔',
      command: 'underline',
      active: formatting.underline,
      title: t('richEditor.underline'),
      ariaLabel: t('richEditor.underline'),
    },
    {
      icon: '•',
      command: 'insertUnorderedList',
      active: formatting.bulletList,
      title: t('richEditor.bulletList'),
      ariaLabel: t('richEditor.bulletList'),
    },
    {
      icon: '1.',
      command: 'insertOrderedList',
      active: formatting.numberedList,
      title: t('richEditor.numberedList'),
      ariaLabel: t('richEditor.numberedList'),
    },
  ];

  const alignmentButtons = [
    {
      icon: isRTL ? '⇥' : '⇤',
      command: isRTL ? 'justifyRight' : 'justifyLeft',
      active: formatting.textAlign === (isRTL ? 'right' : 'left'),
      title: t('richEditor.alignLeft'),
      ariaLabel: t('richEditor.alignLeft'),
    },
    {
      icon: '⇔',
      command: 'justifyCenter',
      active: formatting.textAlign === 'center',
      title: t('richEditor.alignCenter'),
      ariaLabel: t('richEditor.alignCenter'),
    },
    {
      icon: isRTL ? '⇤' : '⇥',
      command: isRTL ? 'justifyLeft' : 'justifyRight',
      active: formatting.textAlign === (isRTL ? 'left' : 'right'),
      title: t('richEditor.alignRight'),
      ariaLabel: t('richEditor.alignRight'),
    },
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={`border rounded-lg bg-white ${error ? 'border-red-300' : 'border-gray-300'} ${disabled ? 'bg-gray-50' : ''}`}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
          {/* Formatting buttons */}
          <div className="flex items-center gap-1">
            {toolbarButtons.map((button, index) => (
              <button
                key={index}
                type="button"
                onClick={() => executeCommand(button.command)}
                disabled={disabled}
                title={button.title}
                aria-label={button.ariaLabel}
                className={`
                  w-8 h-8 flex items-center justify-center rounded text-sm font-medium
                  transition-colors duration-200
                  ${button.active 
                    ? 'bg-lumea-primary text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  border border-gray-300
                `}
              >
                {button.icon}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Alignment buttons */}
          <div className="flex items-center gap-1">
            {alignmentButtons.map((button, index) => (
              <button
                key={index}
                type="button"
                onClick={() => executeCommand(button.command)}
                disabled={disabled}
                title={button.title}
                aria-label={button.ariaLabel}
                className={`
                  w-8 h-8 flex items-center justify-center rounded text-sm
                  transition-colors duration-200
                  ${button.active 
                    ? 'bg-lumea-primary text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  border border-gray-300
                `}
              >
                {button.icon}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Text direction toggle */}
          <button
            type="button"
            onClick={toggleTextDirection}
            disabled={disabled}
            title={t('richEditor.toggleDirection')}
            aria-label={t('richEditor.toggleDirection')}
            className={`
              w-8 h-8 flex items-center justify-center rounded text-sm
              transition-colors duration-200 bg-white text-gray-700 hover:bg-gray-100
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              border border-gray-300
            `}
          >
            ⇄
          </button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            p-3 outline-none overflow-y-auto resize-none
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
            ${isRTL ? 'text-right' : 'text-left'}
          `}
          style={{
            minHeight,
            maxHeight,
            direction: isRTL ? 'rtl' : 'ltr',
          }}
          data-placeholder={placeholder}
          role="textbox"
          aria-multiline="true"
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? 'rich-editor-error' : undefined}
          suppressContentEditableWarning={true}
        />

        {/* Footer with counts and status */}
        <div className="flex justify-between items-center px-3 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
          <div className="flex items-center gap-4">
            {showWordCount && (
              <span>{t('richEditor.wordCount', { count: wordCount })}</span>
            )}
            {showCharCount && (
              <span>
                {t('richEditor.charCount', { count: charCount })}
                {maxLength && ` / ${maxLength}`}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {autoSave && onAutoSave && (
              <span className="text-green-600">
                {t('richEditor.autoSaving')}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p id="rich-editor-error" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}; 