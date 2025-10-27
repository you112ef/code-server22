const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['capy', 'same', 'kilo', 'cline', 'assistant', 'custom']
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  capabilities: [{
    name: String,
    description: String,
    category: String,
    parameters: mongoose.Schema.Types.Mixed,
    isEnabled: {
      type: Boolean,
      default: true
    }
  }],
  tools: [{
    name: String,
    type: String,
    description: String,
    configuration: mongoose.Schema.Types.Mixed,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  workflow: {
    steps: [{
      id: String,
      name: String,
      type: String,
      description: String,
      parameters: mongoose.Schema.Types.Mixed,
      dependencies: [String],
      timeout: Number,
      retryCount: Number,
      isParallel: Boolean
    }],
    triggers: [{
      type: String,
      condition: String,
      action: String
    }],
    errorHandling: {
      strategy: String,
      fallbackActions: [String],
      retryPolicy: mongoose.Schema.Types.Mixed
    }
  },
  configuration: {
    apiKeys: mongoose.Schema.Types.Mixed,
    endpoints: mongoose.Schema.Types.Mixed,
    settings: mongoose.Schema.Types.Mixed,
    limits: {
      maxConcurrentTasks: Number,
      maxExecutionTime: Number,
      maxRetries: Number
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error'],
    default: 'active'
  },
  performance: {
    totalExecutions: {
      type: Number,
      default: 0
    },
    successfulExecutions: {
      type: Number,
      default: 0
    },
    failedExecutions: {
      type: Number,
      default: 0
    },
    averageExecutionTime: {
      type: Number,
      default: 0
    },
    lastExecution: Date,
    uptime: {
      type: Number,
      default: 100
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
agentSchema.index({ user: 1, type: 1 });
agentSchema.index({ user: 1, status: 1 });
agentSchema.index({ project: 1 });

// Virtual for success rate
agentSchema.virtual('successRate').get(function() {
  if (this.performance.totalExecutions === 0) return 0;
  return (this.performance.successfulExecutions / this.performance.totalExecutions) * 100;
});

// Method to execute agent workflow
agentSchema.methods.executeWorkflow = async function(input, context = {}) {
  const startTime = Date.now();
  
  try {
    this.performance.totalExecutions += 1;
    
    const results = [];
    const executedSteps = new Set();
    
    // Execute workflow steps
    for (const step of this.workflow.steps) {
      if (executedSteps.has(step.id)) continue;
      
      // Check dependencies
      const dependenciesMet = step.dependencies.every(dep => executedSteps.has(dep));
      if (!dependenciesMet) continue;
      
      const stepResult = await this.executeStep(step, input, context, results);
      results.push({
        stepId: step.id,
        stepName: step.name,
        result: stepResult,
        timestamp: new Date(),
        executionTime: Date.now() - startTime
      });
      
      executedSteps.add(step.id);
    }
    
    this.performance.successfulExecutions += 1;
    this.performance.lastExecution = new Date();
    this.performance.averageExecutionTime = 
      (this.performance.averageExecutionTime + (Date.now() - startTime)) / 2;
    
    await this.save();
    
    return {
      success: true,
      results,
      executionTime: Date.now() - startTime,
      agent: this.name
    };
    
  } catch (error) {
    this.performance.failedExecutions += 1;
    this.performance.lastExecution = new Date();
    await this.save();
    
    throw error;
  }
};

// Method to execute individual step
agentSchema.methods.executeStep = async function(step, input, context, previousResults) {
  const stepStartTime = Date.now();
  
  try {
    switch (step.type) {
      case 'ai_generation':
        return await this.executeAIGeneration(step, input, context);
      case 'code_analysis':
        return await this.executeCodeAnalysis(step, input, context);
      case 'file_operation':
        return await this.executeFileOperation(step, input, context);
      case 'git_operation':
        return await this.executeGitOperation(step, input, context);
      case 'deployment':
        return await this.executeDeployment(step, input, context);
      case 'testing':
        return await this.executeTesting(step, input, context);
      case 'api_call':
        return await this.executeAPICall(step, input, context);
      case 'database_operation':
        return await this.executeDatabaseOperation(step, input, context);
      case 'notification':
        return await this.executeNotification(step, input, context);
      case 'custom':
        return await this.executeCustomStep(step, input, context);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  } catch (error) {
    console.error(`Error executing step ${step.name}:`, error);
    
    // Handle retries
    if (step.retryCount > 0) {
      step.retryCount -= 1;
      return await this.executeStep(step, input, context, previousResults);
    }
    
    throw error;
  }
};

// AI Generation step execution
agentSchema.methods.executeAIGeneration = async function(step, input, context) {
  const aiService = require('../services/aiService');
  
  const prompt = this.buildPrompt(step.parameters.prompt, input, context);
  const model = step.parameters.model || 'openai/gpt-4';
  
  const result = await aiService.generateText(
    this.user,
    prompt,
    {
      model,
      maxTokens: step.parameters.maxTokens || 4000,
      temperature: step.parameters.temperature || 0.7
    }
  );
  
  return {
    type: 'ai_generation',
    content: result.text,
    model: result.model,
    provider: result.provider,
    usage: result.usage
  };
};

// Code Analysis step execution
agentSchema.methods.executeCodeAnalysis = async function(step, input, context) {
  const codeAnalysisService = require('../services/codeAnalysisService');
  
  const analysis = await codeAnalysisService.analyzeCode(
    input.code,
    {
      language: step.parameters.language,
      analysisType: step.parameters.analysisType,
      includeMetrics: step.parameters.includeMetrics
    }
  );
  
  return {
    type: 'code_analysis',
    analysis,
    metrics: analysis.metrics,
    suggestions: analysis.suggestions
  };
};

// File Operation step execution
agentSchema.methods.executeFileOperation = async function(step, input, context) {
  const fileService = require('../services/fileService');
  
  switch (step.parameters.operation) {
    case 'create':
      return await fileService.createFile(
        step.parameters.path,
        step.parameters.content,
        this.project
      );
    case 'update':
      return await fileService.updateFile(
        step.parameters.path,
        step.parameters.content,
        this.project
      );
    case 'delete':
      return await fileService.deleteFile(
        step.parameters.path,
        this.project
      );
    case 'read':
      return await fileService.readFile(
        step.parameters.path,
        this.project
      );
    default:
      throw new Error(`Unknown file operation: ${step.parameters.operation}`);
  }
};

// Git Operation step execution
agentSchema.methods.executeGitOperation = async function(step, input, context) {
  const gitService = require('../services/gitService');
  
  switch (step.parameters.operation) {
    case 'commit':
      return await gitService.commit(
        this.project,
        step.parameters.message,
        step.parameters.files
      );
    case 'push':
      return await gitService.push(
        this.project,
        step.parameters.branch
      );
    case 'pull':
      return await gitService.pull(
        this.project,
        step.parameters.branch
      );
    case 'create_branch':
      return await gitService.createBranch(
        this.project,
        step.parameters.branchName
      );
    case 'merge':
      return await gitService.merge(
        this.project,
        step.parameters.sourceBranch,
        step.parameters.targetBranch
      );
    default:
      throw new Error(`Unknown git operation: ${step.parameters.operation}`);
  }
};

// Deployment step execution
agentSchema.methods.executeDeployment = async function(step, input, context) {
  const deploymentService = require('../services/deploymentService');
  
  return await deploymentService.deploy(
    this.project,
    {
      provider: step.parameters.provider,
      environment: step.parameters.environment,
      configuration: step.parameters.configuration
    }
  );
};

// Testing step execution
agentSchema.methods.executeTesting = async function(step, input, context) {
  const testingService = require('../services/testingService');
  
  return await testingService.runTests(
    this.project,
    {
      testType: step.parameters.testType,
      testFiles: step.parameters.testFiles,
      configuration: step.parameters.configuration
    }
  );
};

// API Call step execution
agentSchema.methods.executeAPICall = async function(step, input, context) {
  const apiService = require('../services/apiService');
  
  return await apiService.makeRequest(
    step.parameters.url,
    {
      method: step.parameters.method,
      headers: step.parameters.headers,
      body: step.parameters.body,
      timeout: step.parameters.timeout
    }
  );
};

// Database Operation step execution
agentSchema.methods.executeDatabaseOperation = async function(step, input, context) {
  const databaseService = require('../services/databaseService');
  
  switch (step.parameters.operation) {
    case 'query':
      return await databaseService.query(
        this.project,
        step.parameters.query,
        step.parameters.parameters
      );
    case 'insert':
      return await databaseService.insert(
        this.project,
        step.parameters.table,
        step.parameters.data
      );
    case 'update':
      return await databaseService.update(
        this.project,
        step.parameters.table,
        step.parameters.data,
        step.parameters.where
      );
    case 'delete':
      return await databaseService.delete(
        this.project,
        step.parameters.table,
        step.parameters.where
      );
    default:
      throw new Error(`Unknown database operation: ${step.parameters.operation}`);
  }
};

// Notification step execution
agentSchema.methods.executeNotification = async function(step, input, context) {
  const notificationService = require('../services/notificationService');
  
  return await notificationService.send(
    step.parameters.type,
    {
      recipient: step.parameters.recipient,
      subject: step.parameters.subject,
      message: step.parameters.message,
      data: step.parameters.data
    }
  );
};

// Custom step execution
agentSchema.methods.executeCustomStep = async function(step, input, context) {
  // This would execute custom user-defined logic
  // For now, we'll implement a basic custom step handler
  const customService = require('../services/customService');
  
  return await customService.execute(
    step.parameters.handler,
    {
      input,
      context,
      parameters: step.parameters
    }
  );
};

// Build prompt with context
agentSchema.methods.buildPrompt = function(template, input, context) {
  let prompt = template;
  
  // Replace placeholders
  prompt = prompt.replace(/\{input\}/g, JSON.stringify(input, null, 2));
  prompt = prompt.replace(/\{context\}/g, JSON.stringify(context, null, 2));
  prompt = prompt.replace(/\{project\}/g, this.project?.name || 'Unknown Project');
  prompt = prompt.replace(/\{user\}/g, this.user?.name || 'Unknown User');
  
  return prompt;
};

// Static method to get agents by type
agentSchema.statics.getByType = function(userId, type) {
  return this.find({ user: userId, type, status: 'active' });
};

// Static method to get agents by project
agentSchema.statics.getByProject = function(projectId) {
  return this.find({ project: projectId, status: 'active' });
};

module.exports = mongoose.model('Agent', agentSchema);