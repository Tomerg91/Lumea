import React, { useState, useCallback } from 'react';
import { Camera, Share2, FileText, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface DeviceIntegrationProps {
  onImageCapture?: (file: File) => void;
  onShare?: (data: ShareData) => void;
  onContactAdd?: (contact: any) => void;
  className?: string;
}

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

const DeviceIntegration: React.FC<DeviceIntegrationProps> = ({
  onImageCapture,
  onShare,
  onContactAdd,
  className
}) => {
  const [captureState, setCaptureState] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'success' | 'error'>('idle');

  // Camera capture functionality
  const captureImage = useCallback(async () => {
    setCaptureState('capturing');
    
    try {
      // Check if device supports camera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera for profile photos
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      ctx.drawImage(video, 0, 0);

      // Stop camera stream
      stream.getTracks().forEach(track => track.stop());

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.8);
      });

      // Create file from blob
      const file = new File([blob], `profile-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      setCaptureState('success');
      onImageCapture?.(file);

      // Reset state after delay
      setTimeout(() => setCaptureState('idle'), 2000);

    } catch (error) {
      console.error('Image capture failed:', error);
      setCaptureState('error');
      
      // Reset state after delay
      setTimeout(() => setCaptureState('idle'), 3000);
    }
  }, [onImageCapture]);

  // Alternative file input for image selection
  const selectImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user'; // Prefer camera on mobile
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImageCapture?.(file);
      }
    };
    
    input.click();
  }, [onImageCapture]);

  // Native share functionality
  const shareContent = useCallback(async (data: ShareData) => {
    setShareState('sharing');
    
    try {
      // Check if Web Share API is supported
      if (navigator.share) {
        await navigator.share(data);
        setShareState('success');
      } else {
        // Fallback to clipboard or manual sharing
        if (data.url) {
          await navigator.clipboard.writeText(data.url);
          setShareState('success');
          
          // Show toast notification
          alert('Link copied to clipboard!');
        } else {
          throw new Error('Share not supported and no URL to copy');
        }
      }

      onShare?.(data);
      
      // Reset state after delay
      setTimeout(() => setShareState('idle'), 2000);

    } catch (error) {
      console.error('Share failed:', error);
      setShareState('error');
      
      // Reset state after delay
      setTimeout(() => setShareState('idle'), 3000);
    }
  }, [onShare]);

  // Contact integration (simplified)
  const addContact = useCallback(async (contactData: any) => {
    try {
      // This would integrate with the device's contact app
      // For now, we'll just trigger the callback
      onContactAdd?.(contactData);
      
      // Show success message
      alert('Contact information prepared for adding');
      
    } catch (error) {
      console.error('Contact add failed:', error);
    }
  }, [onContactAdd]);

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Camera Integration */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Camera className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Camera Access</h3>
              <p className="text-xs text-gray-500">Take photos for profile or session notes</p>
            </div>
          </div>
          {getStateIcon(captureState)}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={captureImage}
            disabled={captureState === 'capturing'}
            className={cn(
              'flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
              captureState === 'capturing'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            <Camera className="w-4 h-4" />
            <span>{captureState === 'capturing' ? 'Capturing...' : 'Take Photo'}</span>
          </button>
          
          <button
            onClick={selectImage}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
          >
            <FileText className="w-4 h-4" />
            <span>Choose File</span>
          </button>
        </div>
      </div>

      {/* Share Integration */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Share2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Native Sharing</h3>
              <p className="text-xs text-gray-500">Share sessions or reflections</p>
            </div>
          </div>
          {getStateIcon(shareState)}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => shareContent({
              title: 'Lumea Coaching Session',
              text: 'Check out this coaching session summary',
              url: window.location.href
            })}
            disabled={shareState === 'sharing'}
            className={cn(
              'flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
              shareState === 'sharing'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            )}
          >
            <Share2 className="w-4 h-4" />
            <span>{shareState === 'sharing' ? 'Sharing...' : 'Share Page'}</span>
          </button>
        </div>
      </div>

      {/* Contact Integration */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Contact Integration</h3>
              <p className="text-xs text-gray-500">Quick access to client information</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => addContact({
            name: 'Coach Contact',
            phone: '+1234567890',
            email: 'coach@lumea.app'
          })}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-purple-700 border border-purple-300 hover:bg-purple-50 transition-colors duration-200"
        >
          <Users className="w-4 h-4" />
          <span>Add Coach Contact</span>
        </button>
      </div>

      {/* Feature Support Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700">
            <p className="font-medium mb-1">Device Integration Features</p>
            <ul className="space-y-0.5 text-amber-600">
              <li>• Camera: Works on devices with camera access</li>
              <li>• Sharing: Supported on modern browsers</li>
              <li>• Contacts: Limited support, varies by device</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceIntegration; 