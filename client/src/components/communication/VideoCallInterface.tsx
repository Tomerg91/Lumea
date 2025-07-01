import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Settings,
  Users,
  MessageSquare,
  Share,
  Circle,
  MoreVertical,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Camera,
  Monitor,
  Grid3X3,
  User,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface CallParticipant {
  id: string;
  name: string;
  role: 'coach' | 'client';
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isHost: boolean;
  joinedAt: Date;
}

interface CallSettings {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  recordingEnabled: boolean;
  chatEnabled: boolean;
  backgroundBlur: boolean;
  virtualBackground: string | null;
  audioQuality: 'low' | 'medium' | 'high';
  videoQuality: 'low' | 'medium' | 'high';
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'message' | 'system';
}

const VideoCallInterface: React.FC<{
  sessionId: string;
  onCallEnd: () => void;
  isHost?: boolean;
}> = ({ sessionId, onCallEnd, isHost = false }) => {
  const { t, isRTL } = useLanguage();
  const { user, profile } = useAuth();
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [callSettings, setCallSettings] = useState<CallSettings>({
    audioEnabled: true,
    videoEnabled: true,
    screenShareEnabled: false,
    recordingEnabled: false,
    chatEnabled: false,
    backgroundBlur: false,
    virtualBackground: null,
    audioQuality: 'high',
    videoQuality: 'high'
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('excellent');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'speaker' | 'sidebar'>('grid');
  const [isConnecting, setIsConnecting] = useState(true);
  const [callStartTime] = useState(new Date());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Mock participants data
  useEffect(() => {
    const mockParticipants: CallParticipant[] = [
      {
        id: user?.id || '1',
        name: (profile?.full_name as string) || 'You',
        role: user?.role as 'coach' | 'client' || 'coach',
        isAudioEnabled: callSettings.audioEnabled,
        isVideoEnabled: callSettings.videoEnabled,
        isScreenSharing: callSettings.screenShareEnabled,
        connectionQuality: 'excellent',
        isHost: isHost,
        joinedAt: new Date()
      },
      {
        id: '2',
        name: isHost ? 'Sarah Johnson' : 'Dr. Smith',
        role: isHost ? 'client' : 'coach',
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false,
        connectionQuality: 'good',
        isHost: !isHost,
        joinedAt: new Date(Date.now() - 30000)
      }
    ];

    setTimeout(() => {
      setParticipants(mockParticipants);
      setIsConnecting(false);
    }, 2000);
  }, [user, isHost, callSettings.audioEnabled, callSettings.videoEnabled, callSettings.screenShareEnabled]);

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [callStartTime]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAudio = () => {
    setCallSettings(prev => ({ ...prev, audioEnabled: !prev.audioEnabled }));
  };

  const toggleVideo = () => {
    setCallSettings(prev => ({ ...prev, videoEnabled: !prev.videoEnabled }));
  };

  const toggleScreenShare = () => {
    setCallSettings(prev => ({ ...prev, screenShareEnabled: !prev.screenShareEnabled }));
  };

  const toggleRecording = () => {
    setCallSettings(prev => ({ ...prev, recordingEnabled: !prev.recordingEnabled }));
  };

  const toggleChat = () => {
    setCallSettings(prev => ({ ...prev, chatEnabled: !prev.chatEnabled }));
  };

  const sendChatMessage = () => {
    if (!newChatMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: user?.id || '1',
      senderName: (profile?.full_name as string) || 'You',
      content: newChatMessage.trim(),
      timestamp: new Date(),
      type: 'message'
    };

    setChatMessages(prev => [...prev, message]);
    setNewChatMessage('');
  };

  const getConnectionIcon = (quality: CallParticipant['connectionQuality']) => {
    switch (quality) {
      case 'excellent':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'good':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'fair':
        return <Wifi className="w-4 h-4 text-orange-500" />;
      case 'poor':
        return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  const ParticipantVideo: React.FC<{ participant: CallParticipant; isMain?: boolean }> = ({ 
    participant, 
    isMain = false 
  }) => (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${
      isMain ? 'aspect-video' : 'aspect-square'
    }`}>
      {participant.isVideoEnabled ? (
        <video
          ref={participant.id === user?.id ? localVideoRef : remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted={participant.id === user?.id}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-gray-300" />
          </div>
        </div>
      )}
      
      {/* Participant Info Overlay */}
      <div className="absolute bottom-2 left-2 flex items-center space-x-2">
        <div className="bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm flex items-center space-x-1">
          <span>{participant.name}</span>
          {!participant.isAudioEnabled && <MicOff className="w-3 h-3" />}
          {participant.isHost && <span className="text-xs bg-blue-500 px-1 rounded">HOST</span>}
        </div>
      </div>
      
      {/* Connection Quality */}
      <div className="absolute top-2 right-2">
        {getConnectionIcon(participant.connectionQuality)}
      </div>
      
      {/* Screen Share Indicator */}
      {participant.isScreenSharing && (
        <div className="absolute top-2 left-2">
          <div className="bg-green-500 px-2 py-1 rounded text-white text-xs flex items-center space-x-1">
            <Monitor className="w-3 h-3" />
            <span>Sharing</span>
          </div>
        </div>
      )}
    </div>
  );

  if (isConnecting) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
          <p className="text-gray-300">Please wait while we connect you to the session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 text-white">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold">Coaching Session</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(callDuration)}</span>
          </div>
          {callSettings.recordingEnabled && (
            <div className="flex items-center space-x-1 text-red-400">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Recording</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'speaker' : 'grid')}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 p-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 h-full">
              {participants.map((participant) => (
                <ParticipantVideo key={participant.id} participant={participant} isMain />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 mb-4">
                <ParticipantVideo participant={participants[0]} isMain />
              </div>
              <div className="flex space-x-4">
                {participants.slice(1).map((participant) => (
                  <div key={participant.id} className="w-32">
                    <ParticipantVideo participant={participant} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        {callSettings.chatEnabled && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Chat</h3>
            </div>
            
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((message) => (
                <div key={message.id} className="text-white">
                  {message.type === 'system' ? (
                    <div className="text-center text-gray-400 text-sm">
                      {message.content}
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">
                        {message.senderName} • {message.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="text-sm">{message.content}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={sendChatMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-800">
        <div className="flex items-center justify-center space-x-4">
          {/* Audio Control */}
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${
              callSettings.audioEnabled 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {callSettings.audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Video Control */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              callSettings.videoEnabled 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {callSettings.videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full ${
              callSettings.screenShareEnabled 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Recording */}
          {isHost && (
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-full ${
                callSettings.recordingEnabled 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              <Circle className="w-5 h-5" />
            </button>
          )}

          {/* Chat Toggle */}
          <button
            onClick={toggleChat}
            className={`p-3 rounded-full ${
              callSettings.chatEnabled 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Participants */}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white relative"
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {participants.length}
            </span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* End Call */}
          <button
            onClick={onCallEnd}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Call Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Video Quality</label>
                <select
                  value={callSettings.videoQuality}
                  onChange={(e) => setCallSettings(prev => ({ 
                    ...prev, 
                    videoQuality: e.target.value as 'low' | 'medium' | 'high' 
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="low">Low (480p)</option>
                  <option value="medium">Medium (720p)</option>
                  <option value="high">High (1080p)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Audio Quality</label>
                <select
                  value={callSettings.audioQuality}
                  onChange={(e) => setCallSettings(prev => ({ 
                    ...prev, 
                    audioQuality: e.target.value as 'low' | 'medium' | 'high' 
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Background Blur</span>
                <button
                  onClick={() => setCallSettings(prev => ({ ...prev, backgroundBlur: !prev.backgroundBlur }))}
                  className={`w-12 h-6 rounded-full ${
                    callSettings.backgroundBlur ? 'bg-blue-600' : 'bg-gray-300'
                  } relative transition-colors`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${
                    callSettings.backgroundBlur ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipants && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Participants ({participants.length})</h3>
              <button
                onClick={() => setShowParticipants(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {participant.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{participant.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{participant.role}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getConnectionIcon(participant.connectionQuality)}
                    {!participant.isAudioEnabled && <MicOff className="w-4 h-4 text-red-500" />}
                    {!participant.isVideoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
                    {participant.isHost && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">HOST</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCallInterface; 