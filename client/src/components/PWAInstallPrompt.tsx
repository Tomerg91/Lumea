import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Smartphone, Monitor, Share, Plus } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { cn } from '../lib/utils';

interface PWAInstallPromptProps {
  onClose?: () => void;
  showIfInstallable?: boolean;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onClose,
  showIfInstallable = true
}) => {
  const { t } = useTranslation();
  const { isInstallable, isInstalled, install } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [userAgent, setUserAgent] = useState('');

  useEffect(() => {
    setUserAgent(navigator.userAgent);
    
    // Show prompt if installable and not already installed
    if (showIfInstallable && isInstallable && !isInstalled) {
      // Delay showing prompt to avoid interrupting user
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, showIfInstallable]);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const success = await install();
      if (success) {
        setIsVisible(false);
        onClose?.();
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const getDeviceInstructions = () => {
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('iphone') || ua.includes('ipad')) {
      return {
        device: 'iOS',
        icon: <Share className="w-5 h-5" />,
        steps: [
          'Tap the Share button at the bottom of the screen',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to install Lumea'
        ]
      };
    } else if (ua.includes('android')) {
      return {
        device: 'Android',
        icon: <Plus className="w-5 h-5" />,
        steps: [
          'Tap the menu button (three dots) in your browser',
          'Select "Add to Home screen" or "Install app"',
          'Confirm installation'
        ]
      };
    } else {
      return {
        device: 'Desktop',
        icon: <Download className="w-5 h-5" />,
        steps: [
          'Click the install button in your browser\'s address bar',
          'Or use the install button below',
          'Follow the browser prompts to install'
        ]
      };
    }
  };

  // Don't render if not visible or already installed
  if (!isVisible || isInstalled || !isInstallable) {
    return null;
  }

  const instructions = getDeviceInstructions();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Smartphone className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Install Lumea
              </h3>
              <p className="text-sm text-gray-500">
                Get the full app experience
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Benefits */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Why install Lumea?
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                <span>Works offline for viewing sessions and reflections</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                <span>Faster loading and native app experience</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                <span>Push notifications for session reminders</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                <span>No browser tabs - dedicated app icon</span>
              </div>
            </div>
          </div>

          {/* Install Instructions */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              {instructions.icon}
              <h4 className="text-sm font-medium text-gray-900">
                Install on {instructions.device}
              </h4>
            </div>
            
            <ol className="space-y-2">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start space-x-3 text-sm text-gray-600">
                  <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Direct Install Button (for supported browsers) */}
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className={cn(
                'w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200',
                isInstalling
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
              )}
            >
              <Download className={cn(
                'w-5 h-5',
                isInstalling ? 'animate-spin' : ''
              )} />
              <span>
                {isInstalling ? 'Installing...' : 'Install Now'}
              </span>
            </button>

            {/* Alternative Action */}
            <button
              onClick={handleClose}
              className="w-full px-6 py-3 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
            >
              Maybe Later
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-400 text-center mt-4">
            Lumea respects your privacy and works offline. 
            No data is shared without your permission.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt; 