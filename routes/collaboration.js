const express = require('express');
const Project = require('../models/Project');

const router = express.Router();

// Get active collaborators for a project
router.get('/:projectId/active', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // In a real implementation, you would track active users via WebSocket
    // For now, we'll return the project collaborators
    const activeUsers = project.collaborators.map(collab => ({
      userId: collab.user,
      role: collab.role,
      joinedAt: collab.joinedAt,
      isActive: true // This would be determined by WebSocket connection status
    }));

    res.json({
      success: true,
      data: { activeUsers }
    });

  } catch (error) {
    console.error('Get active collaborators error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active collaborators'
    });
  }
});

// Get collaboration history
router.get('/:projectId/history', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // In a real implementation, you would have a separate CollaborationHistory model
    // For now, we'll return mock data
    const history = [
      {
        id: '1',
        type: 'code_change',
        user: 'John Doe',
        action: 'Modified main.js',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        details: 'Updated the authentication logic'
      },
      {
        id: '2',
        type: 'file_added',
        user: 'Jane Smith',
        action: 'Added new component',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        details: 'Created UserProfile.jsx component'
      },
      {
        id: '3',
        type: 'ai_generation',
        user: 'AI Assistant',
        action: 'Generated code',
        timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
        details: 'Generated API endpoint for user management'
      }
    ];

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          current: parseInt(page),
          pages: 1,
          total: history.length
        }
      }
    });

  } catch (error) {
    console.error('Get collaboration history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get collaboration history'
    });
  }
});

// Share project link
router.post('/:projectId/share', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { permissions = 'viewer', expiresIn = 7 } = req.body;

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
        error: 'Insufficient permissions to share project'
      });
    }

    // Generate shareable link
    const shareToken = require('crypto').randomBytes(32).toString('hex');
    const shareUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/shared/${shareToken}`;
    
    // In a real implementation, you would store this in a database
    // For now, we'll return the URL directly
    const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      data: {
        shareUrl,
        permissions,
        expiresAt,
        shareToken
      }
    });

  } catch (error) {
    console.error('Share project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate share link'
    });
  }
});

// Get shared project
router.get('/shared/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // In a real implementation, you would look up the token in the database
    // For now, we'll return a mock response
    res.json({
      success: true,
      data: {
        project: {
          id: 'shared_project_id',
          name: 'Shared Project',
          description: 'This is a shared project',
          permissions: 'viewer'
        }
      }
    });

  } catch (error) {
    console.error('Get shared project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shared project'
    });
  }
});

module.exports = router;