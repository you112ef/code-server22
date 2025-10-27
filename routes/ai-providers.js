const express = require('express');
const { body, validationResult } = require('express-validator');
const AIProvider = require('../models/AIProvider');
const aiService = require('../services/aiService');

const router = express.Router();

// Get all AI providers for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const providers = await aiService.getAvailableProviders(userId);

    res.json({
      success: true,
      data: { providers }
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI providers'
    });
  }
});

// Get single provider
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const provider = await AIProvider.findOne({ _id: id, user: userId });
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    res.json({
      success: true,
      data: { provider }
    });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get provider'
    });
  }
});

// Add new AI provider
router.post('/', [
  body('name').isIn(['openai', 'anthropic', 'openrouter', 'custom']).withMessage('Invalid provider name'),
  body('displayName').notEmpty().withMessage('Display name is required'),
  body('apiKey').notEmpty().withMessage('API key is required'),
  body('baseUrl').optional().isURL().withMessage('Invalid base URL'),
  body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1 and 10')
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
    const { name, displayName, apiKey, baseUrl, priority } = req.body;

    // Check if provider already exists
    const existingProvider = await AIProvider.findOne({ user: userId, name });
    if (existingProvider) {
      return res.status(400).json({
        success: false,
        error: 'Provider already exists'
      });
    }

    const provider = await aiService.addProvider(userId, {
      name,
      displayName,
      apiKey,
      baseUrl,
      priority
    });

    res.status(201).json({
      success: true,
      message: 'AI provider added successfully',
      data: { provider }
    });
  } catch (error) {
    console.error('Add provider error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add AI provider'
    });
  }
});

// Update AI provider
router.put('/:id', [
  body('displayName').optional().notEmpty(),
  body('apiKey').optional().notEmpty(),
  body('baseUrl').optional().isURL(),
  body('priority').optional().isInt({ min: 1, max: 10 }),
  body('isActive').optional().isBoolean()
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

    const provider = await aiService.updateProvider(userId, id, updates);

    res.json({
      success: true,
      message: 'Provider updated successfully',
      data: { provider }
    });
  } catch (error) {
    console.error('Update provider error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update provider'
    });
  }
});

// Delete AI provider
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await aiService.deleteProvider(userId, id);

    res.json({
      success: true,
      message: 'Provider deleted successfully'
    });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete provider'
    });
  }
});

// Test AI provider
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await aiService.testProvider(userId, id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Test provider error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test provider'
    });
  }
});

// Get available models for a provider
router.get('/:id/models', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const provider = await AIProvider.findOne({ _id: id, user: userId });
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    const models = provider.getAvailableModels();

    res.json({
      success: true,
      data: { models }
    });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get models'
    });
  }
});

// Update provider settings
router.put('/:id/settings', [
  body('temperature').optional().isFloat({ min: 0, max: 2 }),
  body('maxTokens').optional().isInt({ min: 1, max: 100000 }),
  body('topP').optional().isFloat({ min: 0, max: 1 }),
  body('frequencyPenalty').optional().isFloat({ min: -2, max: 2 }),
  body('presencePenalty').optional().isFloat({ min: -2, max: 2 })
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
    const settings = req.body;

    const provider = await AIProvider.findOne({ _id: id, user: userId });
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Update settings
    Object.keys(settings).forEach(key => {
      if (settings[key] !== undefined) {
        provider.settings[key] = settings[key];
      }
    });

    await provider.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings: provider.settings }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

// Get provider usage statistics
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { period = '30d' } = req.query;

    const provider = await AIProvider.findOne({ _id: id, user: userId });
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Calculate period-based usage
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    const usage = {
      totalRequests: provider.usage.totalRequests,
      totalTokens: provider.usage.totalTokens,
      totalCost: provider.usage.totalCost,
      lastUsed: provider.usage.lastUsed,
      period: period,
      startDate: startDate,
      endDate: now
    };

    res.json({
      success: true,
      data: { usage }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
});

// Get all available models across providers
router.get('/models/all', async (req, res) => {
  try {
    const userId = req.user.userId;
    const providers = await aiService.getAvailableProviders(userId);
    
    const allModels = providers.reduce((acc, provider) => {
      provider.models.forEach(model => {
        acc.push({
          ...model,
          provider: provider.name,
          providerId: provider.id
        });
      });
      return acc;
    }, []);

    // Group by category
    const modelsByCategory = allModels.reduce((acc, model) => {
      const category = model.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(model);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        models: allModels,
        modelsByCategory,
        totalModels: allModels.length,
        totalProviders: providers.length
      }
    });
  } catch (error) {
    console.error('Get all models error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get all models'
    });
  }
});

module.exports = router;