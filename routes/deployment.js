const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const { spawn } = require('child_process');
const path = require('path');

const router = express.Router();

// Deploy project
router.post('/:projectId/deploy', [
  body('provider').isIn(['vercel', 'netlify', 'heroku', 'aws', 'gcp', 'azure', 'digitalocean']),
  body('environment').optional().isIn(['development', 'staging', 'production'])
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
    const { provider, environment = 'production', config = {} } = req.body;

    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Update deployment status
    project.deployment.status = 'deploying';
    project.deployment.provider = provider;
    await project.save();

    // Simulate deployment process
    const deploymentId = `deploy_${Date.now()}`;
    const deploymentLogs = [];

    // In a real implementation, this would trigger actual deployment
    const deployProcess = async () => {
      try {
        deploymentLogs.push(`Starting deployment to ${provider}...`);
        deploymentLogs.push(`Environment: ${environment}`);
        deploymentLogs.push(`Project: ${project.name}`);
        
        // Simulate build process
        await new Promise(resolve => setTimeout(resolve, 2000));
        deploymentLogs.push('Building project...');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        deploymentLogs.push('Installing dependencies...');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        deploymentLogs.push('Running tests...');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        deploymentLogs.push('Deploying to cloud...');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        deploymentLogs.push('Deployment successful!');
        
        // Update project with deployment info
        project.deployment.status = 'deployed';
        project.deployment.url = `https://${project.name.toLowerCase().replace(/\s+/g, '-')}-${deploymentId}.${provider}.com`;
        project.deployment.lastDeployed = new Date();
        project.deployment.deploymentLogs = deploymentLogs;
        await project.save();

        // Emit WebSocket event for real-time updates
        req.app.get('io').to(`project_${projectId}`).emit('deployment_complete', {
          projectId,
          status: 'deployed',
          url: project.deployment.url,
          logs: deploymentLogs
        });

      } catch (error) {
        deploymentLogs.push(`Deployment failed: ${error.message}`);
        project.deployment.status = 'failed';
        project.deployment.deploymentLogs = deploymentLogs;
        await project.save();

        req.app.get('io').to(`project_${projectId}`).emit('deployment_failed', {
          projectId,
          status: 'failed',
          logs: deploymentLogs
        });
      }
    };

    // Start deployment process
    deployProcess();

    res.json({
      success: true,
      message: 'Deployment started',
      data: {
        deploymentId,
        status: 'deploying',
        provider,
        environment
      }
    });

  } catch (error) {
    console.error('Deploy project error:', error);
    res.status(500).json({
      success: false,
      error: 'Deployment failed'
    });
  }
});

// Get deployment status
router.get('/:projectId/status', async (req, res) => {
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
        status: project.deployment.status,
        url: project.deployment.url,
        provider: project.deployment.provider,
        lastDeployed: project.deployment.lastDeployed,
        logs: project.deployment.deploymentLogs
      }
    });

  } catch (error) {
    console.error('Get deployment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deployment status'
    });
  }
});

// Get deployment logs
router.get('/:projectId/logs', async (req, res) => {
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
        logs: project.deployment.deploymentLogs || []
      }
    });

  } catch (error) {
    console.error('Get deployment logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deployment logs'
    });
  }
});

// Rollback deployment
router.post('/:projectId/rollback', async (req, res) => {
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

    // Check if user has admin permissions
    const userRole = project.getUserRole(userId);
    if (!userRole || !['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for rollback'
      });
    }

    // Update deployment status
    project.deployment.status = 'deploying';
    await project.save();

    // Simulate rollback process
    const rollbackLogs = ['Starting rollback...', 'Reverting to previous version...', 'Rollback completed successfully!'];
    
    project.deployment.status = 'deployed';
    project.deployment.deploymentLogs = [...(project.deployment.deploymentLogs || []), ...rollbackLogs];
    await project.save();

    res.json({
      success: true,
      message: 'Rollback completed successfully',
      data: {
        status: project.deployment.status,
        logs: rollbackLogs
      }
    });

  } catch (error) {
    console.error('Rollback deployment error:', error);
    res.status(500).json({
      success: false,
      error: 'Rollback failed'
    });
  }
});

module.exports = router;