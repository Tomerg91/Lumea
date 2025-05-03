import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Permissions } from '@capacitor/core';

/**
 * Check if the app is running on a native mobile platform (iOS/Android)
 * @returns {boolean} True if running on a native platform
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get the current platform
 * @returns {string} The current platform (ios, android, web)
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Request microphone permissions for recording audio
 * @returns {Promise<boolean>} Whether permission was granted
 */
export const requestMicrophonePermissions = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    return true; // On web, permissions are handled by the browser
  }

  try {
    const { microphone } = await Permissions.query({
      name: Capacitor.getPlatform() === 'ios' ? 'microphone' : 'android.permission.RECORD_AUDIO',
    });

    if (microphone.state === 'granted') {
      return true;
    }

    if (microphone.state === 'prompt') {
      const { microphone: micPermission } = await Permissions.request({
        name: Capacitor.getPlatform() === 'ios' ? 'microphone' : 'android.permission.RECORD_AUDIO',
      });
      return micPermission.state === 'granted';
    }

    return false;
  } catch (error) {
    console.error('Error requesting microphone permissions:', error);
    return false;
  }
};

/**
 * Save a blob to the filesystem (for mobile platforms)
 * @param {Blob} blob - The blob to save
 * @param {string} fileName - The name to give the file
 * @returns {Promise<string>} Path to the saved file
 */
export const saveBlobToFilesystem = async (blob: Blob, fileName: string): Promise<string> => {
  if (!isNativePlatform()) {
    return URL.createObjectURL(blob); // On web, just create an object URL
  }

  try {
    // Convert Blob to base64
    const base64Data = await blobToBase64(blob);

    // Save to filesystem
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });

    return result.uri;
  } catch (error) {
    console.error('Error saving blob to filesystem:', error);
    throw error;
  }
};

/**
 * Read a file from the filesystem (for mobile platforms)
 * @param {string} path - The path to the file
 * @returns {Promise<Blob>} The file as a Blob
 */
export const readFileFromFilesystem = async (path: string): Promise<Blob> => {
  if (!isNativePlatform() || path.startsWith('blob:')) {
    // On web or if it's already a blob URL, fetch the blob
    const response = await fetch(path);
    return response.blob();
  }

  try {
    // Read from filesystem
    const result = await Filesystem.readFile({
      path,
      directory: Directory.Cache,
    });

    // Convert base64 to Blob
    return base64ToBlob(result.data);
  } catch (error) {
    console.error('Error reading file from filesystem:', error);
    throw error;
  }
};

/**
 * Delete a file from the filesystem (for mobile platforms)
 * @param {string} path - The path to the file
 * @returns {Promise<void>}
 */
export const deleteFileFromFilesystem = async (path: string): Promise<void> => {
  if (!isNativePlatform() || path.startsWith('blob:')) {
    // On web or if it's a blob URL, revoke the object URL
    if (path.startsWith('blob:')) {
      URL.revokeObjectURL(path);
    }
    return;
  }

  try {
    await Filesystem.deleteFile({
      path,
      directory: Directory.Cache,
    });
  } catch (error) {
    console.error('Error deleting file from filesystem:', error);
    throw error;
  }
};

/**
 * Convert a Blob to base64
 * @param {Blob} blob - The blob to convert
 * @returns {Promise<string>} The base64 string
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:application/octet-stream;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert a base64 string to a Blob
 * @param {string} base64 - The base64 string
 * @param {string} mimeType - The MIME type of the Blob
 * @returns {Blob} The Blob
 */
const base64ToBlob = (base64: string, mimeType: string = 'application/octet-stream'): Blob => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}; 