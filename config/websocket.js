const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const setupWebSocket = (io) => {
  // Authentication middleware for WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      // Verify JWT token here
      // For now, we'll accept any token
      socket.userId = token;
      next();
    } else {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Handle project collaboration
    socket.on('join_project', (projectId) => {
      socket.join(`project_${projectId}`);
      logger.info(`User ${socket.userId} joined project ${projectId}`);
      
      // Notify other users in the project
      socket.to(`project_${projectId}`).emit('user_joined', {
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('leave_project', (projectId) => {
      socket.leave(`project_${projectId}`);
      logger.info(`User ${socket.userId} left project ${projectId}`);
      
      socket.to(`project_${projectId}`).emit('user_left', {
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle real-time code editing
    socket.on('code_change', (data) => {
      const { projectId, filePath, changes, userId } = data;
      
      // Broadcast changes to other users in the project
      socket.to(`project_${projectId}`).emit('code_updated', {
        filePath,
        changes,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle cursor position updates
    socket.on('cursor_update', (data) => {
      const { projectId, filePath, position, userId } = data;
      
      socket.to(`project_${projectId}`).emit('cursor_moved', {
        filePath,
        position,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle AI code generation requests
    socket.on('ai_generate', (data) => {
      const { projectId, prompt, context } = data;
      
      // Process AI generation request
      // This would integrate with your AI service
      socket.emit('ai_response', {
        projectId,
        generatedCode: '// AI generated code placeholder',
        timestamp: new Date().toISOString()
      });
    });

    // Handle deployment status updates
    socket.on('deployment_status', (data) => {
      const { projectId, status, logs } = data;
      
      socket.to(`project_${projectId}`).emit('deployment_update', {
        projectId,
        status,
        logs,
        timestamp: new Date().toISOString()
      });
    });

    // Handle testing updates
    socket.on('test_results', (data) => {
      const { projectId, results } = data;
      
      socket.to(`project_${projectId}`).emit('tests_updated', {
        projectId,
        results,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  return io;
};

module.exports = { setupWebSocket };