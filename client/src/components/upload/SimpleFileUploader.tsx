import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { useToast } from '../ui/use-toast';
import { useSupabaseStorage } from '../../hooks/useSupabaseStorage';
import { Upload, File, X } from 'lucide-react';

export interface SimpleFileUploaderProps {
  onUploadComplete?: (result: any) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
}

const SimpleFileUploader: React.FC<SimpleFileUploaderProps> = ({
  onUploadComplete,
  accept = '*/*',
  maxSize = 10 * 1024 * 1024, // 10MB
  className = ''
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { uploadFile, isUploading, uploadProgress } = useSupabaseStorage();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      const result = await uploadFile({
        file: selectedFile,
        context: 'document'
      });
      
      toast({
        title: 'Upload successful',
        description: 'File has been uploaded successfully',
      });
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
      
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">Click to select a file</p>
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={isUploading}
        >
          Select File
        </Button>
      </div>
      
      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <File className="w-4 h-4" />
            <span className="text-sm">{selectedFile.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              size="sm"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button
              onClick={() => setSelectedFile(null)}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      
      {isUploading && uploadProgress && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress.percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};

export { SimpleFileUploader };
export default SimpleFileUploader; 