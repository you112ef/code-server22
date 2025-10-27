// Advanced Agent Management JavaScript
class AgentManager {
    constructor() {
        this.agents = [];
        this.workflows = [];
        this.tools = [];
        this.templates = [];
        this.activeWorkflows = new Map();
        this.init();
    }

    init() {
        this.loadAgents();
        this.loadTools();
        this.loadTemplates();
        this.initEventListeners();
        this.initWebSocket();
    }

    initEventListeners() {
        // Agent management
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('create-agent-btn')) {
                this.showCreateAgentModal();
            }
            if (e.target.classList.contains('edit-agent-btn')) {
                const agentId = e.target.getAttribute('data-agent-id');
                this.editAgent(agentId);
            }
            if (e.target.classList.contains('delete-agent-btn')) {
                const agentId = e.target.getAttribute('data-agent-id');
                this.deleteAgent(agentId);
            }
            if (e.target.classList.contains('execute-agent-btn')) {
                const agentId = e.target.getAttribute('data-agent-id');
                this.executeAgent(agentId);
            }
            if (e.target.classList.contains('test-agent-btn')) {
                const agentId = e.target.getAttribute('data-agent-id');
                this.testAgent(agentId);
            }
        });

        // Workflow management
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('create-workflow-btn')) {
                this.showCreateWorkflowModal();
            }
            if (e.target.classList.contains('execute-workflow-btn')) {
                const workflowId = e.target.getAttribute('data-workflow-id');
                this.executeWorkflow(workflowId);
            }
            if (e.target.classList.contains('stop-workflow-btn')) {
                const workflowId = e.target.getAttribute('data-workflow-id');
                this.stopWorkflow(workflowId);
            }
            if (e.target.classList.contains('pause-workflow-btn')) {
                const workflowId = e.target.getAttribute('data-workflow-id');
                this.pauseWorkflow(workflowId);
            }
            if (e.target.classList.contains('resume-workflow-btn')) {
                const workflowId = e.target.getAttribute('data-workflow-id');
                this.resumeWorkflow(workflowId);
            }
        });

        // Tool execution
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('execute-tool-btn')) {
                const toolId = e.target.getAttribute('data-tool-id');
                this.executeTool(toolId);
            }
        });
    }

    initWebSocket() {
        if (window.io) {
            this.socket = window.io();
            
            this.socket.on('workflow:started', (data) => {
                this.handleWorkflowStarted(data);
            });
            
            this.socket.on('workflow:completed', (data) => {
                this.handleWorkflowCompleted(data);
            });
            
            this.socket.on('workflow:step:completed', (data) => {
                this.handleWorkflowStepCompleted(data);
            });
            
            this.socket.on('workflow:error', (data) => {
                this.handleWorkflowError(data);
            });
        }
    }

    async loadAgents() {
        try {
            const response = await fetch('/api/agents', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.agents = data.data.agents;
                this.renderAgents();
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
            this.showNotification('Failed to load agents', 'error');
        }
    }

    async loadTools() {
        try {
            const response = await fetch('/api/agents/tools/available', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.tools = data.data.tools;
                this.renderTools();
            }
        } catch (error) {
            console.error('Failed to load tools:', error);
        }
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/agents/workflows/templates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.templates = data.data.templates;
                this.renderTemplates();
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    renderAgents() {
        const agentsContainer = document.getElementById('agents-container');
        if (!agentsContainer) return;

        if (this.agents.length === 0) {
            agentsContainer.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    <h3>No Agents Configured</h3>
                    <p>Create your first AI agent to start automating tasks</p>
                    <button class="btn btn-primary create-agent-btn">
                        Create Agent
                    </button>
                </div>
            `;
            return;
        }

        agentsContainer.innerHTML = this.agents.map(agent => `
            <div class="agent-card ${agent.status}">
                <div class="agent-header">
                    <div class="agent-info">
                        <h3>${agent.displayName}</h3>
                        <p class="agent-type">${agent.type.toUpperCase()}</p>
                        <div class="agent-status">
                            <span class="status-dot ${agent.status}"></span>
                            ${agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                        </div>
                    </div>
                    <div class="agent-actions">
                        <button class="btn btn-secondary test-agent-btn" data-agent-id="${agent._id}" title="Test Agent">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 12l2 2 4-4"/>
                                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.3 0 2.5.28 3.6.8"/>
                            </svg>
                        </button>
                        <button class="btn btn-primary execute-agent-btn" data-agent-id="${agent._id}" title="Execute Agent">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5,3 19,12 5,21"/>
                            </svg>
                        </button>
                        <button class="btn btn-secondary edit-agent-btn" data-agent-id="${agent._id}" title="Edit Agent">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn btn-danger delete-agent-btn" data-agent-id="${agent._id}" title="Delete Agent">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="agent-details">
                    <p class="agent-description">${agent.description}</p>
                    
                    <div class="agent-capabilities">
                        <h4>Capabilities</h4>
                        <div class="capabilities-list">
                            ${agent.capabilities.slice(0, 3).map(cap => `
                                <span class="capability-tag">${cap.name}</span>
                            `).join('')}
                            ${agent.capabilities.length > 3 ? `<span class="capability-more">+${agent.capabilities.length - 3} more</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="agent-tools">
                        <h4>Tools</h4>
                        <div class="tools-list">
                            ${agent.tools.slice(0, 3).map(tool => `
                                <span class="tool-tag">${tool.name}</span>
                            `).join('')}
                            ${agent.tools.length > 3 ? `<span class="tool-more">+${agent.tools.length - 3} more</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="agent-performance">
                        <div class="performance-metric">
                            <span class="metric-label">Success Rate</span>
                            <span class="metric-value">${agent.successRate.toFixed(1)}%</span>
                        </div>
                        <div class="performance-metric">
                            <span class="metric-label">Executions</span>
                            <span class="metric-value">${agent.performance.totalExecutions}</span>
                        </div>
                        <div class="performance-metric">
                            <span class="metric-label">Avg Time</span>
                            <span class="metric-value">${(agent.performance.averageExecutionTime / 1000).toFixed(1)}s</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderTools() {
        const toolsContainer = document.getElementById('tools-container');
        if (!toolsContainer) return;

        // Group tools by category
        const toolsByCategory = this.tools.reduce((acc, tool) => {
            const category = tool.category || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(tool);
            return acc;
        }, {});

        toolsContainer.innerHTML = Object.keys(toolsByCategory).map(category => `
            <div class="tools-category">
                <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                <div class="tools-grid">
                    ${toolsByCategory[category].map(tool => `
                        <div class="tool-card">
                            <h4>${tool.name}</h4>
                            <p>${tool.description}</p>
                            <button class="btn btn-primary execute-tool-btn" data-tool-id="${tool.id}">
                                Execute
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    renderTemplates() {
        const templatesContainer = document.getElementById('templates-container');
        if (!templatesContainer) return;

        templatesContainer.innerHTML = this.templates.map(template => `
            <div class="template-card">
                <h3>${template.name}</h3>
                <p>${template.description}</p>
                <div class="template-steps">
                    <span class="step-count">${template.steps.length} steps</span>
                </div>
                <button class="btn btn-primary" onclick="agentManager.createWorkflowFromTemplate('${template.id}')">
                    Use Template
                </button>
            </div>
        `).join('');
    }

    showCreateAgentModal() {
        const modal = document.getElementById('create-agent-modal');
        if (modal) {
            modal.style.display = 'block';
            this.populateAgentTypes();
        }
    }

    hideCreateAgentModal() {
        const modal = document.getElementById('create-agent-modal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('create-agent-form').reset();
        }
    }

    populateAgentTypes() {
        const typeSelect = document.getElementById('agent-type');
        if (typeSelect) {
            typeSelect.innerHTML = `
                <option value="">Select Agent Type</option>
                <option value="capy">Capy.ai - AI Software Engineer</option>
                <option value="same">Same.new - UI Generation</option>
                <option value="kilo">Kilo Agent - Task Management</option>
                <option value="cline">Cline - Code Editing</option>
                <option value="assistant">AI Assistant - Complete</option>
                <option value="custom">Custom Agent</option>
            `;
        }
    }

    async createAgent() {
        const formData = new FormData(document.getElementById('create-agent-form'));
        const agentData = {
            name: formData.get('agent-name'),
            type: formData.get('agent-type'),
            displayName: formData.get('display-name'),
            description: formData.get('description'),
            project: formData.get('project-id') || null
        };

        try {
            const response = await fetch('/api/agents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify(agentData)
            });

            if (response.ok) {
                this.showNotification('Agent created successfully!', 'success');
                this.hideCreateAgentModal();
                this.loadAgents();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to create agent', 'error');
            }
        } catch (error) {
            console.error('Create agent error:', error);
            this.showNotification('Failed to create agent', 'error');
        }
    }

    async executeAgent(agentId) {
        const agent = this.agents.find(a => a._id === agentId);
        if (!agent) return;

        const input = prompt('Enter input for the agent:');
        if (!input) return;

        try {
            const response = await fetch(`/api/agents/${agentId}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify({ input })
            });

            if (response.ok) {
                const result = await response.json();
                this.showExecutionResult(agent, result.data);
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to execute agent', 'error');
            }
        } catch (error) {
            console.error('Execute agent error:', error);
            this.showNotification('Failed to execute agent', 'error');
        }
    }

    async testAgent(agentId) {
        try {
            const response = await fetch(`/api/agents/${agentId}/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('Agent test completed successfully!', 'success');
                console.log('Test result:', result.data);
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Agent test failed', 'error');
            }
        } catch (error) {
            console.error('Test agent error:', error);
            this.showNotification('Failed to test agent', 'error');
        }
    }

    async deleteAgent(agentId) {
        if (!confirm('Are you sure you want to delete this agent?')) {
            return;
        }

        try {
            const response = await fetch(`/api/agents/${agentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });

            if (response.ok) {
                this.showNotification('Agent deleted successfully!', 'success');
                this.loadAgents();
            } else {
                this.showNotification('Failed to delete agent', 'error');
            }
        } catch (error) {
            console.error('Delete agent error:', error);
            this.showNotification('Failed to delete agent', 'error');
        }
    }

    async executeTool(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        const parameters = prompt(`Enter parameters for ${tool.name} (JSON format):`);
        if (!parameters) return;

        try {
            const parsedParams = JSON.parse(parameters);
            
            const response = await fetch('/api/agents/tools/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify({
                    toolId,
                    parameters: parsedParams
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showToolResult(tool, result.data);
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to execute tool', 'error');
            }
        } catch (error) {
            console.error('Execute tool error:', error);
            this.showNotification('Failed to execute tool', 'error');
        }
    }

    async createWorkflowFromTemplate(templateId) {
        try {
            const response = await fetch('/api/agents/workflows/from-template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify({ templateId })
            });

            if (response.ok) {
                const result = await response.json();
                this.showWorkflowEditor(result.data.workflow);
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to create workflow', 'error');
            }
        } catch (error) {
            console.error('Create workflow error:', error);
            this.showNotification('Failed to create workflow', 'error');
        }
    }

    showExecutionResult(agent, result) {
        const modal = document.getElementById('execution-result-modal');
        if (modal) {
            document.getElementById('execution-result-content').innerHTML = `
                <h3>Execution Result - ${agent.displayName}</h3>
                <div class="result-details">
                    <p><strong>Success:</strong> ${result.success ? 'Yes' : 'No'}</p>
                    <p><strong>Duration:</strong> ${result.duration}ms</p>
                    ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                </div>
                <div class="result-content">
                    <pre>${JSON.stringify(result.results, null, 2)}</pre>
                </div>
            `;
            modal.style.display = 'block';
        }
    }

    showToolResult(tool, result) {
        const modal = document.getElementById('tool-result-modal');
        if (modal) {
            document.getElementById('tool-result-content').innerHTML = `
                <h3>Tool Result - ${tool.name}</h3>
                <div class="result-details">
                    <p><strong>Success:</strong> ${result.success ? 'Yes' : 'No'}</p>
                    ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                </div>
                <div class="result-content">
                    <pre>${JSON.stringify(result, null, 2)}</pre>
                </div>
            `;
            modal.style.display = 'block';
        }
    }

    showWorkflowEditor(workflow) {
        const modal = document.getElementById('workflow-editor-modal');
        if (modal) {
            document.getElementById('workflow-editor-content').innerHTML = `
                <h3>Workflow Editor - ${workflow.name}</h3>
                <div class="workflow-steps">
                    ${workflow.steps.map(step => `
                        <div class="workflow-step">
                            <h4>${step.name}</h4>
                            <p>${step.description}</p>
                            <span class="step-type">${step.type}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="workflow-actions">
                    <button class="btn btn-primary" onclick="agentManager.executeWorkflow('${workflow.id}')">
                        Execute Workflow
                    </button>
                </div>
            `;
            modal.style.display = 'block';
        }
    }

    // WebSocket event handlers
    handleWorkflowStarted(data) {
        this.showNotification(`Workflow ${data.workflowId} started`, 'info');
        this.activeWorkflows.set(data.workflowId, data.workflow);
        this.updateWorkflowStatus(data.workflowId, 'running');
    }

    handleWorkflowCompleted(data) {
        this.showNotification(`Workflow ${data.workflowId} completed`, 'success');
        this.updateWorkflowStatus(data.workflowId, 'completed');
    }

    handleWorkflowStepCompleted(data) {
        this.updateWorkflowStep(data.workflowId, data.step, data.result);
    }

    handleWorkflowError(data) {
        this.showNotification(`Workflow ${data.workflowId} failed: ${data.error}`, 'error');
        this.updateWorkflowStatus(data.workflowId, 'failed');
    }

    updateWorkflowStatus(workflowId, status) {
        const workflowElement = document.querySelector(`[data-workflow-id="${workflowId}"]`);
        if (workflowElement) {
            workflowElement.classList.remove('running', 'completed', 'failed');
            workflowElement.classList.add(status);
        }
    }

    updateWorkflowStep(workflowId, step, result) {
        // Update UI to show step completion
        console.log(`Workflow ${workflowId} step ${step.name} completed:`, result);
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
    window.agentManager = new AgentManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentManager;
}