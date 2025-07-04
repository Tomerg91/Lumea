import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Mock endpoints for the frontend

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'Mock server is running' });
});

// Notifications endpoints
app.get('/api/notifications', (req, res) => {
  res.json([]);
});

app.get('/api/notifications/unread-count', (req, res) => {
  res.json({ count: 0 });
});

// User endpoints
app.get('/api/users/profile', (req, res) => {
  res.json({
    id: 'mock-user-123',
    email: 'user@example.com',
    name: 'Mock User',
    role: 'client'
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 'mock-user-123',
      email: 'user@example.com',
      name: 'Mock User',
      role: 'client'
    },
    token: 'mock-jwt-token'
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// Daily intentions endpoints
app.get('/api/daily-intentions', (req, res) => {
  res.json([]);
});

app.post('/api/daily-intentions', (req, res) => {
  res.json({ 
    success: true, 
    intention: { 
      id: 'mock-intention-' + Date.now(),
      ...req.body,
      createdAt: new Date()
    }
  });
});

// Sessions endpoints
app.get('/api/sessions', (req, res) => {
  res.json([]);
});

// Performance metrics endpoints (both GET and POST)
app.get('/api/metrics/performance', (req, res) => {
  res.json({ 
    performance: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/metrics/performance', (req, res) => {
  console.log('📊 Performance metrics received:', req.body);
  res.json({ 
    success: true,
    message: 'Performance metrics logged',
    timestamp: new Date().toISOString()
  });
});

// Catch-all for unhandled routes
app.use('*', (req, res) => {
  console.log(`Mock server: Unhandled ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Not found', 
    message: `Mock endpoint for ${req.method} ${req.originalUrl} not implemented`,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🎭 Mock server running on http://localhost:${port}`);
  console.log(`🔄 Handling API calls for frontend development`);
}); 