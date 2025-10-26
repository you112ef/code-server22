const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');

const router = express.Router();

// Get all APIs for a project
router.get('/:projectId', async (req, res) => {
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

    res.json({
      success: true,
      data: {
        apis: project.apis || []
      }
    });

  } catch (error) {
    console.error('Get APIs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get APIs'
    });
  }
});

// Create new API endpoint
router.post('/:projectId', [
  body('name').notEmpty().withMessage('API name is required'),
  body('endpoint').notEmpty().withMessage('Endpoint is required'),
  body('method').isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { projectId } = req.params;
    const userId = req.user.userId;
    const { name, endpoint, method, description, parameters = [], response } = req.body;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Check if user has editor permissions
    const userRole = project.getUserRole(userId);
    if (!userRole || !['owner', 'admin', 'editor'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create APIs'
      });
    }

    const newApi = {
      name,
      endpoint,
      method,
      description,
      parameters,
      response,
      createdAt: new Date()
    };

    project.apis.push(newApi);
    await project.save();

    res.status(201).json({
      success: true,
      message: 'API endpoint created successfully',
      data: { api: newApi }
    });

  } catch (error) {
    console.error('Create API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API endpoint'
    });
  }
});

// Update API endpoint
router.put('/:projectId/:apiId', [
  body('name').optional().notEmpty(),
  body('endpoint').optional().notEmpty(),
  body('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { projectId, apiId } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Check if user has editor permissions
    const userRole = project.getUserRole(userId);
    if (!userRole || !['owner', 'admin', 'editor'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to update APIs'
      });
    }

    const apiIndex = project.apis.findIndex(api => api._id.toString() === apiId);
    if (apiIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found'
      });
    }

    // Update API
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        project.apis[apiIndex][key] = updates[key];
      }
    });

    project.apis[apiIndex].updatedAt = new Date();
    await project.save();

    res.json({
      success: true,
      message: 'API endpoint updated successfully',
      data: { api: project.apis[apiIndex] }
    });

  } catch (error) {
    console.error('Update API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API endpoint'
    });
  }
});

// Delete API endpoint
router.delete('/:projectId/:apiId', async (req, res) => {
  try {
    const { projectId, apiId } = req.params;
    const userId = req.user.userId;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Check if user has editor permissions
    const userRole = project.getUserRole(userId);
    if (!userRole || !['owner', 'admin', 'editor'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to delete APIs'
      });
    }

    const apiIndex = project.apis.findIndex(api => api._id.toString() === apiId);
    if (apiIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found'
      });
    }

    project.apis.splice(apiIndex, 1);
    await project.save();

    res.json({
      success: true,
      message: 'API endpoint deleted successfully'
    });

  } catch (error) {
    console.error('Delete API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete API endpoint'
    });
  }
});

// Test API endpoint
router.post('/:projectId/:apiId/test', [
  body('method').isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  body('data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { projectId, apiId } = req.params;
    const userId = req.user.userId;
    const { method, data = {}, headers = {} } = req.body;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    const api = project.apis.find(api => api._id.toString() === apiId);
    if (!api) {
      return res.status(404).json({
        success: false,
        error: 'API endpoint not found'
      });
    }

    // In a real implementation, you would make an actual HTTP request
    // For now, we'll simulate a test response
    const testResponse = {
      status: 200,
      statusText: 'OK',
      data: {
        message: 'API test successful',
        method,
        endpoint: api.endpoint,
        timestamp: new Date().toISOString()
      },
      headers: {
        'content-type': 'application/json',
        'x-response-time': '45ms'
      }
    };

    res.json({
      success: true,
      data: {
        testResult: testResponse,
        api: api
      }
    });

  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test API endpoint'
    });
  }
});

module.exports = router;