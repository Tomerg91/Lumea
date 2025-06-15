import React, { useState, useCallback } from 'react';
import { useRealtimeSessions } from '../hooks/useRealtime';
import { RealtimeEvent } from '../services/realtimeService';

interface Session {
  id: string;
  client_id: string;
  coach_id: string;
  date: string;
  status: string;
  notes?: string;
}

export const RealtimeSessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent<any> | null>(null);

  // Handle real-time session events
  const handleSessionEvent = useCallback((event: RealtimeEvent<any>) => {
    console.log('Received session event:', event);
    setLastEvent(event);

    if (event.eventType === 'INSERT' && event.new) {
      // Add new session
      setSessions(prev => [event.new, ...prev]);
    } else if (event.eventType === 'UPDATE' && event.new) {
      // Update existing session
      setSessions(prev => 
        prev.map(session => 
          session.id === event.new.id ? event.new : session
        )
      );
    } else if (event.eventType === 'DELETE' && event.old) {
      // Remove deleted session
      setSessions(prev => 
        prev.filter(session => session.id !== event.old.id)
      );
    }
  }, []);

  // Subscribe to real-time sessions
  const { isConnected, activeChannels } = useRealtimeSessions(handleSessionEvent);

  const clearSessions = () => {
    setSessions([]);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Rescheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Upcoming': return '📅';
      case 'Completed': return '✅';
      case 'Cancelled': return '❌';
      case 'Rescheduled': return '🔄';
      default: return '📋';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Real-time Sessions
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={clearSessions}
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

      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📅</div>
            <div>No real-time session updates yet</div>
            <div className="text-sm mt-1">
              Session changes will appear here in real-time
            </div>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="border border-gray-200 rounded-md p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">
                    {getStatusIcon(session.status)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      Session {session.id.slice(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Date: {new Date(session.date).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Coach: {session.coach_id.slice(0, 8)}...
                    </div>
                    <div className="text-sm text-gray-600">
                      Client: {session.client_id.slice(0, 8)}...
                    </div>
                    {session.notes && (
                      <div className="text-sm text-gray-600 mt-2">
                        <span className="font-medium">Notes:</span> {session.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(session.status)}`}>
                    {session.status}
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
            <li>Create, update, or delete sessions in the database</li>
            <li>Use the session API endpoints</li>
            <li>Change session status or notes</li>
            <li>Watch for real-time updates appearing here</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 