declare module '@capacitor/filesystem' {
  export interface FileSystemPlugin {
    writeFile(options: {
      path: string;
      data: string;
      directory: string;
      recursive?: boolean;
    }): Promise<{ uri: string }>;

    readFile(options: { path: string; directory: string }): Promise<{ data: string }>;

    deleteFile(options: { path: string; directory: string }): Promise<void>;

    mkdir(options: { path: string; directory: string; recursive?: boolean }): Promise<void>;

    // Add other methods as needed
  }

  export const Filesystem: FileSystemPlugin;

  export enum Directory {
    Cache = 'CACHE',
    Documents = 'DOCUMENTS',
    Data = 'DATA',
    External = 'EXTERNAL',
    ExternalStorage = 'EXTERNAL_STORAGE',
  }
}

declare module '@capacitor/core' {
  export const Capacitor: {
    isNativePlatform(): boolean;
    getPlatform(): 'ios' | 'android' | 'web';
  };

  export interface PermissionsPlugin {
    query(options: { name: string }): Promise<{ microphone: { state: string } }>;
    request(options: { name: string }): Promise<{ microphone: { state: string } }>;
  }

  export const Permissions: PermissionsPlugin;
}
