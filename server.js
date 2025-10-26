const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const aiRoutes = require('./routes/ai');
const deploymentRoutes = require('./routes/deployment');
const collaborationRoutes = require('./routes/collaboration');
const databaseRoutes = require('./routes/database');
const apiRoutes = require('./routes/api');
const testingRoutes = require('./routes/testing');
const monitoringRoutes = require('./routes/monitoring');

const { connectDB } = require('./config/database');
const { initializeRedis } = require('./config/redis');
const { setupWebSocket } = require('./config/websocket');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Database and Redis connections
connectDB();
initializeRedis();

// WebSocket setup
setupWebSocket(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/deployment', authenticateToken, deploymentRoutes);
app.use('/api/collaboration', authenticateToken, collaborationRoutes);
app.use('/api/database', authenticateToken, databaseRoutes);
app.use('/api/api-management', authenticateToken, apiRoutes);
app.use('/api/testing', authenticateToken, testingRoutes);
app.use('/api/monitoring', authenticateToken, monitoringRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    services: {
      database: 'connected',
      redis: 'connected',
      websocket: 'active'
    }
  });
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Pythagora AI Platform v2.0.0 running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Access the platform at: http://localhost:${PORT}`);
});

module.exports = { app, server, io };