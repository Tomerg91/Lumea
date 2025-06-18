import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Phone, 
  Video, 
  MoreVertical,
  Search,
  Archive,
  Star,
  Trash2,
  Image,
  File,
  Smile,
  Check,
  CheckCheck,
  Clock,
  X
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'coach' | 'client';
  content: string;
  type: 'text' | 'image' | 'file' | 'audio';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  attachments?: MessageAttachment[];
  replyTo?: string;
  edited?: boolean;
  editedAt?: Date;
}

interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'audio';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

interface Conversation {
  id: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  isArchived: boolean;
  isStarred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Participant {
  id: string;
  name: string;
  role: 'coach' | 'client';
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

const MessagingCenter: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockConversations: Conversation[] = [
      {
        id: '1',
        participants: [
          { id: '1', name: 'Sarah Johnson', role: 'client', isOnline: true },
          { id: '2', name: 'Dr. Smith', role: 'coach', isOnline: false, lastSeen: new Date(Date.now() - 30 * 60 * 1000) }
        ],
        lastMessage: {
          id: '1',
          conversationId: '1',
          senderId: '1',
          senderName: 'Sarah Johnson',
          senderRole: 'client',
          content: 'Thank you for the session today. I found the breathing exercises very helpful.',
          type: 'text',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          status: 'read'
        },
        unreadCount: 0,
        isArchived: false,
        isStarred: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        id: '2',
        participants: [
          { id: '3', name: 'Michael Chen', role: 'client', isOnline: false, lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000) },
          { id: '2', name: 'Dr. Smith', role: 'coach', isOnline: false }
        ],
        lastMessage: {
          id: '2',
          conversationId: '2',
          senderId: '2',
          senderName: 'Dr. Smith',
          senderRole: 'coach',
          content: 'I\'ve prepared some additional resources for our next session. Check your email.',
          type: 'text',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'delivered'
        },
        unreadCount: 2,
        isArchived: false,
        isStarred: false,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    setConversations(mockConversations);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      // Mock messages for selected conversation
      const mockMessages: Message[] = [
        {
          id: '1',
          conversationId: selectedConversation,
          senderId: '1',
          senderName: 'Sarah Johnson',
          senderRole: 'client',
          content: 'Hi Dr. Smith, I wanted to follow up on our session today.',
          type: 'text',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'read'
        },
        {
          id: '2',
          conversationId: selectedConversation,
          senderId: '2',
          senderName: 'Dr. Smith',
          senderRole: 'coach',
          content: 'Hello Sarah! I\'m glad you reached out. How are you feeling after our session?',
          type: 'text',
          timestamp: new Date(Date.now() - 90 * 60 * 1000),
          status: 'read'
        },
        {
          id: '3',
          conversationId: selectedConversation,
          senderId: '1',
          senderName: 'Sarah Johnson',
          senderRole: 'client',
          content: 'Much better, thank you! The breathing exercises really helped with my anxiety.',
          type: 'text',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          status: 'read'
        },
        {
          id: '4',
          conversationId: selectedConversation,
          senderId: '1',
          senderName: 'Sarah Johnson',
          senderRole: 'client',
          content: 'I practiced them before my presentation and felt much more confident.',
          type: 'text',
          timestamp: new Date(Date.now() - 55 * 60 * 1000),
          status: 'read'
        },
        {
          id: '5',
          conversationId: selectedConversation,
          senderId: '2',
          senderName: 'Dr. Smith',
          senderRole: 'coach',
          content: 'That\'s wonderful to hear! Consistency is key with these techniques. Keep practicing them daily.',
          type: 'text',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          status: 'read'
        },
        {
          id: '6',
          conversationId: selectedConversation,
          senderId: '1',
          senderName: 'Sarah Johnson',
          senderRole: 'client',
          content: 'Thank you for the session today. I found the breathing exercises very helpful.',
          type: 'text',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          status: 'read'
        }
      ];
      setMessages(mockMessages);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: Date.now().toString(),
      conversationId: selectedConversation,
      senderId: user?.id || '2',
      senderName: user?.name || 'Dr. Smith',
      senderRole: user?.role as 'coach' | 'client' || 'coach',
      content: newMessage.trim(),
      type: 'text',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate API call
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'sent' as const }
            : msg
        )
      );
    }, 1000);

    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id 
            ? { ...msg, status: 'delivered' as const }
            : msg
        )
      );
    }, 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedConversation) return;

    Array.from(files).forEach(file => {
      const message: Message = {
        id: Date.now().toString(),
        conversationId: selectedConversation,
        senderId: user?.id || '2',
        senderName: user?.name || 'Dr. Smith',
        senderRole: user?.role as 'coach' | 'client' || 'coach',
        content: `Shared ${file.name}`,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        timestamp: new Date(),
        status: 'sending',
        attachments: [{
          id: Date.now().toString(),
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          mimeType: file.type
        }]
      };

      setMessages(prev => [...prev, message]);
    });
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getMessageStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participants.some(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const selectedConv = conversations.find(c => c.id === selectedConversation);
  const otherParticipant = selectedConv?.participants.find(p => p.id !== user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => {
            const otherParticipant = conversation.participants.find(p => p.id !== user?.id);
            return (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation === conversation.id ? 'bg-blue-50 border-r-2 border-r-primary' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {otherParticipant?.name.charAt(0)}
                      </span>
                    </div>
                    {otherParticipant?.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 truncate">
                        {otherParticipant?.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        {conversation.isStarred && (
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        )}
                        {conversation.unreadCount > 0 && (
                          <span className="bg-primary text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversation.lastMessage?.content || 'No messages yet'}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {conversation.lastMessage ? formatTime(conversation.lastMessage.timestamp) : ''}
                      </span>
                      {!otherParticipant?.isOnline && otherParticipant?.lastSeen && (
                        <span className="text-xs text-gray-400">
                          {formatLastSeen(otherParticipant.lastSeen)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {otherParticipant?.name.charAt(0)}
                    </span>
                  </div>
                  {otherParticipant?.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">{otherParticipant?.name}</h3>
                  <p className="text-sm text-gray-500">
                    {otherParticipant?.isOnline ? 'Online' : 
                     otherParticipant?.lastSeen ? `Last seen ${formatLastSeen(otherParticipant.lastSeen)}` : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Video className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => {
              const isOwnMessage = message.senderId === user?.id;
              const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                    {showAvatar && !isOwnMessage && (
                      <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-medium">
                          {message.senderName.charAt(0)}
                        </span>
                      </div>
                    )}
                    
                    <div className={`${showAvatar ? '' : isOwnMessage ? 'mr-8' : 'ml-8'}`}>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwnMessage
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mb-2">
                            {message.attachments.map((attachment) => (
                              <div key={attachment.id} className="flex items-center space-x-2">
                                {attachment.type === 'image' ? (
                                  <img 
                                    src={attachment.url} 
                                    alt={attachment.name}
                                    className="max-w-48 rounded-lg"
                                  />
                                ) : (
                                  <div className="flex items-center space-x-2 p-2 bg-black bg-opacity-10 rounded-lg">
                                    <File className="w-4 h-4" />
                                    <span className="text-sm">{attachment.name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-sm">{message.content}</p>
                      </div>
                      
                      <div className={`flex items-center mt-1 space-x-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                        {isOwnMessage && getMessageStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {typingUsers.length > 0 && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500">typing...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <Paperclip className="w-4 h-4 text-gray-500" />
                  </button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 border-none outline-none resize-none"
                  />
                  
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <Smile className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
            <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingCenter; 