const axios = require('axios');
const AIProvider = require('../models/AIProvider');
const User = require('../models/User');

class AIService {
  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  async initializeProviders() {
    // Initialize with default OpenRouter models
    this.initializeOpenRouterModels();
  }

  initializeOpenRouterModels() {
    // Comprehensive list of OpenRouter models
    const openRouterModels = [
      // OpenAI Models
      {
        id: 'openai/gpt-4-turbo-preview',
        name: 'GPT-4 Turbo Preview',
        description: 'Latest GPT-4 model with improved capabilities',
        contextLength: 128000,
        inputCost: 0.01,
        outputCost: 0.03,
        capabilities: ['text', 'code', 'reasoning', 'analysis'],
        category: 'premium'
      },
      {
        id: 'openai/gpt-4',
        name: 'GPT-4',
        description: 'Most capable GPT-4 model',
        contextLength: 8192,
        inputCost: 0.03,
        outputCost: 0.06,
        capabilities: ['text', 'code', 'reasoning', 'analysis'],
        category: 'premium'
      },
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and efficient model for most tasks',
        contextLength: 16384,
        inputCost: 0.001,
        outputCost: 0.002,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'standard'
      },
      
      // Anthropic Models
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Most powerful Claude model',
        contextLength: 200000,
        inputCost: 0.015,
        outputCost: 0.075,
        capabilities: ['text', 'code', 'reasoning', 'analysis', 'long-context'],
        category: 'premium'
      },
      {
        id: 'anthropic/claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and cost',
        contextLength: 200000,
        inputCost: 0.003,
        outputCost: 0.015,
        capabilities: ['text', 'code', 'reasoning', 'analysis', 'long-context'],
        category: 'standard'
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast and efficient model',
        contextLength: 200000,
        inputCost: 0.00025,
        outputCost: 0.00125,
        capabilities: ['text', 'code', 'reasoning', 'long-context'],
        category: 'budget'
      },
      
      // Google Models
      {
        id: 'google/gemini-pro',
        name: 'Gemini Pro',
        description: 'Google\'s most capable model',
        contextLength: 32768,
        inputCost: 0.0005,
        outputCost: 0.0015,
        capabilities: ['text', 'code', 'reasoning', 'multimodal'],
        category: 'standard'
      },
      {
        id: 'google/gemini-pro-vision',
        name: 'Gemini Pro Vision',
        description: 'Multimodal model with vision capabilities',
        contextLength: 16384,
        inputCost: 0.0005,
        outputCost: 0.0015,
        capabilities: ['text', 'code', 'reasoning', 'vision', 'multimodal'],
        category: 'multimodal'
      },
      
      // Meta Models
      {
        id: 'meta-llama/llama-2-70b-chat',
        name: 'Llama 2 70B Chat',
        description: 'Open source model with strong performance',
        contextLength: 4096,
        inputCost: 0.0007,
        outputCost: 0.0009,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'open-source'
      },
      {
        id: 'meta-llama/llama-2-13b-chat',
        name: 'Llama 2 13B Chat',
        description: 'Efficient open source model',
        contextLength: 4096,
        inputCost: 0.0002,
        outputCost: 0.0002,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'budget'
      },
      
      // Mistral Models
      {
        id: 'mistralai/mistral-7b-instruct',
        name: 'Mistral 7B Instruct',
        description: 'Efficient instruction-following model',
        contextLength: 32768,
        inputCost: 0.0002,
        outputCost: 0.0002,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'budget'
      },
      {
        id: 'mistralai/mixtral-8x7b-instruct',
        name: 'Mixtral 8x7B Instruct',
        description: 'Mixture of experts model',
        contextLength: 32768,
        inputCost: 0.00027,
        outputCost: 0.00027,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'standard'
      },
      
      // Cohere Models
      {
        id: 'cohere/command',
        name: 'Cohere Command',
        description: 'Cohere\'s flagship model',
        contextLength: 4096,
        inputCost: 0.0015,
        outputCost: 0.002,
        capabilities: ['text', 'reasoning'],
        category: 'standard'
      },
      {
        id: 'cohere/command-light',
        name: 'Cohere Command Light',
        description: 'Faster, lighter version of Command',
        contextLength: 4096,
        inputCost: 0.0003,
        outputCost: 0.0006,
        capabilities: ['text', 'reasoning'],
        category: 'budget'
      },
      
      // Specialized Models
      {
        id: 'openai/gpt-4-vision-preview',
        name: 'GPT-4 Vision',
        description: 'Multimodal model with vision capabilities',
        contextLength: 128000,
        inputCost: 0.01,
        outputCost: 0.03,
        capabilities: ['text', 'code', 'reasoning', 'vision', 'multimodal'],
        category: 'multimodal'
      },
      {
        id: 'openai/whisper-1',
        name: 'Whisper',
        description: 'Speech-to-text model',
        contextLength: 0,
        inputCost: 0.006,
        outputCost: 0,
        capabilities: ['speech-to-text', 'audio'],
        category: 'audio'
      },
      {
        id: 'openai/dall-e-3',
        name: 'DALL-E 3',
        description: 'Text-to-image generation',
        contextLength: 0,
        inputCost: 0.04,
        outputCost: 0,
        capabilities: ['text-to-image', 'image-generation'],
        category: 'image'
      },
      
      // Code-Specific Models
      {
        id: 'deepseek/deepseek-coder',
        name: 'DeepSeek Coder',
        description: 'Specialized for code generation and understanding',
        contextLength: 16384,
        inputCost: 0.00014,
        outputCost: 0.00028,
        capabilities: ['code', 'programming', 'debugging'],
        category: 'code'
      },
      {
        id: 'bigcode/starcoder',
        name: 'StarCoder',
        description: 'Open source code generation model',
        contextLength: 8192,
        inputCost: 0.0002,
        outputCost: 0.0002,
        capabilities: ['code', 'programming'],
        category: 'code'
      },
      
      // Research Models
      {
        id: 'microsoft/wizardlm-2-8x22b',
        name: 'WizardLM 2 8x22B',
        description: 'Advanced reasoning model',
        contextLength: 65536,
        inputCost: 0.0005,
        outputCost: 0.0005,
        capabilities: ['text', 'reasoning', 'analysis'],
        category: 'research'
      },
      {
        id: 'together/llama-2-70b-chat',
        name: 'Llama 2 70B Chat (Together)',
        description: 'High-performance open source model',
        contextLength: 4096,
        inputCost: 0.0007,
        outputCost: 0.0009,
        capabilities: ['text', 'code', 'reasoning'],
        category: 'open-source'
      }
    ];

    this.providers.set('openrouter', {
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      models: openRouterModels,
      headers: {
        'Authorization': 'Bearer {API_KEY}',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://pythagora.ai',
        'X-Title': 'Pythagora AI Platform'
      }
    });
  }

  async getAvailableProviders(userId) {
    try {
      const providers = await AIProvider.getActiveProviders(userId);
      return providers.map(provider => ({
        id: provider._id,
        name: provider.name,
        displayName: provider.displayName,
        isActive: provider.isActive,
        priority: provider.priority,
        models: provider.getAvailableModels(),
        usage: provider.usage,
        settings: provider.settings
      }));
    } catch (error) {
      console.error('Error getting available providers:', error);
      throw new Error('Failed to get AI providers');
    }
  }

  async addProvider(userId, providerData) {
    try {
      const { name, displayName, apiKey, baseUrl, priority = 1 } = providerData;
      
      // Get models for the provider
      const models = this.getModelsForProvider(name);
      
      const provider = new AIProvider({
        name,
        displayName,
        apiKey,
        baseUrl,
        priority,
        models,
        user: userId
      });

      await provider.save();
      return provider;
    } catch (error) {
      console.error('Error adding provider:', error);
      throw new Error('Failed to add AI provider');
    }
  }

  async updateProvider(userId, providerId, updateData) {
    try {
      const provider = await AIProvider.findOne({ _id: providerId, user: userId });
      if (!provider) {
        throw new Error('Provider not found');
      }

      // Update provider data
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          provider[key] = updateData[key];
        }
      });

      await provider.save();
      return provider;
    } catch (error) {
      console.error('Error updating provider:', error);
      throw new Error('Failed to update AI provider');
    }
  }

  async deleteProvider(userId, providerId) {
    try {
      const result = await AIProvider.deleteOne({ _id: providerId, user: userId });
      if (result.deletedCount === 0) {
        throw new Error('Provider not found');
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting provider:', error);
      throw new Error('Failed to delete AI provider');
    }
  }

  getModelsForProvider(providerName) {
    if (providerName === 'openrouter') {
      return this.providers.get('openrouter').models;
    }
    
    // Default models for other providers
    const defaultModels = {
      openai: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          description: 'Most capable GPT-4 model',
          contextLength: 8192,
          inputCost: 0.03,
          outputCost: 0.06,
          capabilities: ['text', 'code', 'reasoning', 'analysis'],
          category: 'premium'
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          description: 'Fast and efficient model',
          contextLength: 16384,
          inputCost: 0.001,
          outputCost: 0.002,
          capabilities: ['text', 'code', 'reasoning'],
          category: 'standard'
        }
      ],
      anthropic: [
        {
          id: 'claude-3-opus',
          name: 'Claude 3 Opus',
          description: 'Most powerful Claude model',
          contextLength: 200000,
          inputCost: 0.015,
          outputCost: 0.075,
          capabilities: ['text', 'code', 'reasoning', 'analysis'],
          category: 'premium'
        },
        {
          id: 'claude-3-sonnet',
          name: 'Claude 3 Sonnet',
          description: 'Balanced performance and cost',
          contextLength: 200000,
          inputCost: 0.003,
          outputCost: 0.015,
          capabilities: ['text', 'code', 'reasoning', 'analysis'],
          category: 'standard'
        }
      ]
    };

    return defaultModels[providerName] || [];
  }

  async generateText(userId, prompt, options = {}) {
    try {
      const {
        model = 'openai/gpt-3.5-turbo',
        maxTokens = 4000,
        temperature = 0.7,
        topP = 1,
        frequencyPenalty = 0,
        presencePenalty = 0
      } = options;

      // Get the best available provider for the model
      const provider = await this.getBestProviderForModel(userId, model);
      if (!provider) {
        throw new Error('No available AI provider found');
      }

      // Prepare the request
      const requestData = this.prepareRequest(provider, model, prompt, {
        maxTokens,
        temperature,
        topP,
        frequencyPenalty,
        presencePenalty
      });

      // Make the API call
      const response = await this.makeAPICall(provider, requestData);
      
      // Update usage statistics
      const tokens = this.calculateTokens(prompt, response.choices[0].message.content);
      const cost = this.calculateCost(provider, model, tokens);
      await provider.updateUsage(tokens, cost);

      return {
        text: response.choices[0].message.content,
        model: model,
        provider: provider.name,
        usage: {
          promptTokens: tokens.input,
          completionTokens: tokens.output,
          totalTokens: tokens.total,
          cost: cost
        }
      };
    } catch (error) {
      console.error('Error generating text:', error);
      throw new Error('Failed to generate text');
    }
  }

  async getBestProviderForModel(userId, modelId) {
    try {
      const providers = await AIProvider.getActiveProviders(userId);
      
      // Find providers that have this model
      const availableProviders = providers.filter(provider => 
        provider.models.some(model => model.id === modelId)
      );

      if (availableProviders.length === 0) {
        return null;
      }

      // Return the provider with highest priority
      return availableProviders.sort((a, b) => b.priority - a.priority)[0];
    } catch (error) {
      console.error('Error getting best provider:', error);
      return null;
    }
  }

  prepareRequest(provider, model, prompt, options) {
    const baseRequest = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty
    };

    // Add provider-specific parameters
    if (provider.name === 'openrouter') {
      return {
        ...baseRequest,
        extra_headers: {
          'HTTP-Referer': 'https://pythagora.ai',
          'X-Title': 'Pythagora AI Platform'
        }
      };
    }

    return baseRequest;
  }

  async makeAPICall(provider, requestData) {
    try {
      const config = {
        method: 'POST',
        url: `${provider.baseUrl}/chat/completions`,
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
          ...provider.headers
        },
        data: requestData
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('API call failed:', error.response?.data || error.message);
      throw new Error(`API call failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  calculateTokens(prompt, response) {
    // Simple token estimation (in production, use tiktoken or similar)
    const promptTokens = Math.ceil(prompt.length / 4);
    const responseTokens = Math.ceil(response.length / 4);
    
    return {
      input: promptTokens,
      output: responseTokens,
      total: promptTokens + responseTokens
    };
  }

  calculateCost(provider, modelId, tokens) {
    const model = provider.models.find(m => m.id === modelId);
    if (!model) return 0;

    const inputCost = (tokens.input / 1000) * model.inputCost;
    const outputCost = (tokens.output / 1000) * model.outputCost;
    
    return inputCost + outputCost;
  }

  async testProvider(userId, providerId) {
    try {
      const provider = await AIProvider.findOne({ _id: providerId, user: userId });
      if (!provider) {
        throw new Error('Provider not found');
      }

      const testPrompt = 'Hello, this is a test message. Please respond with "Test successful".';
      const result = await this.generateText(userId, testPrompt, {
        model: provider.models[0]?.id || 'gpt-3.5-turbo'
      });

      return {
        success: true,
        response: result.text,
        provider: provider.name
      };
    } catch (error) {
      console.error('Provider test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new AIService();