const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');

const router = express.Router();

// Get all projects for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status, type, search } = req.query;

    const query = {
      $or: [
        { owner: userId },
        { 'collaborators.user': userId }
      ],
      isArchived: false
    };

    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
          ]
        }
      ];
    }

    const projects = await Project.find(query)
      .populate('owner', 'firstName lastName email avatar')
      .populate('collaborators.user', 'firstName lastName email avatar')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await Project.findById(id)
      .populate('owner', 'firstName lastName email avatar')
      .populate('collaborators.user', 'firstName lastName email avatar');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (!project.canAccess(userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { project }
    });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    });
  }
});

// Create new project
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim(),
  body('type').optional().isIn(['web-app', 'mobile-app', 'api', 'desktop-app', 'ai-model', 'data-science']),
  body('framework').optional().isIn(['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'express', 'fastapi', 'django', 'flask', 'spring', 'laravel', 'rails', 'other']),
  body('language').optional().isIn(['javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'other']),
  body('visibility').optional().isIn(['private', 'team', 'public'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user.userId;
    const { name, description, type, framework, language, visibility, tags } = req.body;

    // Check user's project limit
    const user = await User.findById(userId);
    const userProjects = await Project.countDocuments({
      $or: [
        { owner: userId },
        { 'collaborators.user': userId }
      ],
      isArchived: false
    });

    if (userProjects >= user.subscription.maxProjects) {
      return res.status(400).json({
        success: false,
        error: 'Project limit reached',
        message: `You can only have ${user.subscription.maxProjects} projects on your current plan`
      });
    }

    const project = new Project({
      name,
      description,
      type: type || 'web-app',
      framework: framework || 'react',
      language: language || 'javascript',
      visibility: visibility || 'private',
      owner: userId,
      tags: tags || []
    });

    await project.save();

    // Populate the project data
    await project.populate('owner', 'firstName lastName email avatar');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project }
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
  }
});

// Update project
router.put('/:id', [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(['draft', 'development', 'testing', 'staging', 'production', 'archived']),
  body('visibility').optional().isIn(['private', 'team', 'public'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check permissions
    const userRole = project.getUserRole(userId);
    if (!userRole || (userRole === 'viewer' && updates.status)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Update project
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        project[key] = updates[key];
      }
    });

    await project.save();
    await project.populate('owner', 'firstName lastName email avatar');
    await project.populate('collaborators.user', 'firstName lastName email avatar');

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project }
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Only owner can delete project
    if (project.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only project owner can delete the project'
      });
    }

    // Soft delete (archive)
    project.isArchived = true;
    await project.save();

    res.json({
      success: true,
      message: 'Project archived successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
});

// Add collaborator
router.post('/:id/collaborators', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['viewer', 'editor', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userId = req.user.userId;
    const { email, role = 'editor' } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user is owner or admin
    const userRole = project.getUserRole(userId);
    if (!userRole || !['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Find user by email
    const collaborator = await User.findOne({ email });
    if (!collaborator) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if already a collaborator
    const existingCollab = project.collaborators.find(collab => 
      collab.user.toString() === collaborator._id.toString()
    );

    if (existingCollab) {
      return res.status(400).json({
        success: false,
        error: 'User is already a collaborator'
      });
    }

    // Add collaborator
    project.addCollaborator(collaborator._id, role);
    await project.save();

    await project.populate('collaborators.user', 'firstName lastName email avatar');

    res.json({
      success: true,
      message: 'Collaborator added successfully',
      data: { project }
    });

  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add collaborator'
    });
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:collaboratorId', async (req, res) => {
  try {
    const { id, collaboratorId } = req.params;
    const userId = req.user.userId;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user is owner or admin
    const userRole = project.getUserRole(userId);
    if (!userRole || !['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Remove collaborator
    project.removeCollaborator(collaboratorId);
    await project.save();

    await project.populate('collaborators.user', 'firstName lastName email avatar');

    res.json({
      success: true,
      message: 'Collaborator removed successfully',
      data: { project }
    });

  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove collaborator'
    });
  }
});

// Get project statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await Project.findById(id);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    const stats = {
      totalCollaborators: project.totalCollaborators,
      aiTokensUsed: project.aiFeatures.codeGeneration.tokensUsed,
      testCoverage: project.tests.coverage,
      deploymentStatus: project.deployment.status,
      lastActivity: project.updatedAt,
      createdAt: project.createdAt
    };

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get project statistics'
    });
  }
});

module.exports = router;