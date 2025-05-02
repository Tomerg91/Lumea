import { Express, Request, Response } from 'express';
import { storage } from '../storage';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Create uploads directory if it doesn't exist
const uploadDir = path.resolve('./uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for storage
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueFilename);
  },
});

// Filter to accept only audio files
const audioFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'));
  }
};

// Create multer upload middleware
const upload = multer({
  storage: audioStorage,
  fileFilter: audioFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

export function registerAudioRoutes(app: Express) {
  // Upload audio file
  app.post('/api/audio/upload', upload.single('audio'), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const filePath = `/uploads/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      filePath,
    });
  });

  // Update reflection with audio entry
  app.post('/api/reflections/:id/audio', async (req: Request, res: Response) => {
    try {
      const reflectionId = parseInt(req.params.id);
      const { audioPath } = req.body;

      if (!audioPath) {
        return res.status(400).json({ error: 'No audio path provided' });
      }

      const reflection = await storage.getReflectionById(reflectionId);
      if (!reflection) {
        return res.status(404).json({ error: 'Reflection not found' });
      }

      // Check if the user owns this reflection
      if (req.user && reflection.clientId.toString() === req.user.id.toString()) {
        const updatedReflection = await storage.updateReflection(reflectionId, {
          audioEntry: audioPath,
        });

        return res.status(200).json(updatedReflection);
      } else {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } catch (error) {
      console.error('Error updating reflection with audio:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  // Update session with audio notes
  app.post('/api/sessions/:id/audio', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { audioPath } = req.body;

      if (!audioPath) {
        return res.status(400).json({ error: 'No audio path provided' });
      }

      const session = await storage.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check if the user is the coach of this session
      if (req.user && session.coachId.toString() === req.user.id.toString()) {
        const updatedSession = await storage.updateSession(sessionId, {
          audioNotes: audioPath,
        });

        return res.status(200).json(updatedSession);
      } else {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } catch (error) {
      console.error('Error updating session with audio:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  // Serve audio files
  app.get('/uploads/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    res.sendFile(filePath);
  });
}
