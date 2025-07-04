import { Router } from 'express';
import { audioController } from '../controllers/audioController';

const router = Router();

// Presigned URL endpoints
router.post('/presigned-url', audioController.getPresignedUploadUrl);

// File management endpoints  
router.post('/files', audioController.createFileRecord);
router.get('/files/:fileId', audioController.getAudioFile);
router.delete('/files/:fileId', audioController.deleteAudioFile);

// User's audio files
router.get('/files', audioController.getUserAudioFiles);

export default router; 