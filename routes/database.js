const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');

const router = express.Router();

// Get database configuration
router.get('/:projectId/config', async (req, res) => {
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
        type: project.database.type,
        collections: project.database.collections || [],
        isConnected: !!project.database.connectionString
      }
    });

  } catch (error) {
    console.error('Get database config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database configuration'
    });
  }
});

// Update database configuration
router.put('/:projectId/config', [
  body('type').isIn(['none', 'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'firebase']),
  body('connectionString').optional().isString()
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
    const { type, connectionString } = req.body;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Check if user has admin permissions
    const userRole = project.getUserRole(userId);
    if (!userRole || !['owner', 'admin', 'editor'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to modify database configuration'
      });
    }

    project.database.type = type;
    if (connectionString) {
      project.database.connectionString = connectionString;
    }

    await project.save();

    res.json({
      success: true,
      message: 'Database configuration updated successfully',
      data: {
        type: project.database.type,
        collections: project.database.collections || []
      }
    });

  } catch (error) {
    console.error('Update database config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update database configuration'
    });
  }
});

// Get database collections/tables
router.get('/:projectId/collections', async (req, res) => {
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

    // In a real implementation, you would connect to the actual database
    // and fetch the collections/tables
    const collections = project.database.collections || [];

    res.json({
      success: true,
      data: { collections }
    });

  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get collections'
    });
  }
});

// Create new collection/table
router.post('/:projectId/collections', [
  body('name').notEmpty().withMessage('Collection name is required'),
  body('schema').optional().isObject()
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
    const { name, schema = {} } = req.body;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Check if user has admin permissions
    const userRole = project.getUserRole(userId);
    if (!userRole || !['owner', 'admin', 'editor'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create collections'
      });
    }

    // Add collection to project
    if (!project.database.collections) {
      project.database.collections = [];
    }

    project.database.collections.push({
      name,
      schema,
      createdAt: new Date()
    });

    await project.save();

    res.json({
      success: true,
      message: 'Collection created successfully',
      data: { name, schema }
    });

  } catch (error) {
    console.error('Create collection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create collection'
    });
  }
});

// Get collection data
router.get('/:projectId/collections/:collectionName', async (req, res) => {
  try {
    const { projectId, collectionName } = req.params;
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // In a real implementation, you would query the actual database
    // For now, we'll return mock data
    const mockData = Array.from({ length: 10 }, (_, i) => ({
      id: `doc_${i + 1}`,
      name: `Document ${i + 1}`,
      createdAt: new Date(Date.now() - i * 1000 * 60 * 60),
      data: { field1: `value${i + 1}`, field2: `data${i + 1}` }
    }));

    res.json({
      success: true,
      data: {
        collection: collectionName,
        documents: mockData,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(mockData.length / limit),
          total: mockData.length
        }
      }
    });

  } catch (error) {
    console.error('Get collection data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get collection data'
    });
  }
});

module.exports = router;