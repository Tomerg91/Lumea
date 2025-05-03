import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'satya-coaching-files';
const EXPIRATION_TIME = 3600; // URL valid for 1 hour (in seconds)
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB max file size

// Allowed audio MIME types
const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/aac',
];

/**
 * Generate a presigned URL for uploading audio to S3
 * 
 * @param {string} userId - User ID for path construction
 * @param {string} mimeType - The MIME type of the audio file
 * @param {number} fileSize - Size of the file in bytes
 * @returns {Promise<{ presignedUrl: string, objectKey: string }>} - The presigned URL and S3 object key
 * @throws {Error} - If the MIME type is not allowed or file size exceeds limit
 */
export async function getPresignedAudioUploadUrl(
  userId: string,
  mimeType: string,
  fileSize: number
): Promise<{ presignedUrl: string; objectKey: string }> {
  // Validate MIME type
  if (!ALLOWED_AUDIO_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported file type. Allowed types: ${ALLOWED_AUDIO_MIME_TYPES.join(', ')}`);
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Generate a unique key for the file
  const uniqueId = uuidv4();
  const objectKey = `reflections/${userId}/${uniqueId}`;

  // Create the presigned URL
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    ContentType: mimeType,
  });

  try {
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: EXPIRATION_TIME,
    });

    return {
      presignedUrl,
      objectKey,
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate upload URL');
  }
} 