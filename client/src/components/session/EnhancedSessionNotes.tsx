import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { useCoachNotes } from '../../hooks/useCoachNotes';

interface EnhancedSessionNotesProps {
  sessionId: string;
  clientId: string;
  clientName?: string;
}

export const EnhancedSessionNotes: React.FC<EnhancedSessionNotesProps> = ({
  sessionId,
  clientId,
  clientName
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isCoach = profile?.role === 'coach';

  // Use the coach notes hook to get session-specific notes
  const { data: notes = [], isLoading: loading, error } = useCoachNotes(
    isCoach ? { session_id: sessionId, client_id: clientId } : {}
  );

  const handleCreateNote = () => {
    // Navigate to coach notes with pre-filled session and client context
    const params = new URLSearchParams({
      sessionId,
      clientId,
      ...(clientName && { clientName })
    });
    navigate(`/coach/notes?${params.toString()}`);
  };

  const handleViewAllNotes = () => {
    // Navigate to coach notes filtered by this client
    navigate(`/coach/notes?clientId=${clientId}`);
  };

  const handleViewNote = (noteId: string) => {
    navigate(`/coach/notes?noteId=${noteId}`);
  };

  if (!isCoach) {
    return null; // Only show for coaches
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('common.loading')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Session Notes
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCreateNote}
              size="sm"
              className="bg-lumea-primary hover:bg-lumea-primary-dark"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
            {notes.length > 0 && (
              <Button
                onClick={handleViewAllNotes}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View All
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-red-600 text-sm mb-4">
            {error.message || 'Failed to load notes'}
          </div>
        )}
        
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">
              No notes for this session yet.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Click "Add Note" to create your first session note.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.slice(0, 3).map((note) => (
              <div
                key={note.id}
                className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleViewNote(note.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm line-clamp-1">
                    {note.title}
                  </h4>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {note.content}
                </p>
                
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {note.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{note.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {notes.length > 3 && (
              <Button
                onClick={handleViewAllNotes}
                variant="ghost"
                size="sm"
                className="w-full mt-2"
              >
                View all {notes.length} notes
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 