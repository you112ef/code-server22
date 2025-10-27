const mongoose = require('mongoose');

const aiProviderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['openai', 'anthropic', 'openrouter', 'custom']
  },
  displayName: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  baseUrl: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1
  },
  models: [{
    id: String,
    name: String,
    description: String,
    contextLength: Number,
    inputCost: Number,
    outputCost: Number,
    isAvailable: {
      type: Boolean,
      default: true
    },
    capabilities: [String],
    category: String
  }],
  limits: {
    requestsPerMinute: Number,
    requestsPerDay: Number,
    tokensPerMinute: Number,
    tokensPerDay: Number
  },
  settings: {
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2
    },
    maxTokens: {
      type: Number,
      default: 4000
    },
    topP: {
      type: Number,
      default: 1,
      min: 0,
      max: 1
    },
    frequencyPenalty: {
      type: Number,
      default: 0,
      min: -2,
      max: 2
    },
    presencePenalty: {
      type: Number,
      default: 0,
      min: -2,
      max: 2
    }
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    lastUsed: Date
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
aiProviderSchema.index({ user: 1, name: 1 });
aiProviderSchema.index({ user: 1, isActive: 1 });

// Virtual for API key masking
aiProviderSchema.virtual('maskedApiKey').get(function() {
  if (!this.apiKey) return '';
  return this.apiKey.substring(0, 8) + '...' + this.apiKey.substring(this.apiKey.length - 4);
});

// Method to update usage
aiProviderSchema.methods.updateUsage = function(tokens, cost = 0) {
  this.usage.totalRequests += 1;
  this.usage.totalTokens += tokens;
  this.usage.totalCost += cost;
  this.usage.lastUsed = new Date();
  return this.save();
};

// Method to check if provider is available
aiProviderSchema.methods.isAvailable = function() {
  return this.isActive && this.apiKey && this.apiKey.length > 0;
};

// Method to get available models
aiProviderSchema.methods.getAvailableModels = function() {
  return this.models.filter(model => model.isAvailable);
};

// Static method to get active providers for user
aiProviderSchema.statics.getActiveProviders = function(userId) {
  return this.find({ user: userId, isActive: true }).sort({ priority: 1 });
};

// Static method to get provider by name for user
aiProviderSchema.statics.getProviderByName = function(userId, providerName) {
  return this.findOne({ user: userId, name: providerName, isActive: true });
};

module.exports = mongoose.model('AIProvider', aiProviderSchema);