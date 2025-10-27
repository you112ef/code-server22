const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'editor'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  type: {
    type: String,
    enum: ['web-app', 'mobile-app', 'api', 'desktop-app', 'ai-model', 'data-science'],
    default: 'web-app'
  },
  framework: {
    type: String,
    enum: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'express', 'fastapi', 'django', 'flask', 'spring', 'laravel', 'rails', 'other'],
    default: 'react'
  },
  language: {
    type: String,
    enum: ['javascript', 'typescript', 'python', 'java', 'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'other'],
    default: 'javascript'
  },
  status: {
    type: String,
    enum: ['draft', 'development', 'testing', 'staging', 'production', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private'
  },
  repository: {
    url: String,
    branch: {
      type: String,
      default: 'main'
    },
    lastSync: Date
  },
  deployment: {
    status: {
      type: String,
      enum: ['not-deployed', 'deploying', 'deployed', 'failed'],
      default: 'not-deployed'
    },
    url: String,
    provider: {
      type: String,
      enum: ['vercel', 'netlify', 'heroku', 'aws', 'gcp', 'azure', 'digitalocean', 'custom'],
      default: 'vercel'
    },
    lastDeployed: Date,
    deploymentLogs: [String]
  },
  database: {
    type: {
      type: String,
      enum: ['none', 'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'firebase'],
      default: 'none'
    },
    connectionString: String,
    collections: [String]
  },
  apis: [{
    name: String,
    endpoint: String,
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    description: String,
    parameters: [{
      name: String,
      type: String,
      required: Boolean,
      description: String
    }],
    response: mongoose.Schema.Types.Mixed
  }],
  tests: {
    total: {
      type: Number,
      default: 0
    },
    passed: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    coverage: {
      type: Number,
      default: 0
    },
    lastRun: Date
  },
  monitoring: {
    uptime: {
      type: Number,
      default: 0
    },
    performance: {
      averageResponseTime: Number,
      requestsPerMinute: Number,
      errorRate: Number
    },
    lastChecked: Date
  },
  aiFeatures: {
    codeGeneration: {
      enabled: {
        type: Boolean,
        default: true
      },
      model: {
        type: String,
        default: 'gpt-4'
      },
      tokensUsed: {
        type: Number,
        default: 0
      }
    },
    debugging: {
      enabled: {
        type: Boolean,
        default: true
      },
      autoFix: {
        type: Boolean,
        default: false
      }
    },
    testing: {
      autoGenerate: {
        type: Boolean,
        default: false
      },
      smartCoverage: {
        type: Boolean,
        default: false
      }
    }
  },
  settings: {
    autoSave: {
      type: Boolean,
      default: true
    },
    realTimeCollaboration: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  tags: [String],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
projectSchema.index({ owner: 1 });
projectSchema.index({ 'collaborators.user': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ type: 1 });
projectSchema.index({ visibility: 1 });
projectSchema.index({ createdAt: -1 });

// Virtual for total collaborators
projectSchema.virtual('totalCollaborators').get(function() {
  return this.collaborators.length + 1; // +1 for owner
});

// Method to check if user can access project
projectSchema.methods.canAccess = function(userId) {
  if (this.owner.toString() === userId.toString()) return true;
  return this.collaborators.some(collab => 
    collab.user.toString() === userId.toString()
  );
};

// Method to check user role in project
projectSchema.methods.getUserRole = function(userId) {
  if (this.owner.toString() === userId.toString()) return 'owner';
  const collaborator = this.collaborators.find(collab => 
    collab.user.toString() === userId.toString()
  );
  return collaborator ? collaborator.role : null;
};

// Method to add collaborator
projectSchema.methods.addCollaborator = function(userId, role = 'editor') {
  const existingCollab = this.collaborators.find(collab => 
    collab.user.toString() === userId.toString()
  );
  
  if (!existingCollab) {
    this.collaborators.push({
      user: userId,
      role: role,
      joinedAt: new Date()
    });
  }
};

// Method to remove collaborator
projectSchema.methods.removeCollaborator = function(userId) {
  this.collaborators = this.collaborators.filter(collab => 
    collab.user.toString() !== userId.toString()
  );
};

module.exports = mongoose.model('Project', projectSchema);