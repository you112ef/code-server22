const express = require('express');
const Project = require('../models/Project');

const router = express.Router();

// Get monitoring data for a project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { period = '24h' } = req.query;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Mock monitoring data
    const monitoring = {
      uptime: project.monitoring.uptime || 99.9,
      performance: {
        averageResponseTime: project.monitoring.performance?.averageResponseTime || 245,
        requestsPerMinute: project.monitoring.performance?.requestsPerMinute || 1250,
        errorRate: project.monitoring.performance?.errorRate || 0.1
      },
      metrics: {
        cpu: {
          current: 45,
          average: 42,
          peak: 78
        },
        memory: {
          current: 512,
          average: 498,
          peak: 756
        },
        disk: {
          used: 2.5,
          total: 10,
          percentage: 25
        }
      },
      alerts: [
        {
          id: 'alert_1',
          type: 'warning',
          message: 'High CPU usage detected',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          resolved: false
        },
        {
          id: 'alert_2',
          type: 'info',
          message: 'Deployment completed successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          resolved: true
        }
      ],
      logs: [
        {
          id: 'log_1',
          level: 'info',
          message: 'User authentication successful',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          source: 'auth-service'
        },
        {
          id: 'log_2',
          level: 'error',
          message: 'Database connection failed',
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          source: 'database'
        },
        {
          id: 'log_3',
          level: 'warning',
          message: 'API rate limit approaching',
          timestamp: new Date(Date.now() - 1000 * 60 * 25),
          source: 'api-gateway'
        }
      ]
    };

    res.json({
      success: true,
      data: { monitoring }
    });

  } catch (error) {
    console.error('Get monitoring data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring data'
    });
  }
});

// Get performance metrics
router.get('/:projectId/performance', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { timeframe = '1h' } = req.query;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Mock performance data
    const performance = {
      responseTime: {
        current: 245,
        average: 198,
        p95: 450,
        p99: 890,
        history: Array.from({ length: 24 }, (_, i) => ({
          timestamp: new Date(Date.now() - (23 - i) * 1000 * 60 * 5),
          value: 200 + Math.random() * 100
        }))
      },
      throughput: {
        current: 1250,
        average: 1180,
        peak: 2100,
        history: Array.from({ length: 24 }, (_, i) => ({
          timestamp: new Date(Date.now() - (23 - i) * 1000 * 60 * 5),
          value: 1000 + Math.random() * 500
        }))
      },
      errorRate: {
        current: 0.1,
        average: 0.05,
        peak: 2.3,
        history: Array.from({ length: 24 }, (_, i) => ({
          timestamp: new Date(Date.now() - (23 - i) * 1000 * 60 * 5),
          value: Math.random() * 0.5
        }))
      }
    };

    res.json({
      success: true,
      data: { performance }
    });

  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics'
    });
  }
});

// Get error logs
router.get('/:projectId/logs', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { level, page = 1, limit = 50 } = req.query;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Mock log data
    const logs = Array.from({ length: 100 }, (_, i) => ({
      id: `log_${i + 1}`,
      level: ['error', 'warning', 'info', 'debug'][Math.floor(Math.random() * 4)],
      message: `Log message ${i + 1}`,
      timestamp: new Date(Date.now() - i * 1000 * 60),
      source: ['api', 'database', 'auth', 'frontend'][Math.floor(Math.random() * 4)],
      details: {
        userId: `user_${Math.floor(Math.random() * 100)}`,
        requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
        stackTrace: i % 3 === 0 ? 'Error stack trace...' : null
      }
    }));

    // Filter by level if specified
    const filteredLogs = level ? logs.filter(log => log.level === level) : logs;

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(filteredLogs.length / limit),
          total: filteredLogs.length
        }
      }
    });

  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get logs'
    });
  }
});

// Create monitoring alert
router.post('/:projectId/alerts', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { name, condition, threshold, enabled = true } = req.body;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Check if user has admin permissions
    const userRole = project.getUserRole(userId);
    if (!userRole || !['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create alerts'
      });
    }

    const alert = {
      id: `alert_${Date.now()}`,
      name,
      condition,
      threshold,
      enabled,
      createdAt: new Date()
    };

    res.json({
      success: true,
      message: 'Alert created successfully',
      data: { alert }
    });

  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert'
    });
  }
});

module.exports = router;