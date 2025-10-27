const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');

const router = express.Router();

// Get test results for a project
router.get('/:projectId/results', async (req, res) => {
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
        total: project.tests.total,
        passed: project.tests.passed,
        failed: project.tests.failed,
        coverage: project.tests.coverage,
        lastRun: project.tests.lastRun,
        results: [
          {
            id: 'test_1',
            name: 'User authentication test',
            status: 'passed',
            duration: '120ms',
            error: null
          },
          {
            id: 'test_2',
            name: 'API endpoint validation',
            status: 'passed',
            duration: '85ms',
            error: null
          },
          {
            id: 'test_3',
            name: 'Database connection test',
            status: 'failed',
            duration: '2000ms',
            error: 'Connection timeout'
          }
        ]
      }
    });

  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test results'
    });
  }
});

// Run tests for a project
router.post('/:projectId/run', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { testType = 'all', environment = 'test' } = req.body;

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
        error: 'Insufficient permissions to run tests'
      });
    }

    // Update project status
    project.tests.lastRun = new Date();
    await project.save();

    // Simulate test execution
    const runTests = async () => {
      try {
        // Simulate test execution time
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Mock test results
        const testResults = [
          { name: 'Unit tests', status: 'passed', count: 15 },
          { name: 'Integration tests', status: 'passed', count: 8 },
          { name: 'E2E tests', status: 'failed', count: 3, failed: 1 }
        ];

        const totalTests = testResults.reduce((sum, test) => sum + test.count, 0);
        const passedTests = testResults.reduce((sum, test) => 
          sum + (test.status === 'passed' ? test.count : test.count - (test.failed || 0)), 0
        );
        const failedTests = totalTests - passedTests;

        // Update project with test results
        project.tests.total = totalTests;
        project.tests.passed = passedTests;
        project.tests.failed = failedTests;
        project.tests.coverage = Math.round((passedTests / totalTests) * 100);
        await project.save();

        // Emit WebSocket event for real-time updates
        req.app.get('io').to(`project_${projectId}`).emit('test_completed', {
          projectId,
          results: {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            coverage: project.tests.coverage
          },
          testResults
        });

      } catch (error) {
        req.app.get('io').to(`project_${projectId}`).emit('test_failed', {
          projectId,
          error: error.message
        });
      }
    };

    // Start test execution
    runTests();

    res.json({
      success: true,
      message: 'Tests started successfully',
      data: {
        testType,
        environment,
        status: 'running'
      }
    });

  } catch (error) {
    console.error('Run tests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run tests'
    });
  }
});

// Generate test coverage report
router.get('/:projectId/coverage', async (req, res) => {
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

    // Mock coverage data
    const coverage = {
      overall: project.tests.coverage || 85,
      files: [
        {
          name: 'src/components/UserProfile.jsx',
          coverage: 92,
          lines: { total: 50, covered: 46, uncovered: 4 }
        },
        {
          name: 'src/utils/auth.js',
          coverage: 78,
          lines: { total: 30, covered: 23, uncovered: 7 }
        },
        {
          name: 'src/api/users.js',
          coverage: 95,
          lines: { total: 40, covered: 38, uncovered: 2 }
        }
      ],
      branches: {
        total: 25,
        covered: 20,
        coverage: 80
      },
      functions: {
        total: 15,
        covered: 14,
        coverage: 93
      }
    };

    res.json({
      success: true,
      data: { coverage }
    });

  } catch (error) {
    console.error('Get coverage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get coverage report'
    });
  }
});

// Create test configuration
router.post('/:projectId/config', [
  body('framework').isIn(['jest', 'mocha', 'vitest', 'cypress', 'playwright']),
  body('environment').isIn(['node', 'browser', 'both'])
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
    const { framework, environment, config = {} } = req.body;

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
        error: 'Insufficient permissions to configure tests'
      });
    }

    // In a real implementation, you would save test configuration
    const testConfig = {
      framework,
      environment,
      config,
      createdAt: new Date()
    };

    res.json({
      success: true,
      message: 'Test configuration created successfully',
      data: { testConfig }
    });

  } catch (error) {
    console.error('Create test config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test configuration'
    });
  }
});

module.exports = router;