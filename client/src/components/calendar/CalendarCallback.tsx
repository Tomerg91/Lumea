import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const CalendarCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const provider = searchParams.get('provider') || 'google';

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for tokens
        const response = await fetch(`/api/calendar/auth/${provider}/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ code, state })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to connect calendar');
        }

        const data = await response.json();
        
        setStatus('success');
        setMessage(`Successfully connected ${data.calendarName || 'calendar'}`);
        
        toast({
          title: 'Calendar Connected',
          description: `Your ${provider} calendar has been successfully connected`,
        });

        // Redirect to settings after a short delay
        setTimeout(() => {
          navigate('/settings?tab=calendar');
        }, 2000);

      } catch (error) {
        console.error('Calendar callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to connect calendar');
        
        toast({
          title: 'Connection Failed',
          description: 'Failed to connect your calendar. Please try again.',
          variant: 'destructive'
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  const handleRetry = () => {
    navigate('/settings?tab=calendar');
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'processing' && <RefreshCw className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
            Calendar Integration
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Connecting your calendar...'}
            {status === 'success' && 'Calendar connected successfully!'}
            {status === 'error' && 'Connection failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'processing' && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Please wait while we connect your calendar...
              </p>
            </div>
          )}

          {status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {message}. You will be redirected to settings shortly.
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleRetry}
                className="w-full"
              >
                Back to Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 