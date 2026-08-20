/**
 * College Admission System - Backend Server
 * Handles email sending and serves frontend static files
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5503',
  'file://'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow null origin for file:// protocol
    if (origin === 'null') {
      return callback(null, true);
    }
    
    // Allow all localhost variations
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For any other origin, log but still allow (for development)
    console.warn(`⚠️  CORS request from: ${origin}`);
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE']
}));
app.options('*', cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));



// ─────────────────────────────────────────────
// Firebase config endpoint (mirrors Netlify function for local dev)
// ─────────────────────────────────────────────
app.get('/.netlify/functions/config', (req, res) => {
  const config = {
    apiKey:            process.env.FIREBASE_API_KEY            || '',
    authDomain:        process.env.FIREBASE_AUTH_DOMAIN        || '',
    projectId:         process.env.FIREBASE_PROJECT_ID         || '',
    storageBucket:     process.env.FIREBASE_STORAGE_BUCKET     || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID|| '',
    appId:             process.env.FIREBASE_APP_ID             || '',
    measurementId:     process.env.FIREBASE_MEASUREMENT_ID     || ''
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.json(config);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend server is running', timestamp: new Date().toISOString() });
});

// Catch-all route to serve index.html for SPA-like navigation
app.get('*', (req, res) => {
  // Don't serve files for /api routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n✅ College Admission System Backend Server`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`💊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📄 Frontend: http://localhost:${PORT}\n`);
});
