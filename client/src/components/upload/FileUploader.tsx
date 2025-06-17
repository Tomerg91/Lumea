import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { useToast } from '../ui/use-toast';
import { 
  useSupabaseStorage, 
  useImageStorage, 
  useDocumentStorage,
  FileContext,
  FileUploadOptions 
} from '../../hooks/useSupabaseStorage';
import { 
  Upload, 
  X, 
  File, 
  Image as ImageIcon, 
  FileText, 
  Download,
  Eye,
  Trash2
} from 'lucide-react';

// File type configurations
export const FILE_TYPES = {
  IMAGES: {
    accept: 'image/*',
    maxSize: 10 * 1024 * 1024, // 10MB
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    icon: ImageIcon,
    context: 'profile' as FileContext
  },
  DOCUMENTS: {
    accept: '.pdf,.doc,.docx,.txt,.rtf,.odt',
    maxSize: 25 * 1024 * 1024, // 25MB
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
    icon: FileText,
    context: 'document' as FileContext
  },
  AUDIO: {
    accept: 'audio/*',
    maxSize: 50 * 1024 * 1024, // 50MB
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.webm'],
    icon: File,
    context: 'audio_note' as FileContext
  },
  ALL: {
    accept: '*/*',
    maxSize: 100 * 1024 * 1024, // 100MB
    extensions: [],
    icon: File,
    context: 'document' as FileContext
  }
} as const;

export type FileType = keyof typeof FILE_TYPES;

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  supabaseResult?: any;
}

export interface FileUploaderProps {
  fileType?: FileType;
  multiple?: boolean;
  maxFiles?: number;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
  allowRemove?: boolean;
  customUploadOptions?: FileUploadOptions;
  placeholder?: string;
  description?: string;
  // Storage configuration
  storageFolder?: string;
  autoUpload?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  fileType = 'ALL',
  multiple = false,
  maxFiles = 1,
  onUploadComplete,
  onUploadError,
  className = '',
  disabled = false,
  showPreview = true,
  allowRemove = true,
  customUploadOptions,
  placeholder,
  description,
  storageFolder,
  autoUpload = true
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Get appropriate storage hook based on file type
  const imageStorage = useImageStorage();
  const documentStorage = useDocumentStorage();
  const generalStorage = useSupabaseStorage();
  
  const getStorageHook = () => {
    switch (fileType) {
      case 'IMAGES':
        return imageStorage;
      case 'DOCUMENTS':
        return documentStorage;
      default:
        return generalStorage;
    }
  };
  
  const storage = getStorageHook();
  
  // State management
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Get file type configuration
  const fileConfig = FILE_TYPES[fileType];
  
  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > fileConfig.maxSize) {
      return t('fileUploader.errors.fileTooLarge', {
        maxSize: (fileConfig.maxSize / 1024 / 1024).toFixed(1)
      });
    }
    
    // Check file extension if specified
    if (fileConfig.extensions.length > 0) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!fileConfig.extensions.includes(extension)) {
        return t('fileUploader.errors.invalidFileType', {
          allowedTypes: fileConfig.extensions.join(', ')
        });
      }
    }
    
    return null;
  }, [fileConfig, t]);
  
  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    // Check max files limit
    const totalFiles = selectedFiles.length + uploadedFiles.length + fileArray.length;
    if (totalFiles > maxFiles) {
      errors.push(t('fileUploader.errors.tooManyFiles', { maxFiles }));
    }
    
    // Validate each file
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });
    
    // Show errors if any
    if (errors.length > 0) {
      const errorMessage = errors.join('\n');
      toast({
        title: t('fileUploader.validationErrors', 'File validation errors'),
        description: errorMessage,
        variant: 'destructive',
      });
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
    
    // Add valid files
    if (validFiles.length > 0) {
      const newFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles;
      setSelectedFiles(newFiles.slice(0, maxFiles - uploadedFiles.length));
      
      // Generate preview URLs for images
      if (fileType === 'IMAGES' && showPreview) {
        validFiles.forEach(file => {
          if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPreviewUrls(prev => ({ ...prev, [file.name]: url }));
          }
        });
      }
      
      // Auto-upload if enabled
      if (autoUpload) {
        handleUpload(newFiles);
      }
    }
  }, [selectedFiles, uploadedFiles, maxFiles, multiple, validateFile, fileType, showPreview, autoUpload, t, toast, onUploadError]);
  
  // Handle upload
  const handleUpload = useCallback(async (filesToUpload: File[] = selectedFiles) => {
    if (filesToUpload.length === 0) return;
    
    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const uploadOptions: FileUploadOptions = {
          folder: storageFolder,
          ...customUploadOptions,
        };
        
        const result = await storage.uploadFile({
          file,
          context: fileConfig.context,
          options: uploadOptions
        });
        
        return {
          id: result.id || file.name + Date.now(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: result.publicUrl || URL.createObjectURL(file),
          uploadedAt: new Date().toISOString(),
          supabaseResult: result
        };
      });
      
      const results = await Promise.all(uploadPromises);
      
      // Update state
      setUploadedFiles(prev => [...prev, ...results]);
      setSelectedFiles([]);
      
      // Clean up preview URLs
      filesToUpload.forEach(file => {
        if (previewUrls[file.name]) {
          URL.revokeObjectURL(previewUrls[file.name]);
          setPreviewUrls(prev => {
            const updated = { ...prev };
            delete updated[file.name];
            return updated;
          });
        }
      });
      
      // Notify completion
      if (onUploadComplete) {
        onUploadComplete(results);
      }
      
      toast({
        title: t('fileUploader.uploadSuccess', 'Upload successful'),
        description: t('fileUploader.uploadSuccessDescription', {
          count: results.length,
          files: results.length === 1 ? 'file' : 'files'
        }),
      });
      
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : t('fileUploader.uploadFailed');
      
      toast({
        title: t('fileUploader.uploadError', 'Upload failed'),
        description: errorMessage,
        variant: 'destructive',
      });
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  }, [selectedFiles, storage, fileConfig, storageFolder, customUploadOptions, previewUrls, onUploadComplete, onUploadError, t, toast]);
  
  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };
  
  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };
  
  // Remove selected file
  const removeSelectedFile = (index: number) => {
    const file = selectedFiles[index];
    if (previewUrls[file.name]) {
      URL.revokeObjectURL(previewUrls[file.name]);
      setPreviewUrls(prev => {
        const updated = { ...prev };
        delete updated[file.name];
        return updated;
      });
    }
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // Remove uploaded file
  const removeUploadedFile = async (index: number) => {
    const file = uploadedFiles[index];
    
    try {
      // Delete from Supabase if it was uploaded there
      if (file.supabaseResult) {
        await storage.deleteFile(file.supabaseResult.path);
      }
      
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
      
      toast({
        title: t('fileUploader.fileRemoved', 'File removed'),
        description: t('fileUploader.fileRemovedDescription', { fileName: file.name }),
      });
    } catch (error) {
      console.error('Failed to remove file:', error);
      toast({
        title: t('fileUploader.removeError', 'Failed to remove file'),
        description: error instanceof Error ? error.message : t('fileUploader.removeErrorDescription'),
        variant: 'destructive',
      });
    }
  };
  
  // Download file
  const downloadFile = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Get file icon
  const getFileIcon = (file: File | UploadedFile) => {
    const IconComponent = fileConfig.icon;
    return <IconComponent className="w-6 h-6" />;
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };
  
  // Clean up preview URLs on unmount
  React.useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);
  
  return (
    <div className={`file-uploader ${className}`}>
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragOver ? 'border-lumea-primary bg-lumea-primary/5' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={fileConfig.accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            {placeholder || t('fileUploader.dropFiles', 'Drop files here or click to browse')}
          </p>
          
          <p className="text-sm text-gray-600">
            {description || t('fileUploader.supportedFormats', {
              formats: fileConfig.extensions.length > 0 ? fileConfig.extensions.join(', ') : t('fileUploader.allFormats'),
              maxSize: (fileConfig.maxSize / 1024 / 1024).toFixed(1)
            })}
          </p>
          
          {multiple && (
            <p className="text-xs text-gray-500">
              {t('fileUploader.maxFiles', { maxFiles })}
            </p>
          )}
        </div>
      </div>
      
      {/* Upload Progress */}
      {storage.isUploading && storage.uploadProgress && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-900">
              {t('fileUploader.uploading', 'Uploading files...')}
            </span>
            <span className="text-blue-700">
              {storage.uploadProgress.percentage.toFixed(0)}%
            </span>
          </div>
          
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${storage.uploadProgress.percentage}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Upload Error */}
      {storage.uploadError && (
        <Alert variant="destructive" className="mt-4">
          <div className="space-y-2">
            <p className="font-medium">{t('fileUploader.uploadError', 'Upload failed')}</p>
            <p className="text-sm">
              {storage.uploadError instanceof Error ? storage.uploadError.message : storage.uploadError}
            </p>
          </div>
        </Alert>
      )}
      
      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t('fileUploader.selectedFiles', 'Selected Files')}
            </h3>
            {!autoUpload && (
              <Button
                onClick={() => handleUpload()}
                disabled={disabled || storage.isUploading}
                variant="lumea"
              >
                {storage.isUploading ? t('fileUploader.uploading') : t('fileUploader.upload', 'Upload')}
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 mr-3">
                  {fileType === 'IMAGES' && previewUrls[file.name] ? (
                    <img
                      src={previewUrls[file.name]}
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(file)
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                
                {allowRemove && (
                  <Button
                    onClick={() => removeSelectedFile(index)}
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('fileUploader.uploadedFiles', 'Uploaded Files')}
          </h3>
          
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={file.id} className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex-shrink-0 mr-3">
                  {fileType === 'IMAGES' && file.type.startsWith('image/') ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(file)
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)} • {t('fileUploader.uploaded')} {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                  {/* Preview/View Button */}
                  {(fileType === 'IMAGES' || file.type.startsWith('image/')) && (
                    <Button
                      onClick={() => window.open(file.url, '_blank')}
                      variant="ghost"
                      size="sm"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {/* Download Button */}
                  <Button
                    onClick={() => downloadFile(file)}
                    variant="ghost"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  
                  {/* Remove Button */}
                  {allowRemove && (
                    <Button
                      onClick={() => removeUploadedFile(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader; 