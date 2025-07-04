import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import upload from '../config/multer';
import { fileController } from '../controllers/fileController';

const router = express.Router();

// Upload a single file
router.post('/upload', isAuthenticated, upload.single('file'), fileController.uploadFile);

// Upload multiple files
router.post(
  '/upload-multiple',
  isAuthenticated,
  upload.array('files', 10),
  fileController.uploadMultipleFiles
);

// Get a specific file
router.get('/:id', isAuthenticated, fileController.getFile);

// Get files by context
router.get('/user/:context', isAuthenticated, fileController.getFilesByContext);

// Delete a file
router.delete('/:id', isAuthenticated, fileController.deleteFile);

export default router;
