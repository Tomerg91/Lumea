import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Send,
  Eye,
  Search,
  Filter,
  Download,
  Upload,
  Save,
  X,
  FileText,
  Image,
  Link,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Settings
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: EmailTemplateCategory;
  content: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  usage: {
    sent: number;
    opened: number;
    clicked: number;
    lastUsed?: Date;
  };
  tags: string[];
}

type EmailTemplateCategory = 
  | 'welcome'
  | 'session_reminder'
  | 'session_confirmation'
  | 'session_cancellation'
  | 'session_reschedule'
  | 'feedback_request'
  | 'follow_up'
  | 'marketing'
  | 'custom';

interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  example: string;
  required: boolean;
}

const EmailTemplateManager: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EmailTemplateCategory | 'all'>('all');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});

  // Available template variables
  const availableVariables: TemplateVariable[] = [
    { key: 'clientName', label: 'Client Name', description: 'Full name of the client', example: 'John Doe', required: true },
    { key: 'clientFirstName', label: 'Client First Name', description: 'First name of the client', example: 'John', required: false },
    { key: 'coachName', label: 'Coach Name', description: 'Full name of the coach', example: 'Dr. Smith', required: true },
    { key: 'sessionDate', label: 'Session Date', description: 'Date and time of the session', example: 'March 15, 2024 at 2:00 PM', required: false },
    { key: 'sessionDuration', label: 'Session Duration', description: 'Duration of the session', example: '60 minutes', required: false },
    { key: 'nextSessionDate', label: 'Next Session Date', description: 'Date of the next session', example: 'March 22, 2024', required: false },
    { key: 'companyName', label: 'Company Name', description: 'Name of the coaching company', example: 'Satya Coaching', required: false },
    { key: 'unsubscribeUrl', label: 'Unsubscribe URL', description: 'Link to unsubscribe from emails', example: 'https://example.com/unsubscribe', required: false },
    { key: 'bookingUrl', label: 'Booking URL', description: 'Link to book a new session', example: 'https://example.com/book', required: false }
  ];

  // Mock data
  useEffect(() => {
    const mockTemplates: EmailTemplate[] = [
      {
        id: '1',
        name: 'Welcome New Client',
        subject: 'Welcome to {{companyName}}, {{clientFirstName}}!',
        category: 'welcome',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome to {{companyName}}!</h1>
            <p>Dear {{clientName}},</p>
            <p>We're excited to welcome you to our coaching community! I'm {{coachName}}, and I'll be your personal coach on this transformative journey.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What to expect:</h3>
              <ul>
                <li>Personalized coaching sessions tailored to your goals</li>
                <li>Regular check-ins and progress tracking</li>
                <li>Access to exclusive resources and tools</li>
                <li>24/7 support when you need it</li>
              </ul>
            </div>
            
            <p>Your first session is scheduled for {{sessionDate}}. I'm looking forward to meeting you and beginning this journey together!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{bookingUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Manage Your Sessions
              </a>
            </div>
            
            <p>Best regards,<br>{{coachName}}</p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
              <p>If you no longer wish to receive these emails, you can <a href="{{unsubscribeUrl}}">unsubscribe here</a>.</p>
            </div>
          </div>
        `,
        variables: ['clientName', 'clientFirstName', 'coachName', 'companyName', 'sessionDate', 'bookingUrl', 'unsubscribeUrl'],
        isDefault: true,
        isActive: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        usage: {
          sent: 45,
          opened: 38,
          clicked: 12,
          lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        tags: ['onboarding', 'welcome', 'first-impression']
      },
      {
        id: '2',
        name: 'Session Reminder - 24 Hours',
        subject: 'Reminder: Your coaching session tomorrow at {{sessionDate}}',
        category: 'session_reminder',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Session Reminder</h2>
            <p>Hi {{clientFirstName}},</p>
            <p>This is a friendly reminder that you have a coaching session scheduled for tomorrow:</p>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0;">Session Details</h3>
              <p><strong>Date & Time:</strong> {{sessionDate}}</p>
              <p><strong>Duration:</strong> {{sessionDuration}}</p>
              <p><strong>Coach:</strong> {{coachName}}</p>
            </div>
            
            <p>Please make sure you're ready 5 minutes before the session starts. If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{bookingUrl}}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Manage Session
              </a>
            </div>
            
            <p>Looking forward to our session!</p>
            <p>Best regards,<br>{{coachName}}</p>
          </div>
        `,
        variables: ['clientFirstName', 'sessionDate', 'sessionDuration', 'coachName', 'bookingUrl'],
        isDefault: true,
        isActive: true,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        usage: {
          sent: 128,
          opened: 115,
          clicked: 23,
          lastUsed: new Date(Date.now() - 6 * 60 * 60 * 1000)
        },
        tags: ['reminder', 'session', 'automation']
      },
      {
        id: '3',
        name: 'Post-Session Follow-up',
        subject: 'Thank you for today\'s session, {{clientFirstName}}',
        category: 'follow_up',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Thank You for Today's Session!</h2>
            <p>Hi {{clientFirstName}},</p>
            <p>Thank you for a productive coaching session today. I enjoyed our conversation and I'm excited about the progress you're making!</p>
            
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0;">Key Takeaways from Today:</h3>
              <p><em>I'll be adding specific notes about what we discussed and the action items we identified. This section will be customized for each client.</em></p>
            </div>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0;">Action Items for This Week:</h3>
              <ul>
                <li>Practice the breathing exercises we discussed</li>
                <li>Complete the reflection journal entry</li>
                <li>Implement the goal-setting framework</li>
              </ul>
            </div>
            
            <p>Your next session is scheduled for {{nextSessionDate}}. Between now and then, feel free to reach out if you have any questions or need support.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{bookingUrl}}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Your Progress
              </a>
            </div>
            
            <p>Keep up the great work!</p>
            <p>Best regards,<br>{{coachName}}</p>
          </div>
        `,
        variables: ['clientFirstName', 'nextSessionDate', 'coachName', 'bookingUrl'],
        isDefault: false,
        isActive: true,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        usage: {
          sent: 67,
          opened: 58,
          clicked: 19,
          lastUsed: new Date(Date.now() - 12 * 60 * 60 * 1000)
        },
        tags: ['follow-up', 'post-session', 'engagement']
      }
    ];

    setTemplates(mockTemplates);
  }, []);

  const categories: { value: EmailTemplateCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'session_reminder', label: 'Session Reminders' },
    { value: 'session_confirmation', label: 'Session Confirmations' },
    { value: 'session_cancellation', label: 'Cancellations' },
    { value: 'session_reschedule', label: 'Reschedules' },
    { value: 'feedback_request', label: 'Feedback Requests' },
    { value: 'follow_up', label: 'Follow-ups' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'custom', label: 'Custom' }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateTemplate = () => {
    const newTemplate: EmailTemplate = {
      id: Date.now().toString(),
      name: 'New Template',
      subject: '',
      category: 'custom',
      content: '',
      variables: [],
      isDefault: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: {
        sent: 0,
        opened: 0,
        clicked: 0
      },
      tags: []
    };
    
    setSelectedTemplate(newTemplate);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;

    if (isCreating) {
      setTemplates(prev => [...prev, selectedTemplate]);
      setIsCreating(false);
    } else {
      setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? selectedTemplate : t));
    }
    
    setIsEditing(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
    }
  };

  const handleDuplicateTemplate = (template: EmailTemplate) => {
    const duplicatedTemplate: EmailTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: {
        sent: 0,
        opened: 0,
        clicked: 0
      }
    };
    
    setTemplates(prev => [...prev, duplicatedTemplate]);
  };

  const replaceVariables = (content: string, variables: Record<string, string>) => {
    let result = content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  };

  const handlePreview = (template: EmailTemplate) => {
    const sampleData: Record<string, string> = {};
    availableVariables.forEach(variable => {
      sampleData[variable.key] = variable.example;
    });
    
    setPreviewData(sampleData);
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const getUsageColor = (openRate: number) => {
    if (openRate >= 80) return 'text-green-600';
    if (openRate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600">Create and manage email templates for your coaching communications</p>
        </div>
        <button
          onClick={handleCreateTemplate}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Template</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Templates List */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as EmailTemplateCategory | 'all')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Templates List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-blue-50 border-r-2 border-r-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
                        {template.isDefault && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Default</span>
                        )}
                        {!template.isActive && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">{template.subject}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500 capitalize">{template.category.replace('_', ' ')}</span>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{template.usage.sent} sent</span>
                          <span className={getUsageColor((template.usage.opened / template.usage.sent) * 100)}>
                            {template.usage.sent > 0 ? Math.round((template.usage.opened / template.usage.sent) * 100) : 0}% opened
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(template);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateTemplate(template);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Template Editor */}
        <div className="col-span-12 lg:col-span-8">
          {selectedTemplate ? (
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedTemplate.name}</h2>
                    <p className="text-sm text-gray-600">
                      {isCreating ? 'New template' : `Last updated ${selectedTemplate.updatedAt.toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={() => handlePreview(selectedTemplate)}
                          className="btn-secondary flex items-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="btn-primary flex items-center space-x-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            if (isCreating) {
                              setSelectedTemplate(null);
                              setIsCreating(false);
                            }
                          }}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveTemplate}
                          className="btn-primary flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {isEditing ? (
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Template Name</label>
                        <input
                          type="text"
                          value={selectedTemplate.name}
                          onChange={(e) => setSelectedTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Category</label>
                        <select
                          value={selectedTemplate.category}
                          onChange={(e) => setSelectedTemplate(prev => prev ? { ...prev, category: e.target.value as EmailTemplateCategory } : null)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          {categories.filter(c => c.value !== 'all').map(category => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Subject</label>
                      <input
                        type="text"
                        value={selectedTemplate.subject}
                        onChange={(e) => setSelectedTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                        placeholder="Enter email subject (use {{variableName}} for dynamic content)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    {/* Content Editor */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Content</label>
                      <div className="border border-gray-300 rounded-lg">
                        <div className="flex items-center space-x-2 p-2 border-b border-gray-200 bg-gray-50">
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <Bold className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <Italic className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <Underline className="w-4 h-4" />
                          </button>
                          <div className="w-px h-4 bg-gray-300"></div>
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <List className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <Link className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <Image className="w-4 h-4" />
                          </button>
                          <div className="w-px h-4 bg-gray-300"></div>
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <AlignLeft className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <AlignCenter className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <AlignRight className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          value={selectedTemplate.content}
                          onChange={(e) => setSelectedTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                          placeholder="Enter your email content here. Use HTML for formatting and {{variableName}} for dynamic content."
                          className="w-full h-64 p-3 border-none resize-none focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Variables */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Available Variables</label>
                      <div className="grid grid-cols-3 gap-2">
                        {availableVariables.map((variable) => (
                          <button
                            key={variable.key}
                            onClick={() => {
                              const textarea = document.querySelector('textarea');
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = textarea.value;
                                const before = text.substring(0, start);
                                const after = text.substring(end, text.length);
                                const newText = before + `{{${variable.key}}}` + after;
                                setSelectedTemplate(prev => prev ? { ...prev, content: newText } : null);
                              }
                            }}
                            className="text-left p-2 border border-gray-200 rounded hover:bg-gray-50 text-sm"
                            title={variable.description}
                          >
                            <div className="font-medium">{`{{${variable.key}}}`}</div>
                            <div className="text-xs text-gray-500">{variable.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Tags</label>
                      <input
                        type="text"
                        value={selectedTemplate.tags.join(', ')}
                        onChange={(e) => setSelectedTemplate(prev => prev ? { 
                          ...prev, 
                          tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                        } : null)}
                        placeholder="Enter tags separated by commas"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Template Info */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium mb-2">Template Details</h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-600">Category:</span> <span className="capitalize">{selectedTemplate.category.replace('_', ' ')}</span></div>
                          <div><span className="text-gray-600">Created:</span> {selectedTemplate.createdAt.toLocaleDateString()}</div>
                          <div><span className="text-gray-600">Last Updated:</span> {selectedTemplate.updatedAt.toLocaleDateString()}</div>
                          <div><span className="text-gray-600">Status:</span> <span className={selectedTemplate.isActive ? 'text-green-600' : 'text-gray-600'}>{selectedTemplate.isActive ? 'Active' : 'Inactive'}</span></div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">Usage Statistics</h3>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-600">Times Sent:</span> {selectedTemplate.usage.sent}</div>
                          <div><span className="text-gray-600">Open Rate:</span> <span className={getUsageColor(selectedTemplate.usage.sent > 0 ? (selectedTemplate.usage.opened / selectedTemplate.usage.sent) * 100 : 0)}>
                            {selectedTemplate.usage.sent > 0 ? Math.round((selectedTemplate.usage.opened / selectedTemplate.usage.sent) * 100) : 0}%
                          </span></div>
                          <div><span className="text-gray-600">Click Rate:</span> <span className={getUsageColor(selectedTemplate.usage.sent > 0 ? (selectedTemplate.usage.clicked / selectedTemplate.usage.sent) * 100 : 0)}>
                            {selectedTemplate.usage.sent > 0 ? Math.round((selectedTemplate.usage.clicked / selectedTemplate.usage.sent) * 100) : 0}%
                          </span></div>
                          {selectedTemplate.usage.lastUsed && (
                            <div><span className="text-gray-600">Last Used:</span> {selectedTemplate.usage.lastUsed.toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <h3 className="font-medium mb-2">Email Subject</h3>
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        <code className="text-sm">{selectedTemplate.subject}</code>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div>
                      <h3 className="font-medium mb-2">Content Preview</h3>
                      <div className="p-4 bg-gray-50 rounded-lg border max-h-64 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
                      </div>
                    </div>

                    {/* Tags */}
                    {selectedTemplate.tags.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border h-96 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Template Selected</h3>
                <p>Select a template from the list to view or edit it</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Email Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="text-sm">
                <div><strong>Subject:</strong> {replaceVariables(selectedTemplate.subject, previewData)}</div>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-96">
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: replaceVariables(selectedTemplate.content, previewData) 
                }} 
              />
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600">
                This preview shows how the email will look with sample data. Actual emails will use real client and session information.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateManager; 