import React, { useState, useCallback } from 'react';
import { useRealtimeNotifications } from '../hooks/useRealtime';
import { RealtimeEvent } from '../services/realtimeService';

interface Notification {
  id: string;
  type: string;
  subject: string;
  status: string;
  created_at: string;
  sender_id?: string;
}

export const RealtimeNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent<any> | null>(null);

  // Handle real-time notification events
  const handleNotificationEvent = useCallback((event: RealtimeEvent<any>) => {
    console.log('Received notification event:', event);
    setLastEvent(event);

    if (event.eventType === 'INSERT' && event.new) {
      // Add new notification
      setNotifications(prev => [event.new, ...prev]);
    } else if (event.eventType === 'UPDATE' && event.new) {
      // Update existing notification
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === event.new.id ? event.new : notif
        )
      );
    } else if (event.eventType === 'DELETE' && event.old) {
      // Remove deleted notification
      setNotifications(prev => 
        prev.filter(notif => notif.id !== event.old.id)
      );
    }
  }, []);

  // Subscribe to real-time notifications
  const { isConnected, activeChannels } = useRealtimeNotifications(handleNotificationEvent);

  const clearNotifications = () => {
    setNotifications([]);
    setLastEvent(null);
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'INSERT': return 'text-green-600';
      case 'UPDATE': return 'text-blue-600';
      case 'DELETE': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'session_reminder': return '⏰';
      case 'session_cancelled': return '❌';
      case 'session_rescheduled': return '📅';
      case 'session_confirmation': return '✅';
      case 'feedback_request': return '💬';
      case 'reflection_submitted': return '💭';
      default: return '📢';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Real-time Notifications
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={clearNotifications}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="text-sm text-gray-600">
          <div>Status: <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span></div>
          <div>Active Channels: {activeChannels.length}</div>
          {activeChannels.length > 0 && (
            <div className="mt-1">
              <span className="font-medium">Channels:</span>
              <ul className="list-disc list-inside ml-2">
                {activeChannels.map(channel => (
                  <li key={channel} className="text-xs">{channel}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Last Event Debug Info */}
      {lastEvent && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <div className="text-sm">
            <div className="font-medium text-blue-800">Last Event:</div>
            <div className={`font-medium ${getEventTypeColor(lastEvent.eventType)}`}>
              {lastEvent.eventType}
            </div>
            <div className="text-blue-600">Table: {lastEvent.table}</div>
            <div className="text-xs text-blue-500 mt-1">
              {JSON.stringify(lastEvent.new, null, 2)}
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🔔</div>
            <div>No real-time notifications yet</div>
            <div className="text-sm mt-1">
              Notifications will appear here when they arrive in real-time
            </div>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="border border-gray-200 rounded-md p-3 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">
                    {getNotificationTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {notification.subject}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Type: {notification.type}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    notification.status === 'sent' ? 'bg-green-100 text-green-800' :
                    notification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    notification.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {notification.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-3 bg-yellow-50 rounded-md">
        <div className="text-sm text-yellow-800">
          <div className="font-medium">How to test:</div>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Create, update, or delete notifications in the database</li>
            <li>Use the notification API endpoints</li>
            <li>Watch for real-time updates appearing here</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 