import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { addToOfflineQueue, getOfflineQueue, removeFromOfflineQueue } from '../utils/indexedDB';
import { Encryption } from '../utils/encryption';
import { toast } from '../components/ui/use-toast';
import { useNetworkStatus } from './useNetworkStatus';

interface ReflectionData {
  sessionId: string;
  text?: string;
  audio?: {
    blob: Blob;
    mimeType: string;
    size: number;
  };
}

interface UseOfflineReflectionOptions {
  onSuccess?: (reflectionId: string) => void;
  onError?: (error: Error) => void;
}

export default function useOfflineReflection({
  onSuccess,
  onError,
}: UseOfflineReflectionOptions = {}) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  // Process the offline queue when back online
  useEffect(() => {
    let isProcessing = false;

    const processQueue = async () => {
      if (!isOnline || isProcessing) return;

      isProcessing = true;
      try {
        const queue = await getOfflineQueue();
        if (queue.length === 0) {
          isProcessing = false;
          return;
        }

        // Sort by timestamp (oldest first)
        queue.sort((a, b) => a.timestamp - b.timestamp);

        for (const item of queue) {
          try {
            const response = await fetch(item.url, {
              method: item.method,
              headers: item.headers || {
                'Content-Type': 'application/json',
              },
              body: item.body ? JSON.stringify(item.body) : undefined,
            });

            if (response.ok) {
              // Remove from queue
              await removeFromOfflineQueue(item.id!);
              
              // If it was a reflection, invalidate queries
              if (item.reflectionId) {
                queryClient.invalidateQueries({
                  queryKey: ['reflections']
                });
                queryClient.invalidateQueries({
                  queryKey: ['reflections', item.reflectionId]
                });
              }
              
              toast({
                title: t('success.offlineSync', 'Offline data synced'),
                description: t('success.offlineSyncDetail', 'Your offline data has been successfully synced to the server.'),
                variant: 'default',
              });
            } else {
              console.error('Error processing queue item:', response.statusText);
              // Keep in queue for retry
            }
          } catch (error) {
            console.error('Error processing queue item:', error);
            // Keep in queue for retry
          }
        }
      } catch (error) {
        console.error('Error processing offline queue:', error);
      } finally {
        isProcessing = false;
      }
    };

    if (isOnline) {
      processQueue();
    }

    return () => {
      isProcessing = false;
    };
  }, [isOnline, queryClient, t]);

  // Submit a reflection (handles both online and offline modes)
  const submitReflection = useCallback(
    async (data: ReflectionData) => {
      setIsSubmitting(true);

      try {
        await Encryption.init();

        // Create basic request data
        const requestData: any = {
          sessionId: data.sessionId,
          text: data.text,
        };

        // Handle audio if provided
        if (data.audio) {
          requestData.audio = {
            mimeType: data.audio.mimeType,
            size: data.audio.size,
          };

          // Generate encryption key
          const encryptionKey = Encryption.generateKey();

          // If we're online, submit normally
          if (isOnline) {
            // Step 1: Create reflection and get presigned URL
            const response = await fetch('/api/reflections', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestData),
            });

            if (!response.ok) {
              throw new Error(`Failed to create reflection: ${response.statusText}`);
            }

            const { reflectionId, presignedUrl } = await response.json();

            // Step 2: Encrypt audio
            const encryptedBlob = await Encryption.encryptFile(data.audio.blob, encryptionKey);

            // Step 3: Upload encrypted audio to S3
            const uploadResponse = await fetch(presignedUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': data.audio.mimeType,
              },
              body: encryptedBlob,
            });

            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload audio: ${uploadResponse.statusText}`);
            }

            // Step 4: Store encryption key
            await saveEncryptionKey(reflectionId, encryptionKey);

            // Success
            if (onSuccess) {
              onSuccess(reflectionId);
            }

            // Invalidate queries
            queryClient.invalidateQueries({
              queryKey: ['reflections']
            });
            queryClient.invalidateQueries({
              queryKey: ['reflections', reflectionId]
            });

            toast({
              title: t('success.reflectionSubmitted', 'Reflection submitted'),
              description: t('success.reflectionSubmittedDetail', 'Your reflection has been submitted successfully.'),
              variant: 'default',
            });
          } else {
            // We're offline, queue for later
            // Generate a temporary ID for the reflection
            const tempReflectionId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            // Encrypt the audio
            const encryptedBlob = await Encryption.encryptFile(data.audio.blob, encryptionKey);

            // Store the encrypted blob locally
            const offlineBlob = new Blob([encryptedBlob], { type: data.audio.mimeType });
            const offlineBlobUrl = URL.createObjectURL(offlineBlob);

            // Add to offline queue
            await addToOfflineQueue({
              url: '/api/reflections',
              method: 'POST',
              body: requestData,
              timestamp: Date.now(),
              reflectionId: tempReflectionId,
              headers: {
                'Content-Type': 'application/json',
              },
            });

            // Store the encryption key with temporary ID
            await saveEncryptionKey(tempReflectionId, encryptionKey);

            // Add blob URL to storage for local reference
            localStorage.setItem(`offline-reflection-audio-${tempReflectionId}`, offlineBlobUrl);

            // Add to optimistic updates
            addOptimisticReflection({
              id: tempReflectionId,
              sessionId: data.sessionId,
              text: data.text,
              audioUrl: offlineBlobUrl,
              isOffline: true,
              createdAt: new Date().toISOString(),
            });

            toast({
              title: t('success.reflectionQueued', 'Reflection queued'),
              description: t('success.reflectionQueuedDetail', 'Your reflection has been saved offline and will be synced when you reconnect.'),
              variant: 'default',
            });

            if (onSuccess) {
              onSuccess(tempReflectionId);
            }
          }
        } else {
          // No audio, just text
          if (isOnline) {
            // Submit reflection directly
            const response = await fetch('/api/reflections', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestData),
            });

            if (!response.ok) {
              throw new Error(`Failed to create reflection: ${response.statusText}`);
            }

            const { reflectionId } = await response.json();

            // Success
            if (onSuccess) {
              onSuccess(reflectionId);
            }

            // Invalidate queries
            queryClient.invalidateQueries({
              queryKey: ['reflections']
            });
            queryClient.invalidateQueries({
              queryKey: ['reflections', reflectionId]
            });

            toast({
              title: t('success.reflectionSubmitted', 'Reflection submitted'),
              description: t('success.reflectionSubmittedDetail', 'Your reflection has been submitted successfully.'),
              variant: 'default',
            });
          } else {
            // We're offline, queue for later
            // Generate a temporary ID for the reflection
            const tempReflectionId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            // Add to offline queue
            await addToOfflineQueue({
              url: '/api/reflections',
              method: 'POST',
              body: requestData,
              timestamp: Date.now(),
              reflectionId: tempReflectionId,
              headers: {
                'Content-Type': 'application/json',
              },
            });

            // Add to optimistic updates
            addOptimisticReflection({
              id: tempReflectionId,
              sessionId: data.sessionId,
              text: data.text,
              isOffline: true,
              createdAt: new Date().toISOString(),
            });

            toast({
              title: t('success.reflectionQueued', 'Reflection queued'),
              description: t('success.reflectionQueuedDetail', 'Your reflection has been saved offline and will be synced when you reconnect.'),
              variant: 'default',
            });

            if (onSuccess) {
              onSuccess(tempReflectionId);
            }
          }
        }
      } catch (error) {
        console.error('Error submitting reflection:', error);
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }

        toast({
          title: t('errors.reflectionFailed', 'Failed to submit reflection'),
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [isOnline, onSuccess, onError, queryClient, t]
  );

  // Helper function to save encryption key
  const saveEncryptionKey = useCallback(async (reflectionId: string, key: Uint8Array) => {
    try {
      const { saveEncryptionKey } = await import('../utils/indexedDB');
      await saveEncryptionKey(reflectionId, key);
    } catch (error) {
      console.error('Error saving encryption key:', error);
      throw new Error('Failed to save encryption key');
    }
  }, []);

  // Helper function to add optimistic updates
  const addOptimisticReflection = useCallback(
    (reflection: any) => {
      queryClient.setQueryData(['reflections'], (old: any[] = []) => {
        return [reflection, ...old];
      });

      queryClient.setQueryData(['reflections', reflection.sessionId], (old: any[] = []) => {
        return [reflection, ...old];
      });
    },
    [queryClient]
  );

  return {
    submitReflection,
    isSubmitting,
  };
} 