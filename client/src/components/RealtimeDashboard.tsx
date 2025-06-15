import React from 'react';
import { RealtimeNotifications } from './RealtimeNotifications';
import { RealtimeSessions } from './RealtimeSessions';
import { useRealtimeStatus } from '../hooks/useRealtime';

export const RealtimeDashboard: React.FC = () => {
  const status = useRealtimeStatus();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Real-time Features Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor live updates for notifications, sessions, reflections, and coach notes
          </p>
        </div>

        {/* Global Status */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Real-time Connection Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${status.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <div className="font-medium text-gray-900">Connection</div>
                <div className={`text-sm ${status.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {status.isConnected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <div>
                <div className="font-medium text-gray-900">Active Subscriptions</div>
                <div className="text-sm text-blue-600">
                  {status.activeSubscriptions} channels
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <div>
                <div className="font-medium text-gray-900">Features</div>
                <div className="text-sm text-purple-600">
                  Notifications, Sessions, Reflections, Notes
                </div>
              </div>
            </div>
          </div>

          {/* Active Channels List */}
          {status.activeChannels.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="text-sm font-medium text-gray-700 mb-2">Active Channels:</div>
              <div className="flex flex-wrap gap-2">
                {status.activeChannels.map(channel => (
                  <span
                    key={channel}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {channel}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Real-time Components Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Notifications */}
          <div>
            <RealtimeNotifications />
          </div>

          {/* Sessions */}
          <div>
            <RealtimeSessions />
          </div>
        </div>

        {/* Additional Features Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reflections Placeholder */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Real-time Reflections
            </h3>
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">💭</div>
              <div>Reflection updates will appear here</div>
              <div className="text-sm mt-1">
                Use useRealtimeReflections hook to implement
              </div>
            </div>
          </div>

          {/* Coach Notes Placeholder */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Real-time Coach Notes
            </h3>
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <div>Coach note updates will appear here</div>
              <div className="text-sm mt-1">
                Use useRealtimeCoachNotes hook to implement
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Guide */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Implementation Guide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Available Hooks:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <code className="bg-gray-100 px-1 rounded">useRealtimeNotifications</code></li>
                <li>• <code className="bg-gray-100 px-1 rounded">useRealtimeSessions</code></li>
                <li>• <code className="bg-gray-100 px-1 rounded">useRealtimeReflections</code></li>
                <li>• <code className="bg-gray-100 px-1 rounded">useRealtimeCoachNotes</code></li>
                <li>• <code className="bg-gray-100 px-1 rounded">useRealtimeSharedCoachNotes</code></li>
                <li>• <code className="bg-gray-100 px-1 rounded">useRealtimeTable</code> (generic)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Automatic authentication-based subscriptions</li>
                <li>• Role-based access control (coach/client filtering)</li>
                <li>• Automatic cleanup on component unmount</li>
                <li>• Connection status monitoring</li>
                <li>• Debug information and event logging</li>
                <li>• Privacy controls for coach notes</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="text-sm text-blue-800">
              <div className="font-medium">Usage Example:</div>
              <pre className="mt-2 text-xs bg-blue-100 p-2 rounded overflow-x-auto">
{`const handleEvent = useCallback((event) => {
  console.log('Real-time event:', event);
  // Handle INSERT, UPDATE, DELETE events
}, []);

const { isConnected } = useRealtimeNotifications(handleEvent);`}
              </pre>
            </div>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            Testing Real-time Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">Database Testing:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Insert/update/delete records in Supabase dashboard</li>
                <li>• Use SQL commands in the Supabase SQL editor</li>
                <li>• Test with different user IDs to see filtering</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">API Testing:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Use the notification API endpoints</li>
                <li>• Create/update sessions via API</li>
                <li>• Test with multiple browser tabs/users</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 