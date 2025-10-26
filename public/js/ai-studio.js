// AI Studio JavaScript
class AIStudio {
    constructor() {
        this.currentProject = null;
        this.isGenerating = false;
        this.init();
    }

    init() {
        this.initTabs();
        this.initCodeGeneration();
        this.initCodeReview();
        this.initDebugging();
        this.initTestGeneration();
    }

    initTabs() {
        const tabs = document.querySelectorAll('.ai-tab');
        const tabContents = document.querySelectorAll('.ai-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    initCodeGeneration() {
        const generateBtn = document.getElementById('generate-code-btn');
        const promptTextarea = document.getElementById('ai-prompt');
        const languageSelect = document.getElementById('ai-language');
        const frameworkSelect = document.getElementById('ai-framework');
        const codeOutput = document.getElementById('generated-code');
        const copyBtn = document.getElementById('copy-code-btn');
        const saveBtn = document.getElementById('save-code-btn');

        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateCode();
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyCode();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCode();
            });
        }

        // Auto-resize textarea
        if (promptTextarea) {
            promptTextarea.addEventListener('input', () => {
                promptTextarea.style.height = 'auto';
                promptTextarea.style.height = promptTextarea.scrollHeight + 'px';
            });
        }
    }

    initCodeReview() {
        // Initialize code review functionality
        console.log('Code review initialized');
    }

    initDebugging() {
        // Initialize debugging functionality
        console.log('Debugging initialized');
    }

    initTestGeneration() {
        // Initialize test generation functionality
        console.log('Test generation initialized');
    }

    async generateCode() {
        if (this.isGenerating) return;

        const prompt = document.getElementById('ai-prompt').value;
        const language = document.getElementById('ai-language').value;
        const framework = document.getElementById('ai-framework').value;
        const codeOutput = document.getElementById('generated-code');
        const generateBtn = document.getElementById('generate-code-btn');

        if (!prompt.trim()) {
            this.showNotification('Please enter a prompt for code generation', 'error');
            return;
        }

        this.isGenerating = true;
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';

        // Show loading state
        if (codeOutput) {
            codeOutput.innerHTML = '<code>// Generating code... Please wait...</code>';
        }

        try {
            const response = await fetch('/api/ai/generate-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify({
                    prompt,
                    language,
                    framework,
                    projectId: this.currentProject?.id || null
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.displayGeneratedCode(data.data.generatedCode, language);
                this.showNotification('Code generated successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to generate code', 'error');
            }
        } catch (error) {
            console.error('Code generation error:', error);
            this.showNotification('Failed to generate code', 'error');
        } finally {
            this.isGenerating = false;
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Code';
        }
    }

    displayGeneratedCode(code, language) {
        const codeOutput = document.getElementById('generated-code');
        if (codeOutput) {
            // Syntax highlighting would be implemented here
            codeOutput.innerHTML = `<code class="language-${language}">${this.escapeHtml(code)}</code>`;
        }
    }

    copyCode() {
        const codeOutput = document.getElementById('generated-code');
        if (codeOutput) {
            const code = codeOutput.textContent;
            navigator.clipboard.writeText(code).then(() => {
                this.showNotification('Code copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Failed to copy code', 'error');
            });
        }
    }

    async saveCode() {
        const codeOutput = document.getElementById('generated-code');
        if (!codeOutput || !this.currentProject) {
            this.showNotification('No code to save or no project selected', 'error');
            return;
        }

        const code = codeOutput.textContent;
        const fileName = prompt('Enter filename (with extension):');
        
        if (!fileName) return;

        try {
            // In a real implementation, this would save to the project
            this.showNotification('Code saved to project!', 'success');
        } catch (error) {
            console.error('Save code error:', error);
            this.showNotification('Failed to save code', 'error');
        }
    }

    async reviewCode(code, language = 'javascript') {
        try {
            const response = await fetch('/api/ai/review-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify({
                    code,
                    language,
                    projectId: this.currentProject?.id || null
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.data.review;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to review code');
            }
        } catch (error) {
            console.error('Code review error:', error);
            throw error;
        }
    }

    async debugCode(code, error, language = 'javascript') {
        try {
            const response = await fetch('/api/ai/debug-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify({
                    code,
                    error,
                    language,
                    projectId: this.currentProject?.id || null
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.data.debugAnalysis;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to debug code');
            }
        } catch (error) {
            console.error('Code debugging error:', error);
            throw error;
        }
    }

    async generateTests(code, testFramework = 'jest', language = 'javascript') {
        try {
            const response = await fetch('/api/ai/generate-tests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify({
                    code,
                    testFramework,
                    language,
                    projectId: this.currentProject?.id || null
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.data.generatedTests;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate tests');
            }
        } catch (error) {
            console.error('Test generation error:', error);
            throw error;
        }
    }

    async generateDocumentation(code, format = 'markdown', language = 'javascript') {
        try {
            const response = await fetch('/api/ai/generate-docs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify({
                    code,
                    format,
                    language,
                    projectId: this.currentProject?.id || null
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.data.documentation;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate documentation');
            }
        } catch (error) {
            console.error('Documentation generation error:', error);
            throw error;
        }
    }

    setCurrentProject(project) {
        this.currentProject = project;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

// Initialize AI Studio when the section is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aiStudio = new AIStudio();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIStudio;
}