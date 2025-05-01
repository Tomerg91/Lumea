import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { Request } from 'express';

// Initialize S3 client if AWS credentials are provided
const s3Client =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      })
    : null;

// File filter to accept only specific file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, audio files, and documents are allowed.'));
  }
};

// Configure storage based on environment
const storage = s3Client
  ? multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET || 'satya-coaching-files',
      metadata: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: any, metadata?: any) => void
      ) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (req: Request, file: Express.Multer.File, cb: (error: any, key?: string) => void) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}`);
      },
    })
  : multer.memoryStorage();

// Create multer instance with configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export default upload;
