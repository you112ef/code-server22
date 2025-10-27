const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const Agent = require('../models/Agent');
const toolService = require('./toolService');
const aiService = require('./aiService');

class WorkflowService extends EventEmitter {
  constructor() {
    super();
    this.activeWorkflows = new Map();
    this.workflowTemplates = new Map();
    this.initializeTemplates();
  }

  initializeTemplates() {
    // Capy.ai Workflow Template
    this.workflowTemplates.set('capy_development', {
      name: 'Capy.ai Development Workflow',
      description: 'Complete development workflow using Capy.ai capabilities',
      steps: [
        {
          id: 'analyze_requirements',
          name: 'Analyze Requirements',
          type: 'ai_generation',
          parameters: {
            prompt: 'Analyze the following requirements and create a detailed technical specification: {input}',
            model: 'openai/gpt-4'
          }
        },
        {
          id: 'generate_architecture',
          name: 'Generate Architecture',
          type: 'ai_generation',
          parameters: {
            prompt: 'Based on the requirements analysis, create a detailed system architecture: {context}',
            model: 'openai/gpt-4'
          },
          dependencies: ['analyze_requirements']
        },
        {
          id: 'create_project_structure',
          name: 'Create Project Structure',
          type: 'file_operation',
          parameters: {
            operation: 'create',
            path: 'project-structure.json',
            content: '{context}'
          },
          dependencies: ['generate_architecture']
        },
        {
          id: 'generate_code',
          name: 'Generate Code',
          type: 'ai_generation',
          parameters: {
            prompt: 'Generate production-ready code based on the architecture: {context}',
            model: 'openai/gpt-4'
          },
          dependencies: ['create_project_structure']
        },
        {
          id: 'create_tests',
          name: 'Create Tests',
          type: 'ai_generation',
          parameters: {
            prompt: 'Generate comprehensive tests for the generated code: {context}',
            model: 'openai/gpt-4'
          },
          dependencies: ['generate_code']
        },
        {
          id: 'run_tests',
          name: 'Run Tests',
          type: 'testing',
          parameters: {
            testType: 'jest',
            testFiles: ['**/*.test.js']
          },
          dependencies: ['create_tests']
        },
        {
          id: 'deploy_application',
          name: 'Deploy Application',
          type: 'deployment',
          parameters: {
            provider: 'vercel',
            environment: 'production'
          },
          dependencies: ['run_tests']
        }
      ]
    });

    // Same.new UI Workflow Template
    this.workflowTemplates.set('same_ui_development', {
      name: 'Same.new UI Development Workflow',
      description: 'Complete UI development workflow using Same.new capabilities',
      steps: [
        {
          id: 'analyze_design_requirements',
          name: 'Analyze Design Requirements',
          type: 'ai_generation',
          parameters: {
            prompt: 'Analyze the following UI requirements and create a design specification: {input}',
            model: 'openai/gpt-4'
          }
        },
        {
          id: 'create_design_system',
          name: 'Create Design System',
          type: 'custom',
          parameters: {
            handler: 'same_design_system',
            brand: '{input.brand}',
            components: ['button', 'input', 'card', 'modal']
          },
          dependencies: ['analyze_design_requirements']
        },
        {
          id: 'generate_ui_components',
          name: 'Generate UI Components',
          type: 'custom',
          parameters: {
            handler: 'same_ui_generation',
            framework: '{input.framework}',
            responsive: true
          },
          dependencies: ['create_design_system']
        },
        {
          id: 'create_responsive_design',
          name: 'Create Responsive Design',
          type: 'custom',
          parameters: {
            handler: 'same_responsive_design',
            breakpoints: ['mobile', 'tablet', 'desktop']
          },
          dependencies: ['generate_ui_components']
        },
        {
          id: 'test_ui_components',
          name: 'Test UI Components',
          type: 'testing',
          parameters: {
            testType: 'cypress',
            testFiles: ['cypress/e2e/**/*.spec.js']
          },
          dependencies: ['create_responsive_design']
        }
      ]
    });

    // Kilo Agent Workflow Template
    this.workflowTemplates.set('kilo_task_management', {
      name: 'Kilo Agent Task Management Workflow',
      description: 'Advanced task management and orchestration workflow',
      steps: [
        {
          id: 'analyze_tasks',
          name: 'Analyze Tasks',
          type: 'ai_generation',
          parameters: {
            prompt: 'Analyze the following tasks and create an execution plan: {input}',
            model: 'openai/gpt-4'
          }
        },
        {
          id: 'create_execution_plan',
          name: 'Create Execution Plan',
          type: 'custom',
          parameters: {
            handler: 'kilo_task_management',
            tasks: '{input.tasks}',
            dependencies: '{input.dependencies}',
            resources: '{input.resources}'
          },
          dependencies: ['analyze_tasks']
        },
        {
          id: 'optimize_resources',
          name: 'Optimize Resources',
          type: 'custom',
          parameters: {
            handler: 'kilo_resource_optimization',
            plan: '{context.executionPlan}'
          },
          dependencies: ['create_execution_plan']
        },
        {
          id: 'execute_workflow',
          name: 'Execute Workflow',
          type: 'custom',
          parameters: {
            handler: 'kilo_workflow_orchestration',
            workflow: '{context.optimizedPlan}'
          },
          dependencies: ['optimize_resources']
        }
      ]
    });

    // Cline Code Editing Workflow Template
    this.workflowTemplates.set('cline_code_editing', {
      name: 'Cline Code Editing Workflow',
      description: 'Advanced code editing and refactoring workflow',
      steps: [
        {
          id: 'analyze_codebase',
          name: 'Analyze Codebase',
          type: 'code_analysis',
          parameters: {
            analysisType: 'comprehensive',
            includeMetrics: true
          }
        },
        {
          id: 'identify_improvements',
          name: 'Identify Improvements',
          type: 'ai_generation',
          parameters: {
            prompt: 'Analyze the codebase and identify areas for improvement: {context}',
            model: 'openai/gpt-4'
          },
          dependencies: ['analyze_codebase']
        },
        {
          id: 'refactor_code',
          name: 'Refactor Code',
          type: 'custom',
          parameters: {
            handler: 'cline_code_editing',
            operation: 'refactor',
            improvements: '{context.improvements}'
          },
          dependencies: ['identify_improvements']
        },
        {
          id: 'intelligent_completion',
          name: 'Intelligent Completion',
          type: 'custom',
          parameters: {
            handler: 'cline_intelligent_completion',
            context: '{context.refactoredCode}'
          },
          dependencies: ['refactor_code']
        },
        {
          id: 'context_aware_editing',
          name: 'Context-Aware Editing',
          type: 'custom',
          parameters: {
            handler: 'cline_context_aware_editing',
            code: '{context.completedCode}'
          },
          dependencies: ['intelligent_completion']
        }
      ]
    });

    // AI Assistant Workflow Template
    this.workflowTemplates.set('ai_assistant_complete', {
      name: 'AI Assistant Complete Workflow',
      description: 'Complete AI assistant workflow with all capabilities',
      steps: [
        {
          id: 'code_review',
          name: 'Code Review',
          type: 'custom',
          parameters: {
            handler: 'assistant_code_review',
            code: '{input.code}'
          }
        },
        {
          id: 'generate_documentation',
          name: 'Generate Documentation',
          type: 'custom',
          parameters: {
            handler: 'assistant_documentation',
            code: '{input.code}'
          },
          dependencies: ['code_review']
        },
        {
          id: 'debug_issues',
          name: 'Debug Issues',
          type: 'custom',
          parameters: {
            handler: 'assistant_debugging',
            code: '{input.code}',
            errors: '{input.errors}'
          },
          dependencies: ['code_review']
        },
        {
          id: 'generate_tests',
          name: 'Generate Tests',
          type: 'custom',
          parameters: {
            handler: 'assistant_testing',
            code: '{input.code}'
          },
          dependencies: ['debug_issues']
        },
        {
          id: 'deploy_application',
          name: 'Deploy Application',
          type: 'custom',
          parameters: {
            handler: 'assistant_deployment',
            configuration: '{input.deploymentConfig}'
          },
          dependencies: ['generate_tests']
        }
      ]
    });
  }

  async orchestrate(workflow, options = {}) {
    try {
      const workflowId = uuidv4();
      const startTime = Date.now();
      
      // Initialize workflow
      const workflowInstance = {
        id: workflowId,
        name: workflow.name || 'Custom Workflow',
        status: 'running',
        startTime,
        steps: workflow.steps || [],
        context: { ...options.context },
        results: [],
        logs: [],
        triggers: workflow.triggers || [],
        errorHandling: workflow.errorHandling || {
          strategy: 'stop_on_error',
          fallbackActions: [],
          retryPolicy: { maxRetries: 3, retryDelay: 1000 }
        }
      };

      this.activeWorkflows.set(workflowId, workflowInstance);
      this.emit('workflow:started', { workflowId, workflow: workflowInstance });

      // Execute workflow steps
      const results = await this.executeWorkflowSteps(workflowInstance);
      
      // Update workflow status
      workflowInstance.status = results.success ? 'completed' : 'failed';
      workflowInstance.endTime = Date.now();
      workflowInstance.duration = workflowInstance.endTime - workflowInstance.startTime;
      workflowInstance.results = results.stepResults;

      this.emit('workflow:completed', { workflowId, workflow: workflowInstance, results });

      return {
        success: results.success,
        workflowId,
        workflow: workflowInstance,
        results: results.stepResults,
        duration: workflowInstance.duration,
        error: results.error
      };

    } catch (error) {
      this.emit('workflow:error', { workflowId, error: error.message });
      
      return {
        success: false,
        error: error.message,
        workflowId
      };
    }
  }

  async executeWorkflowSteps(workflow) {
    try {
      const stepResults = [];
      const executedSteps = new Set();
      const stepQueue = [...workflow.steps];
      
      while (stepQueue.length > 0) {
        const step = stepQueue.shift();
        
        // Check if step can be executed (dependencies met)
        const canExecute = this.canExecuteStep(step, executedSteps);
        if (!canExecute) {
          stepQueue.push(step); // Re-queue for later
          continue;
        }

        try {
          // Execute step
          const stepResult = await this.executeStep(step, workflow.context, stepResults);
          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            result: stepResult,
            timestamp: new Date(),
            success: stepResult.success
          });

          // Update context with step result
          workflow.context[step.id] = stepResult;
          executedSteps.add(step.id);

          this.addLog(workflow.id, `Step ${step.name} completed successfully`);
          this.emit('workflow:step:completed', { 
            workflowId: workflow.id, 
            step, 
            result: stepResult 
          });

        } catch (error) {
          // Handle step error based on error handling strategy
          const errorResult = await this.handleStepError(step, error, workflow);
          stepResults.push({
            stepId: step.id,
            stepName: step.name,
            result: errorResult,
            timestamp: new Date(),
            success: false,
            error: error.message
          });

          if (workflow.errorHandling.strategy === 'stop_on_error') {
            return {
              success: false,
              error: error.message,
              stepResults
            };
          }
        }
      }

      return {
        success: true,
        stepResults
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        stepResults: []
      };
    }
  }

  async executeStep(step, context, previousResults) {
    try {
      // Build step context
      const stepContext = this.buildStepContext(step, context, previousResults);
      
      // Execute step based on type
      switch (step.type) {
        case 'ai_generation':
          return await this.executeAIStep(step, stepContext);
        case 'code_analysis':
          return await this.executeCodeAnalysisStep(step, stepContext);
        case 'file_operation':
          return await this.executeFileOperationStep(step, stepContext);
        case 'git_operation':
          return await this.executeGitOperationStep(step, stepContext);
        case 'deployment':
          return await this.executeDeploymentStep(step, stepContext);
        case 'testing':
          return await this.executeTestingStep(step, stepContext);
        case 'api_call':
          return await this.executeAPICallStep(step, stepContext);
        case 'database_operation':
          return await this.executeDatabaseOperationStep(step, stepContext);
        case 'custom':
          return await this.executeCustomStep(step, stepContext);
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

    } catch (error) {
      return {
        success: false,
        error: error.message,
        stepType: step.type
      };
    }
  }

  async executeAIStep(step, context) {
    const { prompt, model, parameters } = step.parameters;
    
    // Build prompt with context
    const fullPrompt = this.buildPrompt(prompt, context);
    
    // Execute AI generation
    const result = await aiService.generateText(
      context.userId,
      fullPrompt,
      {
        model: model || 'openai/gpt-4',
        ...parameters
      }
    );

    return {
      success: true,
      type: 'ai_generation',
      content: result.text,
      model: result.model,
      provider: result.provider,
      usage: result.usage
    };
  }

  async executeCodeAnalysisStep(step, context) {
    const codeAnalysisService = require('./codeAnalysisService');
    
    const analysis = await codeAnalysisService.analyzeCode(
      context.code,
      step.parameters
    );

    return {
      success: true,
      type: 'code_analysis',
      analysis,
      metrics: analysis.metrics,
      suggestions: analysis.suggestions
    };
  }

  async executeFileOperationStep(step, context) {
    const fileService = require('./fileService');
    
    const { operation, path, content, options } = step.parameters;
    
    switch (operation) {
      case 'create':
        return await fileService.createFile(path, content, options);
      case 'read':
        return await fileService.readFile(path, options);
      case 'update':
        return await fileService.updateFile(path, content, options);
      case 'delete':
        return await fileService.deleteFile(path, options);
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }

  async executeGitOperationStep(step, context) {
    const gitService = require('./gitService');
    
    const { operation, repository, options } = step.parameters;
    
    switch (operation) {
      case 'clone':
        return await gitService.clone(repository, options);
      case 'commit':
        return await gitService.commit(repository, options);
      case 'push':
        return await gitService.push(repository, options);
      case 'pull':
        return await gitService.pull(repository, options);
      default:
        throw new Error(`Unknown git operation: ${operation}`);
    }
  }

  async executeDeploymentStep(step, context) {
    const deploymentService = require('./deploymentService');
    
    const { provider, environment, configuration } = step.parameters;
    
    return await deploymentService.deploy(provider, environment, configuration, context);
  }

  async executeTestingStep(step, context) {
    const testingService = require('./testingService');
    
    const { testType, testFiles, configuration } = step.parameters;
    
    return await testingService.runTests(testType, testFiles, configuration, context);
  }

  async executeAPICallStep(step, context) {
    const { url, method, headers, body, timeout } = step.parameters;
    
    try {
      const response = await axios({
        method: method || 'GET',
        url,
        headers: headers || {},
        data: body,
        timeout: timeout || 30000
      });
      
      return {
        success: true,
        type: 'api_call',
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  async executeDatabaseOperationStep(step, context) {
    const databaseService = require('./databaseService');
    
    const { operation, database, query, data } = step.parameters;
    
    switch (operation) {
      case 'query':
        return await databaseService.query(database, query);
      case 'insert':
        return await databaseService.insert(database, query, data);
      case 'update':
        return await databaseService.update(database, query, data);
      case 'delete':
        return await databaseService.delete(database, query);
      default:
        throw new Error(`Unknown database operation: ${operation}`);
    }
  }

  async executeCustomStep(step, context) {
    const { handler, ...parameters } = step.parameters;
    
    // Execute custom tool
    return await toolService.executeTool(handler, parameters, context);
  }

  canExecuteStep(step, executedSteps) {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }
    
    return step.dependencies.every(dep => executedSteps.has(dep));
  }

  buildStepContext(step, context, previousResults) {
    return {
      ...context,
      step,
      previousResults,
      userId: context.userId,
      projectId: context.projectId
    };
  }

  buildPrompt(template, context) {
    let prompt = template;
    
    // Replace placeholders
    Object.keys(context).forEach(key => {
      const placeholder = `{${key}}`;
      if (prompt.includes(placeholder)) {
        prompt = prompt.replace(new RegExp(placeholder, 'g'), JSON.stringify(context[key], null, 2));
      }
    });
    
    return prompt;
  }

  async handleStepError(step, error, workflow) {
    const { errorHandling } = workflow;
    
    this.addLog(workflow.id, `Step ${step.name} failed: ${error.message}`);
    this.emit('workflow:step:error', { 
      workflowId: workflow.id, 
      step, 
      error: error.message 
    });

    // Execute fallback actions
    if (errorHandling.fallbackActions && errorHandling.fallbackActions.length > 0) {
      for (const action of errorHandling.fallbackActions) {
        try {
          await this.executeFallbackAction(action, step, error, workflow);
        } catch (fallbackError) {
          this.addLog(workflow.id, `Fallback action failed: ${fallbackError.message}`);
        }
      }
    }

    return {
      success: false,
      error: error.message,
      stepType: step.type,
      fallbackExecuted: true
    };
  }

  async executeFallbackAction(action, step, error, workflow) {
    // Implement fallback action logic
    switch (action.type) {
      case 'retry':
        if (workflow.errorHandling.retryPolicy.maxRetries > 0) {
          workflow.errorHandling.retryPolicy.maxRetries--;
          await new Promise(resolve => 
            setTimeout(resolve, workflow.errorHandling.retryPolicy.retryDelay)
          );
          return await this.executeStep(step, workflow.context, []);
        }
        break;
      case 'skip':
        this.addLog(workflow.id, `Skipping step ${step.name} due to error`);
        break;
      case 'alternative':
        // Execute alternative step
        if (action.alternativeStep) {
          return await this.executeStep(action.alternativeStep, workflow.context, []);
        }
        break;
    }
  }

  addLog(workflowId, message) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.logs.push({
        timestamp: new Date(),
        message
      });
    }
  }

  async getWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return {
        success: false,
        error: 'Workflow not found'
      };
    }

    return {
      success: true,
      workflow
    };
  }

  async getAllWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }

  async getWorkflowsByStatus(status) {
    return Array.from(this.activeWorkflows.values()).filter(w => w.status === status);
  }

  async getWorkflowTemplates() {
    return Array.from(this.workflowTemplates.entries()).map(([id, template]) => ({
      id,
      ...template
    }));
  }

  async createWorkflowFromTemplate(templateId, customizations = {}) {
    const template = this.workflowTemplates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const workflow = {
      ...template,
      ...customizations,
      steps: template.steps.map(step => ({
        ...step,
        ...customizations.steps?.find(s => s.id === step.id)
      }))
    };

    return workflow;
  }

  async stopWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return {
        success: false,
        error: 'Workflow not found'
      };
    }

    workflow.status = 'stopped';
    workflow.endTime = Date.now();
    workflow.duration = workflow.endTime - workflow.startTime;

    this.emit('workflow:stopped', { workflowId, workflow });

    return {
      success: true,
      workflow
    };
  }

  async pauseWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return {
        success: false,
        error: 'Workflow not found'
      };
    }

    workflow.status = 'paused';
    this.emit('workflow:paused', { workflowId, workflow });

    return {
      success: true,
      workflow
    };
  }

  async resumeWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return {
        success: false,
        error: 'Workflow not found'
      };
    }

    if (workflow.status !== 'paused') {
      return {
        success: false,
        error: 'Workflow is not paused'
      };
    }

    workflow.status = 'running';
    this.emit('workflow:resumed', { workflowId, workflow });

    // Continue execution
    const results = await this.executeWorkflowSteps(workflow);
    
    workflow.status = results.success ? 'completed' : 'failed';
    workflow.endTime = Date.now();
    workflow.duration = workflow.endTime - workflow.startTime;

    return {
      success: true,
      workflow,
      results
    };
  }
}

module.exports = new WorkflowService();