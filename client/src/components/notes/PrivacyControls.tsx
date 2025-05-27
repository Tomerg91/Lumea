import React, { useState, useEffect } from 'react';
import { CoachNote, NoteAccessLevel, NotePrivacySettings, AuditEntry } from '../../types/coachNote';
import { coachNoteService } from '../../services/coachNoteService';
import { Button } from '../ui/button';

interface PrivacyControlsProps {
  note: CoachNote;
  onUpdate: (updatedNote: CoachNote) => void;
  onClose: () => void;
  isOwner: boolean;
  currentUserRole: string;
}

export const PrivacyControls: React.FC<PrivacyControlsProps> = ({
  note,
  onUpdate,
  onClose,
  isOwner,
  currentUserRole
}) => {
  const [privacySettings, setPrivacySettings] = useState<NotePrivacySettings>(note.privacySettings);
  const [sharedWith, setSharedWith] = useState<string[]>(note.sharedWith || []);
  const [shareEmail, setShareEmail] = useState('');
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'sharing' | 'audit'>('settings');

  useEffect(() => {
    if (activeTab === 'audit' && (isOwner || currentUserRole === 'admin')) {
      loadAuditTrail();
    }
  }, [activeTab, isOwner, currentUserRole]);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      const trail = await coachNoteService.getAuditTrail(note._id);
      setAuditTrail(trail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacySettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedNote = await coachNoteService.updateNote(note._id, {
        privacySettings: privacySettings
      });
      
      onUpdate(updatedNote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleShareNote = async () => {
    if (!shareEmail.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await coachNoteService.shareNote(note._id, [shareEmail.trim()]);
      setSharedWith([...sharedWith, shareEmail.trim()]);
      setShareEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share note');
    } finally {
      setLoading(false);
    }
  };

  const handleUnshareNote = async (userToRemove: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await coachNoteService.unshareNote(note._id, [userToRemove]);
      setSharedWith(sharedWith.filter(user => user !== userToRemove));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unshare note');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAccessLevelDescription = (level: NoteAccessLevel) => {
    switch (level) {
      case NoteAccessLevel.PRIVATE:
        return 'Only you can access this note';
      case NoteAccessLevel.SUPERVISOR:
        return 'You and designated supervisors can access this note';
      case NoteAccessLevel.TEAM:
        return 'You and team members can access this note';
      case NoteAccessLevel.ORGANIZATION:
        return 'All coaches in your organization can access this note';
      default:
        return 'Unknown access level';
    }
  };

  const canModifyPrivacy = isOwner || currentUserRole === 'admin';

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Privacy & Security Controls</h2>
            <p className="text-sm text-gray-600 mt-1">
              {note.title || `Note from ${formatTimestamp(note.createdAt)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {note.isEncrypted && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                🔒 Encrypted
              </span>
            )}
            {note.privacySettings.sensitiveContent && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                ⚠️ Sensitive
              </span>
            )}
            <Button variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-4">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Privacy Settings
          </button>
          <button
            onClick={() => setActiveTab('sharing')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'sharing'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            disabled={!canModifyPrivacy}
          >
            Sharing
          </button>
          {(isOwner || currentUserRole === 'admin') && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'audit'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Audit Trail
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-96 overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Privacy Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Access Level
              </label>
              <div className="space-y-3">
                {Object.values(NoteAccessLevel).map((level) => (
                  <label key={level} className="flex items-start space-x-3">
                    <input
                      type="radio"
                      value={level}
                      checked={privacySettings.accessLevel === level}
                      onChange={(e) => setPrivacySettings({
                        ...privacySettings,
                        accessLevel: e.target.value as NoteAccessLevel
                      })}
                      disabled={!canModifyPrivacy}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {level.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-gray-600">
                        {getAccessLevelDescription(level)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Permissions</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={privacySettings.allowExport}
                      onChange={(e) => setPrivacySettings({
                        ...privacySettings,
                        allowExport: e.target.checked
                      })}
                      disabled={!canModifyPrivacy}
                    />
                    <span className="text-sm text-gray-900">Allow export</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={privacySettings.allowSharing}
                      onChange={(e) => setPrivacySettings({
                        ...privacySettings,
                        allowSharing: e.target.checked
                      })}
                      disabled={!canModifyPrivacy}
                    />
                    <span className="text-sm text-gray-900">Allow sharing</span>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Security</h4>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={privacySettings.requireReasonForAccess}
                      onChange={(e) => setPrivacySettings({
                        ...privacySettings,
                        requireReasonForAccess: e.target.checked
                      })}
                      disabled={!canModifyPrivacy}
                    />
                    <span className="text-sm text-gray-900">Require reason for access</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={privacySettings.sensitiveContent}
                      onChange={(e) => setPrivacySettings({
                        ...privacySettings,
                        sensitiveContent: e.target.checked
                      })}
                      disabled={!canModifyPrivacy}
                    />
                    <span className="text-sm text-gray-900">Contains sensitive content</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={privacySettings.supervisionRequired}
                      onChange={(e) => setPrivacySettings({
                        ...privacySettings,
                        supervisionRequired: e.target.checked
                      })}
                      disabled={!canModifyPrivacy}
                    />
                    <span className="text-sm text-gray-900">Supervision required</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-delete after (days)
                </label>
                <input
                  type="number"
                  value={privacySettings.autoDeleteAfterDays || ''}
                  onChange={(e) => setPrivacySettings({
                    ...privacySettings,
                    autoDeleteAfterDays: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  disabled={!canModifyPrivacy}
                  placeholder="Never"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retention period (days)
                </label>
                <input
                  type="number"
                  value={privacySettings.retentionPeriodDays || ''}
                  onChange={(e) => setPrivacySettings({
                    ...privacySettings,
                    retentionPeriodDays: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  disabled={!canModifyPrivacy}
                  placeholder="Indefinite"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            {canModifyPrivacy && (
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button 
                  onClick={handleSavePrivacySettings}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Privacy Settings'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Sharing Tab */}
        {activeTab === 'sharing' && (
          <div className="space-y-6">
            {!privacySettings.allowSharing ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-3">🔒</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sharing Disabled</h3>
                <p className="text-gray-600">
                  Enable sharing in privacy settings to share this note with others.
                </p>
              </div>
            ) : (
              <>
                {canModifyPrivacy && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Share with User</h4>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        placeholder="Enter user email or ID"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleShareNote()}
                      />
                      <Button 
                        onClick={handleShareNote}
                        disabled={loading || !shareEmail.trim()}
                        size="sm"
                      >
                        Share
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Currently Shared With</h4>
                  {sharedWith.length === 0 ? (
                    <p className="text-sm text-gray-600">Not shared with anyone</p>
                  ) : (
                    <div className="space-y-2">
                      {sharedWith.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <span className="text-sm text-gray-900">{user}</span>
                          {canModifyPrivacy && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnshareNote(user)}
                              disabled={loading}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700">Access & Modification History</h4>
              <div className="text-xs text-gray-500">
                {note.accessCount} total accesses
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading audit trail...</p>
              </div>
            ) : auditTrail.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-3">📋</div>
                <p className="text-sm text-gray-600">No audit entries found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditTrail.map((entry, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {entry.action.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            by {entry.userRole}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {formatTimestamp(entry.timestamp)}
                        </div>
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div className="text-xs text-gray-500 mt-2">
                            {JSON.stringify(entry.details, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 