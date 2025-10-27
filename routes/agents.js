const express = require('express');
const { body, validationResult } = require('express-validator');
const Agent = require('../models/Agent');
const workflowService = require('../services/workflowService');
const toolService = require('../services/toolService');

const router = express.Router();

// Get all agents for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, status, projectId } = req.query;

    let query = { user: userId };
    if (type) query.type = type;
    if (status) query.status = status;
    if (projectId) query.project = projectId;

    const agents = await Agent.find(query).populate('project', 'name description');
    
    res.json({
      success: true,
      data: { agents }
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agents'
    });
  }
});

// Get single agent
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const agent = await Agent.findOne({ _id: id, user: userId }).populate('project', 'name description');
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: { agent }
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent'
    });
  }
});

// Create new agent
router.post('/', [
  body('name').notEmpty().withMessage('Agent name is required'),
  body('type').isIn(['capy', 'same', 'kilo', 'cline', 'assistant', 'custom']).withMessage('Invalid agent type'),
  body('displayName').notEmpty().withMessage('Display name is required'),
  body('description').notEmpty().withMessage('Description is required')
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
    const agentData = {
      ...req.body,
      user: userId
    };

    const agent = new Agent(agentData);
    await agent.save();

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: { agent }
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent'
    });
  }
});

// Update agent
router.put('/:id', [
  body('displayName').optional().notEmpty(),
  body('description').optional().notEmpty(),
  body('status').optional().isIn(['active', 'inactive', 'maintenance', 'error']),
  body('configuration').optional().isObject()
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

    const agent = await Agent.findOneAndUpdate(
      { _id: id, user: userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Agent updated successfully',
      data: { agent }
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent'
    });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const agent = await Agent.findOneAndDelete({ _id: id, user: userId });
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent'
    });
  }
});

// Execute agent workflow
router.post('/:id/execute', [
  body('input').isObject().withMessage('Input is required'),
  body('context').optional().isObject()
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
    const { input, context = {} } = req.body;

    const agent = await Agent.findOne({ _id: id, user: userId });
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    if (agent.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Agent is not active'
      });
    }

    // Execute agent workflow
    const result = await agent.executeWorkflow(input, {
      ...context,
      userId,
      projectId: agent.project
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Execute agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute agent workflow'
    });
  }
});

// Test agent
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const agent = await Agent.findOne({ _id: id, user: userId });
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Test agent with sample input
    const testInput = {
      prompt: 'This is a test message to verify the agent is working correctly.',
      code: 'console.log("Hello, World!");',
      project: 'Test Project'
    };

    const result = await agent.executeWorkflow(testInput, {
      userId,
      projectId: agent.project
    });

    res.json({
      success: true,
      data: {
        testResult: result,
        agent: {
          id: agent._id,
          name: agent.name,
          type: agent.type,
          status: agent.status
        }
      }
    });
  } catch (error) {
    console.error('Test agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test agent'
    });
  }
});

// Get agent performance
router.get('/:id/performance', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const agent = await Agent.findOne({ _id: id, user: userId });
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: {
        performance: agent.performance,
        successRate: agent.successRate
      }
    });
  } catch (error) {
    console.error('Get agent performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent performance'
    });
  }
});

// Get available tools
router.get('/tools/available', async (req, res) => {
  try {
    const { category } = req.query;
    
    let tools;
    if (category) {
      tools = toolService.getToolsByCategory(category);
    } else {
      tools = toolService.getAllTools();
    }

    res.json({
      success: true,
      data: { tools }
    });
  } catch (error) {
    console.error('Get tools error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available tools'
    });
  }
});

// Execute tool
router.post('/tools/execute', [
  body('toolId').notEmpty().withMessage('Tool ID is required'),
  body('parameters').isObject().withMessage('Parameters are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { toolId, parameters } = req.body;
    const userId = req.user.userId;

    const result = await toolService.executeTool(toolId, parameters, { userId });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Execute tool error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute tool'
    });
  }
});

// Get workflow templates
router.get('/workflows/templates', async (req, res) => {
  try {
    const templates = await workflowService.getWorkflowTemplates();

    res.json({
      success: true,
      data: { templates }
    });
  } catch (error) {
    console.error('Get workflow templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow templates'
    });
  }
});

// Create workflow from template
router.post('/workflows/from-template', [
  body('templateId').notEmpty().withMessage('Template ID is required'),
  body('customizations').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { templateId, customizations = {} } = req.body;

    const workflow = await workflowService.createWorkflowFromTemplate(templateId, customizations);

    res.json({
      success: true,
      data: { workflow }
    });
  } catch (error) {
    console.error('Create workflow from template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow from template'
    });
  }
});

// Execute workflow
router.post('/workflows/execute', [
  body('workflow').isObject().withMessage('Workflow is required'),
  body('context').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { workflow, context = {} } = req.body;
    const userId = req.user.userId;

    const result = await workflowService.orchestrate(workflow, {
      ...context,
      userId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Execute workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute workflow'
    });
  }
});

// Get workflow status
router.get('/workflows/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;

    const result = await workflowService.getWorkflow(workflowId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow'
    });
  }
});

// Stop workflow
router.post('/workflows/:workflowId/stop', async (req, res) => {
  try {
    const { workflowId } = req.params;

    const result = await workflowService.stopWorkflow(workflowId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Stop workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop workflow'
    });
  }
});

// Pause workflow
router.post('/workflows/:workflowId/pause', async (req, res) => {
  try {
    const { workflowId } = req.params;

    const result = await workflowService.pauseWorkflow(workflowId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Pause workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause workflow'
    });
  }
});

// Resume workflow
router.post('/workflows/:workflowId/resume', async (req, res) => {
  try {
    const { workflowId } = req.params;

    const result = await workflowService.resumeWorkflow(workflowId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Resume workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume workflow'
    });
  }
});

// Get all workflows
router.get('/workflows/all', async (req, res) => {
  try {
    const workflows = await workflowService.getAllWorkflows();

    res.json({
      success: true,
      data: { workflows }
    });
  } catch (error) {
    console.error('Get all workflows error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflows'
    });
  }
});

// Get workflows by status
router.get('/workflows/status/:status', async (req, res) => {
  try {
    const { status } = req.params;

    const workflows = await workflowService.getWorkflowsByStatus(status);

    res.json({
      success: true,
      data: { workflows }
    });
  } catch (error) {
    console.error('Get workflows by status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflows by status'
    });
  }
});

// Update agent capabilities
router.put('/:id/capabilities', [
  body('capabilities').isArray().withMessage('Capabilities must be an array')
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
    const { capabilities } = req.body;

    const agent = await Agent.findOneAndUpdate(
      { _id: id, user: userId },
      { capabilities },
      { new: true, runValidators: true }
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Agent capabilities updated successfully',
      data: { agent }
    });
  } catch (error) {
    console.error('Update agent capabilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent capabilities'
    });
  }
});

// Update agent tools
router.put('/:id/tools', [
  body('tools').isArray().withMessage('Tools must be an array')
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
    const { tools } = req.body;

    const agent = await Agent.findOneAndUpdate(
      { _id: id, user: userId },
      { tools },
      { new: true, runValidators: true }
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Agent tools updated successfully',
      data: { agent }
    });
  } catch (error) {
    console.error('Update agent tools error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent tools'
    });
  }
});

// Update agent workflow
router.put('/:id/workflow', [
  body('workflow').isObject().withMessage('Workflow is required')
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
    const { workflow } = req.body;

    const agent = await Agent.findOneAndUpdate(
      { _id: id, user: userId },
      { workflow },
      { new: true, runValidators: true }
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Agent workflow updated successfully',
      data: { agent }
    });
  } catch (error) {
    console.error('Update agent workflow error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent workflow'
    });
  }
});

module.exports = router;