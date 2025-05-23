import React, { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';

export const RichTextEditorDemo: React.FC = () => {
  const [content, setContent] = useState('<p>Write your reflection here...</p>');
  const [savedContent, setSavedContent] = useState('');

  const handleAutoSave = (value: string) => {
    console.log('Auto-saving:', value);
    setSavedContent(value);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Rich Text Editor Demo
        </h2>
        
        <div className="space-y-4">
          <RichTextEditor
            value={content}
            onChange={setContent}
            label="Your Reflection"
            placeholder="Start writing your thoughts here..."
            required
            maxLength={5000}
            autoSave
            onAutoSave={handleAutoSave}
            showWordCount
            showCharCount
            minHeight="200px"
            maxHeight="600px"
          />
          
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Live Preview
            </h3>
            <div 
              className="p-4 border rounded-lg bg-gray-50 min-h-[100px]"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
          
          {savedContent && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Last Auto-Saved Content
              </h3>
              <div 
                className="p-4 border rounded-lg bg-blue-50 min-h-[100px]"
                dangerouslySetInnerHTML={{ __html: savedContent }}
              />
            </div>
          )}
          
          <div className="flex gap-4">
            <button 
              onClick={() => setContent('')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear
            </button>
            
            <button 
              onClick={() => setContent('<p><strong>Bold text</strong> and <em>italic text</em> with <u>underline</u>.</p><ul><li>First item</li><li>Second item</li></ul>')}
              className="px-4 py-2 bg-lumea-primary text-white rounded hover:bg-lumea-primary-dark"
            >
              Load Sample Content
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Features Demonstrated:
        </h3>
        <ul className="space-y-2 text-gray-700">
          <li>✅ <strong>Rich Text Formatting:</strong> Bold, italic, underline</li>
          <li>✅ <strong>Lists:</strong> Bullet points and numbered lists</li>
          <li>✅ <strong>Text Alignment:</strong> Left, center, right alignment</li>
          <li>✅ <strong>RTL Support:</strong> Hebrew text direction switching</li>
          <li>✅ <strong>Auto-save:</strong> Automatic draft saving every 2 seconds</li>
          <li>✅ <strong>Word/Character Count:</strong> Live counting with limits</li>
          <li>✅ <strong>Keyboard Shortcuts:</strong> Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline)</li>
          <li>✅ <strong>Mobile Optimized:</strong> Touch-friendly interface</li>
          <li>✅ <strong>Accessibility:</strong> ARIA labels, keyboard navigation</li>
          <li>✅ <strong>Validation:</strong> Error states and required field support</li>
        </ul>
      </div>
    </div>
  );
}; 