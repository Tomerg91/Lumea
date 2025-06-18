import { useState, useEffect, useCallback } from "react";
import { Capacitor } from '@capacitor/core';

// Basic types for native features
export interface DeviceInfo {
  platform: string;
  model: string;
  operatingSystem: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
}

export interface NativeFeatures {
  deviceInfo: DeviceInfo | null;
  isNative: boolean;
  platform: string;
  vibrate: (duration?: number) => Promise<void>;
  impact: (style?: 'light' | 'medium' | 'heavy') => Promise<void>;
  getDeviceInfo: () => Promise<DeviceInfo | null>;
}

export const useNativeFeatures = (): NativeFeatures => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const getDeviceInfo = useCallback(async (): Promise<DeviceInfo | null> => {
    try {
      const webDeviceInfo: DeviceInfo = {
        platform: 'web',
        model: 'Unknown',
        operatingSystem: navigator.platform,
        osVersion: 'Unknown',
        manufacturer: 'Unknown',
        isVirtual: false
      };
      
      setDeviceInfo(webDeviceInfo);
      return webDeviceInfo;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }, []);

  const vibrate = useCallback(async (duration: number = 100): Promise<void> => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(duration);
      }
    } catch (error) {
      console.error('Error vibrating:', error);
    }
  }, []);

  const impact = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> => {
    try {
      const durationMap = { light: 50, medium: 100, heavy: 200 };
      if (navigator.vibrate) {
        navigator.vibrate(durationMap[style]);
      }
    } catch (error) {
      console.error('Error with haptic impact:', error);
    }
  }, []);

  useEffect(() => {
    getDeviceInfo();
  }, [getDeviceInfo]);

  return {
    deviceInfo,
    isNative,
    platform,
    vibrate,
    impact,
    getDeviceInfo
  };
};
