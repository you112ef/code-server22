// Main Application JavaScript
class PythagoraApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.projects = [];
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize theme
            this.initTheme();
            
            // Initialize authentication
            await this.initAuth();
            
            // Initialize WebSocket connection
            this.initWebSocket();
            
            // Initialize UI components
            this.initUI();
            
            // Load initial data
            await this.loadInitialData();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application');
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        if (loadingScreen) loadingScreen.style.display = 'flex';
        if (app) app.style.display = 'none';
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                if (app) app.style.display = 'flex';
            }, 500);
        }
    }

    initTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('pythagora-theme', newTheme);
            });
        }
    }

    async initAuth() {
        const token = localStorage.getItem('pythagora-token');
        if (token) {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.data.user;
                    this.updateUserUI();
                } else {
                    localStorage.removeItem('pythagora-token');
                    this.redirectToLogin();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('pythagora-token');
                this.redirectToLogin();
            }
        } else {
            this.redirectToLogin();
        }
    }

    initWebSocket() {
        const token = localStorage.getItem('pythagora-token');
        if (token) {
            this.socket = io({
                auth: { token }
            });

            this.socket.on('connect', () => {
                console.log('Connected to WebSocket');
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from WebSocket');
            });

            this.socket.on('code_updated', (data) => {
                this.handleCodeUpdate(data);
            });

            this.socket.on('deployment_complete', (data) => {
                this.handleDeploymentComplete(data);
            });

            this.socket.on('test_completed', (data) => {
                this.handleTestCompleted(data);
            });
        }
    }

    initUI() {
        // Navigation
        this.initNavigation();
        
        // User menu
        this.initUserMenu();
        
        // Modals
        this.initModals();
        
        // Theme toggle
        this.initThemeToggle();
    }

    initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                if (section) {
                    this.showSection(section);
                }
            });
        });
    }

    initUserMenu() {
        const userAvatar = document.getElementById('user-avatar');
        const userDropdown = document.getElementById('user-dropdown');
        const logoutBtn = document.getElementById('logout-btn');

        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('active');
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (userDropdown && !userDropdown.contains(e.target) && !userAvatar.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }

    initModals() {
        const createProjectBtn = document.getElementById('create-project-btn');
        const modalOverlay = document.getElementById('modal-overlay');
        const closeModal = document.getElementById('close-modal');
        const cancelProject = document.getElementById('cancel-project');
        const createProjectSubmit = document.getElementById('create-project-submit');

        if (createProjectBtn) {
            createProjectBtn.addEventListener('click', () => {
                this.showModal('create-project-modal');
            });
        }

        if (closeModal || cancelProject) {
            [closeModal, cancelProject].forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', () => {
                        this.hideModal();
                    });
                }
            });
        }

        if (createProjectSubmit) {
            createProjectSubmit.addEventListener('click', () => {
                this.createProject();
            });
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.hideModal();
                }
            });
        }
    }

    initThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('pythagora-theme', newTheme);
            });
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadProjects(),
                this.loadDashboardData()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    async loadProjects() {
        try {
            const response = await fetch('/api/projects', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.projects = data.data.projects;
                this.renderProjects();
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }

    async loadDashboardData() {
        // Load dashboard statistics and recent activity
        this.updateDashboardStats();
        this.renderRecentProjects();
        this.renderAIActivity();
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentSection = sectionName;

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'projects':
                await this.loadProjects();
                break;
            case 'ai-studio':
                this.initAIStudio();
                break;
            case 'collaboration':
                this.initCollaboration();
                break;
            case 'deployment':
                this.initDeployment();
                break;
        }
    }

    renderProjects() {
        const projectsGrid = document.getElementById('projects-grid');
        if (!projectsGrid) return;

        if (this.projects.length === 0) {
            projectsGrid.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                    </svg>
                    <h3>No projects yet</h3>
                    <p>Create your first project to get started with Pythagora AI</p>
                    <button class="btn btn-primary" onclick="app.showModal('create-project-modal')">
                        Create Project
                    </button>
                </div>
            `;
            return;
        }

        projectsGrid.innerHTML = this.projects.map(project => `
            <div class="project-card" onclick="app.openProject('${project._id}')">
                <div class="project-actions">
                    <button class="project-action" onclick="event.stopPropagation(); app.editProject('${project._id}')" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="project-action" onclick="event.stopPropagation(); app.deleteProject('${project._id}')" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                        </svg>
                    </button>
                </div>
                <div class="project-header">
                    <div>
                        <h3 class="project-title">${project.name}</h3>
                        <p class="project-description">${project.description || 'No description'}</p>
                    </div>
                </div>
                <div class="project-meta">
                    <span class="project-type">${project.type}</span>
                    <span class="project-status">
                        <span class="status-dot status-${project.status}"></span>
                        ${project.status}
                    </span>
                </div>
                <div class="project-stats">
                    <div class="project-stat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        ${project.totalCollaborators} collaborators
                    </div>
                    <div class="project-stat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                        ${project.deployment.status}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderRecentProjects() {
        const recentProjects = document.getElementById('recent-projects');
        if (!recentProjects) return;

        const recent = this.projects.slice(0, 5);
        recentProjects.innerHTML = recent.map(project => `
            <div class="recent-project-item" onclick="app.openProject('${project._id}')">
                <div class="project-info">
                    <h4>${project.name}</h4>
                    <p>${project.description || 'No description'}</p>
                </div>
                <div class="project-status">
                    <span class="status-dot status-${project.status}"></span>
                    ${project.status}
                </div>
            </div>
        `).join('');
    }

    renderAIActivity() {
        const aiActivity = document.getElementById('ai-activity');
        if (!aiActivity) return;

        // Mock AI activity data
        const activities = [
            {
                type: 'code_generation',
                title: 'Generated React component',
                description: 'UserProfile.jsx component with form validation',
                time: '2 minutes ago'
            },
            {
                type: 'code_review',
                title: 'Code review completed',
                description: 'Reviewed authentication middleware',
                time: '15 minutes ago'
            },
            {
                type: 'debug',
                title: 'Debug session',
                description: 'Fixed API endpoint error',
                time: '1 hour ago'
            }
        ];

        aiActivity.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    updateDashboardStats() {
        // Update dashboard statistics
        const totalProjects = document.getElementById('total-projects');
        const aiTokensUsed = document.getElementById('ai-tokens-used');
        const deployments = document.getElementById('deployments');
        const collaborators = document.getElementById('collaborators');

        if (totalProjects) totalProjects.textContent = this.projects.length;
        if (aiTokensUsed) aiTokensUsed.textContent = '2,450,000';
        if (deployments) deployments.textContent = '8';
        if (collaborators) collaborators.textContent = '24';
    }

    updateUserUI() {
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        const userPlan = document.getElementById('user-plan');
        const userTokens = document.getElementById('user-tokens');

        if (this.currentUser) {
            if (userName) userName.textContent = this.currentUser.fullName || 'User';
            if (userEmail) userEmail.textContent = this.currentUser.email;
            if (userPlan) userPlan.textContent = this.currentUser.subscription?.plan || 'Free';
            if (userTokens) userTokens.textContent = `${this.currentUser.subscription?.tokens || 0} tokens`;
        }
    }

    showModal(modalId) {
        const modalOverlay = document.getElementById('modal-overlay');
        const modal = document.getElementById(modalId);
        
        if (modalOverlay && modal) {
            modalOverlay.classList.add('active');
            modal.style.display = 'block';
        }
    }

    hideModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        const modals = document.querySelectorAll('.modal');
        
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
        
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    async createProject() {
        const form = document.getElementById('create-project-form');
        const formData = new FormData(form);
        
        const projectData = {
            name: document.getElementById('project-name').value,
            description: document.getElementById('project-description').value,
            type: document.getElementById('project-type').value,
            framework: document.getElementById('project-framework').value,
            language: document.getElementById('project-language').value
        };

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                },
                body: JSON.stringify(projectData)
            });

            if (response.ok) {
                const data = await response.json();
                this.projects.unshift(data.data.project);
                this.renderProjects();
                this.hideModal();
                this.showSuccess('Project created successfully!');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to create project');
            }
        } catch (error) {
            console.error('Create project error:', error);
            this.showError('Failed to create project');
        }
    }

    openProject(projectId) {
        // Navigate to project details or editor
        console.log('Opening project:', projectId);
        // Implementation would depend on the project structure
    }

    editProject(projectId) {
        console.log('Editing project:', projectId);
        // Implementation for editing project
    }

    async deleteProject(projectId) {
        if (confirm('Are you sure you want to delete this project?')) {
            try {
                const response = await fetch(`/api/projects/${projectId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                    }
                });

                if (response.ok) {
                    this.projects = this.projects.filter(p => p._id !== projectId);
                    this.renderProjects();
                    this.showSuccess('Project deleted successfully!');
                } else {
                    this.showError('Failed to delete project');
                }
            } catch (error) {
                console.error('Delete project error:', error);
                this.showError('Failed to delete project');
            }
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('pythagora-token')}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('pythagora-token');
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        window.location.href = '/login.html';
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // WebSocket event handlers
    handleCodeUpdate(data) {
        console.log('Code updated:', data);
        // Handle real-time code updates
    }

    handleDeploymentComplete(data) {
        console.log('Deployment complete:', data);
        // Update deployment status in UI
    }

    handleTestCompleted(data) {
        console.log('Tests completed:', data);
        // Update test results in UI
    }

    // Section-specific initializers
    initAIStudio() {
        // Initialize AI Studio functionality
        console.log('Initializing AI Studio');
    }

    initCollaboration() {
        // Initialize collaboration features
        console.log('Initializing Collaboration');
    }

    initDeployment() {
        // Initialize deployment features
        console.log('Initializing Deployment');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PythagoraApp();
});

// Add notification styles
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease;
}

.notification-success {
    background: var(--success);
}

.notification-error {
    background: var(--error);
}

.notification-info {
    background: var(--info);
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;

// Add styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);