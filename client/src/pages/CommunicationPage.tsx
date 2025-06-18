import React, { useState } from 'react';
import { 
  MessageSquare, 
  Video, 
  Mail, 
  Phone, 
  Users, 
  Calendar,
  Settings,
  BarChart3,
  Clock,
  Send,
  Archive,
  Star,
  Search
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import MessagingCenter from '../components/communication/MessagingCenter';
import VideoCallInterface from '../components/communication/VideoCallInterface';
import EmailTemplateManager from '../components/communication/EmailTemplateManager';

type CommunicationTab = 'messaging' | 'video' | 'email' | 'analytics';

interface CommunicationStats {
  totalMessages: number;
  activeConversations: number;
  videoCallsThisWeek: number;
  emailsSentThisMonth: number;
  averageResponseTime: string;
  clientSatisfactionScore: number;
}

interface RecentActivity {
  id: string;
  type: 'message' | 'video_call' | 'email';
  clientName: string;
  timestamp: Date;
  description: string;
  status: 'completed' | 'pending' | 'missed';
}

const CommunicationPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<CommunicationTab>('messaging');
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [videoCallSessionId, setVideoCallSessionId] = useState<string | null>(null);

  // Mock data for analytics
  const stats: CommunicationStats = {
    totalMessages: 1247,
    activeConversations: 12,
    videoCallsThisWeek: 8,
    emailsSentThisMonth: 45,
    averageResponseTime: '2.5 hours',
    clientSatisfactionScore: 4.8
  };

  const recentActivity: RecentActivity[] = [
    {
      id: '1',
      type: 'message',
      clientName: 'Sarah Johnson',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      description: 'New message received',
      status: 'pending'
    },
    {
      id: '2',
      type: 'video_call',
      clientName: 'Michael Chen',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      description: 'Video call completed (45 minutes)',
      status: 'completed'
    },
    {
      id: '3',
      type: 'email',
      clientName: 'Emma Davis',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      description: 'Session reminder email sent',
      status: 'completed'
    },
    {
      id: '4',
      type: 'video_call',
      clientName: 'David Wilson',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      description: 'Missed video call',
      status: 'missed'
    }
  ];

  const tabs = [
    {
      id: 'messaging' as CommunicationTab,
      label: 'Messaging',
      icon: MessageSquare,
      description: 'Chat with clients in real-time'
    },
    {
      id: 'video' as CommunicationTab,
      label: 'Video Calls',
      icon: Video,
      description: 'Conduct video coaching sessions'
    },
    {
      id: 'email' as CommunicationTab,
      label: 'Email Templates',
      icon: Mail,
      description: 'Manage email templates and campaigns'
    },
    {
      id: 'analytics' as CommunicationTab,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Communication insights and metrics'
    }
  ];

  const handleStartVideoCall = (sessionId: string) => {
    setVideoCallSessionId(sessionId);
    setIsVideoCallActive(true);
  };

  const handleEndVideoCall = () => {
    setIsVideoCallActive(false);
    setVideoCallSessionId(null);
  };

  const formatTimeAgo = (date: Date) => {
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

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'video_call':
        return <Video className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: RecentActivity['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'missed':
        return 'text-red-600 bg-red-100';
    }
  };

  if (isVideoCallActive && videoCallSessionId) {
    return (
      <VideoCallInterface
        sessionId={videoCallSessionId}
        onCallEnd={handleEndVideoCall}
        isHost={user?.role === 'coach'}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Communication Center</h1>
        <p className="text-gray-600">Manage all your client communications in one place</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Conversations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeConversations}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Video Calls This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.videoCallsThisWeek}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Emails Sent This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.emailsSentThisMonth}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageResponseTime}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="col-span-12 lg:col-span-9">
          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'messaging' && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold mb-2">Real-time Messaging</h2>
                    <p className="text-gray-600">Communicate with your clients instantly through secure messaging</p>
                  </div>
                  <MessagingCenter />
                </div>
              )}

              {activeTab === 'video' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Video Calling</h2>
                    <p className="text-gray-600">Conduct face-to-face coaching sessions with high-quality video calls</p>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                      <h3 className="text-lg font-semibold mb-2">Start Instant Call</h3>
                      <p className="text-blue-100 mb-4">Begin a video call with any of your clients right now</p>
                      <button
                        onClick={() => handleStartVideoCall('instant-call')}
                        className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                      >
                        Start Call
                      </button>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
                      <h3 className="text-lg font-semibold mb-2">Schedule Call</h3>
                      <p className="text-green-100 mb-4">Schedule a video call for a future session</p>
                      <button className="bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors">
                        Schedule
                      </button>
                    </div>
                  </div>

                  {/* Recent Video Calls */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-3">Recent Video Calls</h3>
                    <div className="space-y-3">
                      {recentActivity
                        .filter(activity => activity.type === 'video_call')
                        .slice(0, 3)
                        .map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {activity.clientName.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{activity.clientName}</div>
                                <div className="text-sm text-gray-500">{activity.description}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">{formatTimeAgo(activity.timestamp)}</div>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(activity.status)}`}>
                                {activity.status}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'email' && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold mb-2">Email Template Management</h2>
                    <p className="text-gray-600">Create and manage professional email templates for all your coaching communications</p>
                  </div>
                  <EmailTemplateManager />
                </div>
              )}

              {activeTab === 'analytics' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-2">Communication Analytics</h2>
                    <p className="text-gray-600">Track and analyze your communication patterns and effectiveness</p>
                  </div>

                  {/* Detailed Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="font-semibold mb-4">Message Statistics</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Messages Sent</span>
                          <span className="font-medium">{stats.totalMessages}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Average Response Time</span>
                          <span className="font-medium">{stats.averageResponseTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Conversations</span>
                          <span className="font-medium">{stats.activeConversations}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="font-semibold mb-4">Client Satisfaction</h3>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {stats.clientSatisfactionScore}/5.0
                        </div>
                        <div className="text-gray-600">Average Rating</div>
                        <div className="flex justify-center mt-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= Math.floor(stats.clientSatisfactionScore)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Communication Trends Chart Placeholder */}
                  <div className="bg-white p-6 rounded-lg border">
                    <h3 className="font-semibold mb-4">Communication Trends</h3>
                    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                        <p>Communication trends chart would be displayed here</p>
                        <p className="text-sm">Showing messages, calls, and emails over time</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Recent Activity</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(activity.status)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.clientName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => setActiveTab('messaging')}
                className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span className="font-medium">New Message</span>
              </button>
              
              <button
                onClick={() => handleStartVideoCall('quick-call')}
                className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Video className="w-5 h-5 text-green-600" />
                <span className="font-medium">Start Video Call</span>
              </button>
              
              <button
                onClick={() => setActiveTab('email')}
                className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Send Email</span>
              </button>
              
              <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                <Calendar className="w-5 h-5 text-orange-600" />
                <span className="font-medium">Schedule Session</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationPage; 