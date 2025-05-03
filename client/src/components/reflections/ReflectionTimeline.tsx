import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Mic, Loader2, AlertCircle, WifiOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getEncryptionKey } from '../../utils/indexedDB';
import { Encryption } from '../../utils/encryption';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

// Define the Reflection interface here instead of importing it
interface Reflection {
  id: string;
  sessionId: string;
  text: string;
  audioUrl?: string;
  createdAt: string;
  isOffline?: boolean;
  encryptionMetadata?: {
    version: string;
    algorithm: string;
    [key: string]: string;
  };
}

interface ReflectionTimelineProps {
  sessionId: string;
  onAddReflection?: () => void;
}

export default function ReflectionTimeline({
  sessionId,
  onAddReflection,
}: ReflectionTimelineProps) {
  const { t } = useTranslation();

  // Fetch reflections for the session
  const { data, status, error } = useQuery<Reflection[]>(
    ['reflections', sessionId],
    async () => {
      const response = await fetch(`/api/reflections?sessionId=${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reflections');
      }
      return response.json();
    }
  );

  // Derived loading and error states
  const isLoading = status === 'loading';
  const isError = status === 'error';

  // Group reflections by date
  const reflectionsByDate = useMemo(() => {
    if (!data) return {};

    // Cast to ensure TypeScript recognizes array methods
    const reflectionsArray = data as Reflection[];
    
    return reflectionsArray.reduce<Record<string, Reflection[]>>((acc, reflection) => {
      const date = format(parseISO(reflection.createdAt), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(reflection);
      return acc;
    }, {});
  }, [data]);

  // Handle audio playback
  const playAudio = async (reflection: Reflection) => {
    try {
      if (!reflection.audioUrl) return;

      // Initialize the encryption library
      await Encryption.init();

      // Fetch the encryption key from IndexedDB
      const encryptionKey = await getEncryptionKey(reflection.id);
      if (!encryptionKey) {
        console.error('No encryption key found for reflection', reflection.id);
        return;
      }

      // For offline reflections, use the stored URL directly
      if (reflection.isOffline) {
        const audio = new Audio(reflection.audioUrl);
        audio.play();
        return;
      }

      // For online reflections, fetch the audio, decrypt it, and play it
      const response = await fetch(reflection.audioUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch audio');
      }

      const encryptedBlob = await response.blob();
      const decryptedBlob = await Encryption.decryptFile(encryptedBlob, encryptionKey);

      const objectUrl = URL.createObjectURL(decryptedBlob);
      const audio = new Audio(objectUrl);

      // Clean up object URL when playback ends
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(objectUrl);
      });

      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  // Display loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">{t('common.loading', 'Loading...')}</span>
      </div>
    );
  }

  // Display error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-destructive">
        <AlertCircle className="h-10 w-10 mb-2" />
        <p className="text-lg font-medium">
          {t('errors.failedToLoad', 'Failed to load reflections')}
        </p>
        <p className="text-sm">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  }

  // Display empty state
  if (!data || (data as Reflection[]).length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('reflections.timeline', 'Reflection Timeline')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground mb-4">
            {t('reflections.noReflections', 'No reflections have been added yet.')}
          </p>
          {onAddReflection && (
            <Button onClick={onAddReflection}>
              {t('reflections.addReflection', 'Add Reflection')}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Cast data to array type for TypeScript
  const reflectionsArray = data as Reflection[];

  // Display timeline
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('reflections.timeline', 'Reflection Timeline')}</CardTitle>
        {onAddReflection && (
          <Button onClick={onAddReflection} size="sm">
            {t('reflections.addReflection', 'Add Reflection')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {Object.entries(reflectionsByDate)
            .sort((a, b) => (a[0] > b[0] ? -1 : 1)) // Sort dates in descending order
            .map(([date, reflections]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <h3 className="text-sm font-medium">
                    {format(parseISO(date), 'PPPP')}
                  </h3>
                </div>

                <div className="space-y-4 pl-6 border-l">
                  {reflections
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .map((reflection) => (
                      <div
                        key={reflection.id}
                        className="relative p-4 bg-card border rounded-md"
                      >
                        {/* Time indicator */}
                        <div className="absolute left-0 w-3 h-3 bg-primary rounded-full -translate-x-[calc(0.5rem+1.5px)]" />

                        {/* Offline badge */}
                        {reflection.isOffline && (
                          <Badge variant="outline" className="absolute top-2 right-2">
                            <WifiOff className="h-3 w-3 mr-1" />
                            {t('common.offline', 'Offline')}
                          </Badge>
                        )}

                        {/* Time */}
                        <div className="text-xs text-muted-foreground mb-2">
                          {format(parseISO(reflection.createdAt), 'p')}
                        </div>

                        {/* Text content */}
                        {reflection.text && (
                          <div className="mt-2 whitespace-pre-wrap text-sm">
                            {reflection.text}
                          </div>
                        )}

                        {/* Audio */}
                        {reflection.audioUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => playAudio(reflection)}
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            {t('reflections.playAudio', 'Play Audio')}
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
} 