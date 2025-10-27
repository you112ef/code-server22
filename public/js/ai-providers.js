// AI Providers Management JavaScript
class AIProvidersManager {
    constructor() {
        this.providers = [];
        this.models = [];
        this.currentProvider = null;
        this.init();
    }

    init() {
        this.loadProviders();
        this.initEventListeners();
    }

    initEventListeners() {
        // Add provider form
        const addProviderBtn = document.getElementById('add-provider-btn');
        if (addProviderBtn) {
            addProviderBtn.addEventListener('click', () => {
                this.showAddProviderModal();
            });
        }

        // Provider form submission
        const providerForm = document.getElementById('provider-form');
        if (providerForm) {
            providerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addProvider();
            });
        }

        // Test provider button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('test-provider-btn')) {
                const providerId = e.target.getAttribute('data-provider-id');
                this.testProvider(providerId);
            }
        });

        // Delete provider button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-provider-btn')) {
                const providerId = e.target.getAttribute('data-provider-id');
                this.deleteProvider(providerId);
            }
        });

        // Edit provider button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-provider-btn')) {
                const providerId = e.target.getAttribute('data-provider-id');
                this.editProvider(providerId);
            }
        });
    }

    async loadProviders() {
        try {
            const response = await fetch('/api/ai-providers', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.providers = data.data.providers;
                this.renderProviders();
            }
        } catch (error) {
            console.error('Failed to load providers:', error);
            this.showNotification('Failed to load AI providers', 'error');
        }
    }

    async loadAllModels() {
        try {
            const response = await fetch('/api/ai-providers/models/all', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.models = data.data.models;
                this.modelsByCategory = data.data.modelsByCategory;
                return data.data;
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            return null;
        }
    }

    renderProviders() {
        const providersContainer = document.getElementById('providers-container');
        if (!providersContainer) return;

        if (this.providers.length === 0) {
            providersContainer.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                    <h3>No AI Providers Configured</h3>
                    <p>Add your first AI provider to start using advanced AI features</p>
                    <button class="btn btn-primary" onclick="aiProvidersManager.showAddProviderModal()">
                        Add AI Provider
                    </button>
                </div>
            `;
            return;
        }

        providersContainer.innerHTML = this.providers.map(provider => `
            <div class="provider-card ${provider.isActive ? 'active' : 'inactive'}">
                <div class="provider-header">
                    <div class="provider-info">
                        <h3>${provider.displayName}</h3>
                        <p class="provider-type">${provider.name.toUpperCase()}</p>
                        <div class="provider-status">
                            <span class="status-dot ${provider.isActive ? 'active' : 'inactive'}"></span>
                            ${provider.isActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                    <div class="provider-actions">
                        <button class="btn btn-secondary test-provider-btn" data-provider-id="${provider.id}" title="Test Provider">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12l2 2 4-4"/>
                                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.3 0 2.5.28 3.6.8"/>
                            </svg>
                        </button>
                        <button class="btn btn-secondary edit-provider-btn" data-provider-id="${provider.id}" title="Edit Provider">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn btn-danger delete-provider-btn" data-provider-id="${provider.id}" title="Delete Provider">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="provider-details">
                    <div class="provider-stats">
                        <div class="stat">
                            <span class="stat-label">Models</span>
                            <span class="stat-value">${provider.models.length}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Requests</span>
                            <span class="stat-value">${provider.usage.totalRequests.toLocaleString()}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Tokens</span>
                            <span class="stat-value">${provider.usage.totalTokens.toLocaleString()}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Cost</span>
                            <span class="stat-value">$${provider.usage.totalCost.toFixed(4)}</span>
                        </div>
                    </div>
                    
                    <div class="provider-models">
                        <h4>Available Models</h4>
                        <div class="models-list">
                            ${provider.models.slice(0, 3).map(model => `
                                <span class="model-tag ${model.category}">${model.name}</span>
                            `).join('')}
                            ${provider.models.length > 3 ? `<span class="model-more">+${provider.models.length - 3} more</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    showAddProviderModal() {
        const modal = document.getElementById('add-provider-modal');
        if (modal) {
            modal.style.display = 'block';
            this.populateProviderOptions();
        }
    }

    hideAddProviderModal() {
        const modal = document.getElementById('add-provider-modal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('provider-form').reset();
        }
    }

    populateProviderOptions() {
        const providerSelect = document.getElementById('provider-type');
        if (providerSelect) {
            providerSelect.innerHTML = `
                <option value="">Select Provider Type</option>
                <option value="openrouter">OpenRouter (All Models)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">Custom Provider</option>
            `;
        }
    }

    async addProvider() {
        const formData = new FormData(document.getElementById('provider-form'));
        const providerData = {
            name: formData.get('provider-type'),
            displayName: formData.get('display-name'),
            apiKey: formData.get('api-key'),
            baseUrl: formData.get('base-url') || null,
            priority: parseInt(formData.get('priority')) || 1
        };

        try {
            const response = await fetch('/api/ai-providers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify(providerData)
            });

            if (response.ok) {
                this.showNotification('AI provider added successfully!', 'success');
                this.hideAddProviderModal();
                this.loadProviders();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to add provider', 'error');
            }
        } catch (error) {
            console.error('Add provider error:', error);
            this.showNotification('Failed to add provider', 'error');
        }
    }

    async testProvider(providerId) {
        const button = document.querySelector(`[data-provider-id="${providerId}"]`);
        if (button) {
            button.disabled = true;
            button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg> Testing...';
        }

        try {
            const response = await fetch(`/api/ai-providers/${providerId}/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.data.success) {
                    this.showNotification('Provider test successful!', 'success');
                } else {
                    this.showNotification(`Provider test failed: ${result.data.error}`, 'error');
                }
            } else {
                this.showNotification('Provider test failed', 'error');
            }
        } catch (error) {
            console.error('Test provider error:', error);
            this.showNotification('Failed to test provider', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.3 0 2.5.28 3.6.8"/></svg>';
            }
        }
    }

    async deleteProvider(providerId) {
        if (!confirm('Are you sure you want to delete this AI provider?')) {
            return;
        }

        try {
            const response = await fetch(`/api/ai-providers/${providerId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });

            if (response.ok) {
                this.showNotification('Provider deleted successfully!', 'success');
                this.loadProviders();
            } else {
                this.showNotification('Failed to delete provider', 'error');
            }
        } catch (error) {
            console.error('Delete provider error:', error);
            this.showNotification('Failed to delete provider', 'error');
        }
    }

    async editProvider(providerId) {
        const provider = this.providers.find(p => p.id === providerId);
        if (!provider) return;

        // Show edit modal with pre-filled data
        const modal = document.getElementById('edit-provider-modal');
        if (modal) {
            document.getElementById('edit-provider-id').value = providerId;
            document.getElementById('edit-display-name').value = provider.displayName;
            document.getElementById('edit-api-key').value = provider.apiKey ? '••••••••' : '';
            document.getElementById('edit-base-url').value = provider.baseUrl || '';
            document.getElementById('edit-priority').value = provider.priority;
            modal.style.display = 'block';
        }
    }

    async updateProvider() {
        const formData = new FormData(document.getElementById('edit-provider-form'));
        const providerId = formData.get('provider-id');
        const updateData = {
            displayName: formData.get('display-name'),
            priority: parseInt(formData.get('priority'))
        };

        // Only update API key if it's not masked
        const apiKey = formData.get('api-key');
        if (apiKey && !apiKey.includes('••••')) {
            updateData.apiKey = apiKey;
        }

        const baseUrl = formData.get('base-url');
        if (baseUrl) {
            updateData.baseUrl = baseUrl;
        }

        try {
            const response = await fetch(`/api/ai-providers/${providerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                this.showNotification('Provider updated successfully!', 'success');
                this.hideEditProviderModal();
                this.loadProviders();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to update provider', 'error');
            }
        } catch (error) {
            console.error('Update provider error:', error);
            this.showNotification('Failed to update provider', 'error');
        }
    }

    hideEditProviderModal() {
        const modal = document.getElementById('edit-provider-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Use the app's notification system if available
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aiProvidersManager = new AIProvidersManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIProvidersManager;
}