import { Router } from 'express';
import { verifyGoogleToken, verifyFacebookToken, handleOAuthLogin } from '../services/oauth.js';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

// Google OAuth route
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    const userData = await verifyGoogleToken(token);
    const user = await handleOAuthLogin('google', userData.email ?? '', userData.name ?? '', userData.picture ?? '');

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Facebook OAuth route
router.post('/facebook', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    const userData = await verifyFacebookToken(token);
    const user = await handleOAuthLogin('facebook', userData.email, userData.name, userData.picture);

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router; 