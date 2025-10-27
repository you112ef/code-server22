const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const aiService = require('../services/aiService');

const router = express.Router();

// AI Code Generation
router.post('/generate-code', [
  body('prompt').notEmpty().withMessage('Prompt is required'),
  body('projectId').isMongoId().withMessage('Valid project ID is required'),
  body('language').optional().isIn(['javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust', 'php', 'ruby']),
  body('framework').optional().isIn(['react', 'vue', 'angular', 'express', 'django', 'flask', 'spring', 'laravel', 'rails']),
  body('model').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { prompt, projectId, language = 'javascript', framework, context, model = 'openai/gpt-3.5-turbo' } = req.body;
    const userId = req.user.userId;

    // Get project and verify access
    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Get user to check tokens
    const user = await User.findById(userId);
    const estimatedTokens = Math.ceil(prompt.length / 4) + 1000; // Rough estimation

    if (!user.hasEnoughTokens(estimatedTokens)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient tokens',
        message: `You need ${estimatedTokens} tokens but have ${user.subscription.tokens}`
      });
    }

    // Prepare context for AI
    const systemPrompt = `You are an expert ${language} developer specializing in ${framework || 'web development'}. 
    Generate clean, production-ready code that follows best practices. 
    Include proper error handling, comments, and documentation.
    ${context ? `Context: ${context}` : ''}`;

    try {
      // Use the new AI service
      const result = await aiService.generateText(userId, `${systemPrompt}\n\nUser request: ${prompt}`, {
        model,
        maxTokens: 2000,
        temperature: 0.7
      });

      // Deduct tokens from user
      user.deductTokens(result.usage.totalTokens);
      await user.save();

      // Update project AI usage
      project.aiFeatures.codeGeneration.tokensUsed += result.usage.totalTokens;
      await project.save();

      res.json({
        success: true,
        data: {
          generatedCode: result.text,
          tokensUsed: result.usage.totalTokens,
          model: result.model,
          provider: result.provider,
          language,
          framework
        }
      });

    } catch (aiError) {
      console.error('AI generation error:', aiError);
      res.status(500).json({
        success: false,
        error: 'AI code generation failed',
        message: aiError.message
      });
    }

  } catch (error) {
    console.error('Generate code error:', error);
    res.status(500).json({
      success: false,
      error: 'Code generation failed'
    });
  }
});

// AI Code Review
router.post('/review-code', [
  body('code').notEmpty().withMessage('Code is required'),
  body('projectId').isMongoId().withMessage('Valid project ID is required'),
  body('model').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { code, projectId, language = 'javascript', model = 'openai/gpt-4' } = req.body;
    const userId = req.user.userId;

    // Get project and verify access
    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    const systemPrompt = `You are an expert code reviewer. Analyze the provided ${language} code and provide:
    1. Code quality assessment (1-10)
    2. Security issues
    3. Performance improvements
    4. Best practices violations
    5. Suggestions for improvement
    6. Overall recommendation`;

    try {
      const result = await aiService.generateText(userId, `${systemPrompt}\n\nPlease review this code:\n\n${code}`, {
        model,
        maxTokens: 1500,
        temperature: 0.3
      });

      // Deduct tokens
      const user = await User.findById(userId);
      user.deductTokens(result.usage.totalTokens);
      await user.save();

      res.json({
        success: true,
        data: {
          review: result.text,
          tokensUsed: result.usage.totalTokens,
          model: result.model,
          provider: result.provider,
          language
        }
      });

    } catch (aiError) {
      console.error('AI review error:', aiError);
      res.status(500).json({
        success: false,
        error: 'AI code review failed',
        message: aiError.message
      });
    }

  } catch (error) {
    console.error('Code review error:', error);
    res.status(500).json({
      success: false,
      error: 'Code review failed'
    });
  }
});

// AI Debugging
router.post('/debug-code', [
  body('code').notEmpty().withMessage('Code is required'),
  body('error').notEmpty().withMessage('Error message is required'),
  body('projectId').isMongoId().withMessage('Valid project ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { code, error, projectId, language = 'javascript' } = req.body;
    const userId = req.user.userId;

    // Get project and verify access
    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    const systemPrompt = `You are an expert debugger. Analyze the provided ${language} code and error message.
    Provide:
    1. Root cause analysis
    2. Step-by-step debugging approach
    3. Fixed code solution
    4. Prevention strategies
    5. Additional testing recommendations`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Code:\n${code}\n\nError:\n${error}` }
      ],
      max_tokens: 2000,
      temperature: 0.2
    });

    const debugAnalysis = completion.choices[0].message.content;
    const tokensUsed = completion.usage.total_tokens;

    // Deduct tokens
    const user = await User.findById(userId);
    user.deductTokens(tokensUsed);
    await user.save();

    res.json({
      success: true,
      data: {
        debugAnalysis,
        tokensUsed,
        language
      }
    });

  } catch (error) {
    console.error('Debug code error:', error);
    res.status(500).json({
      success: false,
      error: 'Code debugging failed'
    });
  }
});

// AI Test Generation
router.post('/generate-tests', [
  body('code').notEmpty().withMessage('Code is required'),
  body('projectId').isMongoId().withMessage('Valid project ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { code, projectId, testFramework = 'jest', language = 'javascript' } = req.body;
    const userId = req.user.userId;

    // Get project and verify access
    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    const systemPrompt = `You are an expert in ${testFramework} testing. Generate comprehensive unit tests for the provided ${language} code.
    Include:
    1. Test cases for all functions/methods
    2. Edge cases and error scenarios
    3. Mocking where appropriate
    4. Setup and teardown if needed
    5. Clear test descriptions`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate tests for this code:\n\n${code}` }
      ],
      max_tokens: 2500,
      temperature: 0.3
    });

    const generatedTests = completion.choices[0].message.content;
    const tokensUsed = completion.usage.total_tokens;

    // Deduct tokens
    const user = await User.findById(userId);
    user.deductTokens(tokensUsed);
    await user.save();

    res.json({
      success: true,
      data: {
        generatedTests,
        tokensUsed,
        testFramework,
        language
      }
    });

  } catch (error) {
    console.error('Generate tests error:', error);
    res.status(500).json({
      success: false,
      error: 'Test generation failed'
    });
  }
});

// AI Documentation Generation
router.post('/generate-docs', [
  body('code').notEmpty().withMessage('Code is required'),
  body('projectId').isMongoId().withMessage('Valid project ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { code, projectId, format = 'markdown', language = 'javascript' } = req.body;
    const userId = req.user.userId;

    // Get project and verify access
    const project = await Project.findById(projectId);
    if (!project || !project.canAccess(userId)) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    const systemPrompt = `You are an expert technical writer. Generate comprehensive documentation for the provided ${language} code in ${format} format.
    Include:
    1. Overview and purpose
    2. Function/method descriptions
    3. Parameters and return values
    4. Usage examples
    5. Error handling
    6. Dependencies`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate documentation for this code:\n\n${code}` }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });

    const documentation = completion.choices[0].message.content;
    const tokensUsed = completion.usage.total_tokens;

    // Deduct tokens
    const user = await User.findById(userId);
    user.deductTokens(tokensUsed);
    await user.save();

    res.json({
      success: true,
      data: {
        documentation,
        tokensUsed,
        format,
        language
      }
    });

  } catch (error) {
    console.error('Generate docs error:', error);
    res.status(500).json({
      success: false,
      error: 'Documentation generation failed'
    });
  }
});

// Get AI Usage Statistics
router.get('/usage/:projectId', async (req, res) => {
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
        tokensUsed: project.aiFeatures.codeGeneration.tokensUsed,
        features: project.aiFeatures,
        lastUsed: project.updatedAt
      }
    });

  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
});

module.exports = router;